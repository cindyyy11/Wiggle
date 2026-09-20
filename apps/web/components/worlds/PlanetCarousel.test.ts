import { describe, expect, it } from "vitest";
import { ASTRONAUT_CENTER_Y, ASTRONAUT_RIG_HEIGHT, ASTRONAUT_SCALE, LOCK_BADGE_CENTER_Y, LOCK_BADGE_SURFACE_Z, WORLDS_CAMERA_Z, astronautDrift, lockBadgeLocalX, planetSpinStep } from "./PlanetCarousel";

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

it("keeps the lock badge on the camera's line of sight to the planet centre", () => {
  expect(lockBadgeLocalX(0)).toBeCloseTo(0);
  const planetX = 6;
  const badgeWorldZ = LOCK_BADGE_SURFACE_Z * .66;
  const badgeWorldX = planetX + lockBadgeLocalX(planetX) * .66;
  expect(badgeWorldX / (WORLDS_CAMERA_Z - badgeWorldZ)).toBeCloseTo(planetX / WORLDS_CAMERA_Z);
});

it("stands the astronaut tall enough to read beside a planet without outgrowing one", () => {
  const height = ASTRONAUT_SCALE * ASTRONAUT_RIG_HEIGHT;
  expect(height).toBeGreaterThan(2.6);
  expect(height).toBeLessThan(4.4);
});

describe("astronautDrift", () => {
  it("starts level so the first frame matches the resting pose", () => {
    expect(astronautDrift(0)).toEqual({ lift: 0, tilt: 0, turn: 0 });
  });

  it("keeps the astronaut floating within a gentle range", () => {
    for (let time = 0; time < 40; time += 0.13) {
      const drift = astronautDrift(time);
      expect(Math.abs(drift.lift)).toBeLessThanOrEqual(0.22);
      expect(ASTRONAUT_CENTER_Y + drift.lift).toBeGreaterThan(-0.25);
      expect(Math.abs(drift.tilt)).toBeLessThanOrEqual(0.12);
      expect(Math.abs(drift.turn)).toBeLessThanOrEqual(0.34);
    }
  });
});
