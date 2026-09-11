from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.domain.models import EventType, GenericEventPayload, LearnerTwin, LearningEvent
from app.repositories.protocols import RepositoryAccessError, RepositoryError

from .conftest import RepositoryPair


def new_id() -> str:
    return str(uuid4())


def create_child(repository_pair: RepositoryPair, *, parent: str = "a") -> str:
    child_id = new_id()
    repository = repository_pair.parent_a if parent == "a" else repository_pair.parent_b
    repository.create_child({"id": child_id, "display_name": f"Contract Child {parent}"})
    return child_id


def create_mission_and_session(
    repository_pair: RepositoryPair,
) -> tuple[str, str, str]:
    child_id = create_child(repository_pair)
    mission_id = new_id()
    session_id = new_id()
    repository_pair.parent_a.create_mission(
        {
            "id": mission_id,
            "child_id": child_id,
            "objective": "identify-three-quarters",
            "title": "Contract Fractions",
        }
    )
    repository_pair.parent_a.create_session(
        {
            "id": session_id,
            "child_id": child_id,
            "mission_id": mission_id,
            "status": "active",
        }
    )
    return child_id, mission_id, session_id


def learning_event(event_id: str, child_id: str, session_id: str) -> LearningEvent:
    return LearningEvent(
        id=event_id,
        child_id=child_id,
        session_id=session_id,
        occurred_at=datetime(2026, 9, 11, 8, tzinfo=UTC),
        event_type=EventType.SESSION_STARTED,
        payload=GenericEventPayload(kind="session_started"),
    )


def test_owned_twin_round_trip_and_cross_parent_isolation(
    repository_pair: RepositoryPair,
) -> None:
    child_id = str(uuid4())
    twin = LearnerTwin(mastery={"fractions": 0.45})

    repository_pair.parent_a.create_child({"id": child_id, "display_name": "Contract Child"})
    assert repository_pair.parent_a.get_child(child_id) is not None
    assert repository_pair.parent_b.get_child(child_id) is None
    assert repository_pair.parent_a.put_twin(child_id, twin) == twin
    assert repository_pair.parent_a.get_twin(child_id) == twin
    assert repository_pair.parent_b.get_twin(child_id) is None
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.put_twin(child_id, twin)


def test_children_are_created_listed_and_isolated(repository_pair: RepositoryPair) -> None:
    child_id = create_child(repository_pair)

    owned_ids = {str(child["id"]) for child in repository_pair.parent_a.list_children()}
    assert child_id in owned_ids
    assert repository_pair.parent_a.get_child(child_id) is not None
    assert repository_pair.parent_b.get_child(child_id) is None
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.create_child(
            {"id": new_id(), "parent_id": repository_pair.parent_a.owner_id, "display_name": "No"}
        )


def test_missions_and_sessions_round_trip_and_reject_cross_child_links(
    repository_pair: RepositoryPair,
) -> None:
    child_id, mission_id, session_id = create_mission_and_session(repository_pair)
    other_child_id = create_child(repository_pair, parent="b")

    assert repository_pair.parent_a.get_mission(mission_id)["child_id"] == child_id
    assert mission_id in {
        str(mission["id"]) for mission in repository_pair.parent_a.list_missions(child_id)
    }
    assert repository_pair.parent_b.get_mission(mission_id) is None
    assert repository_pair.parent_b.list_missions(child_id) == []

    updated = repository_pair.parent_a.update_session(session_id, {"status": "completed"})
    assert updated["status"] == "completed"
    assert repository_pair.parent_a.get_session(session_id)["child_id"] == child_id
    assert repository_pair.parent_b.get_session(session_id) is None
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.update_session(session_id, {"status": "abandoned"})
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.create_session(
            {
                "id": new_id(),
                "child_id": other_child_id,
                "mission_id": mission_id,
                "status": "active",
            }
        )
    second_owned_child_id = create_child(repository_pair)
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_a.create_session(
            {
                "id": new_id(),
                "child_id": second_owned_child_id,
                "mission_id": mission_id,
                "status": "active",
            }
        )


def test_events_are_append_only_idempotent_and_session_scoped(
    repository_pair: RepositoryPair,
) -> None:
    child_id, mission_id, session_id = create_mission_and_session(repository_pair)
    second_session_id = new_id()
    repository_pair.parent_a.create_session(
        {
            "id": second_session_id,
            "child_id": child_id,
            "mission_id": mission_id,
            "status": "active",
        }
    )
    first = learning_event(new_id(), child_id, session_id)
    second = learning_event(new_id(), child_id, second_session_id)

    assert repository_pair.parent_a.append_event(first, idempotency_key="shared-key") == first
    assert repository_pair.parent_a.append_event(first, idempotency_key="shared-key") == first
    with pytest.raises(RepositoryError):
        repository_pair.parent_a.append_event(
            first.model_copy(update={"id": new_id()}), idempotency_key="shared-key"
        )
    assert repository_pair.parent_a.append_event(second, idempotency_key="shared-key") == second
    assert {item.id for item in repository_pair.parent_a.list_events(child_id)} == {
        first.id,
        second.id,
    }
    assert repository_pair.parent_a.list_events(child_id, session_id=session_id) == [first]
    assert repository_pair.parent_b.list_events(child_id) == []

    other_child_id = create_child(repository_pair, parent="b")
    cross_event = learning_event(new_id(), other_child_id, session_id)
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.append_event(cross_event, idempotency_key="cross-session")


def test_interventions_settings_and_check_ins_share_one_contract(
    repository_pair: RepositoryPair,
) -> None:
    child_id, _, session_id = create_mission_and_session(repository_pair)
    intervention_id = new_id()
    intervention = repository_pair.parent_a.create_intervention(
        {
            "id": intervention_id,
            "child_id": child_id,
            "session_id": session_id,
            "selected_strategy": "visual_hint",
            "status": "selected",
        }
    )
    assert intervention["selected_strategy"] == "visual_hint"
    assert (
        repository_pair.parent_a.update_intervention(intervention_id, {"status": "presented"})[
            "status"
        ]
        == "presented"
    )
    assert intervention_id in {
        str(item["id"]) for item in repository_pair.parent_a.list_interventions(child_id)
    }
    assert repository_pair.parent_b.list_interventions(child_id) == []
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.update_intervention(intervention_id, {"status": "dismissed"})

    settings = repository_pair.parent_a.put_settings(
        {"break_interval_minutes": 25, "gesture_enabled": True}
    )
    assert settings["parent_id"] == repository_pair.parent_a.owner_id
    assert repository_pair.parent_a.get_settings()["break_interval_minutes"] == 25
    repository_pair.parent_b.put_settings({"break_interval_minutes": 35})
    assert repository_pair.parent_b.get_settings()["break_interval_minutes"] == 35
    assert repository_pair.parent_a.get_settings()["break_interval_minutes"] == 25

    check_in_id = new_id()
    check_in = repository_pair.parent_a.add_check_in(
        {
            "id": check_in_id,
            "child_id": child_id,
            "difficulty": 0.6,
            "note": "Needed one reminder",
        }
    )
    assert check_in["parent_id"] == repository_pair.parent_a.owner_id
    assert check_in_id in {
        str(item["id"]) for item in repository_pair.parent_a.list_check_ins(child_id)
    }
    assert repository_pair.parent_b.list_check_ins(child_id) == []
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.add_check_in(
            {"id": new_id(), "child_id": child_id, "difficulty": 0.5}
        )


def test_cross_parent_intervention_rejects_a_foreign_session(
    repository_pair: RepositoryPair,
) -> None:
    _, _, session_id = create_mission_and_session(repository_pair)
    other_child_id = create_child(repository_pair, parent="b")

    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_b.create_intervention(
            {
                "id": new_id(),
                "child_id": other_child_id,
                "session_id": session_id,
                "selected_strategy": "choice",
                "status": "selected",
            }
        )
    second_owned_child_id = create_child(repository_pair)
    with pytest.raises(RepositoryAccessError):
        repository_pair.parent_a.create_intervention(
            {
                "id": new_id(),
                "child_id": second_owned_child_id,
                "session_id": session_id,
                "selected_strategy": "choice",
                "status": "selected",
            }
        )
