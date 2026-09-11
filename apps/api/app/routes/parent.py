from fastapi import APIRouter

from app.dependencies import IdempotencyKey, Sessions
from app.schemas import CheckInRequest, CheckInResponse, ParentInsightsResponse
from app.services.parent import ParentService

router = APIRouter(prefix="/parent", tags=["parent"])


@router.get("/insights", response_model=ParentInsightsResponse)
def insights(child_id: str, sessions: Sessions) -> ParentInsightsResponse:
    return ParentService(sessions).insights(child_id)


@router.post("/check-in", response_model=CheckInResponse)
def check_in(body: CheckInRequest, sessions: Sessions, key: IdempotencyKey) -> CheckInResponse:
    return ParentService(sessions).check_in(body, key)
