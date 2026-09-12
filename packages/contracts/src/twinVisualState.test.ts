import { describe, expect, it } from "vitest";
import { getTwinVisualState, twinVisualCopy, type TwinVisualState } from "./twinVisualState.js";
import type { LearnerTwin } from "./twin.js";

const base: LearnerTwin = {
  mastery: { fractions: 0.5 },
  initiationFriction: 0.3,
  persistenceFriction: 0.3,
  cognitiveLoad: 0.3,
  transitionFriction: 0.3,
  fatigueEstimate: 0.3,
  modalityEffectiveness: { visual: 0.5, voice: 0.5, gesture: 0.5, movement: 0.5, story: 0.5, text: 0.5 },
  strategyEffectiveness: { chunking: 0.5, movementBreak: 0.5, visualHint: 0.5, voiceHint: 0.5, choice: 0.5 },
};

describe("getTwinVisualState", () => {
  it("defaults to ready", () => {
    expect(getTwinVisualState(base)).toBe("ready");
  });

  it("prioritizes fatigue as needs_reset over everything else", () => {
    const twin = { ...base, fatigueEstimate: 0.9, cognitiveLoad: 0.9, initiationFriction: 0.9, mastery: { fractions: 0.95 } };
    expect(getTwinVisualState(twin)).toBe("needs_reset");
  });

  it("flags high cognitive load as overwhelmed before stuck or mastery", () => {
    const twin = { ...base, cognitiveLoad: 0.85, initiationFriction: 0.85, mastery: { fractions: 0.95 } };
    expect(getTwinVisualState(twin)).toBe("overwhelmed");
  });

  it("flags high initiation friction as stuck", () => {
    const twin = { ...base, initiationFriction: 0.72 };
    expect(getTwinVisualState(twin)).toBe("stuck");
  });

  it("flags very high mastery as mastered", () => {
    const twin = { ...base, mastery: { fractions: 0.92 } };
    expect(getTwinVisualState(twin)).toBe("mastered");
  });

  it("flags a recent mastery jump as progressing, given a previous snapshot", () => {
    const previous = { ...base, mastery: { fractions: 0.5 } };
    const twin = { ...base, mastery: { fractions: 0.62 } };
    expect(getTwinVisualState(twin, previous)).toBe("progressing");
  });

  it("does not report progressing without a previous snapshot", () => {
    const twin = { ...base, mastery: { fractions: 0.62 } };
    expect(getTwinVisualState(twin)).toBe("ready");
  });

  it("never mentions a number in any state's copy", () => {
    const states = Object.keys(twinVisualCopy) as TwinVisualState[];
    for (const state of states) {
      expect(twinVisualCopy[state]).not.toMatch(/\d/);
    }
  });
});
