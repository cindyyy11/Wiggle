from typing import Annotated, cast

from fastapi import APIRouter, Depends, Header, Request
from pydantic import Field

from app.dependencies import IdempotencyKey, Sessions
from app.schemas import CheckInRequest, CheckInResponse, ParentInsightsResponse, RequestModel
from app.services.parent import ParentService
from app.services.parent_pin import ParentPinService, PinStore
from app.services.sessions import SessionService, WorkflowError

router = APIRouter(prefix="/parent", tags=["parent"])


class PinRequest(RequestModel):
    pin: str = Field(pattern=r"^[0-9]{6}$")


class BreakRequest(RequestModel):
    break_interval_minutes: int = Field(ge=5, le=480)


def pins(request: Request, sessions: Sessions) -> ParentPinService:
    if request.app.state.pin_store is None:
        raise WorkflowError("pin_store_unavailable", "Configure durable WIGGLE_PIN_STORE_PATH", 503)
    return ParentPinService(sessions.repository, cast(PinStore, request.app.state.pin_store))


Pins = Annotated[ParentPinService, Depends(pins)]


def require_parent(
    sessions: Sessions, service: Pins, x_parent_pin: Annotated[str | None, Header()] = None
) -> SessionService:
    service.require(x_parent_pin)
    return sessions


ParentSessions = Annotated[SessionService, Depends(require_parent)]


@router.get("/pin/status")
def pin_status(service: Pins) -> dict[str, bool]:
    return {"setupRequired": not bool((service.repository.get_settings() or {}).get("pin_hash"))}


@router.post("/pin/setup")
def pin_setup(body: PinRequest, service: Pins) -> dict[str, str]:
    return {"ticket": service.setup(body.pin)}


@router.post("/pin/verify")
def pin_verify(body: PinRequest, service: Pins) -> dict[str, str]:
    return {"ticket": service.verify(body.pin)}


@router.post("/pin/lock")
def pin_lock(service: Pins, x_parent_pin: Annotated[str, Header()]) -> dict[str, bool]:
    service.revoke(x_parent_pin)
    return {"locked": True}


@router.get("/children")
def children(sessions: ParentSessions) -> list[dict[str, str]]:
    return [
        {"id": str(row["id"]), "name": str(row.get("display_name", "Explorer"))}
        for row in sessions.repository.list_children()
    ]


@router.get("/settings")
def settings(sessions: ParentSessions) -> dict[str, int]:
    row = sessions.repository.get_settings() or {}
    return {"breakIntervalMinutes": int(cast(int, row.get("break_interval_minutes", 20)))}


@router.post("/settings")
def save_settings(body: BreakRequest, sessions: ParentSessions) -> dict[str, int]:
    row = sessions.repository.get_settings() or {}
    sessions.repository.put_settings({**row, "break_interval_minutes": body.break_interval_minutes})
    return {"breakIntervalMinutes": body.break_interval_minutes}


@router.get("/insights", response_model=ParentInsightsResponse)
def insights(child_id: str, sessions: ParentSessions) -> ParentInsightsResponse:
    return ParentService(sessions).insights(child_id)


@router.post("/check-in", response_model=CheckInResponse)
def check_in(
    body: CheckInRequest, sessions: ParentSessions, key: IdempotencyKey
) -> CheckInResponse:
    return ParentService(sessions).check_in(body, key)
