// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import {
  loadCompletedScienceZones,
  saveCompletedScienceZones,
  loadCompletedNumeriaRegions,
  saveCompletedNumeriaRegions,
  planetStarProgressFor,
} from "./planetCompletionMemory";

beforeEach(() => {
  window.localStorage.clear();
});

it("round-trips science zones per child", () => {
  saveCompletedScienceZones("child-1", new Set(["magnet-lab", "animals"]));
  expect([...loadCompletedScienceZones("child-1")].sort()).toEqual(["animals", "magnet-lab"]);
  expect(loadCompletedScienceZones("child-2").size).toBe(0);
});

it("round-trips numeria regions and builds planet progress counts", () => {
  saveCompletedNumeriaRegions("child-1", new Set(["fraction-forest", "number-valley", "geometry-ridge", "crystal-crater"]));
  expect(loadCompletedNumeriaRegions("child-1").size).toBe(4);
  expect(planetStarProgressFor("child-1")).toEqual({ scienceCompleted: 0, numeriaCompleted: 4 });
});

it("treats corrupt storage as empty", () => {
  window.localStorage.setItem("wiggle:planet-complete:child-1:science", "{not json");
  expect(loadCompletedScienceZones("child-1").size).toBe(0);
  window.localStorage.setItem("wiggle:planet-complete:child-1:science", JSON.stringify(["nope", "animals"]));
  expect([...loadCompletedScienceZones("child-1")]).toEqual(["animals"]);
});
