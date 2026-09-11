from datetime import UTC, datetime
from typing import cast
from uuid import NAMESPACE_URL, uuid5

from app.domain.models import (
    EventType,
    GenericEventPayload,
    LearnerTwin,
    LearningEvent,
    MissionCompletedPayload,
    TwinUpdate,
)
from app.domain.simulation import ActivityCharacteristics, SimulationReport, simulate
from app.domain.twin import update_twin
from app.providers.base import AIProvider, ProviderContext, TextContent
from app.repositories.protocols import Record, WiggleRepository
from app.schemas import (
    AppendEventsRequest,
    AppendEventsResponse,
    CompleteSessionRequest,
    CompleteSessionResponse,
    StartSessionRequest,
    StartSessionResponse,
)


class WorkflowError(Exception):
    def __init__(self, code: str, diagnostic: str, status_code: int = 409) -> None:
        self.code = code
        self.diagnostic = diagnostic
        self.status_code = status_code
        super().__init__(diagnostic)


def stable_id(owner: str, operation: str, key: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"wiggle:{owner}:{operation}:{key}"))


def as_record(value: object) -> Record:
    if not isinstance(value, dict):
        raise WorkflowError("invalid_record", "Stored workflow snapshot is invalid", 503)
    return cast(Record, value)


class SessionService:
    def __init__(self, repository: WiggleRepository, provider: AIProvider) -> None:
        self.repository = repository
        self.provider = provider

    def require_child(self, child_id: str) -> Record:
        child = self.repository.get_child(child_id)
        if child is None:
            raise WorkflowError("not_found", "Child is not available to this household", 404)
        return child

    def session(self, session_id: str) -> Record:
        session = self.repository.get_session(session_id)
        if session is None:
            raise WorkflowError("not_found", "Session is not available to this household", 404)
        return session

    def mission(self, session: Record) -> Record:
        mission = self.repository.get_mission(str(session["mission_id"]))
        if mission is None:
            raise WorkflowError("not_found", "Mission is not available", 404)
        return mission

    def interventions(self, session: Record) -> list[Record]:
        return [
            row
            for row in self.repository.list_interventions(str(session["child_id"]))
            if row["session_id"] == session["id"]
        ]

    def active_intervention(self, session: Record) -> Record:
        rows = self.interventions(session)
        if not rows:
            raise WorkflowError("session_incomplete", "Retry session/start before continuing", 409)
        return rows[-1]

    def current_twin(self, child_id: str) -> LearnerTwin:
        self.require_child(child_id)
        rows = self.repository.list_interventions(child_id)
        anchors = [
            as_record(row["simulation_snapshot"])
            for row in rows
            if "initial_twin" in as_record(row["simulation_snapshot"])
        ]
        if not anchors:
            return self.repository.get_twin(child_id) or LearnerTwin()
        anchor = anchors[0]
        excluded = cast(list[str], anchor["excluded_event_ids"])
        events = [
            event for event in self.repository.list_events(child_id) if event.id not in excluded
        ]
        # Rebuild from a durable baseline, not from an already updated materialized twin.
        # Sorting by timestamp and ID also handles delayed/batched delivery deterministically.
        events.sort(key=lambda event: (event.occurred_at, event.id))
        twin = update_twin(LearnerTwin.model_validate(anchor["initial_twin"]), events).twin
        return self.repository.put_twin(child_id, twin)

    def simulation(self, session_id: str) -> SimulationReport:
        session = self.session(session_id)
        mission = self.mission(session)
        authored = as_record(mission.get("authored_content", {}))
        activity = ActivityCharacteristics.model_validate(authored.get("simulation", {}))
        return simulate(
            self.current_twin(str(session["child_id"])), str(mission["objective"]), activity
        )

    def start(self, request: StartSessionRequest, key: str) -> StartSessionResponse:
        self.require_child(request.child_id)
        missions = self.repository.list_missions(request.child_id)
        mission = (
            self.repository.get_mission(request.mission_id)
            if request.mission_id
            else (missions[0] if missions else None)
        )
        if mission is None or mission["child_id"] != request.child_id:
            raise WorkflowError("not_found", "Mission is not available to this child", 404)
        if mission["objective"] != "identify-three-quarters":
            raise WorkflowError(
                "unsupported_mission", "Only the authored fraction mission is ready"
            )
        session_id = stable_id(self.repository.owner_id, "start", key)
        existing = self.repository.get_session(session_id)
        if existing and (
            existing["child_id"] != request.child_id or existing["mission_id"] != mission["id"]
        ):
            raise WorkflowError("idempotency_conflict", "Start key was used for another request")
        if existing and self.interventions(existing):
            snapshot = as_record(self.interventions(existing)[0]["simulation_snapshot"])
            self._record_start(existing)
            return StartSessionResponse.model_validate(snapshot["start_response"])
        twin = self.current_twin(request.child_id)
        session = existing or self.repository.create_session(
            {
                "id": session_id,
                "child_id": request.child_id,
                "mission_id": mission["id"],
                "status": "active",
                "started_at": datetime.now(UTC).isoformat(),
            }
        )
        response = StartSessionResponse(
            session_id=session_id,
            child_id=request.child_id,
            mission_id=str(mission["id"]),
            objective=str(mission["objective"]),
            activity=self.provider.generate_activity(ProviderContext()),
        )
        report = self.simulation(session_id)
        prediction = next(item for item in report.ranked if item.strategy == "standard")
        self.repository.create_intervention(
            {
                "id": stable_id(session_id, "baseline", key),
                "child_id": request.child_id,
                "session_id": session["id"],
                "selected_strategy": "standard",
                "predicted_success": prediction.predicted_success,
                "status": "selected",
                "simulation_snapshot": {
                    "initial_twin": twin.model_dump(mode="json"),
                    "excluded_event_ids": [
                        event.id for event in self.repository.list_events(request.child_id)
                    ],
                    "report": report.model_dump(mode="json"),
                    "start_response": response.model_dump(mode="json"),
                },
            }
        )
        self._record_start(session)
        return response

    def _record_start(self, session: Record) -> None:
        identifier = stable_id(str(session["id"]), "session-started", "v1")
        event = LearningEvent(
            id=identifier,
            child_id=str(session["child_id"]),
            session_id=str(session["id"]),
            occurred_at=datetime.fromisoformat(str(session["started_at"])),
            event_type=EventType.SESSION_STARTED,
            payload=GenericEventPayload(kind="session_started"),
        )
        self.repository.append_event(event, idempotency_key=identifier)

    def append(self, request: AppendEventsRequest) -> AppendEventsResponse:
        # Validate the entire batch before writing any row. Event IDs are stable per-event
        # idempotency keys, so retries work even when batches are split or regrouped.
        batch: dict[str, LearningEvent] = {}
        for event in request.events:
            if event.id in batch and batch[event.id] != event:
                raise WorkflowError("idempotency_conflict", "Batch repeats an ID with new content")
            batch[event.id] = event
            session = self.session(event.session_id)
            if session["child_id"] != event.child_id:
                raise WorkflowError("not_found", "Event child/session pair is unavailable", 404)
            if event.event_type == EventType.MISSION_COMPLETED:
                raise WorkflowError("use_completion_endpoint", "Use /session/complete for outcomes")
            existing = self.repository.list_events(event.child_id, session_id=event.session_id)
            same = next((row for row in existing if row.id == event.id), None)
            if same is not None and same != event:
                raise WorkflowError("idempotency_conflict", "Event ID was reused with new content")
            if session["status"] != "active" and same is None:
                raise WorkflowError("session_closed", "New events cannot modify a closed session")
            self.active_intervention(session)
        for event in request.events:
            self.repository.append_event(event, idempotency_key=event.id)
        for child_id in {event.child_id for event in request.events}:
            self.current_twin(child_id)
        return AppendEventsResponse(accepted_event_ids=tuple(event.id for event in request.events))

    def complete(self, request: CompleteSessionRequest, key: str) -> CompleteSessionResponse:
        from app.services.adaptation import mode_for_strategy

        session = self.session(request.session_id)
        intervention = self.active_intervention(session)
        child_id = str(session["child_id"])
        outcome = intervention.get("outcome")
        if outcome is not None:
            saved = as_record(outcome)
            if saved["idempotency_key"] != key or saved["request"] != request.model_dump(
                mode="json"
            ):
                raise WorkflowError(
                    "idempotency_conflict", "Completion already recorded differently"
                )
            response = CompleteSessionResponse.model_validate(saved["response"])
            self.current_twin(child_id)
            self.repository.update_session(
                request.session_id, {"status": "completed", "completed_at": saved["completed_at"]}
            )
            return response
        if session["status"] != "active":
            raise WorkflowError("session_closed", "Session is already closed")
        mission = self.mission(session)
        mode, strategy = mode_for_strategy(str(intervention["selected_strategy"]))
        event_id = stable_id(request.session_id, "complete", key)
        events = self.repository.list_events(child_id, session_id=request.session_id)
        completions = [event for event in events if event.event_type == EventType.MISSION_COMPLETED]
        existing = next((event for event in completions if event.id == event_id), None)
        if completions and (
            existing is None
            or not isinstance(existing.payload, MissionCompletedPayload)
            or existing.payload.correctness != request.correctness
        ):
            raise WorkflowError(
                "idempotency_conflict", "Completion event already recorded differently"
            )
        event = existing or LearningEvent(
            id=event_id,
            child_id=child_id,
            session_id=request.session_id,
            occurred_at=datetime.now(UTC),
            event_type=EventType.MISSION_COMPLETED,
            payload=MissionCompletedPayload(
                objective=str(mission["objective"]),
                correctness=request.correctness,
                mode=mode,
                strategy=strategy,
            ),
        )
        # Exclude a previously appended completion when recovering a partial write.
        anchor = next(
            as_record(row["simulation_snapshot"])
            for row in self.repository.list_interventions(child_id)
            if "initial_twin" in as_record(row["simulation_snapshot"])
        )
        prior_events = [
            row
            for row in self.repository.list_events(child_id)
            if row.id != event_id and row.id not in cast(list[str], anchor["excluded_event_ids"])
        ]
        prior_events.sort(key=lambda row: (row.occurred_at, row.id))
        prior = update_twin(LearnerTwin.model_validate(anchor["initial_twin"]), prior_events).twin
        update = update_twin(prior, [event])
        self.repository.append_event(event, idempotency_key=event_id)
        final_twin = self.current_twin(child_id)
        prediction = float(cast(float, intervention["predicted_success"]))
        response = CompleteSessionResponse(
            session_id=request.session_id,
            intervention_id=str(intervention["id"]),
            update=TwinUpdate(twin=final_twin, changes=update.changes),
            predicted_success=prediction,
            actual_success=request.correctness,
            prediction_error=request.correctness - prediction,
            celebration=TextContent(text="You made three quarters. Nice exploring!"),
        )
        completed_at = event.occurred_at.isoformat()
        self.repository.update_intervention(
            str(intervention["id"]),
            {
                "actual_success": request.correctness,
                "status": "completed",
                "outcome": {
                    "idempotency_key": key,
                    "request": request.model_dump(mode="json"),
                    "response": response.model_dump(mode="json"),
                    "completed_at": completed_at,
                },
            },
        )
        self.repository.update_session(
            request.session_id, {"status": "completed", "completed_at": completed_at}
        )
        return response
