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
FrictionFactorName = Literal[
    "current_friction",
    "cognitive_load",
    "fatigue",
    "novelty",
    "modality_history",
    "objective_compatibility",
]
MasteryOpportunityName = Literal["activity_difficulty", "mastery_gap"]
SignedUnit = Annotated[float, Field(ge=-1, le=1)]

NEUTRAL_FACTOR_VALUE = 0.5
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
FRICTION_WEIGHTS: Mapping[FrictionFactorName, float] = MappingProxyType(
    {
        "current_friction": 1.00,
        "cognitive_load": 0.20,
        "fatigue": 0.15,
        "novelty": 0.15,
        "modality_history": -0.20,
        "objective_compatibility": -0.15,
    }
)
MASTERY_OPPORTUNITY_WEIGHTS: Mapping[MasteryOpportunityName, float] = MappingProxyType(
    {
        "activity_difficulty": 0.50,
        "mastery_gap": 0.50,
    }
)
MASTERY_GAIN_SCALE = 0.25
CURRENT_FRICTION_FIELDS = (
    "initiation_friction",
    "persistence_friction",
    "transition_friction",
)


class ActivityCharacteristics(DomainModel):
    """Bounded, authored activity inputs used by every strategy simulation."""

    difficulty: Probability = NEUTRAL_FACTOR_VALUE
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
        return MappingProxyType(
            {name: value.get(name, NEUTRAL_FACTOR_VALUE) for name in STRATEGY_NAMES}
        )

    @field_serializer("objective_compatibility", "novelty")
    def serialize_strategy_values(
        self, value: Mapping[StrategyName, Probability]
    ) -> dict[StrategyName, Probability]:
        return dict(value)


class SimulationFactor(DomainModel):
    """One auditable weighted contribution to ``predicted_success``."""

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
    factors: tuple[SimulationFactor, ...] = Field(
        description="Weighted explanations for predicted_success."
    )


class SimulationReport(DomainModel):
    objective: str = Field(min_length=1)
    recommended_strategy: StrategyName
    ranked: tuple[StrategyPrediction, ...]


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _modality_history(twin: LearnerTwin, definition: StrategyDefinition) -> float:
    if not definition.modalities:
        return NEUTRAL_FACTOR_VALUE
    values = [float(getattr(twin.modality_effectiveness, name)) for name in definition.modalities]
    return sum(values) / len(values)


def _strategy_history(twin: LearnerTwin, definition: StrategyDefinition) -> float:
    if definition.history_key is None:
        return NEUTRAL_FACTOR_VALUE
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
    current_friction_values = [
        float(getattr(twin, field_name)) for field_name in CURRENT_FRICTION_FIELDS
    ]
    current_friction = sum(current_friction_values) / len(current_friction_values)
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
    factor_values = {factor.name: factor.value for factor in factors}
    friction_inputs: Mapping[FrictionFactorName, float] = {
        "current_friction": factor_values["current_friction"],
        "cognitive_load": factor_values["cognitive_load"],
        "fatigue": factor_values["fatigue"],
        "novelty": factor_values["novelty"],
        "modality_history": factor_values["modality_history"],
        "objective_compatibility": factor_values["objective_compatibility"],
    }
    predicted_friction = _clamp(
        definition.friction_modifier
        + sum(friction_inputs[name] * weight for name, weight in FRICTION_WEIGHTS.items())
    )
    mastery = twin.mastery.get(objective, NEUTRAL_FACTOR_VALUE)
    mastery_opportunity_inputs: Mapping[MasteryOpportunityName, float] = {
        "activity_difficulty": activity.difficulty,
        "mastery_gap": 1.0 - mastery,
    }
    learning_opportunity = sum(
        mastery_opportunity_inputs[name] * weight
        for name, weight in MASTERY_OPPORTUNITY_WEIGHTS.items()
    )
    expected_mastery_gain = _clamp(
        predicted_success
        * learning_opportunity
        * definition.learning_gain_multiplier
        * MASTERY_GAIN_SCALE
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
