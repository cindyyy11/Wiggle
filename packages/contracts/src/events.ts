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
  "gesture_slice_focused",
  "gesture_slice_placed",
  "gesture_slice_returned",
  "gesture_lexi_opened",
  "gesture_task_completed",
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
export type CompletionInput = "buttons" | "gesture";
export const gestureObjectIds = [
  "pizza-slice-1",
  "pizza-slice-2",
  "pizza-slice-3",
  "pizza-slice-4",
  "pizza-plate",
  "lexi-beacon",
] as const;
export type GestureObjectId = (typeof gestureObjectIds)[number];
export type GestureName = "point" | "pinch" | "fist" | "open_palm";
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
  intendedMode?: LearningMode;
  inputMethod?: CompletionInput;
  strategy?: "chunking" | "movement_break" | "visual_hint" | "voice_hint" | "choice";
}

export interface GestureSliceFocusedPayload {
  kind: "gesture_slice_focused";
  gesture: "point";
  objectId: Extract<GestureObjectId, `pizza-slice-${number}`>;
}

export interface GestureSlicePlacedPayload {
  kind: "gesture_slice_placed";
  gesture: Extract<GestureName, "pinch" | "fist">;
  objectId: Extract<GestureObjectId, `pizza-slice-${number}`>;
  success: boolean;
}

export interface GestureSliceReturnedPayload {
  kind: "gesture_slice_returned";
  gesture: Extract<GestureName, "pinch" | "fist">;
  objectId: Extract<GestureObjectId, `pizza-slice-${number}`>;
  success: false;
}

export interface GestureLexiOpenedPayload {
  kind: "gesture_lexi_opened";
  gesture: "open_palm";
  objectId: "lexi-beacon";
}

export interface GestureTaskCompletedPayload {
  kind: "gesture_task_completed";
  gesture: Extract<GestureName, "pinch" | "fist">;
  objectId: Extract<GestureObjectId, `pizza-slice-${number}`>;
  success: true;
}

export type GestureEventPayload =
  | GestureSliceFocusedPayload
  | GestureSlicePlacedPayload
  | GestureSliceReturnedPayload
  | GestureLexiOpenedPayload
  | GestureTaskCompletedPayload;

export type GenericEventType = Exclude<EventType, "stuck_requested" | "mission_completed" | GestureEventPayload["kind"]>;

export interface GenericEventPayload<Type extends GenericEventType> {
  kind: Type;
  difficulty?: number | null;
  responseTimeMs?: number | null;
  mode?: LearningMode | null;
}

export type LearningEventPayload =
  | StuckRequestedPayload
  | MissionCompletedPayload
  | GestureEventPayload
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

function assertPayloadKeys(payload: object, allowed: readonly string[]): void {
  for (const key of Object.keys(payload)) {
    if (!allowed.includes(key)) throw new TypeError(`payload.${key} is not allowed`);
  }
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
    assertPayloadKeys(payload, ["kind", "objective", "correctness", "mode", "intendedMode", "inputMethod", "strategy"]);
    if (typeof payload.objective !== "string" || !payload.objective) {
      throw new TypeError("payload.objective is required");
    }
    assertProbability(payload.correctness, "payload.correctness");
    if (!learningModes.includes(payload.mode as LearningMode)) {
      throw new TypeError("payload.mode must be a supported learning mode");
    }
    if (payload.intendedMode !== undefined && !learningModes.includes(payload.intendedMode)) {
      throw new TypeError("payload.intendedMode must be a supported learning mode");
    }
    if (payload.inputMethod !== undefined && !["buttons", "gesture"].includes(payload.inputMethod)) {
      throw new TypeError("payload.inputMethod must identify buttons or recognized gesture input");
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
  const gesturePayload = payload as Partial<GestureEventPayload>;
  if (gesturePayload.kind === "gesture_slice_focused") {
    assertPayloadKeys(gesturePayload, ["kind", "gesture", "objectId"]);
    if (gesturePayload.gesture !== "point" || !isSliceObjectId(gesturePayload.objectId)) throw new TypeError("gesture focus requires a known slice objectId");
  }
  if (gesturePayload.kind === "gesture_slice_placed") {
    assertPayloadKeys(gesturePayload, ["kind", "gesture", "objectId", "success"]);
    if (!isPlacementGesture(gesturePayload.gesture) || !isSliceObjectId(gesturePayload.objectId) || typeof gesturePayload.success !== "boolean") throw new TypeError("gesture placement requires a known slice objectId and boolean success");
  }
  if (gesturePayload.kind === "gesture_slice_returned") {
    assertPayloadKeys(gesturePayload, ["kind", "gesture", "objectId", "success"]);
    if (!isPlacementGesture(gesturePayload.gesture) || !isSliceObjectId(gesturePayload.objectId) || gesturePayload.success !== false) throw new TypeError("gesture return requires a known slice objectId and false success");
  }
  if (gesturePayload.kind === "gesture_lexi_opened") {
    assertPayloadKeys(gesturePayload, ["kind", "gesture", "objectId"]);
    if (gesturePayload.gesture !== "open_palm" || gesturePayload.objectId !== "lexi-beacon") throw new TypeError("gesture Lexi event requires the Lexi beacon");
  }
  if (gesturePayload.kind === "gesture_task_completed") {
    assertPayloadKeys(gesturePayload, ["kind", "gesture", "objectId", "success"]);
    if (!isPlacementGesture(gesturePayload.gesture) || !isSliceObjectId(gesturePayload.objectId) || gesturePayload.success !== true) throw new TypeError("gesture completion requires a known slice objectId and true success");
  }
  if (payload.kind !== "stuck_requested" && payload.kind !== "mission_completed") {
    const generic = payload as Partial<GenericEventPayload<GenericEventType>>;
    if (generic.difficulty != null) assertProbability(generic.difficulty, "payload.difficulty");
    if (generic.responseTimeMs != null && (
      !Number.isInteger(generic.responseTimeMs) || generic.responseTimeMs < 0 ||
      generic.responseTimeMs > 86400000
    )) throw new TypeError("payload.responseTimeMs must be bounded milliseconds");
    if (generic.mode != null && !learningModes.includes(generic.mode)) {
      throw new TypeError("payload.mode must be a supported learning mode");
    }
  }
  return candidate as LearningEvent;
}

function isSliceObjectId(value: unknown): value is Extract<GestureObjectId, `pizza-slice-${number}`> {
  return typeof value === "string" && value.startsWith("pizza-slice-") && gestureObjectIds.includes(value as GestureObjectId);
}

function isPlacementGesture(value: unknown): value is Extract<GestureName, "pinch" | "fist"> {
  return value === "pinch" || value === "fist";
}
