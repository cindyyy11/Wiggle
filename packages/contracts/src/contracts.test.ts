import { describe, expect, it } from "vitest";

import { assertLearnerTwin, validateLearningEvent, type LearnerTwin } from "./index.js";

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
  });
});
