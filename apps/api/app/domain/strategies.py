"""Declarative strategy metadata for the deterministic simulation engine."""

from dataclasses import dataclass
from typing import Literal

StrategyName = Literal[
    "standard",
    "chunked",
    "visual",
    "voice",
    "gesture",
    "visual_gesture",
    "movement",
    "story",
    "challenge",
]
ModalityName = Literal["visual", "voice", "gesture", "movement", "story", "text"]
StrategyHistoryName = Literal["chunking", "movement_break", "visual_hint", "voice_hint", "choice"]


@dataclass(frozen=True, slots=True)
class StrategyDefinition:
    """Static inputs that distinguish one adaptation strategy from another."""

    name: StrategyName
    modalities: tuple[ModalityName, ...]
    history_key: StrategyHistoryName | None
    learning_gain_multiplier: float
    friction_modifier: float


# Tuple order is also the documented deterministic tie-break order.
STRATEGIES: tuple[StrategyDefinition, ...] = (
    StrategyDefinition("standard", ("text",), None, 0.90, 0.05),
    StrategyDefinition("chunked", ("text",), "chunking", 0.95, -0.12),
    StrategyDefinition("visual", ("visual",), "visual_hint", 1.00, -0.08),
    StrategyDefinition("voice", ("voice",), "voice_hint", 0.95, -0.04),
    StrategyDefinition("gesture", ("gesture",), None, 1.05, -0.05),
    StrategyDefinition("visual_gesture", ("visual", "gesture"), "visual_hint", 1.12, -0.14),
    StrategyDefinition("movement", ("movement",), "movement_break", 0.90, -0.10),
    StrategyDefinition("story", ("story",), "choice", 1.00, -0.03),
    StrategyDefinition("challenge", (), "choice", 1.20, 0.14),
)

STRATEGY_NAMES: tuple[StrategyName, ...] = tuple(definition.name for definition in STRATEGIES)
