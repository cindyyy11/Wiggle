// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
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

function seedPlanetsComplete(childId: string) {
  window.localStorage.setItem(
    `wiggle:planet-complete:${childId}:science`,
    JSON.stringify(["magnet-lab", "animals", "colors", "life-cycle"]),
  );
  window.localStorage.setItem(
    `wiggle:planet-complete:${childId}:numeria`,
    JSON.stringify(["fraction-forest", "number-valley", "geometry-ridge", "crystal-crater"]),
  );
}

describe("getNextStep", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("points the nearest locked star at a real, clickable place", () => {
    const step = getNextStep(base, "child-1");
    expect(step?.title).toBe("Visual Explorer");
    expect(step?.description).toBe("Pictures and diagrams help you learn fast.");
    expect(step?.actionLabel).toBe("Go to Colors Canyon");
    expect(step?.href).toBe("/?child=child-1&world=science&zone=colors");
  });

  it("returns null once every star is unlocked, instead of a stale suggestion", () => {
    seedPlanetsComplete("child-1");
    expect(getNextStep(mastered, "child-1")).toBeNull();
  });

  it("offers a different place when the closest star was already suggested", () => {
    const first = getNextStep(base, "child-1");
    expect(first?.missionName).toBe("Colors Canyon");
    const second = getNextStep(base, "child-1", first?.missionName);
    expect(second?.missionName).not.toBe("Colors Canyon");
    expect(second?.title).toBe("Brave Beginner");
    expect(second?.missionName).toBe("Life Cycle Garden");
  });

  it("repeats the suggestion rather than fabricating an alternative when there is only one", () => {
    seedPlanetsComplete("child-1");
    const onlyBraveBeginnerLocked: LearnerTwin = { ...mastered, initiationFriction: 0.5 };
    const step = getNextStep(onlyBraveBeginnerLocked, "child-1", "Life Cycle Garden");
    expect(step?.missionName).toBe("Life Cycle Garden");
  });

  it("never suggests Magnet Lab, even when Movement Explorer is the nearest locked star", () => {
    seedPlanetsComplete("child-1");
    const movementNearestButExcluded: LearnerTwin = {
      ...mastered,
      modalityEffectiveness: { ...mastered.modalityEffectiveness, movement: 0.65, visual: 0.1 },
      strategyEffectiveness: { ...mastered.strategyEffectiveness, movementBreak: 0.65 },
    };
    const step = getNextStep(movementNearestButExcluded, "child-1");
    expect(step?.missionName).not.toBe("Magnet Lab");
    expect(step?.missionName).toBe("Colors Canyon");
  });

  it("returns null when Movement Explorer is the only locked star, instead of suggesting Magnet Lab", () => {
    seedPlanetsComplete("child-1");
    const onlyMovementLocked: LearnerTwin = {
      ...mastered,
      modalityEffectiveness: { ...mastered.modalityEffectiveness, movement: 0.65 },
      strategyEffectiveness: { ...mastered.strategyEffectiveness, movementBreak: 0.65 },
    };
    expect(getNextStep(onlyMovementLocked, "child-1")).toBeNull();
  });

  it("never suggests Fraction Forest, even when a Numeria star is the only locked one", () => {
    seedPlanetsComplete("child-1");
    const onlyTinyStepLocked: LearnerTwin = {
      ...mastered,
      strategyEffectiveness: { ...mastered.strategyEffectiveness, chunking: 0.5 },
    };
    expect(getNextStep(onlyTinyStepLocked, "child-1")).toBeNull();
    window.localStorage.clear();
    const tinyStepNearest: LearnerTwin = { ...base, strategyEffectiveness: { ...base.strategyEffectiveness, chunking: 0.65 }, modalityEffectiveness: { ...base.modalityEffectiveness, visual: 0.1 } };
    expect(getNextStep(tinyStepNearest, "child-1")?.missionName).not.toBe("Fraction Forest");
  });
});
