import { describe, expect, it } from "vitest";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { answerStatusForFrame, benchStatusForFrame, staleHoldToCancel, trackedBenchPoint } from "./handBenchFrame";

const frame = (patch: Partial<HandTrackingLatest> = {}): HandTrackingLatest => ({
  pointer: { x: 0, y: 0 }, gesture: "point", handedness: "Right", confidence: .9, isTracking: true, ...patch,
});

describe("trackedBenchPoint", () => {
  it("maps a confident tracked hand onto the bench", () => {
    expect(trackedBenchPoint(frame({ pointer: { x: 1, y: -1 } }))).toEqual({ x: .93, y: .07 });
  });

  it("returns null when the hand is not reliably seen", () => {
    expect(trackedBenchPoint(frame({ isTracking: false }))).toBeNull();
    expect(trackedBenchPoint(frame({ confidence: .2 }))).toBeNull();
    expect(trackedBenchPoint(frame({ pointer: null }))).toBeNull();
    expect(trackedBenchPoint(frame({ pointer: { x: Number.NaN, y: 0 } }))).toBeNull();
  });
});

describe("staleHoldToCancel", () => {
  it("returns the held id when the lesson holds an item the controller does not", () => {
    expect(staleHoldToCancel("frog", null)).toBe("frog");
  });

  it("returns null when the lesson and the controller hold the same item", () => {
    expect(staleHoldToCancel("frog", "frog")).toBeNull();
  });

  it("returns null when the lesson holds nothing", () => {
    expect(staleHoldToCancel(null, null)).toBeNull();
    expect(staleHoldToCancel(null, "frog")).toBeNull();
  });

  it("returns the lesson's id when the controller holds a different item", () => {
    expect(staleHoldToCancel("frog", "horse")).toBe("frog");
  });
});

describe("benchStatusForFrame", () => {
  it("asks for a hand when none is seen, and reassures while holding", () => {
    expect(benchStatusForFrame("discover", false, false)).toBe("Show your hand to the camera.");
    expect(benchStatusForFrame("match", false, true)).toBe("Tracking paused. Keep your hand in view.");
  });

  it("gives one clear instruction per phase", () => {
    expect(benchStatusForFrame("discover", true, false)).toBe("Point at an item to discover it.");
    expect(benchStatusForFrame("match", true, false)).toBe("Pinch an item to pick it up.");
    expect(benchStatusForFrame("match", true, true)).toBe("Open your palm over a target to place it.");
    expect(benchStatusForFrame("done", true, false)).toBe("All done!");
  });
});

describe("answerStatusForFrame", () => {
  it("asks for a hand when none is seen, and gives one instruction while asking", () => {
    expect(answerStatusForFrame("asking", false)).toBe("Show your hand to the camera.");
    expect(answerStatusForFrame("asking", true)).toBe("Hold your hand over an answer.");
  });

  it("celebrates and finishes without needing a hand", () => {
    expect(answerStatusForFrame("celebrating", false)).toBe("Well done!");
    expect(answerStatusForFrame("celebrating", true)).toBe("Well done!");
    expect(answerStatusForFrame("done", false)).toBe("All done!");
  });
});
