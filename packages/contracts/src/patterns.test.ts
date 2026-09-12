import { describe, expect, it } from "vitest";
import { getLearnerPatterns } from "./patterns.js";
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

describe("getLearnerPatterns", () => {
  it("treats untouched neutral signals as needing more data", () => {
    const { needsMoreData, effective, improving } = getLearnerPatterns(base);
    expect(needsMoreData.length).toBeGreaterThan(0);
    expect(effective).toEqual([]);
    expect(improving).toEqual([]);
  });

  it("classifies a signal above threshold as effective, never as needing data", () => {
    const twin = { ...base, modalityEffectiveness: { ...base.modalityEffectiveness, gesture: 0.88 } };
    const patterns = getLearnerPatterns(twin);
    expect(patterns.effective).toContain("gesture");
    expect(patterns.needsMoreData).not.toContain("gesture");
  });

  it("classifies a rising-but-not-yet-effective signal as improving", () => {
    const previous = { ...base, strategyEffectiveness: { ...base.strategyEffectiveness, chunking: 0.5 } };
    const twin = { ...base, strategyEffectiveness: { ...base.strategyEffectiveness, chunking: 0.6 } };
    const patterns = getLearnerPatterns(twin, previous);
    expect(patterns.improving).toContain("chunking");
    expect(patterns.effective).not.toContain("chunking");
  });

  it("never produces a medical or diagnostic-sounding label", () => {
    const patterns = getLearnerPatterns(base);
    const all = [...patterns.effective, ...patterns.improving, ...patterns.needsMoreData].join(" ");
    expect(all).not.toMatch(/adhd|attention|disorder|diagnos/i);
  });
});
