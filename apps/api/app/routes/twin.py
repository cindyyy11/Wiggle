from fastapi import APIRouter

from app.dependencies import Sessions
from app.domain.simulation import SimulationReport
from app.schemas import SimulateRequest, TwinResponse

router = APIRouter(prefix="/twin", tags=["twin"])


@router.get("/{child_id}", response_model=TwinResponse)
def get_twin(child_id: str, sessions: Sessions) -> TwinResponse:
    return TwinResponse(twin=sessions.current_twin(child_id))


@router.post("/simulate", response_model=SimulationReport)
def simulate(body: SimulateRequest, sessions: Sessions) -> SimulationReport:
    return sessions.simulation(body.session_id)
