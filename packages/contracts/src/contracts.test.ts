import { describe, expect, it } from "vitest";

import {
  assertLearnerTwin,
  validateLearningEvent,
  type LearnerTwin,
  type LearningEvent,
} from "./index.js";

const twin: LearnerTwin = {
  mastery: { "fractions.three_quarters": 0.5 },
  initiationFriction: 0.5,
  persistenceFriction: 0.5,
  cognitiveLoad: 0.5,
  transitionFriction: 0.5,
  fatigueEstimate: 0.5,
  modalityEffectiveness: {
    visual: 0.5,
    voice: 0.5,
    gesture: 0.5,
    movement: 0.5,
    story: 0.5,
    text: 0.5,
  },
  strategyEffectiveness: {
    chunking: 0.5,
    movementBreak: 0.5,
    visualHint: 0.5,
    voiceHint: 0.5,
    choice: 0.5,
  },
};

describe("Wiggle contracts", () => {
  it("preserves bounded observed completion input separately from the intended mode", () => {
    const event = {
      id: "completed", childId: "child-1", sessionId: "session-1",
      occurredAt: "2026-09-12T00:00:00Z", type: "mission_completed",
      payload: { kind: "mission_completed", objective: "fractions.three_quarters", correctness: .92, mode: "visual" },
    };
    expect(validateLearningEvent(event)).toEqual(event);
    for (const inputMethod of ["buttons", "gesture"]) {
      const observed = { ...event, payload: { ...event.payload, intendedMode: "visual_gesture", inputMethod } };
      expect(validateLearningEvent(observed)).toEqual(observed);
    }
    expect(() => validateLearningEvent({ ...event, payload: { ...event.payload, inputMethod: "camera-enabled" } })).toThrow("inputMethod");
    expect(() => validateLearningEvent({ ...event, payload: { ...event.payload, intendedMode: "unknown" } })).toThrow("intendedMode");
  });

  it("validates optional bounded telemetry and self reports", () => {
    const event = {
      id: "timing-1", childId: "child-1", sessionId: "session-1",
      occurredAt: "2026-09-11T00:00:00Z", type: "response_time_recorded",
      payload: { kind: "response_time_recorded", responseTimeMs: 19000 },
    };
    expect(validateLearningEvent(event)).toEqual(event);
    expect(() => validateLearningEvent({ ...event,
      payload: { ...event.payload, responseTimeMs: -1 },
    })).toThrow("responseTimeMs");
    expect(() => validateLearningEvent({ ...event,
      payload: { ...event.payload, difficulty: 2 },
    })).toThrow("difficulty");
    expect(() => validateLearningEvent({ ...event, payload: null })).toThrow("payload.kind");
  });
  it("accepts semantic gesture telemetry without accepting sensor data", () => {
    const focused = {
      id: "gesture-1", childId: "child-1", sessionId: "session-1",
      occurredAt: "2026-09-12T00:00:00Z", type: "gesture_slice_focused",
      payload: { kind: "gesture_slice_focused", gesture: "point", objectId: "pizza-slice-2" },
    } as const;
    expect(validateLearningEvent(focused)).toEqual(focused);
    expect(validateLearningEvent({
      ...focused,
      id: "gesture-2",
      type: "gesture_task_completed",
      payload: { kind: "gesture_task_completed", gesture: "pinch", objectId: "pizza-slice-3", success: true },
    })).toMatchObject({ type: "gesture_task_completed" });
    expect(() => validateLearningEvent({
      ...focused,
      payload: { ...focused.payload, objectId: "pizza-slice-99" },
    })).toThrow("objectId");
    expect(() => validateLearningEvent({
      ...focused,
      payload: { ...focused.payload, landmarks: [[0, 0, 0]] },
    })).toThrow("not allowed");
  });
  it("accepts bounded learner-twin values", () => {
    expect(assertLearnerTwin(twin)).toEqual(twin);
    expect(() => assertLearnerTwin({ ...twin, fatigueEstimate: 1.1 })).toThrow("fatigueEstimate");
  });

  it("uses payload discriminants and UTC timestamps", () => {
    const event = validateLearningEvent({
      id: "event-1",
      childId: "child-1",
      sessionId: "session-1",
      occurredAt: "2026-09-11T00:00:00.000Z",
      type: "mission_completed",
      payload: {
        kind: "mission_completed",
        objective: "fractions.three_quarters",
        correctness: 0.92,
        mode: "visual_gesture",
      },
    });

    if (event.type !== "mission_completed") {
      throw new Error("Expected the validated fixture to be a completion event");
    }
    expect(event.payload.correctness).toBe(0.92);
    expect(() =>
      validateLearningEvent({ ...event, occurredAt: "2026-09-11T00:00:00+08:00" }),
    ).toThrow("UTC");
    expect(() =>
      validateLearningEvent({ ...event, type: "stuck_requested" }),
    ).toThrow("must match payload.kind");

    // @ts-expect-error Generic event type must determine the payload discriminant.
    const staticallyMismatchedEvent: LearningEvent = {
      id: "event-2",
      childId: "child-1",
      sessionId: "session-1",
      occurredAt: "2026-09-11T00:00:00Z",
      type: "session_started",
      payload: { kind: "task_started" },
    };
    expect(() => validateLearningEvent(staticallyMismatchedEvent)).toThrow(
      "must match payload.kind",
    );
  });

  it("accepts and rejects the same UTC wire timestamps as the Python contract", () => {
    for (const occurredAt of [
      "2026-09-11T00:00:00+00:00",
      "2026-09-11T08:00:00+08:00",
      "2026-09-11T00:00Z",
    ]) {
      expect(() =>
        validateLearningEvent({
          id: "event-3",
          childId: "child-1",
          sessionId: "session-1",
          occurredAt,
          type: "stuck_requested",
          payload: { kind: "stuck_requested" },
        }),
      ).toThrow("UTC");
    }
    expect(
      validateLearningEvent({
        id: "event-4",
        childId: "child-1",
        sessionId: "session-1",
        occurredAt: "2026-09-11T00:00:00Z",
        type: "stuck_requested",
        payload: { kind: "stuck_requested" },
      }).occurredAt,
    ).toBe("2026-09-11T00:00:00Z");
  });

  it("rejects invalid Zulu calendar dates instead of normalizing them", () => {
    for (const occurredAt of [
      "2026-02-29T00:00:00Z",
      "2024-02-30T00:00:00Z",
      "2026-04-31T00:00:00Z",
    ]) {
      expect(() =>
        validateLearningEvent({
          id: "event-calendar",
          childId: "child-1",
          sessionId: "session-1",
          occurredAt,
          type: "stuck_requested",
          payload: { kind: "stuck_requested" },
        }),
      ).toThrow("UTC");
    }
  });
});
