from typing import cast

from app.providers.base import ProviderContext
from app.schemas import CheckInRequest, CheckInResponse, ParentInsightsResponse
from app.services.adaptation import mode_for_strategy
from app.services.sessions import SessionService, WorkflowError, stable_id


class ParentService:
    def __init__(self, sessions: SessionService) -> None:
        self.sessions = sessions

    def insights(self, child_id: str) -> ParentInsightsResponse:
        twin = self.sessions.current_twin(child_id)
        completed = [
            row
            for row in self.sessions.repository.list_interventions(child_id)
            if row["status"] == "completed"
        ]
        context = ProviderContext()
        if completed:
            latest = completed[-1]
            mode, _ = mode_for_strategy(str(latest["selected_strategy"]))
            context = ProviderContext(mode=mode, correctness=cast(float, latest["actual_success"]))
        return ParentInsightsResponse(
            child_id=child_id,
            completed_missions=len(completed),
            twin=twin,
            insight=self.sessions.provider.generate_parent_insight(context),
        )

    def check_in(self, request: CheckInRequest, key: str) -> CheckInResponse:
        self.sessions.require_child(request.child_id)
        identifier = stable_id(self.sessions.repository.owner_id, "check-in", key)
        record: dict[str, object] = {
            "id": identifier,
            "child_id": request.child_id,
            "difficulty": request.difficulty,
            "note": request.note,
            "context": {"weight": "context_only"},
        }
        for child in self.sessions.repository.list_children():
            for row in self.sessions.repository.list_check_ins(str(child["id"])):
                if row["id"] == identifier:
                    stored_request = CheckInRequest.model_validate(
                        {field: row[field] for field in ("child_id", "difficulty", "note")}
                    )
                    if stored_request != request:
                        raise WorkflowError("idempotency_conflict", "Check-in key was reused")
                    return CheckInResponse(check_in_id=identifier)
        self.sessions.repository.add_check_in(record)
        # Context is stored but never treated as a clinical score or a direct twin write.
        return CheckInResponse(check_in_id=identifier)
