import { describe, expect, it } from "vitest";
import { constellationStarIds, getConstellationStars, newlyUnlockedStars } from "./constellation.js";
import type { LearnerTwin } from "./twin.js";

const base: LearnerTwin = {
  mastery: { fractions: 0.5 },
  initiationFriction: 0.5,
  persistenceFriction: 0.5,
  cognitiveLoad: 0.5,
  transitionFriction: 0.5,
  fatigueEstimate: 0.5,
  modalityEffectiveness: { visual: 0.5, voice: 0.5, gesture: 0.5, movement: 0.5, story: 0.5, text: 0.5 },
  strategyEffectiveness: { chunking: 0.5, movementBreak: 0.5, visualHint: 0.5, voiceHint: 0.5, choice: 0.5 },
};

describe("getConstellationStars", () => {
  it("returns every catalogued star, locked by default", () => {
    const stars = getConstellationStars(base);
    expect(stars.map(star => star.id).sort()).toEqual([...constellationStarIds].sort());
    expect(stars.every(star => !star.unlocked)).toBe(true);
  });

  it("never renders a percentage-shaped description", () => {
    for (const star of getConstellationStars(base)) {
      expect(star.description).not.toMatch(/%/);
      expect(star.title).not.toMatch(/%/);
    }
  });

  it("unlocks Visual Explorer once visual effectiveness clears the threshold", () => {
    const twin = { ...base, modalityEffectiveness: { ...base.modalityEffectiveness, visual: 0.82 } };
    const star = getConstellationStars(twin).find(item => item.id === "visual-explorer")!;
    expect(star.unlocked).toBe(true);
    expect(star.progress).toBe(1);
  });

  it("unlocks Brave Beginner on low initiation friction (an inverted threshold)", () => {
    const twin = { ...base, initiationFriction: 0.1 };
    const star = getConstellationStars(twin).find(item => item.id === "brave-beginner")!;
    expect(star.unlocked).toBe(true);
  });

  it("unlocks Puzzle Solver from the strongest mastery objective", () => {
    const twin = { ...base, mastery: { fractions: 0.4, vocabulary: 0.9 } };
    const star = getConstellationStars(twin).find(item => item.id === "puzzle-solver")!;
    expect(star.unlocked).toBe(true);
  });

  it("reports only stars unlocked now that were not unlocked before", () => {
    const twin = { ...base, modalityEffectiveness: { ...base.modalityEffectiveness, visual: 0.9, voice: 0.9 } };
    const alreadySeen = new Set(["voice-navigator"] as const);
    const fresh = newlyUnlockedStars(twin, alreadySeen);
    expect(fresh.map(star => star.id)).toEqual(["visual-explorer"]);
  });
});
