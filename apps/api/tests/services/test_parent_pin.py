from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.demo import DEMO_CHILD_ID, DEMO_PARENT_ID, seed_demo
from app.main import create_app
from app.repositories.memory import MemoryRepository
from app.services.parent_pin import ParentPinService, PinStore, hash_pin, verify_pin
from app.services.sessions import WorkflowError


def test_salted_hash_and_malformed_hash_fail_closed() -> None:
    first = hash_pin("123456")
    assert first != hash_pin("123456")
    assert "123456" not in first
    assert verify_pin("123456", first)
    assert not verify_pin("654321", first)
    assert not verify_pin("123456", "malformed")


def test_lockout_survives_service_restart_and_ticket_is_owner_bound(tmp_path: Path) -> None:
    repo = MemoryRepository(DEMO_PARENT_ID)
    repo.put_settings({"pin_hash": hash_pin("123456")})
    path = str(tmp_path / "pin.sqlite")
    service = ParentPinService(repo, PinStore(path), clock=lambda: 100.0)
    for _ in range(4):
        with pytest.raises(WorkflowError) as error:
            service.verify("000000")
        assert error.value.status_code == 403
    with pytest.raises(WorkflowError) as error:
        service.verify("000000")
    assert error.value.status_code == 429
    restarted = ParentPinService(repo, PinStore(path), clock=lambda: 101.0)
    with pytest.raises(WorkflowError) as error:
        restarted.verify("123456")
    assert error.value.status_code == 429
    later = ParentPinService(repo, PinStore(path), clock=lambda: 401.0)
    ticket = later.verify("123456")
    later.require(ticket)
    other = ParentPinService(MemoryRepository("other"), PinStore(path), clock=lambda: 402.0)
    with pytest.raises(WorkflowError):
        other.require(ticket)
    later.revoke(ticket)
    with pytest.raises(WorkflowError):
        later.require(ticket)


def test_parent_endpoints_require_pin_and_preserve_context_only(tmp_path: Path) -> None:
    repo = MemoryRepository(DEMO_PARENT_ID)
    seed_demo(repo)
    repo.put_settings({"pin_hash": hash_pin("123456")})
    app = create_app(repository=repo)
    app.state.pin_store = PinStore(str(tmp_path / "pin.sqlite"))
    client = TestClient(app)
    url = f"/parent/insights?child_id={DEMO_CHILD_ID}"
    assert client.get(url).status_code == 403
    ticket = client.post("/parent/pin/verify", json={"pin": "123456"}).json()["ticket"]
    client.headers["X-Parent-Pin"] = ticket
    assert client.get(url).status_code == 200
    assert client.get("/parent/insights?child_id=another-household").status_code == 404
    before = repo.get_twin(DEMO_CHILD_ID)
    response = client.post(
        "/parent/check-in",
        json={"childId": DEMO_CHILD_ID, "difficulty": 0.8, "note": "A busy afternoon"},
        headers={"Idempotency-Key": "check"},
    )
    assert response.status_code == 200
    assert repo.get_twin(DEMO_CHILD_ID) == before
    assert repo.list_check_ins(DEMO_CHILD_ID)[0]["context"] == {"weight": "context_only"}
