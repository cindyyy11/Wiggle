from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def unlock_parent() -> Callable[[TestClient], None]:
    def unlock(client: TestClient) -> None:
        status = client.get("/parent/pin/status")
        endpoint = "setup" if status.json()["setupRequired"] else "verify"
        response = client.post(f"/parent/pin/{endpoint}", json={"pin": "123456"})
        assert response.status_code == 200, response.text
        client.headers["X-Parent-Pin"] = response.json()["ticket"]

    return unlock
