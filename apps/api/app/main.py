import logging
import os
import re
import tempfile
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.demo import DEMO_PARENT_ID, seed_demo
from app.observability import request_summary
from app.providers.base import AIProvider
from app.providers.gemini import provider_from_env
from app.repositories.memory import MemoryRepository
from app.repositories.protocols import RepositoryAccessError, RepositoryError, WiggleRepository
from app.repositories.supabase import RepositorySettings
from app.routes import adaptation, child, events, lexi, parent, sessions, twin
from app.services.parent_pin import PinStore, hash_pin
from app.services.sessions import WorkflowError

DEFAULT_DEMO_PIN = "123456"


def create_app(
    *,
    repository: WiggleRepository | None = None,
    provider: AIProvider | None = None,
    demo_pin: str | None = None,
) -> FastAPI:
    """Build the API.

    ``demo_pin`` pre-sets the parent PIN, but only on the built-in in-memory demo repository.
    It is ignored for Supabase/household data and for a caller-supplied repository, so a real
    household always creates its own PIN.
    """
    app = FastAPI(title="Wiggle API", version="0.1.0")
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    app.middleware("http")(request_summary)
    origins = [
        origin.strip()
        for origin in os.getenv("WIGGLE_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    if "*" in origins:
        raise ValueError("WIGGLE_ALLOWED_ORIGINS must contain exact origins, not a wildcard")
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type", "Authorization", "Idempotency-Key", "X-Parent-Pin"],
            expose_headers=["X-Request-ID"],
        )
    settings = RepositorySettings.from_env()
    if repository is None and settings.backend == "memory":
        memory = MemoryRepository(DEMO_PARENT_ID)
        seed_demo(memory)
        if demo_pin:
            if not re.fullmatch(r"[0-9]{6}", demo_pin):
                raise ValueError("WIGGLE_DEMO_PIN must be exactly six digits")
            memory.put_settings({**(memory.get_settings() or {}), "pin_hash": hash_pin(demo_pin)})
        repository = memory
    app.state.repository_settings = settings
    app.state.repository = repository
    app.state.provider = provider or provider_from_env()
    app.state.workflow_lock = Lock()
    pin_path = os.environ.get("WIGGLE_PIN_STORE_PATH")
    if not pin_path:
        if settings.backend == "memory":
            pin_path = str(Path(tempfile.mkdtemp(prefix="wiggle-pin-")) / "pin.sqlite")
    app.state.pin_store = PinStore(pin_path) if pin_path else None

    @app.exception_handler(WorkflowError)
    async def workflow_error(request: Request, error: WorkflowError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={
                "error": {
                    "code": error.code,
                    "message": "Let's try that again.",
                    "diagnostic": error.diagnostic,
                    "recovery": "retry_or_return_to_mission",
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Let's try that again.",
                    "diagnostics": [
                        {"location": list(item["loc"]), "type": item["type"]}
                        for item in error.errors()
                    ],
                    "recovery": "check_request",
                }
            },
        )

    @app.exception_handler(RepositoryError)
    async def repository_error(request: Request, error: RepositoryError) -> JSONResponse:
        access = isinstance(error, RepositoryAccessError)
        return JSONResponse(
            status_code=404 if access else 503,
            content={
                "error": {
                    "code": "not_found" if access else "persistence_unavailable",
                    "message": "Your mission is here. Try again in a moment.",
                    "diagnostic": type(error).__name__,
                    "recovery": "retry_with_same_idempotency_key",
                }
            },
        )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    for router in (
        sessions.router,
        events.router,
        twin.router,
        adaptation.router,
        lexi.router,
        parent.router,
        child.router,
    ):
        app.include_router(router)
    return app


# The served app pre-sets the sample PIN for the in-memory demo so it never needs setting up
# after a restart. Set WIGGLE_DEMO_PIN to another six digits, or to an empty value to turn it off.
app = create_app(demo_pin=os.environ.get("WIGGLE_DEMO_PIN", DEFAULT_DEMO_PIN))
