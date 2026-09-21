import { describe, expect, it } from "vitest";
import {
  benchHit,
  benchReducer,
  handPointerToBench,
  initialBenchState,
  type BenchAction,
  type BenchRules,
  type BenchState,
} from "./handBenchPlay";

const rules: BenchRules = {
  itemIds: ["a", "b"],
  targetFor: (id) => ({ a: "left", b: "right" } as Record<string, string>)[id],
};
const run = (state: BenchState, ...actions: BenchAction[]) =>
  actions.reduce((next, action) => benchReducer(rules, next, action), state);
const inMatch = () => run(initialBenchState, { type: "observe", id: "a" }, { type: "observe", id: "b" }, { type: "advance" });

describe("handPointerToBench", () => {
  it("centres a centred hand and pads the edges", () => {
    expect(handPointerToBench({ x: 0, y: 0 })).toEqual({ x: .5, y: .5 });
    expect(handPointerToBench({ x: 1, y: 1 })).toEqual({ x: .93, y: .93 });
    expect(handPointerToBench({ x: -1, y: -1 })).toEqual({ x: .07, y: .07 });
  });

  it("keeps outliers on the bench", () => {
    expect(handPointerToBench({ x: 9, y: -9 })).toEqual({ x: 1, y: 0 });
  });
});

describe("benchHit", () => {
  const zones = [
    { id: "near", at: { x: .5, y: .5 }, radius: .1 },
    { id: "far", at: { x: .9, y: .9 }, radius: .1 },
  ];

  it("returns the zone the point is inside", () => {
    expect(benchHit({ x: .52, y: .5 }, zones)).toBe("near");
    expect(benchHit({ x: .9, y: .85 }, zones)).toBe("far");
  });

  it("returns null when the point is in no zone", () => {
    expect(benchHit({ x: .2, y: .2 }, zones)).toBeNull();
  });

  it("prefers the nearest zone when two overlap", () => {
    const overlapping = [
      { id: "a", at: { x: .5, y: .5 }, radius: .2 },
      { id: "b", at: { x: .6, y: .5 }, radius: .2 },
    ];
    expect(benchHit({ x: .58, y: .5 }, overlapping)).toBe("b");
  });
});

describe("benchReducer", () => {
  it("records each discovery once and ignores unknown items", () => {
    const once = run(initialBenchState, { type: "observe", id: "a" });
    expect(once.observed).toEqual(["a"]);
    expect(run(once, { type: "observe", id: "a" })).toBe(once);
    expect(run(once, { type: "observe", id: "zzz" })).toBe(once);
  });

  it("only advances to matching once everything has been discovered", () => {
    const partway = run(initialBenchState, { type: "observe", id: "a" });
    expect(run(partway, { type: "advance" }).phase).toBe("discover");
    expect(inMatch().phase).toBe("match");
  });

  it("does not let a child grab or discover in the wrong phase", () => {
    expect(run(initialBenchState, { type: "grab", id: "a" }).held).toBeNull();
    expect(run(inMatch(), { type: "observe", id: "a" }).phase).toBe("match");
    expect(run(inMatch(), { type: "observe", id: "a" }).observed).toEqual(["a", "b"]);
  });

  it("holds one item at a time", () => {
    const holding = run(inMatch(), { type: "grab", id: "a" });
    expect(holding.held).toBe("a");
    expect(run(holding, { type: "grab", id: "b" }).held).toBe("a");
  });

  it("scores a correct drop and keeps the phase until the last one", () => {
    const state = run(inMatch(), { type: "grab", id: "a" }, { type: "drop", id: "a", target: "left" });
    expect(state.matched).toEqual(["a"]);
    expect(state.held).toBeNull();
    expect(state.phase).toBe("match");
  });

  it("scores nothing on a wrong drop but lets go of the item", () => {
    const state = run(inMatch(), { type: "grab", id: "a" }, { type: "drop", id: "a", target: "right" });
    expect(state.matched).toEqual([]);
    expect(state.held).toBeNull();
  });

  it("finishes when every item is matched", () => {
    const done = run(
      inMatch(),
      { type: "grab", id: "a" }, { type: "drop", id: "a", target: "left" },
      { type: "grab", id: "b" }, { type: "drop", id: "b", target: "right" },
    );
    expect(done.phase).toBe("done");
    expect(done.matched).toEqual(["a", "b"]);
  });

  it("cannot grab an item that is already matched", () => {
    const state = run(inMatch(), { type: "grab", id: "a" }, { type: "drop", id: "a", target: "left" });
    expect(run(state, { type: "grab", id: "a" }).held).toBeNull();
  });

  it("ignores a drop of something that is not being held", () => {
    const state = run(inMatch(), { type: "grab", id: "a" });
    expect(run(state, { type: "drop", id: "b", target: "right" })).toBe(state);
  });

  it("cancel releases only the item that is held", () => {
    const holding = run(inMatch(), { type: "grab", id: "a" });
    expect(run(holding, { type: "cancel", id: "b" })).toBe(holding);
    expect(run(holding, { type: "cancel", id: "a" }).held).toBeNull();
  });
});
