// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { LearnerTwin } from "@wiggle/contracts";
import { getLastSeenTwin, saveSeenTwin } from "./twinMemory";

const twin: LearnerTwin = {
  mastery: { fractions: 0.5 },
  initiationFriction: 0.5,
  persistenceFriction: 0.5,
  cognitiveLoad: 0.5,
  transitionFriction: 0.5,
  fatigueEstimate: 0.5,
  modalityEffectiveness: { visual: 0.5, voice: 0.5, gesture: 0.5, movement: 0.5, story: 0.5, text: 0.5 },
  strategyEffectiveness: { chunking: 0.5, movementBreak: 0.5, visualHint: 0.5, voiceHint: 0.5, choice: 0.5 },
};

afterEach(() => window.localStorage.clear());

describe("twinMemory", () => {
  it("returns null when nothing has been saved yet", () => {
    expect(getLastSeenTwin("child-1")).toBeNull();
  });

  it("round-trips a saved twin", () => {
    saveSeenTwin("child-1", twin);
    expect(getLastSeenTwin("child-1")).toEqual(twin);
  });

  it("ignores corrupt or invalid stored data instead of throwing", () => {
    window.localStorage.setItem("wiggle:last-twin:child-2", "{not json");
    expect(getLastSeenTwin("child-2")).toBeNull();
    window.localStorage.setItem("wiggle:last-twin:child-3", JSON.stringify({ ...twin, cognitiveLoad: 5 }));
    expect(getLastSeenTwin("child-3")).toBeNull();
  });
});
