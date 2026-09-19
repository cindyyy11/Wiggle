import { describe, expect, it } from "vitest";
import { LOCK_BADGE_CENTER_Y, LOCK_BADGE_SURFACE_Z, planetSpinStep } from "./PlanetCarousel";

describe("planetSpinStep", () => {
  it("turns the selected planet faster than side planets", () => {
    expect(planetSpinStep(1 / 60, 0, false, false)).toBeCloseTo(0.12 / 60);
    expect(planetSpinStep(1 / 60, 1, false, false)).toBeCloseTo(0.075 / 60);
  });

  it("caps long frame gaps", () => {
    expect(planetSpinStep(2, 0, false, false)).toBeCloseTo(0.05 * 0.12);
  });

  it("stops for a pressed planet or reduced motion", () => {
    expect(planetSpinStep(1 / 60, 0, false, true)).toBe(0);
    expect(planetSpinStep(1 / 60, 0, true, false)).toBe(0);
  });
});

it("places locked-world badges on the visible front surface", () => {
  expect(LOCK_BADGE_SURFACE_Z).toBeGreaterThan(3.5);
  expect(LOCK_BADGE_CENTER_Y).toBeCloseTo(-.18);
});
