from fastapi import APIRouter

from app.dependencies import IdempotencyKey, Sessions
from app.schemas import (
    CompleteSessionRequest,
    CompleteSessionResponse,
    StartSessionRequest,
    StartSessionResponse,
)

router = APIRouter(prefix="/session", tags=["sessions"])


@router.post("/start", response_model=StartSessionResponse)
def start(
    body: StartSessionRequest, sessions: Sessions, key: IdempotencyKey
) -> StartSessionResponse:
    return sessions.start(body, key)


@router.post("/complete", response_model=CompleteSessionResponse)
def complete(
    body: CompleteSessionRequest, sessions: Sessions, key: IdempotencyKey
) -> CompleteSessionResponse:
    return sessions.complete(body, key)
