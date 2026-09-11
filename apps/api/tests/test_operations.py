import json
import logging

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.providers.base import ProviderContext
from app.providers.gemini import GeminiProvider


def test_request_logs_never_include_child_data_or_request_secrets(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.INFO, logger="wiggle.requests"):
        response = TestClient(create_app()).post(
            "/session/start?note=sensitive-query",
            json={"childId": "private-child"},
            headers={"Authorization": "Bearer private-token", "Idempotency-Key": "private-key"},
        )
    record = next(
        json.loads(row.message) for row in caplog.records if row.name == "wiggle.requests"
    )
    assert record["route"] == "/session/start"
    assert record["status"] == 404
    assert response.headers["X-Request-ID"] == record["request_id"]
    assert all(secret not in json.dumps(record) for secret in ["private", "sensitive-query"])


def test_provider_failure_logs_only_operation_and_error_type(
    caplog: pytest.LogCaptureFixture,
) -> None:
    def timeout(*args: object) -> str:
        raise TimeoutError("sensitive provider body")

    GeminiProvider("private-key", transport=timeout).generate_hint(
        ProviderContext(message="private-child")
    )
    record = next(
        json.loads(row.message) for row in caplog.records if row.name == "app.providers.gemini"
    )
    assert record == {
        "event": "provider_fallback",
        "provider": "gemini",
        "operation": "generate_hint",
        "reason": "TimeoutError",
    }


def test_cors_allows_only_the_configured_origin(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("WIGGLE_ALLOWED_ORIGINS", "https://wiggle.example")
    client = TestClient(create_app())
    headers = {"Access-Control-Request-Method": "POST", "Origin": "https://wiggle.example"}
    assert (
        client.options("/events", headers=headers).headers["Access-Control-Allow-Origin"]
        == "https://wiggle.example"
    )
    headers["Origin"] = "https://other.example"
    assert client.options("/events", headers=headers).status_code == 400


def test_break_setting_matches_the_database_maximum() -> None:
    client = TestClient(create_app())
    ticket = client.post("/parent/pin/setup", json={"pin": "654321"}).json()["ticket"]
    assert (
        client.post(
            "/parent/settings", json={"breakIntervalMinutes": 121}, headers={"X-Parent-Pin": ticket}
        ).status_code
        == 422
    )
