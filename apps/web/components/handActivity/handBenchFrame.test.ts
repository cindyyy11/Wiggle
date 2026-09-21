import { describe, expect, it } from "vitest";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { benchStatusForFrame, trackedBenchPoint } from "./handBenchFrame";

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
