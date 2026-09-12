from app.services.safety import SAFETY_RESPONSE, detect_crisis


def test_detects_common_self_harm_phrasing() -> None:
    assert detect_crisis("I want to kill myself")
    assert detect_crisis("I'm really sad and I want to hurt myself")
    assert detect_crisis("sometimes I think about suicide")


def test_ignores_ordinary_frustration() -> None:
    assert not detect_crisis("I don't understand this")
    assert not detect_crisis("I'm bored")
    assert not detect_crisis("this fraction is killing me it's so hard")


def test_ignores_empty_message() -> None:
    assert not detect_crisis("")


def test_safety_response_redirects_to_a_trusted_adult_without_medical_language() -> None:
    text = SAFETY_RESPONSE.text.lower()
    assert "trusted adult" in text
    assert SAFETY_RESPONSE.suggested_tool is None
    for banned in ("diagnos", "disorder", "medication", "therapist"):
        assert banned not in text
