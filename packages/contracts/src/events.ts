import { assertProbability } from "./twin.js";

export const eventTypes = [
  "session_started",
  "task_started",
  "first_interaction",
  "response_time_recorded",
  "answer_submitted",
  "retry_recorded",
  "hint_requested",
  "task_skipped",
  "mission_completed",
  "mission_abandoned",
  "stuck_requested",
  "reset_started",
  "reset_completed",
  "reality_mission_started",
  "reality_mission_completed",
  "mode_changed",
  "difficulty_self_reported",
  "parent_check_in",
] as const;

export type EventType = (typeof eventTypes)[number];
export type LearningMode =
  | "standard"
  | "visual"
  | "gesture"
  | "visual_gesture"
  | "chunk"
  | "voice"
  | "movement"
  | "story";

export interface StuckRequestedPayload {
  kind: "stuck_requested";
  mode?: LearningMode;
}

export interface MissionCompletedPayload {
  kind: "mission_completed";
  objective: string;
  correctness: number;
  mode: LearningMode;
  strategy?: "chunking" | "movement_break" | "visual_hint" | "voice_hint" | "choice";
}

export type GenericEventType = Exclude<EventType, "stuck_requested" | "mission_completed">;

export interface GenericEventPayload<Type extends GenericEventType> {
  kind: Type;
  difficulty?: number | null;
  responseTimeMs?: number | null;
  mode?: LearningMode | null;
}

export type LearningEventPayload =
  | StuckRequestedPayload
  | MissionCompletedPayload
  | GenericEventPayload<GenericEventType>;

export type LearningEvent =
  | EventEnvelope<"stuck_requested", StuckRequestedPayload>
  | EventEnvelope<"mission_completed", MissionCompletedPayload>
  | {
      [Type in GenericEventType]: EventEnvelope<Type, GenericEventPayload<Type>>;
    }[GenericEventType];

interface EventEnvelope<Type extends EventType, Payload extends LearningEventPayload> {
  id: string;
  childId: string;
  sessionId: string;
  occurredAt: string;
  type: Type;
  payload: Payload;
}

const learningModes: readonly LearningMode[] = [
  "standard",
  "visual",
  "gesture",
  "visual_gesture",
  "chunk",
  "voice",
  "movement",
  "story",
];
const strategyNames = ["chunking", "movement_break", "visual_hint", "voice_hint", "choice"] as const;
const zuluTimestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?Z$/;

function assertUtcTimestamp(value: string): void {
  const match = zuluTimestampPattern.exec(value);
  if (match === null) {
    throw new TypeError("occurredAt must be an ISO-8601 UTC timestamp ending in Z");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (
    year === 0 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new TypeError("occurredAt must be an ISO-8601 UTC timestamp ending in Z");
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Runtime validation for untrusted event JSON; returns the same immutable input reference. */
export function validateLearningEvent(event: unknown): LearningEvent {
  if (event === null || typeof event !== "object") {
    throw new TypeError("event must be an object");
  }
  const candidate = event as Partial<LearningEvent>;
  if (
    typeof candidate.id !== "string" ||
    !candidate.id ||
    typeof candidate.childId !== "string" ||
    !candidate.childId ||
    typeof candidate.sessionId !== "string" ||
    !candidate.sessionId
  ) {
    throw new TypeError("id, childId, and sessionId are required");
  }
  if (typeof candidate.occurredAt !== "string") {
    throw new TypeError("occurredAt is required");
  }
  assertUtcTimestamp(candidate.occurredAt);
  if (!eventTypes.includes(candidate.type as EventType)) {
    throw new TypeError("type must be a supported event type");
  }
  const payload = candidate.payload as Partial<LearningEventPayload> | undefined;
  if (payload == null || typeof payload !== "object" || typeof payload.kind !== "string") {
    throw new TypeError("payload.kind is required");
  }
  if (candidate.type !== payload.kind) {
    throw new TypeError("type must match payload.kind");
  }
  if (payload.kind === "mission_completed") {
    if (typeof payload.objective !== "string" || !payload.objective) {
      throw new TypeError("payload.objective is required");
    }
    assertProbability(payload.correctness, "payload.correctness");
    if (!learningModes.includes(payload.mode as LearningMode)) {
      throw new TypeError("payload.mode must be a supported learning mode");
    }
    if (
      payload.strategy !== undefined &&
      !strategyNames.includes(payload.strategy as (typeof strategyNames)[number])
    ) {
      throw new TypeError("payload.strategy must be a supported strategy");
    }
  }
  if (
    payload.kind === "stuck_requested" &&
    payload.mode !== undefined &&
    !learningModes.includes(payload.mode as LearningMode)
  ) {
    throw new TypeError("payload.mode must be a supported learning mode");
  }
  if (payload.kind !== "stuck_requested" && payload.kind !== "mission_completed") {
    const generic = payload as Partial<GenericEventPayload<GenericEventType>>;
    if (generic.difficulty != null) assertProbability(generic.difficulty, "payload.difficulty");
    if (generic.responseTimeMs != null && (
      !Number.isInteger(generic.responseTimeMs) || generic.responseTimeMs < 0 ||
      generic.responseTimeMs > 86400000
    )) throw new TypeError("payload.responseTimeMs must be bounded milliseconds");
    if (payload.mode != null && !learningModes.includes(payload.mode)) {
      throw new TypeError("payload.mode must be a supported learning mode");
    }
  }
  return candidate as LearningEvent;
}
