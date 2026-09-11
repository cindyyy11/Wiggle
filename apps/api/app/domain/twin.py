"""Deterministic and explainable Learner Digital Twin update functions."""

from collections.abc import Iterable
from typing import Literal

from .models import (
    AuditChange,
    LearnerTwin,
    LearningEvent,
    MissionCompletedPayload,
    StuckRequestedPayload,
    TwinUpdate,
)

_COMPLETION_RATE = 0.2
_FRICTION_RATE = 0.15
_STUCK_RATE = 0.2
_MODE_MODALITIES: dict[str, tuple[str, ...]] = {
    "standard": ("text",),
    "visual": ("visual",),
    "gesture": ("gesture",),
    "visual_gesture": ("visual", "gesture"),
    "chunk": ("text",),
    "voice": ("voice",),
    "movement": ("movement",),
    "story": ("story",),
}
_MODE_STRATEGIES: dict[str, tuple[str, ...]] = {
    "visual": ("visual_hint",),
    "visual_gesture": ("visual_hint",),
    "chunk": ("chunking",),
    "voice": ("voice_hint",),
    "movement": ("movement_break",),
}


def _bounded_exponential_update(previous: float, target: float, rate: float) -> float:
    """Move a bounded signal toward evidence using an exponential moving average."""

    return max(0.0, min(1.0, previous + rate * (target - previous)))


def _record_change(
    changes: list[AuditChange], field: str, previous: float, result: float, evidence: str
) -> None:
    changes.append(
        AuditChange(
            field=field,
            previous_value=previous,
            evidence=evidence,
            delta=result - previous,
            resulting_value=result,
        )
    )


def _update_scalar(
    twin: LearnerTwin,
    changes: list[AuditChange],
    field: Literal[
        "initiation_friction",
        "persistence_friction",
        "cognitive_load",
        "transition_friction",
        "fatigue_estimate",
    ],
    target: float,
    rate: float,
    evidence: str,
) -> LearnerTwin:
    previous = getattr(twin, field)
    result = _bounded_exponential_update(previous, target, rate)
    _record_change(changes, field, previous, result, evidence)
    return twin.model_copy(update={field: result})


def _update_mastery(
    twin: LearnerTwin, changes: list[AuditChange], objective: str, correctness: float, evidence: str
) -> LearnerTwin:
    previous = twin.mastery.get(objective, 0.5)
    result = _bounded_exponential_update(previous, correctness, _COMPLETION_RATE)
    mastery = {**twin.mastery, objective: result}
    _record_change(changes, f"mastery.{objective}", previous, result, evidence)
    return twin.model_copy(update={"mastery": mastery})


def _update_modality(
    twin: LearnerTwin, changes: list[AuditChange], modality: str, correctness: float, evidence: str
) -> LearnerTwin:
    previous = getattr(twin.modality_effectiveness, modality)
    result = _bounded_exponential_update(previous, correctness, _COMPLETION_RATE)
    modalities = twin.modality_effectiveness.model_copy(update={modality: result})
    _record_change(changes, f"modality_effectiveness.{modality}", previous, result, evidence)
    return twin.model_copy(update={"modality_effectiveness": modalities})


def _update_strategy(
    twin: LearnerTwin, changes: list[AuditChange], strategy: str, correctness: float, evidence: str
) -> LearnerTwin:
    previous = getattr(twin.strategy_effectiveness, strategy)
    result = _bounded_exponential_update(previous, correctness, _COMPLETION_RATE)
    strategies = twin.strategy_effectiveness.model_copy(update={strategy: result})
    _record_change(changes, f"strategy_effectiveness.{strategy}", previous, result, evidence)
    return twin.model_copy(update={"strategy_effectiveness": strategies})


def update_twin(twin: LearnerTwin, events: Iterable[LearningEvent]) -> TwinUpdate:
    """Return a new twin and auditable changes without mutating the input twin or events."""

    updated = twin.model_copy(deep=True)
    changes: list[AuditChange] = []

    for event in events:
        if isinstance(event.payload, StuckRequestedPayload):
            updated = _update_scalar(
                updated,
                changes,
                "persistence_friction",
                target=1.0,
                rate=_STUCK_RATE,
                evidence="stuck_requested",
            )
        elif isinstance(event.payload, MissionCompletedPayload):
            payload = event.payload
            evidence = (
                f"mission_completed correctness={payload.correctness:.2f} mode={payload.mode}"
            )
            updated = _update_mastery(
                updated, changes, payload.objective, payload.correctness, evidence
            )
            updated = _update_scalar(
                updated,
                changes,
                "persistence_friction",
                target=1.0 - payload.correctness,
                rate=_FRICTION_RATE,
                evidence=evidence,
            )
            for modality in _MODE_MODALITIES[payload.mode]:
                updated = _update_modality(
                    updated, changes, modality, payload.correctness, evidence
                )
            strategy_names = (
                (payload.strategy,)
                if payload.strategy is not None
                else _MODE_STRATEGIES[payload.mode]
            )
            for strategy in strategy_names:
                updated = _update_strategy(
                    updated, changes, strategy, payload.correctness, evidence
                )

    return TwinUpdate(twin=updated, changes=tuple(changes))
