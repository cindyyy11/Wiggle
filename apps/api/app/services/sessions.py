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
    canonical_probability,
    observed_completion_mode,
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
        # The accepted event is durable even if the status write failed. Reconcile it
        # before any later workflow can mutate or revive an abandoned session.
        if session["status"] == "active" and any(
            event.event_type == EventType.MISSION_ABANDONED
            for event in self.repository.list_events(
                str(session["child_id"]), session_id=session_id
            )
        ):
            session = self.repository.update_session(session_id, {"status": "abandoned"})
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
        return self.repository.put_twin(child_id, self._replay(child_id).twin)

    def _replay(self, child_id: str, *, audit_from_event_id: str | None = None) -> TwinUpdate:
        """Use one ordering for materialization and completion's audit suffix."""
        self.require_child(child_id)
        rows = self.repository.list_interventions(child_id)
        anchors = [
            as_record(row["simulation_snapshot"])
            for row in rows
            if "initial_twin" in as_record(row["simulation_snapshot"])
        ]
        if not anchors:
            return TwinUpdate(twin=self.repository.get_twin(child_id) or LearnerTwin(), changes=())
        anchor = anchors[0]
        excluded = cast(list[str], anchor["excluded_event_ids"])
        events = [
            event for event in self.repository.list_events(child_id) if event.id not in excluded
        ]
        # Rebuild from a durable baseline, not from an already updated materialized twin.
        # Sorting by timestamp and ID also handles delayed/batched delivery deterministically.
        events.sort(key=lambda event: (event.occurred_at, event.id))
        baseline = LearnerTwin.model_validate(anchor["initial_twin"])
        if audit_from_event_id is not None:
            position = next(
                (index for index, event in enumerate(events) if event.id == audit_from_event_id),
                None,
            )
            if position is None:
                raise WorkflowError(
                    "missing_event", "Completion event is unavailable for replay", 503
                )
            baseline = update_twin(baseline, events[:position]).twin
            events = events[position:]
        return update_twin(baseline, events)

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
                "predicted_success": canonical_probability(prediction.predicted_success),
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
        session_status: dict[str, object] = {}
        evidence: dict[str, list[LearningEvent]] = {}
        for event in request.events:
            if event.id in batch and batch[event.id] != event:
                raise WorkflowError("idempotency_conflict", "Batch repeats an ID with new content")
            if event.id in batch:
                continue
            batch[event.id] = event
            session = self.session(event.session_id)
            if session["child_id"] != event.child_id:
                raise WorkflowError("not_found", "Event child/session pair is unavailable", 404)
            if event.event_type == EventType.MISSION_COMPLETED:
                raise WorkflowError("use_completion_endpoint", "Use /session/complete for outcomes")
            if event.session_id not in evidence:
                evidence[event.session_id] = self.repository.list_events(
                    event.child_id, session_id=event.session_id
                )
                session_status[event.session_id] = session["status"]
            existing = evidence[event.session_id]
            same = next((row for row in existing if row.id == event.id), None)
            if same is not None and same != event:
                raise WorkflowError("idempotency_conflict", "Event ID was reused with new content")
            if same is not None:
                continue
            status = session_status[event.session_id]
            reality_event = event.event_type in {
                EventType.REALITY_MISSION_STARTED,
                EventType.REALITY_MISSION_COMPLETED,
            }
            if status != "active" and not (status == "completed" and reality_event):
                raise WorkflowError("session_closed", "New events cannot modify a closed session")
            if (
                any(row.event_type == EventType.MISSION_COMPLETED for row in existing)
                and status == "active"
            ):
                raise WorkflowError("session_closed", "Finish the pending completion first")
            if reality_event:
                starts = sum(
                    row.event_type == EventType.REALITY_MISSION_STARTED for row in existing
                )
                finishes = sum(
                    row.event_type == EventType.REALITY_MISSION_COMPLETED for row in existing
                )
                if (
                    event.event_type == EventType.REALITY_MISSION_STARTED and starts != finishes
                ) or (
                    event.event_type == EventType.REALITY_MISSION_COMPLETED
                    and starts != finishes + 1
                ):
                    raise WorkflowError(
                        "invalid_reality_lifecycle", "Reality Mission must start before finishing"
                    )
            if event.event_type == EventType.MISSION_ABANDONED:
                session_status[event.session_id] = "abandoned"
            existing.append(event)
            self.active_intervention(session)
        for event in request.events:
            self.repository.append_event(event, idempotency_key=event.id)
            if event.event_type == EventType.MISSION_ABANDONED:
                self.repository.update_session(event.session_id, {"status": "abandoned"})
        for child_id in {event.child_id for event in request.events}:
            self.current_twin(child_id)
        return AppendEventsResponse(accepted_event_ids=tuple(event.id for event in request.events))

    def complete(self, request: CompleteSessionRequest, key: str) -> CompleteSessionResponse:
        from app.services.adaptation import mode_for_strategy

        session = self.session(request.session_id)
        if session["status"] == "abandoned":
            raise WorkflowError("session_closed", "Cannot complete an abandoned session")
        intervention = self.active_intervention(session)
        child_id = str(session["child_id"])
        outcome = intervention.get("outcome")
        if outcome is not None:
            saved = as_record(outcome)
            if (
                saved["idempotency_key"] != key
                or CompleteSessionRequest.model_validate(saved["request"]) != request
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
        intended_mode, strategy = mode_for_strategy(str(intervention["selected_strategy"]))
        mode = observed_completion_mode(intended_mode, request.input_method)
        event_id = stable_id(request.session_id, "complete", key)
        events = self.repository.list_events(child_id, session_id=request.session_id)
        completions = [event for event in events if event.event_type == EventType.MISSION_COMPLETED]
        existing = next((event for event in completions if event.id == event_id), None)
        if completions and (
            existing is None
            or not isinstance(existing.payload, MissionCompletedPayload)
            or existing.payload.correctness != request.correctness
            or existing.payload.input_method != request.input_method
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
                intended_mode=intended_mode,
                input_method=request.input_method,
                strategy=strategy,
            ),
        )
        self.repository.append_event(event, idempotency_key=event_id)
        # Keep completion in its actual timestamp/ID position. The audit includes
        # completion and every later event, so its final values match materialization
        # even with client clock skew or new events during partial-write recovery.
        update = self._replay(child_id, audit_from_event_id=event_id)
        self.repository.put_twin(child_id, update.twin)
        prediction = float(cast(float, intervention["predicted_success"]))
        response = CompleteSessionResponse(
            session_id=request.session_id,
            intervention_id=str(intervention["id"]),
            update=update,
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
