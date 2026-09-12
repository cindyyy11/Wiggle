from collections.abc import Mapping
from decimal import ROUND_HALF_UP, Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.demo import DEMO_CHILD_ID, DEMO_PARENT_ID, seed_demo
from app.domain.models import LearnerTwin, MissionCompletedPayload
from app.main import create_app
from app.repositories.memory import MemoryRepository
from app.repositories.protocols import Record, RepositoryError


def start(client: TestClient) -> str:
    response = client.post(
        "/session/start", json={"childId": DEMO_CHILD_ID}, headers={"Idempotency-Key": "start"}
    )
    assert response.status_code == 200, response.text
    return response.json()["sessionId"]


def event(session: str, kind: str) -> dict[str, object]:
    return {
        "id": str(uuid4()),
        "childId": DEMO_CHILD_ID,
        "sessionId": session,
        "occurredAt": "2026-09-12T12:00:00Z",
        "type": kind,
        "payload": {"kind": kind},
    }


@pytest.mark.parametrize("strategy", ["gesture", "visual_gesture"])
@pytest.mark.parametrize("input_method", [None, "buttons", "gesture"])
def test_completion_credits_observed_input_and_replays_once(
    strategy: str, input_method: str | None
) -> None:
    repository = MemoryRepository(DEMO_PARENT_ID)
    seed_demo(repository)
    client = TestClient(create_app(repository=repository))
    session = start(client)
    baseline = client.get(f"/twin/{DEMO_CHILD_ID}").json()["twin"]
    selection = client.post(
        "/adaptation/select",
        json={"sessionId": session, "strategy": strategy},
        headers={"Idempotency-Key": "select"},
    )
    assert selection.status_code == 200, selection.text
    body = {"sessionId": session, "correctness": 0.92}
    if input_method is not None:
        body["inputMethod"] = input_method
    response = client.post("/session/complete", json=body, headers={"Idempotency-Key": "done"})
    assert response.status_code == 200, response.text
    final = response.json()["update"]["twin"]
    gesture_used = input_method == "gesture"
    if gesture_used:
        assert (
            final["modalityEffectiveness"]["gesture"] > baseline["modalityEffectiveness"]["gesture"]
        )
    else:
        assert (
            final["modalityEffectiveness"]["gesture"]
            == baseline["modalityEffectiveness"]["gesture"]
        )
        assert (
            final["modalityEffectiveness"]["visual"] > baseline["modalityEffectiveness"]["visual"]
        )
        assert not any(
            change["field"] == "modality_effectiveness.gesture"
            for change in response.json()["update"]["changes"]
        )
    payload = next(
        row.payload
        for row in repository.list_events(DEMO_CHILD_ID)
        if isinstance(row.payload, MissionCompletedPayload)
    )
    assert payload.intended_mode == strategy
    assert payload.mode == (strategy if gesture_used else "visual")
    assert payload.input_method == (input_method or "buttons")
    restarted = TestClient(create_app(repository=repository))
    assert restarted.get(f"/twin/{DEMO_CHILD_ID}").json()["twin"] == final
    retry = restarted.post("/session/complete", json=body, headers={"Idempotency-Key": "done"})
    assert retry.status_code == 200, retry.text
    assert retry.json() == response.json()
    assert (
        len(
            [
                row
                for row in repository.list_events(DEMO_CHILD_ID)
                if isinstance(row.payload, MissionCompletedPayload)
            ]
        )
        == 1
    )
    body["inputMethod"] = "buttons" if gesture_used else "gesture"
    assert (
        restarted.post(
            "/session/complete", json=body, headers={"Idempotency-Key": "done"}
        ).status_code
        == 409
    )


def test_completion_input_is_a_bounded_contract() -> None:
    client = TestClient(create_app())
    session = start(client)
    response = client.post(
        "/session/complete",
        json={"sessionId": session, "correctness": 0.92, "inputMethod": "camera-enabled"},
        headers={"Idempotency-Key": "done"},
    )
    assert response.status_code == 422


class RoundedPredictionRepository(MemoryRepository):
    """Exercise the scalar persistence behavior of Postgres numeric(4,3)."""

    def create_intervention(self, intervention: Mapping[str, object]) -> Record:
        row = dict(intervention)
        row["predicted_success"] = float(
            Decimal(str(row["predicted_success"])).quantize(Decimal(".001"), rounding=ROUND_HALF_UP)
        )
        return super().create_intervention(row)


@pytest.mark.parametrize("repository_type", [MemoryRepository, RoundedPredictionRepository])
def test_prediction_precision_matches_simulation_selection_storage_and_completion(
    repository_type: type[MemoryRepository],
) -> None:
    repository = repository_type(DEMO_PARENT_ID)
    seed_demo(repository)
    repository.put_twin(
        DEMO_CHILD_ID,
        LearnerTwin(mastery={"identify-three-quarters": 0.6137}, persistence_friction=0.7432),
    )
    client = TestClient(create_app(repository=repository))
    session = start(client)
    report = client.post("/twin/simulate", json={"sessionId": session}).json()
    for prediction in report["ranked"]:
        assert Decimal(str(prediction["predictedSuccess"])).as_tuple().exponent >= -3
    standard = next(row for row in report["ranked"] if row["strategy"] == "standard")
    assert (
        repository.list_interventions(DEMO_CHILD_ID)[0]["predicted_success"]
        == standard["predictedSuccess"]
    )
    body = {"sessionId": session, "strategy": "visual_gesture"}
    selected = client.post("/adaptation/select", json=body, headers={"Idempotency-Key": "select"})
    assert selected.status_code == 200, selected.text
    predicted = next(row for row in report["ranked"] if row["strategy"] == "visual_gesture")
    scalar = predicted["predictedSuccess"]
    assert selected.json()["predictedSuccess"] == scalar
    assert repository.list_interventions(DEMO_CHILD_ID)[-1]["predicted_success"] == scalar
    restarted = TestClient(create_app(repository=repository))
    assert (
        restarted.post(
            "/adaptation/select", json=body, headers={"Idempotency-Key": "select"}
        ).json()
        == selected.json()
    )
    completed = restarted.post(
        "/session/complete",
        json={"sessionId": session, "correctness": 0.92},
        headers={"Idempotency-Key": "done"},
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["predictedSuccess"] == scalar
    assert completed.json()["predictionError"] == 0.92 - scalar


@pytest.mark.parametrize("fail_status_write", [False, True])
def test_abandonment_closes_session_and_recovers_after_partial_write(
    fail_status_write: bool,
) -> None:
    class FailingRepository(MemoryRepository):
        armed = False

        def update_session(self, session_id: str, changes: Mapping[str, object]) -> Record:
            if self.armed:
                self.armed = False
                raise RepositoryError("temporary failure")
            return super().update_session(session_id, changes)

    repository = FailingRepository(DEMO_PARENT_ID)
    seed_demo(repository)
    client = TestClient(create_app(repository=repository))
    session = start(client)
    selection = {"sessionId": session, "strategy": "visual"}
    assert (
        client.post(
            "/adaptation/select", json=selection, headers={"Idempotency-Key": "select"}
        ).status_code
        == 200
    )
    abandoned = event(session, "mission_abandoned")
    repository.armed = fail_status_write
    response = client.post("/events", json={"events": [abandoned]})
    assert response.status_code == (503 if fail_status_write else 200), response.text
    assert repository.get_session(session)["status"] == (
        "active" if fail_status_write else "abandoned"
    )
    restarted = TestClient(create_app(repository=repository))
    # A new operation must reconcile the durable abandonment even before its retry arrives.
    assert (
        restarted.post(
            "/adaptation/select", json=selection, headers={"Idempotency-Key": "select"}
        ).status_code
        == 409
    )
    assert repository.get_session(session)["status"] == "abandoned"
    for _ in range(2):
        retry = restarted.post("/events", json={"events": [abandoned, abandoned]})
        assert retry.status_code == 200, retry.text
        assert retry.json()["acceptedEventIds"] == [abandoned["id"], abandoned["id"]]
    assert (
        len(
            [
                row
                for row in repository.list_events(DEMO_CHILD_ID)
                if row.payload.kind == "mission_abandoned"
            ]
        )
        == 1
    )
    assert (
        restarted.post(
            "/session/complete",
            json={"sessionId": session, "correctness": 0.92},
            headers={"Idempotency-Key": "done"},
        ).status_code
        == 409
    )
    assert (
        restarted.post(
            "/lexi/chat", json={"sessionId": session, "tool": "create_reality_mission"}
        ).status_code
        == 409
    )
    for kind in ["task_started", "reality_mission_started"]:
        assert restarted.post("/events", json={"events": [event(session, kind)]}).status_code == 409


def test_batch_cannot_add_new_activity_after_abandonment() -> None:
    app = create_app()
    client = TestClient(app)
    session = start(client)
    before = app.state.repository.list_events(DEMO_CHILD_ID)
    response = client.post(
        "/events",
        json={"events": [event(session, "mission_abandoned"), event(session, "task_started")]},
    )
    assert response.status_code == 409
    assert app.state.repository.get_session(session)["status"] == "active"
    assert app.state.repository.list_events(DEMO_CHILD_ID) == before


def test_post_completion_reality_lifecycle_preserves_outcome_and_twin() -> None:
    app = create_app()
    client = TestClient(app)
    session = start(client)
    body = {"sessionId": session, "correctness": 0.92}
    completion = client.post("/session/complete", json=body, headers={"Idempotency-Key": "done"})
    assert completion.status_code == 200, completion.text
    baseline = app.state.repository.list_interventions(DEMO_CHILD_ID)
    twin = client.get(f"/twin/{DEMO_CHILD_ID}").json()
    assert (
        client.post(
            "/lexi/chat", json={"sessionId": session, "tool": "create_reality_mission"}
        ).status_code
        == 200
    )
    reality_start = event(session, "reality_mission_started")
    reality_finish = event(session, "reality_mission_completed")
    assert client.post("/events", json={"events": [reality_finish]}).status_code == 409
    assert client.post("/events", json={"events": [reality_start]}).status_code == 200
    assert (
        client.post(
            "/events", json={"events": [event(session, "reality_mission_started")]}
        ).status_code
        == 409
    )
    for batch in [
        [reality_start, reality_finish],
        [reality_finish],
        [reality_start, reality_finish],
    ]:
        response = client.post("/events", json={"events": batch})
        assert response.status_code == 200, response.text
    assert (
        client.post(
            "/events", json={"events": [event(session, "reality_mission_completed")]}
        ).status_code
        == 409
    )
    assert (
        client.post("/events", json={"events": [event(session, "stuck_requested")]}).status_code
        == 409
    )
    assert client.get(f"/twin/{DEMO_CHILD_ID}").json() == twin
    assert app.state.repository.list_interventions(DEMO_CHILD_ID) == baseline
    assert app.state.repository.get_session(session)["status"] == "completed"
    assert (
        client.post("/session/complete", json=body, headers={"Idempotency-Key": "done"}).json()
        == completion.json()
    )
    assert (
        len(
            [
                row
                for row in app.state.repository.list_events(DEMO_CHILD_ID)
                if row.payload.kind in {"reality_mission_started", "reality_mission_completed"}
            ]
        )
        == 2
    )
