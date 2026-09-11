from collections.abc import Callable, Mapping
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.demo import DEMO_CHILD_ID, DEMO_PARENT_ID, seed_demo
from app.domain.models import LearnerTwin
from app.main import create_app
from app.providers.base import LexiContent, ProviderContext
from app.providers.local import LocalAIProvider
from app.repositories.memory import MemoryRepository
from app.repositories.protocols import Record, RepositoryError


def start(client: TestClient, key: str = "start") -> str:
    response = client.post(
        "/session/start", json={"childId": DEMO_CHILD_ID}, headers={"Idempotency-Key": key}
    )
    assert response.status_code == 200, response.text
    return response.json()["sessionId"]


def test_reality_mission_events_are_telemetry_not_main_completion() -> None:
    app = create_app()
    client = TestClient(app)
    session = start(client)
    before = client.get(f"/twin/{DEMO_CHILD_ID}").json()
    for kind in ["reality_mission_started", "reality_mission_completed"]:
        response = client.post("/events", json={"events": [{
            "id": kind,
            "childId": DEMO_CHILD_ID,
            "sessionId": session,
            "occurredAt": "2026-09-11T12:00:00Z",
            "type": kind,
            "payload": {"kind": kind, "mode": "movement"},
        }]})
        assert response.status_code == 200, response.text
    assert client.get(f"/twin/{DEMO_CHILD_ID}").json() == before
    assert not any(
        event.payload.kind == "mission_completed"
        for event in app.state.repository.list_events(DEMO_CHILD_ID)
    )


def test_lexi_tools_and_parent_check_in(unlock_parent: Callable[[TestClient], None]) -> None:
    app = create_app()
    client = TestClient(app)
    unlock_parent(client)
    session = start(client)
    for tool in [
        "get_current_twin",
        "get_current_mission",
        "request_hint",
        "create_reality_mission",
        "report_learning_friction",
        "start_reset_station",
        "record_self_report",
        "switch_learning_mode",
    ]:
        body = {"sessionId": session, "tool": tool}
        if tool == "record_self_report":
            body["difficulty"] = 0.8
        if tool == "switch_learning_mode":
            body["mode"] = "visual"
        response = client.post("/lexi/chat", json=body, headers={"Idempotency-Key": tool})
        assert response.status_code == 200, response.text
        assert response.json()["executedTool"] == tool
        assert (
            client.post("/lexi/chat", json=body, headers={"Idempotency-Key": tool}).status_code
            == 200
        )
    events = app.state.repository.list_events(DEMO_CHILD_ID)
    reports = [event for event in events if event.payload.kind == "difficulty_self_reported"]
    assert len(reports) == 1
    assert reports[0].payload.difficulty == 0.8
    before = client.get(f"/twin/{DEMO_CHILD_ID}").json()
    body = {"childId": DEMO_CHILD_ID, "difficulty": 0.7, "note": "A busy afternoon."}
    for _ in range(2):
        assert (
            client.post(
                "/parent/check-in", json=body, headers={"Idempotency-Key": "check"}
            ).status_code
            == 200
        )
    assert len(app.state.repository.list_check_ins(DEMO_CHILD_ID)) == 1
    assert client.get(f"/twin/{DEMO_CHILD_ID}").json() == before
    body["difficulty"] = 0.9
    assert (
        client.post("/parent/check-in", json=body, headers={"Idempotency-Key": "check"}).status_code
        == 409
    )


def test_ai_suggestions_do_not_execute_tools() -> None:
    class SuggestionProvider(LocalAIProvider):
        def chat_with_lexi(self, context: ProviderContext) -> LexiContent:
            return LexiContent(text="Try a tiny step.", suggested_tool="report_learning_friction")

    client = TestClient(create_app(provider=SuggestionProvider()))
    session = start(client)
    before = client.get(f"/twin/{DEMO_CHILD_ID}").json()
    reply = client.post("/lexi/chat", json={"sessionId": session, "message": "help"})
    assert reply.status_code == 200
    assert reply.json()["executedTool"] is None
    assert client.get(f"/twin/{DEMO_CHILD_ID}").json() == before


def test_conflicting_outcomes_and_closed_sessions_are_rejected() -> None:
    client = TestClient(create_app())
    session = start(client)
    body = {"sessionId": session, "correctness": 0.92}
    assert (
        client.post(
            "/session/complete", json=body, headers={"Idempotency-Key": "complete"}
        ).status_code
        == 200
    )
    body["correctness"] = 0.2
    assert (
        client.post(
            "/session/complete", json=body, headers={"Idempotency-Key": "complete"}
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/adaptation/select",
            json={"sessionId": session, "strategy": "visual"},
            headers={"Idempotency-Key": "late"},
        ).status_code
        == 409
    )


@pytest.mark.parametrize("failure", ["twin", "outcome", "session"])
def test_completion_recovers_after_partial_persistence_and_app_restart(failure: str) -> None:
    class FailingRepository(MemoryRepository):
        armed = False

        def fail(self, target: str) -> None:
            if self.armed and target == failure:
                self.armed = False
                raise RepositoryError("temporary failure")

        def put_twin(
            self, child_id: str, twin: LearnerTwin, *, schema_version: int = 1
        ) -> LearnerTwin:
            self.fail("twin")
            return super().put_twin(child_id, twin, schema_version=schema_version)

        def update_intervention(
            self, intervention_id: str, changes: Mapping[str, object]
        ) -> Record:
            self.fail("outcome")
            return super().update_intervention(intervention_id, changes)

        def update_session(self, session_id: str, changes: Mapping[str, object]) -> Record:
            self.fail("session")
            return super().update_session(session_id, changes)

    repository = FailingRepository(DEMO_PARENT_ID)
    seed_demo(repository)
    client = TestClient(create_app(repository=repository))
    session = start(client)
    repository.armed = True
    body = {"sessionId": session, "correctness": 0.92}
    assert (
        client.post(
            "/session/complete", json=body, headers={"Idempotency-Key": "complete"}
        ).status_code
        == 503
    )
    restarted = TestClient(create_app(repository=repository))
    completed = restarted.post(
        "/session/complete", json=body, headers={"Idempotency-Key": "complete"}
    )
    assert completed.status_code == 200, completed.text
    assert completed.json()["update"]["twin"]["mastery"][
        "identify-three-quarters"
    ] == pytest.approx(0.504)
    assert (
        len(
            [
                event
                for event in repository.list_events(DEMO_CHILD_ID)
                if event.payload.kind == "mission_completed"
            ]
        )
        == 1
    )
    assert repository.get_session(session)["status"] == "completed"


def test_concurrent_duplicate_completion_applies_once() -> None:
    app = create_app()
    client = TestClient(app)
    session = start(client)

    def finish() -> object:
        response = client.post(
            "/session/complete",
            json={"sessionId": session, "correctness": 0.92},
            headers={"Idempotency-Key": "same"},
        )
        assert response.status_code == 200, response.text
        return response.json()

    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(lambda _: finish(), range(4)))
    assert all(response == responses[0] for response in responses)


def test_supabase_without_token_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WIGGLE_REPOSITORY_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test")
    client = TestClient(create_app())
    assert client.get(f"/twin/{DEMO_CHILD_ID}").status_code == 401
