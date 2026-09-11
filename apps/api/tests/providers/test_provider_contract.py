import pytest
from pydantic import ValidationError

from app.providers.base import ProviderContext, TextContent
from app.providers.gemini import GeminiProvider, ProviderSettings, provider_from_env
from app.providers.local import LocalAIProvider


@pytest.mark.parametrize(
    "method",
    [
        "generate_activity",
        "generate_hint",
        "generate_explanation",
        "generate_parent_insight",
        "chat_with_lexi",
    ],
)
def test_local_contract(method: str) -> None:
    provider = LocalAIProvider()
    result = getattr(provider, method)(ProviderContext())
    assert result.text
    assert len(result.text) <= 400


@pytest.mark.parametrize(
    "output", ['{"text": 32}', '{"text":"ok","twin":{"mastery":1}}', "not json", '{"text":""}']
)
def test_malformed_gemini_falls_back(output: str) -> None:
    provider = GeminiProvider("test", transport=lambda *args: output)
    assert provider.generate_hint(ProviderContext()) == LocalAIProvider().generate_hint(
        ProviderContext()
    )


def test_timeout_falls_back() -> None:
    def timeout(*args: object) -> str:
        raise TimeoutError("timeout")

    provider = GeminiProvider("test", transport=timeout)
    assert provider.chat_with_lexi(ProviderContext()) == LocalAIProvider().chat_with_lexi(
        ProviderContext()
    )


def test_valid_external_output_is_validated() -> None:
    provider = GeminiProvider("test", transport=lambda *args: '{"text":"Count three slices."}')
    assert provider.generate_hint(ProviderContext()) == TextContent(text="Count three slices.")


def test_validated_environment_selection() -> None:
    assert isinstance(provider_from_env({}), LocalAIProvider)
    assert isinstance(provider_from_env({"GEMINI_API_KEY": "test"}), GeminiProvider)
    with pytest.raises(ValidationError):
        ProviderSettings.from_env({"WIGGLE_AI_PROVIDER": "unknown"})
    with pytest.raises(ValidationError):
        ProviderSettings.from_env({"WIGGLE_AI_PROVIDER": "gemini"})
