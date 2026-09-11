"""Pure, deterministic, and factor-level explainable adaptation simulation."""

from collections.abc import Mapping
from types import MappingProxyType
from typing import Annotated, Literal

from pydantic import Field, field_serializer, field_validator

from .models import DomainModel, LearnerTwin, Probability
from .strategies import STRATEGIES, STRATEGY_NAMES, StrategyDefinition, StrategyName

FactorName = Literal[
    "modality_history",
    "strategy_history",
    "objective_compatibility",
    "current_friction",
    "fatigue",
    "cognitive_load",
    "novelty",
]
SignedUnit = Annotated[float, Field(ge=-1, le=1)]

BASE_SUCCESS = 0.23
SUCCESS_WEIGHTS: Mapping[FactorName, float] = MappingProxyType(
    {
        "modality_history": 0.18,
        "strategy_history": 0.12,
        "objective_compatibility": 0.42,
        "current_friction": -0.08,
        "fatigue": -0.06,
        "cognitive_load": -0.08,
        "novelty": -0.08,
    }
)


class ActivityCharacteristics(DomainModel):
    """Bounded, authored activity inputs used by every strategy simulation."""

    difficulty: Probability = 0.5
    objective_compatibility: Mapping[StrategyName, Probability] = Field(
        default_factory=dict, validate_default=True
    )
    novelty: Mapping[StrategyName, Probability] = Field(default_factory=dict, validate_default=True)

    @staticmethod
    def strategy_names() -> tuple[StrategyName, ...]:
        return STRATEGY_NAMES

    @field_validator("objective_compatibility", "novelty")
    @classmethod
    def fill_and_freeze_strategy_values(
        cls, value: Mapping[StrategyName, Probability]
    ) -> Mapping[StrategyName, Probability]:
        return MappingProxyType({name: value.get(name, 0.5) for name in STRATEGY_NAMES})

    @field_serializer("objective_compatibility", "novelty")
    def serialize_strategy_values(
        self, value: Mapping[StrategyName, Probability]
    ) -> dict[StrategyName, Probability]:
        return dict(value)


class SimulationFactor(DomainModel):
    name: FactorName
    value: Probability
    weight: SignedUnit
    contribution: SignedUnit
    explanation: str = Field(min_length=1)


class StrategyPrediction(DomainModel):
    strategy: StrategyName
    predicted_success: Probability
    predicted_friction: Probability
    expected_mastery_gain: Probability
    factors: tuple[SimulationFactor, ...]


class SimulationReport(DomainModel):
    objective: str = Field(min_length=1)
    recommended_strategy: StrategyName
    ranked: tuple[StrategyPrediction, ...]


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _modality_history(twin: LearnerTwin, definition: StrategyDefinition) -> float:
    if not definition.modalities:
        return 0.5
    values = [float(getattr(twin.modality_effectiveness, name)) for name in definition.modalities]
    return sum(values) / len(values)


def _strategy_history(twin: LearnerTwin, definition: StrategyDefinition) -> float:
    if definition.history_key is None:
        return 0.5
    return float(getattr(twin.strategy_effectiveness, definition.history_key))


def _factor(name: FactorName, value: float, explanation: str) -> SimulationFactor:
    weight = SUCCESS_WEIGHTS[name]
    return SimulationFactor(
        name=name,
        value=value,
        weight=weight,
        contribution=value * weight,
        explanation=explanation,
    )


def _factors(
    twin: LearnerTwin,
    activity: ActivityCharacteristics,
    definition: StrategyDefinition,
) -> tuple[SimulationFactor, ...]:
    modality_history = _modality_history(twin, definition)
    strategy_history = _strategy_history(twin, definition)
    current_friction = (
        twin.initiation_friction + twin.persistence_friction + twin.transition_friction
    ) / 3
    compatibility = activity.objective_compatibility[definition.name]
    novelty = activity.novelty[definition.name]
    modality_label = ", ".join(definition.modalities) or "neutral baseline"
    history_label = definition.history_key or "neutral baseline"

    return (
        _factor(
            "modality_history",
            modality_history,
            f"Prior effectiveness for {modality_label} modalities.",
        ),
        _factor(
            "strategy_history",
            strategy_history,
            f"Prior effectiveness for {history_label} support.",
        ),
        _factor(
            "objective_compatibility",
            compatibility,
            f"Authored compatibility with {definition.name} for this objective.",
        ),
        _factor(
            "current_friction",
            current_friction,
            "Mean initiation, persistence, and transition friction penalty.",
        ),
        _factor("fatigue", twin.fatigue_estimate, "Current fatigue estimate penalty."),
        _factor("cognitive_load", twin.cognitive_load, "Current cognitive-load penalty."),
        _factor("novelty", novelty, f"Novelty penalty for {definition.name}."),
    )


def _predict(
    twin: LearnerTwin,
    objective: str,
    activity: ActivityCharacteristics,
    definition: StrategyDefinition,
) -> StrategyPrediction:
    factors = _factors(twin, activity, definition)
    predicted_success = _clamp(BASE_SUCCESS + sum(factor.contribution for factor in factors))
    current_friction = next(factor.value for factor in factors if factor.name == "current_friction")
    modality_history = next(factor.value for factor in factors if factor.name == "modality_history")
    compatibility = activity.objective_compatibility[definition.name]
    novelty = activity.novelty[definition.name]
    predicted_friction = _clamp(
        current_friction
        + definition.friction_modifier
        + 0.20 * twin.cognitive_load
        + 0.15 * twin.fatigue_estimate
        + 0.15 * novelty
        - 0.20 * modality_history
        - 0.15 * compatibility
    )
    mastery = twin.mastery.get(objective, 0.5)
    learning_opportunity = (activity.difficulty + (1.0 - mastery)) / 2
    expected_mastery_gain = _clamp(
        predicted_success * learning_opportunity * definition.learning_gain_multiplier * 0.25
    )
    return StrategyPrediction(
        strategy=definition.name,
        predicted_success=predicted_success,
        predicted_friction=predicted_friction,
        expected_mastery_gain=expected_mastery_gain,
        factors=factors,
    )


def simulate(
    twin: LearnerTwin,
    objective: str,
    activity: ActivityCharacteristics | Mapping[str, object],
) -> SimulationReport:
    """Rank every declared strategy with no randomness, I/O, or model inference."""

    if not objective:
        raise ValueError("objective must not be empty")
    characteristics = (
        activity
        if isinstance(activity, ActivityCharacteristics)
        else ActivityCharacteristics.model_validate(activity)
    )
    predictions = [
        _predict(twin, objective, characteristics, definition) for definition in STRATEGIES
    ]
    order = {name: index for index, name in enumerate(STRATEGY_NAMES)}
    ranked = tuple(
        sorted(predictions, key=lambda item: (-item.predicted_success, order[item.strategy]))
    )
    return SimulationReport(
        objective=objective,
        recommended_strategy=ranked[0].strategy,
        ranked=ranked,
    )
