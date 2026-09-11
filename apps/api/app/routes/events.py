from fastapi import APIRouter

from app.dependencies import Sessions
from app.schemas import AppendEventsRequest, AppendEventsResponse

router = APIRouter(tags=["events"])


@router.post("/events", response_model=AppendEventsResponse)
def append(body: AppendEventsRequest, sessions: Sessions) -> AppendEventsResponse:
    return sessions.append(body)
