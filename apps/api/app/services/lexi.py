from datetime import UTC, datetime

from app.domain.models import EventType, GenericEventPayload, LearningEvent, StuckRequestedPayload
from app.domain.strategies import StrategyName
from app.providers.base import LexiContent, ProviderContext
from app.schemas import AppendEventsRequest, LexiRequest, LexiResponse, SelectAdaptationRequest
from app.services.adaptation import AdaptationService, mode_for_strategy
from app.services.safety import SAFETY_RESPONSE, detect_crisis
from app.services.sessions import SessionService, WorkflowError, stable_id


class LexiService:
    def __init__(self, sessions: SessionService) -> None:
        self.sessions = sessions

    def chat(self, request: LexiRequest, key: str | None) -> LexiResponse:
        session = self.sessions.session(request.session_id)
        if session["status"] == "abandoned":
            raise WorkflowError("session_closed", "Cannot use tools in an abandoned session")
        # The safety check runs before any provider call and before tool dispatch: no
        # prompt, tool schema, or "helpful" AI phrasing can override this redirect.
        if detect_crisis(request.message):
            return LexiResponse(content=SAFETY_RESPONSE)
        active = self.sessions.active_intervention(session)
        mode, _ = mode_for_strategy(str(active["selected_strategy"]))
        context = ProviderContext(message=request.message, mode=mode)
        tool = request.tool
        # External text can suggest tools, but it cannot authorize or execute one.
        if tool is None:
            return LexiResponse(content=self.sessions.provider.chat_with_lexi(context))
        if tool in {
            "report_learning_friction",
            "start_reset_station",
            "record_self_report",
            "switch_learning_mode",
        }:
            if not key:
                raise WorkflowError("idempotency_required", "Tool requires Idempotency-Key", 422)
        if tool == "get_current_twin":
            self.sessions.current_twin(str(session["child_id"]))
            return LexiResponse(
                content=LexiContent(text="Your learning constellation is growing."),
                executed_tool=tool,
                learning_label="Visual Explorer",
            )
        if tool == "get_current_mission":
            return LexiResponse(
                content=LexiContent(text="Let's make three quarters."),
                executed_tool=tool,
                activity=self.sessions.provider.generate_activity(context),
            )
        if tool == "request_hint":
            hint = self.sessions.provider.generate_hint(context)
            return LexiResponse(content=LexiContent(text=hint.text), executed_tool=tool)
        if tool == "create_reality_mission":
            return LexiResponse(
                content=LexiContent(text="Try a tiny mission away from the screen."),
                executed_tool=tool,
                reality_mission="Find four small objects. Put three in a group.",
            )
        if tool == "switch_learning_mode":
            if request.mode is None:
                raise WorkflowError("mode_required", "A mode is required for switching", 422)
            strategies: dict[str, StrategyName] = {
                "standard": "standard",
                "chunk": "chunked",
                "visual": "visual",
                "gesture": "gesture",
                "visual_gesture": "visual_gesture",
                "voice": "voice",
                "movement": "movement",
                "story": "story",
            }
            assert key is not None
            selection = AdaptationService(self.sessions).select(
                SelectAdaptationRequest(
                    session_id=request.session_id, strategy=strategies[request.mode]
                ),
                f"lexi:{key}",
            )
            return LexiResponse(
                content=LexiContent(text="Let's try this way."),
                executed_tool=tool,
                mode=selection.mode,
                activity=selection.activity,
            )
        assert key is not None
        if tool == "record_self_report" and request.difficulty is None:
            raise WorkflowError("difficulty_required", "A difficulty value is required", 422)
        kind = {
            "report_learning_friction": EventType.STUCK_REQUESTED,
            "start_reset_station": EventType.RESET_STARTED,
            "record_self_report": EventType.DIFFICULTY_SELF_REPORTED,
        }[tool]
        event_id = stable_id(request.session_id, f"lexi:{tool}", key)
        existing = next(
            (
                event
                for event in self.sessions.repository.list_events(
                    str(session["child_id"]), session_id=request.session_id
                )
                if event.id == event_id
            ),
            None,
        )
        payload = (
            StuckRequestedPayload(mode=mode)
            if kind == EventType.STUCK_REQUESTED
            else GenericEventPayload.model_validate(
                {"kind": kind.value, "difficulty": request.difficulty}
            )
        )
        if existing is not None and tool == "record_self_report" and existing.payload != payload:
            raise WorkflowError("idempotency_conflict", "Self-report key was reused")
        event = existing or LearningEvent(
            id=event_id,
            child_id=str(session["child_id"]),
            session_id=request.session_id,
            occurred_at=datetime.now(UTC),
            event_type=kind,
            payload=payload,
        )
        self.sessions.append(AppendEventsRequest(events=(event,)))
        if tool == "report_learning_friction":
            selection = AdaptationService(self.sessions).select(
                SelectAdaptationRequest(session_id=request.session_id, strategy="chunked"),
                f"stuck:{key}",
            )
            return LexiResponse(
                content=LexiContent(text="Select three pizza slices."),
                executed_tool=tool,
                mode=selection.mode,
                activity=selection.activity,
            )
        text = (
            "Let's take a short stretch."
            if tool == "start_reset_station"
            else "Thanks for telling me. We can take one small step."
        )
        return LexiResponse(
            content=LexiContent(text=text),
            executed_tool=tool,
            reset_started=tool == "start_reset_station",
        )
