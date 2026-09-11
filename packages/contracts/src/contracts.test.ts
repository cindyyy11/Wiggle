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
