import logging
import os
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
from app.routes import adaptation, events, lexi, parent, sessions, twin
from app.services.parent_pin import PinStore
from app.services.sessions import WorkflowError


def create_app(
    *, repository: WiggleRepository | None = None, provider: AIProvider | None = None
) -> FastAPI:
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
    ):
        app.include_router(router)
    return app


app = create_app()
