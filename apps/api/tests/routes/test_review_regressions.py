from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.demo import DEMO_CHILD_ID, DEMO_PARENT_ID, seed_demo
from app.domain.models import LearnerTwin
from app.main import create_app
from app.repositories.memory import MemoryRepository
from app.repositories.protocols import Record, RepositoryError


class RoundedCheckInRepository(MemoryRepository):
    """Model Postgres numeric(4,3) normalization without a running database."""

    def add_check_in(self, check_in: Mapping[str, object]) -> Record:
        row = dict(check_in)
        row["difficulty"] = float(
            Decimal(str(row["difficulty"])).quantize(Decimal(".001"), rounding=ROUND_HALF_UP)
        )
        return super().add_check_in(row)


@pytest.mark.parametrize("repository_type", [MemoryRepository, RoundedCheckInRepository])
@pytest.mark.parametrize("difficulty,stored", [(0.1234, 0.123), (0.1235, 0.124), (0.9999, 1.0)])
def test_check_in_precision_and_retry_parity(
    repository_type: type[MemoryRepository], difficulty: float, stored: float
) -> None:
    repository = repository_type(DEMO_PARENT_ID)
    seed_demo(repository)
    client = TestClient(create_app(repository=repository))
    request = {"childId": DEMO_CHILD_ID, "difficulty": difficulty, "note": "Busy afternoon."}
    first = client.post("/parent/check-in", json=request, headers={"Idempotency-Key": "check"})
    assert first.status_code == 200
    assert repository.list_check_ins(DEMO_CHILD_ID)[0]["difficulty"] == stored
    restarted = TestClient(create_app(repository=repository))
    retry = restarted.post("/parent/check-in", json=request, headers={"Idempotency-Key": "check"})
    assert retry.status_code == 200, retry.text
    assert retry.json() == first.json()
    assert len(repository.list_check_ins(DEMO_CHILD_ID)) == 1
    request["difficulty"] = 0.5
    assert (
        restarted.post(
            "/parent/check-in", json=request, headers={"Idempotency-Key": "check"}
        ).status_code
        == 409
    )


def start(client: TestClient, key: str) -> str:
    response = client.post(
        "/session/start", json={"childId": DEMO_CHILD_ID}, headers={"Idempotency-Key": key}
    )
    assert response.status_code == 200, response.text
    return response.json()["sessionId"]


def stuck(client: TestClient, session: str, occurred_at: datetime) -> None:
    response = client.post(
        "/events",
        json={
            "events": [
                {
                    "id": str(uuid4()),
                    "childId": DEMO_CHILD_ID,
                    "sessionId": session,
                    "occurredAt": occurred_at.isoformat().replace("+00:00", "Z"),
                    "type": "stuck_requested",
                    "payload": {"kind": "stuck_requested"},
                }
            ]
        },
    )
    assert response.status_code == 200, response.text


def assert_ordered_audit(response: dict[str, object], repository: MemoryRepository) -> None:
    update = response["update"]
    friction_changes = [
        change for change in update["changes"] if change["field"] == "persistence_friction"
    ]
    assert len(friction_changes) == 2
    completion, later_stuck = friction_changes
    assert "mission_completed" in completion["evidence"]
    assert completion["previousValue"] == 0.5
    assert completion["resultingValue"] == pytest.approx(0.437)
    assert later_stuck["evidence"] == "stuck_requested"
    assert later_stuck["previousValue"] == completion["resultingValue"]
    assert later_stuck["resultingValue"] == pytest.approx(0.5496)
    assert update["twin"]["persistenceFriction"] == later_stuck["resultingValue"]
    assert repository.get_twin(DEMO_CHILD_ID).persistence_friction == later_stuck["resultingValue"]


def test_completion_audit_accounts_for_later_client_timestamp() -> None:
    repository = MemoryRepository(DEMO_PARENT_ID)
    seed_demo(repository)
    client = TestClient(create_app(repository=repository))
    session = start(client, "start")
    stuck(client, session, datetime.now(UTC) + timedelta(days=1))
    body = {"sessionId": session, "correctness": 0.92}
    response = client.post("/session/complete", json=body, headers={"Idempotency-Key": "complete"})
    assert response.status_code == 200, response.text
    assert_ordered_audit(response.json(), repository)
    replayed = client.get(f"/twin/{DEMO_CHILD_ID}").json()["twin"]
    assert replayed == response.json()["update"]["twin"]
    assert (
        client.post("/session/complete", json=body, headers={"Idempotency-Key": "complete"}).json()
        == response.json()
    )


@pytest.mark.parametrize("failure", ["twin", "outcome"])
def test_completion_recovery_audits_intervening_session_events(failure: str) -> None:
    class FailingRepository(MemoryRepository):
        armed = False

        def fail(self, stage: str) -> None:
            if self.armed and stage == failure:
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

    repository = FailingRepository(DEMO_PARENT_ID)
    seed_demo(repository)
    client = TestClient(create_app(repository=repository))
    session = start(client, "start")
    other_session = start(client, "other")
    body = {"sessionId": session, "correctness": 0.92}
    repository.armed = True
    assert (
        client.post(
            "/session/complete", json=body, headers={"Idempotency-Key": "complete"}
        ).status_code
        == 503
    )
    completion = next(
        event
        for event in repository.list_events(DEMO_CHILD_ID)
        if event.payload.kind == "mission_completed"
    )
    stuck(client, other_session, completion.occurred_at + timedelta(seconds=1))
    restarted = TestClient(create_app(repository=repository))
    recovered = restarted.post(
        "/session/complete", json=body, headers={"Idempotency-Key": "complete"}
    )
    assert recovered.status_code == 200, recovered.text
    assert_ordered_audit(recovered.json(), repository)
    assert (
        restarted.get(f"/twin/{DEMO_CHILD_ID}").json()["twin"] == recovered.json()["update"]["twin"]
    )
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
