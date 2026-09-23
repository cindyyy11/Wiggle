// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { hasCheeredPlanet, markCheeredPlanet } from "./planetCheerSession";

beforeEach(() => { window.sessionStorage.clear(); });

it("tracks cheer per planet for this session", () => {
  expect(hasCheeredPlanet("science")).toBe(false);
  markCheeredPlanet("science");
  expect(hasCheeredPlanet("science")).toBe(true);
  expect(hasCheeredPlanet("numeria")).toBe(false);
});
