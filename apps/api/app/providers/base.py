from typing import Literal, Protocol

from pydantic import ConfigDict, Field

from app.domain.models import DomainModel, LearningMode, Probability

LexiTool = Literal[
    "get_current_twin",
    "get_current_mission",
    "report_learning_friction",
    "request_hint",
    "switch_learning_mode",
    "start_reset_station",
    "create_reality_mission",
    "record_self_report",
]


class ProviderContext(DomainModel):
    objective: str = "identify-three-quarters"
    mode: LearningMode = "standard"
    message: str = Field(default="", max_length=1000)
    correctness: Probability | None = None
    # Optional structured inputs for generate_weekly_summary; the LLM only phrases these
    # numbers, it never invents or overrides them.
    child_name: str = "your explorer"
    mastery_delta: float | None = None
    independence_delta: float | None = None
    most_effective_strategy: str | None = None
    biggest_improvement: str | None = None


class TextContent(DomainModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    text: str = Field(min_length=1, max_length=400, pattern=r"\S")


class ActivityContent(TextContent):
    objective: Literal["identify-three-quarters"] = "identify-three-quarters"
    target_slices: Literal[3] = 3
    total_slices: Literal[4] = 4


class LexiContent(TextContent):
    suggested_tool: LexiTool | None = None


class WeeklyNarrative(DomainModel):
    """Two short, parent-friendly sentences phrasing an already-computed weekly delta."""

    model_config = ConfigDict(extra="forbid", strict=True)
    wiggle_noticed: str = Field(min_length=1, max_length=240, pattern=r"\S")
    parent_suggestion: str = Field(min_length=1, max_length=240, pattern=r"\S")


class AIProvider(Protocol):
    def generate_activity(self, context: ProviderContext) -> ActivityContent: ...
    def generate_hint(self, context: ProviderContext) -> TextContent: ...
    def generate_explanation(self, context: ProviderContext) -> TextContent: ...
    def generate_parent_insight(self, context: ProviderContext) -> TextContent: ...
    def chat_with_lexi(self, context: ProviderContext) -> LexiContent: ...
    def generate_weekly_summary(self, context: ProviderContext) -> WeeklyNarrative: ...
