from datetime import UTC, datetime, timedelta
from typing import cast

from app.domain.models import LearnerTwin, LearningEvent
from app.domain.twin import update_twin
from app.providers.base import ProviderContext
from app.schemas import (
    CheckInRequest,
    CheckInResponse,
    ParentInsightsResponse,
    ParentMission,
    ProgressPoint,
    TodaySummary,
    WeeklySummary,
)
from app.services.adaptation import mode_for_strategy
from app.services.sessions import SessionService, WorkflowError, as_record, stable_id

_HELP_KINDS = ("hint_requested", "stuck_requested")
_WEEK = timedelta(days=7)
_MODALITY_LABELS = {
    "visual": "Visual", "voice": "Voice", "gesture": "Gesture",
    "movement": "Movement", "story": "Stories", "text": "Reading",
}
_STRATEGY_LABELS = {
    "chunking": "Small steps", "movement_break": "Movement breaks",
    "visual_hint": "Picture hints", "voice_hint": "Spoken hints", "choice": "Choice of activities",
}
_IMPROVEMENT_LABELS = {
    "initiation_friction": "Task initiation",
    "persistence_friction": "Sticking with a task",
    "cognitive_load": "Handling harder ideas",
    "transition_friction": "Switching activities",
    "fatigue_estimate": "Energy during missions",
}
_EFFECTIVE_LABEL_THRESHOLD = 0.6
_IMPROVEMENT_THRESHOLD = 0.03


def _today_summary(events: list[LearningEvent]) -> TodaySummary:
    today = datetime.now(UTC).date()
    todays = [event for event in events if event.occurred_at.astimezone(UTC).date() == today]
    helped_sessions = {event.session_id for event in todays if event.payload.kind in _HELP_KINDS}
    completed = [event for event in todays if event.payload.kind == "mission_completed"]
    spans: dict[str, list[datetime]] = {}
    for event in todays:
        spans.setdefault(event.session_id, []).append(event.occurred_at)
    learning_ms = sum(
        (max(times) - min(times)).total_seconds() * 1000 for times in spans.values()
    )
    offline_ms = sum(
        getattr(event.payload, "response_time_ms", None) or 0
        for event in todays
        if event.payload.kind == "reality_mission_completed"
    )
    return TodaySummary(
        missions_completed=len(completed),
        independent_missions=sum(
            1 for event in completed if event.session_id not in helped_sessions
        ),
        help_requests=sum(1 for event in todays if event.payload.kind in _HELP_KINDS),
        reset_breaks=sum(1 for event in todays if event.payload.kind == "reset_completed"),
        learning_minutes=round(learning_ms / 60000),
        offline_minutes=round(offline_ms / 60000),
    )


def _independent_rate(events: list[LearningEvent]) -> float | None:
    completed = [event for event in events if event.payload.kind == "mission_completed"]
    if not completed:
        return None
    helped_sessions = {event.session_id for event in events if event.payload.kind in _HELP_KINDS}
    independent = sum(1 for event in completed if event.session_id not in helped_sessions)
    return independent / len(completed)


def _top_label(twin: LearnerTwin) -> str | None:
    modality = twin.modality_effectiveness.model_dump()
    strategy = twin.strategy_effectiveness.model_dump()
    candidates = {
        **{
            _MODALITY_LABELS[key]: value
            for key, value in modality.items()
            if key in _MODALITY_LABELS
        },
        **{
            _STRATEGY_LABELS[key]: value
            for key, value in strategy.items()
            if key in _STRATEGY_LABELS
        },
    }
    best = max(candidates.items(), key=lambda item: item[1], default=None)
    return best[0] if best and best[1] >= _EFFECTIVE_LABEL_THRESHOLD else None


def _biggest_improvement(baseline: LearnerTwin, current: LearnerTwin) -> str | None:
    deltas = {
        field: getattr(baseline, field) - getattr(current, field) for field in _IMPROVEMENT_LABELS
    }
    field, delta = max(deltas.items(), key=lambda item: item[1])
    return _IMPROVEMENT_LABELS[field] if delta >= _IMPROVEMENT_THRESHOLD else None


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
        weekly_summary: WeeklySummary | None = None
        anchors = [
            as_record(row["simulation_snapshot"])
            for row in self.sessions.repository.list_interventions(child_id)
            if "initial_twin" in as_record(row["simulation_snapshot"])
        ]
        if anchors:
            anchor = anchors[0]
            initial_twin = LearnerTwin.model_validate(anchor["initial_twin"])
            baseline = initial_twin
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
            weekly_summary = self._weekly_summary(child_id, initial_twin, events, twin)
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
            today=_today_summary(self.sessions.repository.list_events(child_id)),
            weekly_summary=weekly_summary,
        )

    def _weekly_summary(
        self,
        child_id: str,
        initial_twin: LearnerTwin,
        events: list[LearningEvent],
        current: LearnerTwin,
    ) -> WeeklySummary | None:
        cutoff = datetime.now(UTC) - _WEEK
        earlier = [event for event in events if event.occurred_at < cutoff]
        recent = [event for event in events if event.occurred_at >= cutoff]
        earlier_rate = _independent_rate(earlier)
        recent_rate = _independent_rate(recent)
        if earlier_rate is None or recent_rate is None:
            return None
        week_baseline = initial_twin
        for event in earlier:
            week_baseline = update_twin(week_baseline, [event]).twin
        mastery_delta = {
            objective: round(current.mastery.get(objective, 0) - value, 3)
            for objective, value in week_baseline.mastery.items()
        }
        biggest_improvement = _biggest_improvement(week_baseline, current)
        most_effective = _top_label(current)
        child = self.sessions.repository.get_child(child_id) or {}
        child_name = str(child.get("display_name") or "Your explorer")
        independence_delta = round(recent_rate - earlier_rate, 3)
        narrative = self.sessions.provider.generate_weekly_summary(
            ProviderContext(
                child_name=child_name,
                mastery_delta=max(mastery_delta.values(), default=0.0),
                independence_delta=independence_delta,
                most_effective_strategy=most_effective,
                biggest_improvement=biggest_improvement,
            )
        )
        return WeeklySummary(
            child_name=child_name,
            mastery_delta_by_subject=mastery_delta,
            independent_completion_delta=independence_delta,
            most_effective_strategy=most_effective,
            biggest_improvement=biggest_improvement,
            wiggle_noticed=narrative.wiggle_noticed,
            parent_suggestion=narrative.parent_suggestion,
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
