from fastapi import APIRouter

from app.dependencies import IdempotencyKey, Sessions
from app.schemas import SelectAdaptationRequest, SelectAdaptationResponse
from app.services.adaptation import AdaptationService

router = APIRouter(prefix="/adaptation", tags=["adaptation"])


@router.post("/select", response_model=SelectAdaptationResponse)
def select(
    body: SelectAdaptationRequest, sessions: Sessions, key: IdempotencyKey
) -> SelectAdaptationResponse:
    return AdaptationService(sessions).select(body, key)
