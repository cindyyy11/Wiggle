from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.domain.models import (
    LearnerTwin,
    LearningEvent,
    MissionCompletedPayload,
    ModalityEffectiveness,
    StuckRequestedPayload,
)
from app.domain.twin import update_twin


@pytest.fixture
def default_twin() -> LearnerTwin:
    return LearnerTwin(
        mastery={"fractions.three_quarters": 0.5},
        initiation_friction=0.5,
        persistence_friction=0.5,
        cognitive_load=0.5,
        transition_friction=0.5,
        fatigue_estimate=0.5,
        modality_effectiveness=ModalityEffectiveness(),
    )


@pytest.fixture
def event_factory():
    def make(event_type: str, **payload_values: object) -> LearningEvent:
        common = {
            "id": "event-1",
            "child_id": "child-1",
            "session_id": "session-1",
            "event_type": event_type,
            "occurred_at": datetime(2026, 9, 11, tzinfo=UTC),
        }
        if event_type == "stuck_requested":
            return LearningEvent(**common, payload=StuckRequestedPayload(**payload_values))
        if event_type == "mission_completed":
            return LearningEvent(
                **common,
                payload=MissionCompletedPayload(
                    objective="fractions.three_quarters", **payload_values
                ),
            )
        raise ValueError(f"Unsupported test event type: {event_type}")

    return make


def test_stuck_and_success_update_relevant_fields(default_twin, event_factory) -> None:
    result = update_twin(
        default_twin,
        [
            event_factory("stuck_requested"),
            event_factory("mission_completed", correctness=0.92, mode="visual_gesture"),
        ],
    )

    assert 0 <= result.twin.persistence_friction <= 1
    assert result.twin.modality_effectiveness.gesture > default_twin.modality_effectiveness.gesture
    assert {change.field for change in result.changes} >= {
        "persistence_friction",
        "modality_effectiveness.gesture",
    }
    assert default_twin.persistence_friction == 0.5
    assert default_twin.modality_effectiveness.gesture == 0.5


def test_event_payloads_are_discriminated_and_timestamps_must_be_utc() -> None:
    with pytest.raises(ValidationError, match="event_type must match payload.kind"):
        LearningEvent(
            id="event-1",
            child_id="child-1",
            session_id="session-1",
            event_type="stuck_requested",
            occurred_at=datetime(2026, 9, 11, tzinfo=UTC),
            payload=MissionCompletedPayload(
                objective="fractions.three_quarters", correctness=0.92, mode="visual_gesture"
            ),
        )

    with pytest.raises(ValidationError, match="UTC"):
        LearningEvent(
            id="event-1",
            child_id="child-1",
            session_id="session-1",
            event_type="stuck_requested",
            occurred_at=datetime(2026, 9, 11),
            payload=StuckRequestedPayload(),
        )


def test_event_wire_shape_uses_the_shared_typescript_aliases() -> None:
    event = LearningEvent.model_validate(
        {
            "id": "event-1",
            "childId": "child-1",
            "sessionId": "session-1",
            "occurredAt": "2026-09-11T00:00:00Z",
            "type": "stuck_requested",
            "payload": {"kind": "stuck_requested", "mode": "visual"},
        }
    )

    wire_event = event.model_dump(mode="json", by_alias=True)
    assert wire_event["type"] == "stuck_requested"
    assert wire_event["childId"] == "child-1"
    assert wire_event["occurredAt"] == "2026-09-11T00:00:00Z"


def test_updates_are_clamped_and_include_explainable_audit_values(
    default_twin, event_factory
) -> None:
    result = update_twin(
        default_twin,
        [event_factory("mission_completed", correctness=1.0, mode="visual_gesture")],
    )

    assert result.twin.mastery["fractions.three_quarters"] == pytest.approx(0.6)
    assert result.twin.modality_effectiveness.gesture == pytest.approx(0.6)
    change = next(
        change for change in result.changes if change.field == "modality_effectiveness.gesture"
    )
    assert change.previous_value == 0.5
    assert change.delta == pytest.approx(0.1)
    assert change.resulting_value == pytest.approx(0.6)
    assert "correctness=1.00" in change.evidence
