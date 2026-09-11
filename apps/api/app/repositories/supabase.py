"""Supabase PostgREST repository with validated, server-side configuration."""

from __future__ import annotations

import json
import os
from collections.abc import Mapping
from typing import Literal, Self, cast
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, SecretStr, model_validator

from app.domain.models import LearnerTwin, LearningEvent
from app.repositories.memory import MemoryRepository
from app.repositories.protocols import Record, RepositoryError, WiggleRepository


class RepositorySettings(BaseModel):
    """Validated persistence selection; credentials are intentionally server-only."""

    model_config = ConfigDict(frozen=True)

    backend: Literal["memory", "supabase"] = "memory"
    supabase_url: AnyHttpUrl | None = None
    supabase_anon_key: SecretStr | None = None

    @model_validator(mode="after")
    def require_supabase_credentials(self) -> Self:
        if self.backend == "supabase" and (
            self.supabase_url is None or self.supabase_anon_key is None
        ):
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY are required for Supabase")
        return self

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> Self:
        values = os.environ if environ is None else environ
        return cls.model_validate(
            {
                "backend": values.get("WIGGLE_REPOSITORY_BACKEND", "memory").lower(),
                "supabase_url": values.get("SUPABASE_URL") or None,
                "supabase_anon_key": values.get("SUPABASE_ANON_KEY") or None,
            }
        )


class SupabaseRepository:
    """Authenticated REST adapter; Postgres RLS remains the authorization authority."""

    def __init__(
        self,
        *,
        url: str,
        anon_key: str,
        access_token: str,
        owner_id: str,
        timeout_seconds: float = 10.0,
    ) -> None:
        if not all((url, anon_key, access_token, owner_id)):
            raise ValueError("url, anon_key, access_token, and owner_id are required")
        self.owner_id = owner_id
        self._rest_url = f"{url.rstrip('/')}/rest/v1"
        self._anon_key = anon_key
        self._access_token = access_token
        self._timeout_seconds = timeout_seconds

    def _request(
        self,
        method: str,
        table: str,
        *,
        query: Mapping[str, str] | None = None,
        body: Mapping[str, object] | None = None,
        prefer: str | None = None,
    ) -> list[Record]:
        suffix = "" if not query else f"?{urlencode(query)}"
        headers = {
            "apikey": self._anon_key,
            "Authorization": f"Bearer {self._access_token}",
            "Accept": "application/json",
        }
        if body is not None:
            headers["Content-Type"] = "application/json"
        if prefer is not None:
            headers["Prefer"] = prefer
        request = Request(
            f"{self._rest_url}/{table}{suffix}",
            data=None if body is None else json.dumps(body).encode("utf-8"),
            headers=headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=self._timeout_seconds) as response:  # noqa: S310
                raw = response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            message = f"Supabase rejected {method} {table}: {error.code} {detail}"
            raise RepositoryError(message) from error
        except URLError as error:
            raise RepositoryError(f"Supabase request failed for {table}: {error.reason}") from error
        if not raw:
            return []
        decoded = json.loads(raw)
        if not isinstance(decoded, list) or not all(isinstance(row, dict) for row in decoded):
            raise RepositoryError(f"Supabase returned an invalid {table} response")
        return cast(list[Record], decoded)

    @staticmethod
    def _one(rows: list[Record], subject: str) -> Record:
        if len(rows) != 1:
            raise RepositoryError(f"expected one {subject} row, received {len(rows)}")
        return rows[0]

    def _select(self, table: str, **filters: str) -> list[Record]:
        query = {"select": "*", **{name: f"eq.{value}" for name, value in filters.items()}}
        return self._request("GET", table, query=query)

    def _insert(
        self, table: str, record: Mapping[str, object], *, resolution: str | None = None
    ) -> Record:
        directives = ["return=representation"]
        if resolution is not None:
            directives.append(f"resolution={resolution}")
        rows = self._request("POST", table, body=record, prefer=",".join(directives))
        return self._one(rows, table)

    def _update(self, table: str, identifier: str, changes: Mapping[str, object]) -> Record:
        rows = self._request(
            "PATCH",
            table,
            query={"id": f"eq.{identifier}"},
            body=changes,
            prefer="return=representation",
        )
        return self._one(rows, table)

    def create_child(self, child: Mapping[str, object]) -> Record:
        record = dict(child)
        requested_parent = record.setdefault("parent_id", self.owner_id)
        if requested_parent != self.owner_id:
            raise RepositoryError("cannot create a child for another parent")
        return self._insert("children", record)

    def get_child(self, child_id: str) -> Record | None:
        rows = self._select("children", id=child_id)
        return None if not rows else self._one(rows, "child")

    def list_children(self) -> list[Record]:
        return self._select("children", parent_id=self.owner_id)

    def put_twin(self, child_id: str, twin: LearnerTwin, *, schema_version: int = 1) -> LearnerTwin:
        rows = self._request(
            "POST",
            "learner_twins",
            query={"on_conflict": "child_id"},
            body={
                "child_id": child_id,
                "twin": twin.model_dump(mode="json"),
                "schema_version": schema_version,
            },
            prefer="return=representation,resolution=merge-duplicates",
        )
        row = self._one(rows, "learner twin")
        return LearnerTwin.model_validate(row["twin"])

    def get_twin(self, child_id: str) -> LearnerTwin | None:
        rows = self._select("learner_twins", child_id=child_id)
        if not rows:
            return None
        return LearnerTwin.model_validate(self._one(rows, "learner twin")["twin"])

    def create_mission(self, mission: Mapping[str, object]) -> Record:
        return self._insert("missions", mission)

    def get_mission(self, mission_id: str) -> Record | None:
        rows = self._select("missions", id=mission_id)
        return None if not rows else self._one(rows, "mission")

    def list_missions(self, child_id: str) -> list[Record]:
        return self._select("missions", child_id=child_id)

    def create_session(self, session: Mapping[str, object]) -> Record:
        return self._insert("sessions", session)

    def get_session(self, session_id: str) -> Record | None:
        rows = self._select("sessions", id=session_id)
        return None if not rows else self._one(rows, "session")

    def update_session(self, session_id: str, changes: Mapping[str, object]) -> Record:
        if "id" in changes or "child_id" in changes or "mission_id" in changes:
            raise RepositoryError("session identity and ownership fields are immutable")
        return self._update("sessions", session_id, changes)

    def append_event(self, event: LearningEvent, *, idempotency_key: str) -> LearningEvent:
        record = event.model_dump(mode="json")
        record["idempotency_key"] = idempotency_key
        try:
            row = self._insert("learning_events", record)
        except RepositoryError:
            rows = self._select("learning_events", idempotency_key=idempotency_key)
            if not rows:
                raise
            row = self._one(rows, "learning event")
        persisted = LearningEvent.model_validate(row)
        if persisted != event:
            raise RepositoryError("idempotency key was already used for another event")
        return persisted

    def list_events(self, child_id: str, *, session_id: str | None = None) -> list[LearningEvent]:
        query = {"select": "*", "child_id": f"eq.{child_id}", "order": "occurred_at.asc"}
        if session_id is not None:
            query["session_id"] = f"eq.{session_id}"
        rows = self._request("GET", "learning_events", query=query)
        return [LearningEvent.model_validate(row) for row in rows]

    def create_intervention(self, intervention: Mapping[str, object]) -> Record:
        return self._insert("interventions", intervention)

    def update_intervention(self, intervention_id: str, changes: Mapping[str, object]) -> Record:
        if "id" in changes or "child_id" in changes or "session_id" in changes:
            raise RepositoryError("intervention identity and ownership fields are immutable")
        return self._update("interventions", intervention_id, changes)

    def list_interventions(self, child_id: str) -> list[Record]:
        return self._select("interventions", child_id=child_id)

    def get_settings(self) -> Record | None:
        rows = self._select("parent_settings", parent_id=self.owner_id)
        return None if not rows else self._one(rows, "parent settings")

    def put_settings(self, settings: Mapping[str, object]) -> Record:
        record = dict(settings)
        record["parent_id"] = self.owner_id
        rows = self._request(
            "POST",
            "parent_settings",
            query={"on_conflict": "parent_id"},
            body=record,
            prefer="return=representation,resolution=merge-duplicates",
        )
        return self._one(rows, "parent settings")

    def add_check_in(self, check_in: Mapping[str, object]) -> Record:
        record = dict(check_in)
        requested_parent = record.setdefault("parent_id", self.owner_id)
        if requested_parent != self.owner_id:
            raise RepositoryError("cannot create another parent's check-in")
        return self._insert("parent_check_ins", record)

    def list_check_ins(self, child_id: str) -> list[Record]:
        return self._select("parent_check_ins", child_id=child_id)


def repository_from_env(
    *,
    owner_id: str,
    access_token: str | None = None,
    environ: Mapping[str, str] | None = None,
) -> WiggleRepository:
    """Select an adapter only after environment configuration validates."""

    settings = RepositorySettings.from_env(environ)
    if settings.backend == "memory":
        return MemoryRepository(owner_id)
    if access_token is None:
        raise ValueError("an authenticated user access token is required for Supabase")
    assert settings.supabase_url is not None
    assert settings.supabase_anon_key is not None
    return SupabaseRepository(
        url=str(settings.supabase_url),
        anon_key=settings.supabase_anon_key.get_secret_value(),
        access_token=access_token,
        owner_id=owner_id,
    )
