import { expect, it } from "vitest";
import {
  SUBJECT_ORBIT_LAYOUT,
  isOrbitPress,
  orbitDecorationCounts,
} from "./worldOrbit";

it("describes the miniature worlds with two playable hero worlds", () => {
  expect(Object.keys(SUBJECT_ORBIT_LAYOUT)).toEqual(["math", "science", "english", "bm", "nova"]);
  expect(SUBJECT_ORBIT_LAYOUT.math).toMatchObject({ playable: true, label: "Numeria" });
  expect(SUBJECT_ORBIT_LAYOUT.science).toMatchObject({ playable: true, label: "Science Planet" });
  expect(SUBJECT_ORBIT_LAYOUT.english.playable).toBe(false);
  expect(SUBJECT_ORBIT_LAYOUT.bm.playable).toBe(false);
  expect(SUBJECT_ORBIT_LAYOUT.nova.playable).toBe(false);
});

it("reduces decoration density without removing any miniature world", () => {
  const high = orbitDecorationCounts("high");
  const low = orbitDecorationCounts("low");
  expect(low.stars).toBeLessThan(high.stars);
  expect(low.orbitalRocks).toBeLessThan(high.orbitalRocks);
  expect(low.cloudPuffs).toBeLessThan(high.cloudPuffs);
  expect(low.mathTrees).toBeLessThan(high.mathTrees);
  expect(low.scienceFragments).toBeLessThan(high.scienceFragments);
});

it("accepts a deliberate tap but rejects a drag as a world selection", () => {
  expect(isOrbitPress([20, 30], [28, 38])).toBe(true);
  expect(isOrbitPress([20, 30], [33, 43])).toBe(false);
});
