from typing import Annotated

from fastapi import APIRouter, Header

from app.dependencies import Sessions
from app.schemas import LexiRequest, LexiResponse
from app.services.lexi import LexiService

router = APIRouter(prefix="/lexi", tags=["lexi"])


@router.post("/chat", response_model=LexiResponse)
def chat(
    body: LexiRequest,
    sessions: Sessions,
    key: Annotated[
        str | None, Header(alias="Idempotency-Key", min_length=1, max_length=128)
    ] = None,
) -> LexiResponse:
    return LexiService(sessions).chat(body, key)
