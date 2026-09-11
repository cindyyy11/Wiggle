"""Test-only server: exercise the real Gemini fallback without any external requests."""

from collections.abc import Mapping

from app.main import create_app
from app.providers.gemini import GeminiProvider

failures = 0


def timeout_transport(operation: str, body: Mapping[str, object], timeout: float) -> str:
    global failures
    failures += 1
    raise TimeoutError("Injected by the browser-test server")


app = create_app(provider=GeminiProvider("test-only", transport=timeout_transport))


@app.get("/__test/provider-failures")
def provider_failures() -> dict[str, int]:
    return {"timeouts": failures}
