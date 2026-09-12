from app.domain.models import LearningMode
from app.domain.strategies import STRATEGIES, StrategyHistoryName
from app.providers.base import ProviderContext
from app.schemas import SelectAdaptationRequest, SelectAdaptationResponse
from app.services.sessions import SessionService, WorkflowError, as_record, stable_id


def mode_for_strategy(strategy: str) -> tuple[LearningMode, StrategyHistoryName | None]:
    modes: dict[str, LearningMode] = {
        "standard": "standard",
        "chunked": "chunk",
        "visual": "visual",
        "voice": "voice",
        "gesture": "gesture",
        "visual_gesture": "visual_gesture",
        "movement": "movement",
        "story": "story",
        "challenge": "standard",
    }
    definition = next(item for item in STRATEGIES if item.name == strategy)
    return modes[strategy], definition.history_key


class AdaptationService:
    def __init__(self, sessions: SessionService) -> None:
        self.sessions = sessions

    def select(self, request: SelectAdaptationRequest, key: str) -> SelectAdaptationResponse:
        session = self.sessions.session(request.session_id)
        if session["status"] == "abandoned":
            raise WorkflowError("session_closed", "Cannot adapt an abandoned session")
        identifier = stable_id(request.session_id, "select", key)
        for row in self.sessions.interventions(session):
            if row["id"] == identifier:
                if row["selected_strategy"] != request.strategy:
                    raise WorkflowError("idempotency_conflict", "Selection key was reused")
                snapshot = as_record(row["simulation_snapshot"])
                return SelectAdaptationResponse.model_validate(snapshot["selection_response"])
        if session["status"] != "active":
            raise WorkflowError("session_closed", "Cannot adapt a closed session")
        events = self.sessions.repository.list_events(
            str(session["child_id"]), session_id=request.session_id
        )
        if any(event.payload.kind == "mission_completed" for event in events):
            raise WorkflowError("session_closed", "Finish the pending completion before adapting")
        self.sessions.active_intervention(session)
        mode, _ = mode_for_strategy(request.strategy)
        mission = self.sessions.mission(session)
        supported_modes = mission.get("supported_modes", [])
        if not isinstance(supported_modes, list) or mode not in supported_modes:
            raise WorkflowError("unsupported_mode", "The mission does not support this mode")
        report = self.sessions.simulation(request.session_id)
        prediction = next(item for item in report.ranked if item.strategy == request.strategy)
        response = SelectAdaptationResponse(
            intervention_id=identifier,
            strategy=request.strategy,
            mode=mode,
            predicted_success=prediction.predicted_success,
            activity=self.sessions.provider.generate_activity(ProviderContext(mode=mode)),
        )
        self.sessions.repository.create_intervention(
            {
                "id": identifier,
                "child_id": session["child_id"],
                "session_id": request.session_id,
                "selected_strategy": request.strategy,
                "predicted_success": response.predicted_success,
                "status": "selected",
                "simulation_snapshot": {
                    "report": report.model_dump(mode="json"),
                    "selection_response": response.model_dump(mode="json"),
                },
            }
        )
        return response
