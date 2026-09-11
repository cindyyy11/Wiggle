"""Camel-case HTTP contracts, independent of persistence row shapes."""

from typing import Annotated

from pydantic import ConfigDict, Field

from app.domain.models import (
    DomainModel,
    LearnerTwin,
    LearningEvent,
    LearningMode,
    Probability,
    TwinUpdate,
)
from app.domain.strategies import StrategyName
from app.providers.base import ActivityContent, LexiContent, LexiTool, TextContent

Identifier = Annotated[str, Field(min_length=1, max_length=128)]


class RequestModel(DomainModel):
    model_config = ConfigDict(extra="forbid")


class StartSessionRequest(RequestModel):
    child_id: Identifier
    mission_id: Identifier | None = None


class StartSessionResponse(DomainModel):
    session_id: str
    child_id: str
    mission_id: str
    objective: str
    activity: ActivityContent


class AppendEventsRequest(RequestModel):
    events: tuple[LearningEvent, ...] = Field(min_length=1, max_length=100)


class AppendEventsResponse(DomainModel):
    accepted_event_ids: tuple[str, ...]


class TwinResponse(DomainModel):
    twin: LearnerTwin


class SimulateRequest(RequestModel):
    session_id: Identifier


class SelectAdaptationRequest(SimulateRequest):
    strategy: StrategyName


class SelectAdaptationResponse(DomainModel):
    intervention_id: str
    strategy: StrategyName
    mode: LearningMode
    predicted_success: Probability
    activity: ActivityContent


class CompleteSessionRequest(SimulateRequest):
    correctness: Probability


class CompleteSessionResponse(DomainModel):
    session_id: str
    intervention_id: str
    update: TwinUpdate
    predicted_success: Probability
    actual_success: Probability
    prediction_error: float
    celebration: TextContent


class LexiRequest(SimulateRequest):
    message: str = Field(default="", max_length=1000)
    tool: LexiTool | None = None
    mode: LearningMode | None = None
    difficulty: Probability | None = None


class LexiResponse(DomainModel):
    content: LexiContent
    executed_tool: LexiTool | None = None
    mode: LearningMode | None = None
    activity: ActivityContent | None = None
    reset_started: bool = False
    reality_mission: str | None = None
    learning_label: str | None = None


class CheckInRequest(RequestModel):
    child_id: Identifier
    difficulty: Probability
    note: str = Field(default="", max_length=1000)


class CheckInResponse(DomainModel):
    check_in_id: str
    message: str = "Thanks for sharing."


class ParentInsightsResponse(DomainModel):
    child_id: str
    completed_missions: int
    twin: LearnerTwin
    insight: TextContent
