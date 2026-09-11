import json
from collections.abc import Mapping
from datetime import UTC, datetime
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError

import pytest

from app.domain.models import EventType, GenericEventPayload, LearningEvent
from app.repositories.protocols import Record, RepositoryAccessError, RepositoryError
from app.repositories.supabase import SupabaseRepository

OWNER_ID = "10000000-0000-0000-0000-000000000001"
CHILD_ID = "10000000-0000-0000-0000-000000000011"
SESSION_ID = "10000000-0000-0000-0000-000000001111"
OTHER_SESSION_ID = "10000000-0000-0000-0000-000000001112"


def event_row(number: int = 1, *, session_id: str = SESSION_ID) -> Record:
    return {
        "id": f"event-{number}",
        "child_id": CHILD_ID,
        "session_id": session_id,
        "occurred_at": "2026-09-11T08:00:00+00:00",
        "event_type": "session_started",
        "payload": {"kind": "session_started"},
        "idempotency_key": "shared-key",
    }


def event(number: int = 1, *, session_id: str = SESSION_ID) -> LearningEvent:
    return LearningEvent(
        id=f"event-{number}",
        child_id=CHILD_ID,
        session_id=session_id,
        occurred_at=datetime(2026, 9, 11, 8, tzinfo=UTC),
        event_type=EventType.SESSION_STARTED,
        payload=GenericEventPayload(kind="session_started"),
    )


class StubSupabaseRepository(SupabaseRepository):
    def __init__(self) -> None:
        super().__init__(
            url="http://127.0.0.1:54321",
            anon_key="anon-key",
            access_token="access-token",
            owner_id=OWNER_ID,
        )
        self.responses: list[list[Record] | RepositoryError] = []
        self.requests: list[tuple[str, str, Mapping[str, str] | None]] = []

    def _request(
        self,
        method: str,
        table: str,
        *,
        query: Mapping[str, str] | None = None,
        body: Mapping[str, object] | None = None,
        prefer: str | None = None,
    ) -> list[Record]:
        self.requests.append((method, table, query))
        response = self.responses.pop(0)
        if isinstance(response, RepositoryError):
            raise response
        return response


def test_event_rows_normalize_postgrest_timestamps_before_validation() -> None:
    repository = StubSupabaseRepository()
    repository.responses = [[event_row()]]

    persisted = repository.append_event(event(), idempotency_key="shared-key")

    assert persisted.occurred_at == datetime(2026, 9, 11, 8, tzinfo=UTC)


def test_duplicate_event_recovery_is_scoped_by_session_and_key() -> None:
    repository = StubSupabaseRepository()
    repository.responses = [
        RepositoryError("duplicate"),
        [event_row()],
        RepositoryError("duplicate"),
        [event_row(2, session_id=OTHER_SESSION_ID)],
    ]

    assert repository.append_event(event(), idempotency_key="shared-key") == event()
    assert repository.append_event(
        event(2, session_id=OTHER_SESSION_ID), idempotency_key="shared-key"
    ) == event(2, session_id=OTHER_SESSION_ID)
    assert repository.requests[1] == (
        "GET",
        "learning_events",
        {
            "select": "*",
            "session_id": f"eq.{SESSION_ID}",
            "idempotency_key": "eq.shared-key",
        },
    )
    assert repository.requests[3][2] == {
        "select": "*",
        "session_id": f"eq.{OTHER_SESSION_ID}",
        "idempotency_key": "eq.shared-key",
    }


def test_event_history_fetches_every_stably_ordered_page() -> None:
    repository = StubSupabaseRepository()
    repository.responses = [
        [event_row(number) for number in range(1000)],
        [event_row(1000)],
        [],
    ]

    events = repository.list_events(CHILD_ID)

    assert len(events) == 1001
    assert [request[2]["offset"] for request in repository.requests] == ["0", "1000", "1001"]
    assert all(request[2]["order"] == "occurred_at.asc,id.asc" for request in repository.requests)


def test_postgrest_authorization_failures_use_access_error() -> None:
    repository = SupabaseRepository(
        url="http://127.0.0.1:54321",
        anon_key="anon-key",
        access_token="access-token",
        owner_id=OWNER_ID,
    )
    payload = BytesIO(json.dumps({"code": "42501", "message": "RLS denied"}).encode())
    error = HTTPError("http://local/children", 403, "Forbidden", {}, payload)

    with patch("app.repositories.supabase.urlopen", side_effect=error):
        with pytest.raises(RepositoryAccessError):
            repository.create_child({"id": CHILD_ID, "display_name": "Nova"})


def test_rls_hidden_update_uses_access_error() -> None:
    repository = StubSupabaseRepository()
    repository.responses = [[]]

    with pytest.raises(RepositoryAccessError):
        repository.update_session(SESSION_ID, {"status": "completed"})
