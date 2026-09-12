from app.providers.base import (
    ActivityContent,
    LexiContent,
    ProviderContext,
    TextContent,
    WeeklyNarrative,
)


class LocalAIProvider:
    """Authored, bounded content for the fraction mission and recovery paths."""

    def generate_activity(self, context: ProviderContext) -> ActivityContent:
        return ActivityContent(text="Select three of four equal pizza slices.")

    def generate_hint(self, context: ProviderContext) -> TextContent:
        return TextContent(text="Select three pizza slices. Leave one slice empty.")

    def generate_explanation(self, context: ProviderContext) -> TextContent:
        return TextContent(text="Three quarters means three of four equal parts.")

    def generate_parent_insight(self, context: ProviderContext) -> TextContent:
        if context.correctness is None:
            return TextContent(text="Try sharing four equal slices and counting three together.")
        score = round(context.correctness * 100)
        mode = context.mode.replace("_", " + ")
        return TextContent(
            text=f"The {mode} activity finished at {score}% accuracy. "
            "Try counting three of four equal slices together at home."
        )

    def chat_with_lexi(self, context: ProviderContext) -> LexiContent:
        return LexiContent(
            text="Let's count three pizza slices together.", suggested_tool="request_hint"
        )

    def generate_weekly_summary(self, context: ProviderContext) -> WeeklyNarrative:
        noticed = (
            f"{context.child_name} started short activities more independently this week."
            if (context.independence_delta or 0) > 0
            else f"{context.child_name} kept exploring missions this week."
        )
        strategy = context.most_effective_strategy
        suggestion = (
            f"Try offering {strategy} for the next tricky task."
            if strategy
            else "Try breaking the next task into three small steps."
        )
        return WeeklyNarrative(wiggle_noticed=noticed, parent_suggestion=suggestion)
