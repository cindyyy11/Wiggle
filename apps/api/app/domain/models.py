"""Shared, validated data shapes for the Learner Digital Twin domain."""

from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from re import compile as re_compile
from types import MappingProxyType
from typing import Annotated, Literal

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel

Probability = Annotated[float, Field(ge=0, le=1)]
_ZULU_TIMESTAMP = re_compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$")


class DomainModel(BaseModel):
    """Immutable domain data with camelCase JSON aliases shared with TypeScript."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)


class EventType(StrEnum):
    SESSION_STARTED = "session_started"
    TASK_STARTED = "task_started"
    FIRST_INTERACTION = "first_interaction"
    RESPONSE_TIME_RECORDED = "response_time_recorded"
    ANSWER_SUBMITTED = "answer_submitted"
    RETRY_RECORDED = "retry_recorded"
    HINT_REQUESTED = "hint_requested"
    TASK_SKIPPED = "task_skipped"
    MISSION_COMPLETED = "mission_completed"
    MISSION_ABANDONED = "mission_abandoned"
    STUCK_REQUESTED = "stuck_requested"
    RESET_STARTED = "reset_started"
    RESET_COMPLETED = "reset_completed"
    MODE_CHANGED = "mode_changed"
    DIFFICULTY_SELF_REPORTED = "difficulty_self_reported"
    PARENT_CHECK_IN = "parent_check_in"


LearningMode = Literal[
    "standard", "visual", "gesture", "visual_gesture", "chunk", "voice", "movement", "story"
]


class StuckRequestedPayload(DomainModel):
    kind: Literal["stuck_requested"] = "stuck_requested"
    mode: LearningMode | None = None


class MissionCompletedPayload(DomainModel):
    kind: Literal["mission_completed"] = "mission_completed"
    objective: str = Field(min_length=1)
    correctness: Probability
    mode: LearningMode
    strategy: (
        Literal["chunking", "movement_break", "visual_hint", "voice_hint", "choice"] | None
    ) = None


class GenericEventPayload(DomainModel):
    """Payload for recorded events that do not directly mutate the twin in this phase."""

    kind: Literal[
        "session_started",
        "task_started",
        "first_interaction",
        "response_time_recorded",
        "answer_submitted",
        "retry_recorded",
        "hint_requested",
        "task_skipped",
        "mission_abandoned",
        "reset_started",
        "reset_completed",
        "mode_changed",
        "difficulty_self_reported",
        "parent_check_in",
    ]


EventPayload = Annotated[
    StuckRequestedPayload | MissionCompletedPayload | GenericEventPayload,
    Field(discriminator="kind"),
]


class LearningEvent(DomainModel):
    id: str = Field(min_length=1)
    child_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    occurred_at: datetime
    event_type: EventType = Field(
        validation_alias=AliasChoices("event_type", "eventType", "type"),
        serialization_alias="type",
    )
    payload: EventPayload

    @field_validator("occurred_at", mode="before")
    @classmethod
    def require_zulu_wire_timestamp(cls, value: object) -> object:
        """Keep JSON wire timestamps aligned with TypeScript's trailing-Z rule."""

        if isinstance(value, str) and _ZULU_TIMESTAMP.fullmatch(value) is None:
            raise ValueError("occurred_at must be an ISO-8601 UTC timestamp ending in Z")
        return value

    @field_validator("occurred_at")
    @classmethod
    def require_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() != timedelta(0):
            raise ValueError("occurred_at must be UTC")
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def match_event_type_to_payload(self) -> "LearningEvent":
        if self.event_type.value != self.payload.kind:
            raise ValueError("event_type must match payload.kind")
        return self


class ModalityEffectiveness(DomainModel):
    visual: Probability = 0.5
    voice: Probability = 0.5
    gesture: Probability = 0.5
    movement: Probability = 0.5
    story: Probability = 0.5
    text: Probability = 0.5


class StrategyEffectiveness(DomainModel):
    chunking: Probability = 0.5
    movement_break: Probability = 0.5
    visual_hint: Probability = 0.5
    voice_hint: Probability = 0.5
    choice: Probability = 0.5


class LearnerTwin(DomainModel):
    mastery: Mapping[str, Probability] = Field(default_factory=dict, validate_default=True)
    initiation_friction: Probability = 0.5
    persistence_friction: Probability = 0.5
    cognitive_load: Probability = 0.5
    transition_friction: Probability = 0.5
    fatigue_estimate: Probability = 0.5
    modality_effectiveness: ModalityEffectiveness = Field(default_factory=ModalityEffectiveness)
    strategy_effectiveness: StrategyEffectiveness = Field(default_factory=StrategyEffectiveness)

    @field_validator("mastery")
    @classmethod
    def freeze_mastery(cls, value: Mapping[str, Probability]) -> Mapping[str, Probability]:
        """Prevent callers from mutating learner state outside pure domain updates."""

        return MappingProxyType(dict(value))

    @field_serializer("mastery")
    def serialize_mastery(self, value: Mapping[str, Probability]) -> dict[str, Probability]:
        """Emit a normal JSON object while keeping the in-memory mapping read-only."""

        return dict(value)


class AuditChange(DomainModel):
    field: str = Field(min_length=1)
    previous_value: Probability
    evidence: str = Field(min_length=1)
    delta: float
    resulting_value: Probability


class TwinUpdate(DomainModel):
    twin: LearnerTwin
    changes: tuple[AuditChange, ...]
