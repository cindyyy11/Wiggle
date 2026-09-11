from collections.abc import Callable

from fastapi.testclient import TestClient

from app.main import create_app


def test_complete_hero_loop_and_retries(unlock_parent: Callable[[TestClient], None]) -> None:
    client = TestClient(create_app())
    unlock_parent(client)
    start_body = {"childId": "10000000-0000-0000-0000-000000000011"}
    start = client.post("/session/start", json=start_body, headers={"Idempotency-Key": "start"})
    assert start.status_code == 200, start.text
    assert (
        client.post("/session/start", json=start_body, headers={"Idempotency-Key": "start"}).json()
        == start.json()
    )
    session = start.json()["sessionId"]
    child = start_body["childId"]
    before = client.get(f"/twin/{child}").json()["twin"]
    events = [
        {
            "id": "10000000-0000-0000-0000-000000000991",
            "childId": child,
            "sessionId": session,
            "occurredAt": "2026-09-11T12:00:01Z",
            "type": "task_started",
            "payload": {"kind": "task_started"},
        },
        {
            "id": "10000000-0000-0000-0000-000000000992",
            "childId": child,
            "sessionId": session,
            "occurredAt": "2026-09-11T12:00:20Z",
            "type": "stuck_requested",
            "payload": {"kind": "stuck_requested"},
        },
    ]
    for _ in range(2):
        response = client.post("/events", json={"events": events})
        assert response.status_code == 200, response.text
    twin = client.get(f"/twin/{child}").json()["twin"]
    assert twin["persistenceFriction"] == before["persistenceFriction"] + 0.2 * (
        1 - before["persistenceFriction"]
    )
    simulation = client.post("/twin/simulate", json={"sessionId": session})
    assert simulation.status_code == 200, simulation.text
    strategy = simulation.json()["recommendedStrategy"]
    assert strategy == "visual_gesture"
    selection = client.post(
        "/adaptation/select",
        json={"sessionId": session, "strategy": strategy},
        headers={"Idempotency-Key": "select"},
    )
    assert selection.status_code == 200, selection.text
    body = {"sessionId": session, "correctness": 0.92}
    completion = client.post(
        "/session/complete", json=body, headers={"Idempotency-Key": "complete"}
    )
    assert completion.status_code == 200, completion.text
    assert (
        client.post("/session/complete", json=body, headers={"Idempotency-Key": "complete"}).json()
        == completion.json()
    )
    final = completion.json()["update"]["twin"]
    objective = start.json()["objective"]
    assert final["mastery"][objective] > twin["mastery"][objective]
    assert final["modalityEffectiveness"]["visual"] > twin["modalityEffectiveness"]["visual"]
    assert completion.json()["predictionError"] == 0.92 - selection.json()["predictedSuccess"]
    assert completion.json()["update"]["changes"]
    insight = client.get("/parent/insights", params={"child_id": child})
    assert insight.status_code == 200, insight.text
    assert insight.json()["completedMissions"] == 1
    assert insight.json()["masteryHistory"] == [
        {"label": "Mission 1", "value": final["mastery"][objective]}
    ]
    assert insight.json()["independenceHistory"] == [{"label": "Mission 1", "value": 0}]
    assert "slice" in insight.json()["insight"]["text"].lower()


def test_errors_are_structured_and_child_safe() -> None:
    client = TestClient(create_app())
    response = client.post("/session/complete", json={"sessionId": "x", "correctness": 92})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert "message" in response.json()["error"]
    assert client.get("/twin/not-owned").status_code == 404
