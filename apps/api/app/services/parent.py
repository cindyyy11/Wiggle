from typing import cast

from app.domain.models import LearnerTwin
from app.domain.twin import update_twin
from app.providers.base import ProviderContext
from app.schemas import (
    CheckInRequest,
    CheckInResponse,
    ParentInsightsResponse,
    ParentMission,
    ProgressPoint,
)
from app.services.adaptation import mode_for_strategy
from app.services.sessions import SessionService, WorkflowError, as_record, stable_id


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
        mastery_history: list[ProgressPoint] = []
        independence_history: list[ProgressPoint] = []
        anchors = [
            as_record(row["simulation_snapshot"])
            for row in self.sessions.repository.list_interventions(child_id)
            if "initial_twin" in as_record(row["simulation_snapshot"])
        ]
        if anchors:
            anchor = anchors[0]
            baseline = LearnerTwin.model_validate(anchor["initial_twin"])
            events = sorted(
                [
                    event
                    for event in self.sessions.repository.list_events(child_id)
                    if event.id not in cast(list[str], anchor["excluded_event_ids"])
                ],
                key=lambda event: (event.occurred_at, event.id),
            )
            helped: set[str] = set()
            for event in events:
                baseline = update_twin(baseline, [event]).twin
                if event.payload.kind in ("hint_requested", "stuck_requested"):
                    helped.add(event.session_id)
                if event.payload.kind == "mission_completed":
                    label = f"Mission {len(mastery_history) + 1}"
                    mastery_history.append(
                        ProgressPoint(label=label, value=baseline.mastery[event.payload.objective])
                    )
                    independence_history.append(
                        ProgressPoint(label=label, value=0 if event.session_id in helped else 1)
                    )
        return ParentInsightsResponse(
            child_id=child_id,
            completed_missions=len(completed),
            twin=twin,
            insight=self.sessions.provider.generate_parent_insight(context),
            missions=tuple(
                ParentMission(title=str(row["title"]), objective=str(row["objective"]))
                for row in self.sessions.repository.list_missions(child_id)
            ),
            mastery_history=tuple(mastery_history),
            independence_history=tuple(independence_history),
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
