"""Request-scoped ownership and shared, serialized demo workflow dependencies."""

import json
from collections.abc import Iterator
from threading import Lock
from typing import Annotated, cast
from urllib.error import HTTPError, URLError
from urllib.request import Request as URLRequest
from urllib.request import urlopen

from fastapi import Depends, Header, Request

from app.providers.base import AIProvider
from app.repositories.protocols import WiggleRepository
from app.repositories.supabase import RepositorySettings, SupabaseRepository
from app.services.sessions import SessionService, WorkflowError


def get_sessions(
    request: Request, authorization: Annotated[str | None, Header()] = None
) -> Iterator[SessionService]:
    settings = cast(RepositorySettings, request.app.state.repository_settings)
    repository = cast(WiggleRepository | None, request.app.state.repository)
    if repository is None:
        if not authorization or not authorization.startswith("Bearer "):
            raise WorkflowError(
                "authentication_required", "A household access token is required", 401
            )
        token = authorization.removeprefix("Bearer ").strip()
        assert settings.supabase_url is not None and settings.supabase_anon_key is not None
        # Resolve identity using Auth; never trust caller-supplied owner IDs or decoded JWTs.
        auth_request = URLRequest(
            f"{str(settings.supabase_url).rstrip('/')}/auth/v1/user",
            headers={
                "apikey": settings.supabase_anon_key.get_secret_value(),
                "Authorization": f"Bearer {token}",
            },
        )
        try:
            with urlopen(auth_request, timeout=5) as response:
                identity = json.loads(response.read(65536))
            owner_id = identity["id"]
            if not isinstance(owner_id, str) or not owner_id:
                raise ValueError("missing identity")
        except HTTPError as error:
            if error.code in (401, 403):
                raise WorkflowError("authentication_required", "Household token is invalid", 401)
            raise WorkflowError(
                "authentication_unavailable", "Household authentication unavailable", 503
            )
        except (URLError, TimeoutError, OSError, ValueError, KeyError, TypeError):
            raise WorkflowError(
                "authentication_unavailable", "Household authentication unavailable", 503
            )
        repository = SupabaseRepository(
            url=str(settings.supabase_url),
            anon_key=settings.supabase_anon_key.get_secret_value(),
            access_token=token,
            owner_id=owner_id,
        )
    provider = cast(AIProvider, request.app.state.provider)
    # The fallback server is one process. Durable replay handles retry/restart recovery;
    # distributed multi-writer transactions require a later repository-level RPC.
    lock = cast(Lock, request.app.state.workflow_lock)
    with lock:
        yield SessionService(repository, provider)


Sessions = Annotated[SessionService, Depends(get_sessions)]
IdempotencyKey = Annotated[
    str, Header(alias="Idempotency-Key", min_length=1, max_length=128, pattern=r"\S")
]
