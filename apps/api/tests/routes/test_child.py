from fastapi.testclient import TestClient

from app.demo import DEMO_CHILD_ID
from app.main import create_app


def test_child_progress_matches_the_shape_parents_see_without_a_pin() -> None:
    client = TestClient(create_app())
    response = client.get(f"/child/{DEMO_CHILD_ID}/progress")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["childId"] == DEMO_CHILD_ID
    assert "twin" in body and "today" in body
    # No PIN, no auth header: this is the child's own screen.
    assert "X-Parent-Pin" not in response.request.headers


def test_child_progress_for_an_unknown_child_is_not_found() -> None:
    client = TestClient(create_app())
    response = client.get("/child/does-not-exist/progress")
    assert response.status_code == 404
