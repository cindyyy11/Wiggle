import { describe, expect, it } from "vitest";
import {
  constellationStarIds,
  getConstellationStars,
  newlyUnlockedStars,
  type PlanetStarProgress,
} from "./constellation.js";
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

  it("keeps planet stars locked without planet progress", () => {
    const science = getConstellationStars(base).find(s => s.id === "science-explorer")!;
    expect(science.unlocked).toBe(false);
    expect(science.progress).toBe(0);
  });

  it("unlocks Science Explorer at four science lands and reports progress", () => {
    const progress: PlanetStarProgress = { scienceCompleted: 2, numeriaCompleted: 0 };
    const partial = getConstellationStars(base, progress).find(s => s.id === "science-explorer")!;
    expect(partial.unlocked).toBe(false);
    expect(partial.progress).toBeCloseTo(0.5);

    const full = getConstellationStars(base, { scienceCompleted: 4, numeriaCompleted: 0 }).find(s => s.id === "science-explorer")!;
    expect(full.unlocked).toBe(true);
    expect(full.progress).toBe(1);
  });

  it("does not unlock Twin stars from planet progress alone", () => {
    const stars = getConstellationStars(base, { scienceCompleted: 4, numeriaCompleted: 4 });
    expect(stars.find(s => s.id === "visual-explorer")!.unlocked).toBe(false);
    expect(stars.find(s => s.id === "numeria-explorer")!.unlocked).toBe(true);
  });
});
