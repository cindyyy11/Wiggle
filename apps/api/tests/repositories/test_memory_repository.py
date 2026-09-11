from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.domain.models import EventType, GenericEventPayload, LearnerTwin, LearningEvent
from app.repositories.memory import MemoryRepository, MemoryStore
from app.repositories.protocols import RepositoryAccessError, RepositoryError, WiggleRepository
from app.repositories.supabase import RepositorySettings, repository_from_env

PARENT_A = "10000000-0000-0000-0000-000000000001"
PARENT_B = "20000000-0000-0000-0000-000000000002"
CHILD_A = "10000000-0000-0000-0000-000000000011"
CHILD_B = "20000000-0000-0000-0000-000000000022"
MISSION_A = "10000000-0000-0000-0000-000000000111"
SESSION_A = "10000000-0000-0000-0000-000000001111"


@pytest.fixture
def repositories() -> tuple[MemoryRepository, MemoryRepository]:
    store = MemoryStore()
    return MemoryRepository(PARENT_A, store), MemoryRepository(PARENT_B, store)


def seed_session(repository: WiggleRepository) -> None:
    repository.create_child({"id": CHILD_A, "display_name": "Nova"})
    repository.create_mission(
        {
            "id": MISSION_A,
            "child_id": CHILD_A,
            "objective": "identify-three-quarters",
            "title": "Pizza Fractions",
        }
    )
    repository.create_session(
        {
            "id": SESSION_A,
            "child_id": CHILD_A,
            "mission_id": MISSION_A,
            "status": "active",
        }
    )


def test_memory_repository_satisfies_protocol() -> None:
    assert isinstance(MemoryRepository(PARENT_A), WiggleRepository)


def test_environment_defaults_to_memory_without_credentials() -> None:
    repository = repository_from_env(owner_id=PARENT_A, environ={})

    assert isinstance(repository, MemoryRepository)


def test_supabase_environment_requires_valid_public_credentials() -> None:
    with pytest.raises(ValidationError):
        RepositorySettings.from_env({"WIGGLE_REPOSITORY_BACKEND": "supabase"})

    with pytest.raises(ValidationError):
        RepositorySettings.from_env(
            {
                "WIGGLE_REPOSITORY_BACKEND": "supabase",
                "SUPABASE_URL": "not-a-url",
                "SUPABASE_ANON_KEY": "public-key",
            }
        )


def test_owned_rows_succeed_and_cross_parent_rows_are_hidden(
    repositories: tuple[MemoryRepository, MemoryRepository],
) -> None:
    parent_a, parent_b = repositories
    child = parent_a.create_child({"id": CHILD_A, "display_name": "Nova"})

    assert child["parent_id"] == PARENT_A
    assert parent_a.get_child(CHILD_A) == child
    assert parent_b.get_child(CHILD_A) is None
    with pytest.raises(RepositoryAccessError):
        parent_b.put_twin(CHILD_A, LearnerTwin())


def test_twin_round_trip_is_validated_and_detached(
    repositories: tuple[MemoryRepository, MemoryRepository],
) -> None:
    parent_a, _ = repositories
    parent_a.create_child({"id": CHILD_A, "display_name": "Nova"})
    twin = LearnerTwin(mastery={"fractions": 0.4}, cognitive_load=0.7)

    assert parent_a.put_twin(CHILD_A, twin) == twin
    assert parent_a.get_twin(CHILD_A) == twin


def test_event_append_is_idempotent_and_event_is_not_mutable(
    repositories: tuple[MemoryRepository, MemoryRepository],
) -> None:
    parent_a, _ = repositories
    seed_session(parent_a)
    event = LearningEvent(
        id="10000000-0000-0000-0000-000000011111",
        child_id=CHILD_A,
        session_id=SESSION_A,
        occurred_at=datetime(2026, 9, 11, 8, 0, tzinfo=UTC),
        event_type=EventType.SESSION_STARTED,
        payload=GenericEventPayload(kind="session_started"),
    )

    assert parent_a.append_event(event, idempotency_key="start-session-a") == event
    assert parent_a.append_event(event, idempotency_key="start-session-a") == event
    assert parent_a.list_events(CHILD_A) == [event]

    changed = event.model_copy(update={"id": "different"})
    with pytest.raises(RepositoryError):
        parent_a.append_event(changed, idempotency_key="start-session-a")


def test_session_requires_a_mission_for_the_same_child(
    repositories: tuple[MemoryRepository, MemoryRepository],
) -> None:
    parent_a, parent_b = repositories
    parent_a.create_child({"id": CHILD_A, "display_name": "Nova"})
    parent_b.create_child({"id": CHILD_B, "display_name": "Orbit"})
    parent_b.create_mission(
        {"id": MISSION_A, "child_id": CHILD_B, "objective": "fractions", "title": "Mission"}
    )

    with pytest.raises(RepositoryAccessError):
        parent_a.create_session(
            {"id": SESSION_A, "child_id": CHILD_A, "mission_id": MISSION_A, "status": "active"}
        )


def test_interventions_settings_and_check_ins_are_parent_scoped(
    repositories: tuple[MemoryRepository, MemoryRepository],
) -> None:
    parent_a, parent_b = repositories
    seed_session(parent_a)
    intervention = parent_a.create_intervention(
        {
            "id": "10000000-0000-0000-0000-000000111111",
            "child_id": CHILD_A,
            "session_id": SESSION_A,
            "selected_strategy": "visual_hint",
            "status": "selected",
        }
    )
    assert parent_a.list_interventions(CHILD_A) == [intervention]
    assert parent_b.list_interventions(CHILD_A) == []

    settings = parent_a.put_settings({"break_interval_minutes": 20})
    assert settings["parent_id"] == PARENT_A
    assert parent_b.get_settings() is None

    check_in = parent_a.add_check_in(
        {
            "id": "10000000-0000-0000-0000-000001111111",
            "child_id": CHILD_A,
            "difficulty": 0.6,
            "note": "Needed one reminder",
        }
    )
    assert parent_a.list_check_ins(CHILD_A) == [check_in]
