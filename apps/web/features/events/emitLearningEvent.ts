import type { LearningEvent, LearningEventPayload } from "@wiggle/contracts";
import type { EventQueue, QueuedEvent } from "./eventQueue";

export function emitLearningEvent(queue: EventQueue, session: { childId: string; sessionId: string }, payload: LearningEventPayload, transport: QueuedEvent["transport"], id = crypto.randomUUID()): LearningEvent {
  const event = { id, childId: session.childId, sessionId: session.sessionId, occurredAt: new Date().toISOString(), type: payload.kind, payload } as LearningEvent;
  queue.enqueue(event, transport);
  return event;
}
