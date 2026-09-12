// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { saveSeenConstellationStars, seenConstellationStars } from "./constellationMemory";

afterEach(() => window.localStorage.clear());

describe("constellationMemory", () => {
  it("starts empty for a child with no saved stars", () => {
    expect(seenConstellationStars("child-1").size).toBe(0);
  });

  it("round-trips a saved set of star ids", () => {
    saveSeenConstellationStars("child-1", ["visual-explorer", "brave-beginner"]);
    const seen = seenConstellationStars("child-1");
    expect(seen.has("visual-explorer")).toBe(true);
    expect(seen.has("puzzle-solver")).toBe(false);
  });

  it("ignores unknown ids and corrupt data instead of throwing", () => {
    window.localStorage.setItem("wiggle:constellation-seen:child-2", JSON.stringify(["not-a-real-star"]));
    expect(seenConstellationStars("child-2").size).toBe(0);
    window.localStorage.setItem("wiggle:constellation-seen:child-3", "{not json");
    expect(() => seenConstellationStars("child-3")).not.toThrow();
  });

  it("keeps each child's stars separate", () => {
    saveSeenConstellationStars("child-a", ["visual-explorer"]);
    expect(seenConstellationStars("child-b").size).toBe(0);
  });
});
