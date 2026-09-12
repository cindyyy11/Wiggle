"""ParentService.insights: today's counts and the week-over-week summary."""

from datetime import UTC, datetime, timedelta

from app.domain.models import (
    EventType,
    GenericEventPayload,
    LearnerTwin,
    LearningEvent,
    MissionCompletedPayload,
    ModalityEffectiveness,
)
from app.domain.twin import update_twin
from app.providers.local import LocalAIProvider
from app.repositories.memory import MemoryRepository
from app.services.parent import ParentService
from app.services.sessions import SessionService

CHILD_ID = "child-1"
OBJECTIVE = "identify-three-quarters"


def _seed() -> tuple[MemoryRepository, str]:
    repository = MemoryRepository("owner-1")
    repository.create_child({"id": CHILD_ID, "display_name": "Maya"})
    mission = repository.create_mission(
        {"id": "mission-1", "child_id": CHILD_ID, "objective": OBJECTIVE, "title": "Pizza"}
    )
    old_session = repository.create_session(
        {
            "id": "session-old", "child_id": CHILD_ID,
            "mission_id": mission["id"], "status": "completed",
        }
    )
    new_session = repository.create_session(
        {
            "id": "session-new", "child_id": CHILD_ID,
            "mission_id": mission["id"], "status": "completed",
        }
    )
    initial_twin = LearnerTwin()
    repository.create_intervention(
        {
            "id": "intervention-old",
            "child_id": CHILD_ID,
            "session_id": old_session["id"],
            "status": "completed",
            "selected_strategy": "standard",
            "actual_success": 0.5,
            "simulation_snapshot": {
                "initial_twin": initial_twin.model_dump(mode="json"),
                "excluded_event_ids": [],
            },
        }
    )
    repository.create_intervention(
        {
            "id": "intervention-new",
            "child_id": CHILD_ID,
            "session_id": new_session["id"],
            "status": "completed",
            "selected_strategy": "visual_gesture",
            "actual_success": 0.9,
            "simulation_snapshot": {},
        }
    )
    now = datetime.now(UTC)
    ten_days_ago = now - timedelta(days=10)
    events = [
        LearningEvent(
            id="old-hint", child_id=CHILD_ID, session_id=old_session["id"],
            occurred_at=ten_days_ago, event_type=EventType.HINT_REQUESTED,
            payload=GenericEventPayload(kind="hint_requested"),
        ),
        LearningEvent(
            id="old-complete", child_id=CHILD_ID, session_id=old_session["id"],
            occurred_at=ten_days_ago, event_type=EventType.MISSION_COMPLETED,
            payload=MissionCompletedPayload(objective=OBJECTIVE, correctness=0.5, mode="standard"),
        ),
        LearningEvent(
            id="new-complete", child_id=CHILD_ID, session_id=new_session["id"],
            occurred_at=now, event_type=EventType.MISSION_COMPLETED,
            payload=MissionCompletedPayload(
                objective=OBJECTIVE, correctness=0.9, mode="visual_gesture"
            ),
        ),
    ]
    twin = initial_twin
    for index, event in enumerate(events):
        repository.append_event(event, idempotency_key=f"seed-{index}")
        twin = update_twin(twin, [event]).twin
    repository.put_twin(CHILD_ID, twin)
    return repository, CHILD_ID


def test_today_summary_only_counts_todays_events() -> None:
    repository, child_id = _seed()
    service = ParentService(SessionService(repository, LocalAIProvider()))
    insights = service.insights(child_id)
    assert insights.today.missions_completed == 1
    assert insights.today.independent_missions == 1
    assert insights.today.help_requests == 0


def test_weekly_summary_compares_the_last_week_against_earlier_history() -> None:
    repository, child_id = _seed()
    service = ParentService(SessionService(repository, LocalAIProvider()))
    insights = service.insights(child_id)
    summary = insights.weekly_summary
    assert summary is not None
    # Earlier week: 0 of 1 missions were independent (a hint was requested). Recent week: 1 of 1.
    assert summary.independent_completion_delta == 1.0
    assert summary.mastery_delta_by_subject[OBJECTIVE] > 0
    assert summary.child_name == "Maya"
    assert "trusted adult" not in summary.wiggle_noticed.lower()


def test_weekly_summary_is_absent_without_history_on_both_sides_of_the_window() -> None:
    repository = MemoryRepository("owner-2")
    repository.create_child({"id": "child-2", "display_name": "Nova"})
    mission = repository.create_mission(
        {"id": "mission-2", "child_id": "child-2", "objective": OBJECTIVE, "title": "Pizza"}
    )
    session = repository.create_session(
        {
            "id": "session-2", "child_id": "child-2",
            "mission_id": mission["id"], "status": "completed",
        }
    )
    repository.create_intervention(
        {
            "id": "intervention-2",
            "child_id": "child-2",
            "session_id": session["id"],
            "status": "completed",
            "selected_strategy": "standard",
            "actual_success": 0.7,
            "simulation_snapshot": {
                "initial_twin": LearnerTwin(
                    modality_effectiveness=ModalityEffectiveness(visual=0.5)
                ).model_dump(mode="json"),
                "excluded_event_ids": [],
            },
        }
    )
    event = LearningEvent(
        id="only-complete", child_id="child-2", session_id=session["id"],
        occurred_at=datetime.now(UTC), event_type=EventType.MISSION_COMPLETED,
        payload=MissionCompletedPayload(objective=OBJECTIVE, correctness=0.7, mode="standard"),
    )
    repository.append_event(event, idempotency_key="only")
    repository.put_twin("child-2", update_twin(LearnerTwin(), [event]).twin)
    service = ParentService(SessionService(repository, LocalAIProvider()))
    insights = service.insights("child-2")
    assert insights.weekly_summary is None
