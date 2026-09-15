import { describe, expect, it } from "vitest";
import type { LearnerTwin } from "@wiggle/contracts";
import { getNextStep } from "./nextStep";

const base: LearnerTwin = {
  mastery: { fractions: 0.1 },
  initiationFriction: 0.5,
  persistenceFriction: 0.5,
  cognitiveLoad: 0.5,
  transitionFriction: 0.5,
  fatigueEstimate: 0.5,
  modalityEffectiveness: { visual: 0.65, voice: 0.2, gesture: 0.2, movement: 0.2, story: 0.2, text: 0.2 },
  strategyEffectiveness: { chunking: 0.1, movementBreak: 0.1, visualHint: 0.1, voiceHint: 0.1, choice: 0.1 },
};

const mastered: LearnerTwin = {
  mastery: { fractions: 0.9 },
  initiationFriction: 0.2,
  persistenceFriction: 0.9,
  cognitiveLoad: 0.9,
  transitionFriction: 0.9,
  fatigueEstimate: 0.9,
  modalityEffectiveness: { visual: 0.9, voice: 0.9, gesture: 0.9, movement: 0.9, story: 0.9, text: 0.9 },
  strategyEffectiveness: { chunking: 0.9, movementBreak: 0.9, visualHint: 0.9, voiceHint: 0.9, choice: 0.9 },
};

describe("getNextStep", () => {
  it("points the nearest locked star at a real, clickable place", () => {
    const step = getNextStep(base, "child-1");
    expect(step?.title).toBe("Visual Explorer");
    expect(step?.description).toBe("Pictures and diagrams help you learn fast.");
    expect(step?.actionLabel).toBe("Go to Colors Canyon");
    expect(step?.href).toBe("/?child=child-1&world=science&zone=colors");
  });

  it("returns null once every star is unlocked, instead of a stale suggestion", () => {
    expect(getNextStep(mastered, "child-1")).toBeNull();
  });
});
