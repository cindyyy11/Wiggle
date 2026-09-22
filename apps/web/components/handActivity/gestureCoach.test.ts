import { describe, expect, it } from "vitest";
import {
  expectedHint,
  initialNudgeState,
  nextNudge,
  wrongGestureLine,
  type CoachMode,
} from "./gestureCoach";

const discover: CoachMode = { kind: "bench", phase: "discover", holding: false };
const matchIdle: CoachMode = { kind: "bench", phase: "match", holding: false };
const matchHold: CoachMode = { kind: "bench", phase: "match", holding: true };
const asking: CoachMode = { kind: "answer", phase: "asking" };

describe("expectedHint", () => {
  it("maps bench and answer phases to the kid-facing glyph", () => {
    expect(expectedHint(discover)).toBe("point");
    expect(expectedHint(matchIdle)).toBe("pinch");
    expect(expectedHint(matchHold)).toBe("open_palm");
    expect(expectedHint({ kind: "bench", phase: "done", holding: false })).toBe("none");
    expect(expectedHint(asking)).toBe("hold");
    expect(expectedHint({ kind: "answer", phase: "done" })).toBe("none");
    expect(expectedHint({ kind: "answer", phase: "celebrating" })).toBe("none");
  });
});

describe("wrongGestureLine", () => {
  it("nudges discover when the kid pinches or opens the palm", () => {
    expect(wrongGestureLine(discover, "pinch")).toBe("Try pointing your finger to discover!");
    expect(wrongGestureLine(discover, "open_palm")).toBe("Try pointing your finger to discover!");
    expect(wrongGestureLine(discover, "point")).toBeNull();
    expect(wrongGestureLine(discover, null)).toBeNull();
  });

  it("nudges match when idle and the kid points", () => {
    expect(wrongGestureLine(matchIdle, "point")).toBe("Pinch your fingers to pick it up!");
    expect(wrongGestureLine(matchIdle, "pinch")).toBeNull();
  });

  it("nudges match when holding and the kid pinches or points", () => {
    expect(wrongGestureLine(matchHold, "pinch")).toBe("Open your palm over its home to place it!");
    expect(wrongGestureLine(matchHold, "point")).toBe("Open your palm over its home to place it!");
    expect(wrongGestureLine(matchHold, "open_palm")).toBeNull();
  });

  it("does not nudge answer-hold for any classified gesture (dwell uses presence)", () => {
    expect(wrongGestureLine(asking, "pinch")).toBeNull();
    expect(wrongGestureLine(asking, "point")).toBeNull();
  });
});

describe("nextNudge", () => {
  it("delivers a wrong-gesture tip once per streak, then stays quiet until reset", () => {
    let state = initialNudgeState(discover);
    const first = nextNudge(state, discover, "pinch");
    expect(first.nudge).toBe("Try pointing your finger to discover!");
    state = first.state;
    expect(nextNudge(state, discover, "pinch").nudge).toBeNull();
  });

  it("re-arms after a correct gesture, then can nudge again", () => {
    let state = nextNudge(initialNudgeState(discover), discover, "pinch").state;
    state = nextNudge(state, discover, "point").state;
    expect(nextNudge(state, discover, "pinch").nudge).toBe("Try pointing your finger to discover!");
  });

  it("re-arms when the coach phase changes", () => {
    const state = nextNudge(initialNudgeState(discover), discover, "pinch").state;
    const switched = nextNudge(state, matchIdle, "point");
    expect(switched.nudge).toBe("Pinch your fingers to pick it up!");
  });

  it("re-arms when tracking is lost (null gesture) after a delivered nudge", () => {
    let state = nextNudge(initialNudgeState(discover), discover, "pinch").state;
    state = nextNudge(state, discover, null).state;
    expect(nextNudge(state, discover, "pinch").nudge).toBe("Try pointing your finger to discover!");
  });
});
