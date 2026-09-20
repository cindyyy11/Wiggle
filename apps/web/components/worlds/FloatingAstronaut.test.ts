import { describe, expect, it } from "vitest";
import {
  ASTRONAUT_CENTER_Y, ASTRONAUT_RIG_HEIGHT, ASTRONAUT_SCALE, BEHIND_Z, ROAM_X_SHARE, ROAM_Y_SHARE, ROAM_Z_MAX, ROAM_Z_MIN,
  SOMERSAULT_EVERY, SOMERSAULT_SECONDS, astronautDepth, astronautDrift, astronautRoam, somersaultAngle, springStep, turnAngle,
} from "./FloatingAstronaut";

const CAMERA_Z = 9.4;

it("stands the astronaut tall enough to read beside a planet without outgrowing one", () => {
  const height = ASTRONAUT_SCALE * ASTRONAUT_RIG_HEIGHT;
  expect(height).toBeGreaterThan(2);
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
      expect(Math.abs(drift.tilt)).toBeLessThanOrEqual(0.12);
      expect(Math.abs(drift.turn)).toBeLessThanOrEqual(0.34);
    }
  });
});

describe("astronautRoam", () => {
  it("wanders across the whole scene without leaving the visible area at any depth", () => {
    const halfWidth = 6;
    const halfHeight = 4;
    let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
    for (let time = 0; time < 600; time += 0.5) {
      const roam = astronautRoam(time, halfWidth, halfHeight, CAMERA_Z);
      const perspective = (CAMERA_Z - roam.z) / CAMERA_Z;
      expect(Math.abs(roam.x)).toBeLessThanOrEqual(halfWidth * perspective * ROAM_X_SHARE + 1e-9);
      expect(Math.abs(roam.y - ASTRONAUT_CENTER_Y)).toBeLessThanOrEqual(halfHeight * perspective * ROAM_Y_SHARE + 1e-9);
      expect(roam.z).toBeGreaterThanOrEqual(ROAM_Z_MIN - 1e-9);
      expect(roam.z).toBeLessThanOrEqual(ROAM_Z_MAX + 1e-9);
      minX = Math.min(minX, roam.x); maxX = Math.max(maxX, roam.x);
      minZ = Math.min(minZ, roam.z); maxZ = Math.max(maxZ, roam.z);
    }
    expect(minX).toBeLessThan(-halfWidth * .4);
    expect(maxX).toBeGreaterThan(halfWidth * .4);
    expect(maxZ - minZ).toBeGreaterThan(.8);
  });

  it("scales the roaming range down on a narrow screen", () => {
    const wide = astronautRoam(Math.PI / 2 / .21, 6, 4, CAMERA_Z).x;
    const narrow = astronautRoam(Math.PI / 2 / .21, 2, 4, CAMERA_Z).x;
    expect(Math.abs(narrow)).toBeLessThan(Math.abs(wide));
  });
});

describe("springStep", () => {
  it("settles on its target", () => {
    let state = { position: 0, velocity: 0 };
    for (let frame = 0; frame < 600; frame++) state = springStep(state.position, state.velocity, 3, 1 / 60);
    expect(state.position).toBeCloseTo(3, 2);
    expect(Math.abs(state.velocity)).toBeLessThan(0.01);
  });

  it("carries a kick past its resting place before returning", () => {
    let state = { position: 0, velocity: -7 };
    let farthest = 0;
    for (let frame = 0; frame < 240; frame++) {
      state = springStep(state.position, state.velocity, 0, 1 / 60);
      farthest = Math.min(farthest, state.position);
    }
    expect(farthest).toBeLessThan(-1);
    expect(Math.abs(state.position)).toBeLessThan(0.5);
  });

  it("stays stable across a long frame gap", () => {
    const state = springStep(0, 0, 1, 5);
    expect(Number.isFinite(state.position)).toBe(true);
    expect(state.position).toBeLessThan(0.05);
  });
});

describe("astronautDepth", () => {
  it("tucks behind the planet through the middle and comes forward out at the sides", () => {
    expect(astronautDepth(0, 2.7, ROAM_Z_MAX)).toBe(BEHIND_Z);
    expect(astronautDepth(2.7 * .9, 2.7, ROAM_Z_MAX)).toBe(BEHIND_Z);
    expect(astronautDepth(12, 2.7, ROAM_Z_MAX)).toBeCloseTo(ROAM_Z_MAX);
    expect(astronautDepth(-12, 2.7, ROAM_Z_MIN)).toBeCloseTo(ROAM_Z_MIN);
  });

  it("only comes forward once it has cleared the planet's edge", () => {
    const band = 2.7;
    expect(astronautDepth(band * 1.2, band, ROAM_Z_MAX)).toBeLessThan(ROAM_Z_MAX);
    for (let x = 0; x <= 14; x += .25) {
      const z = astronautDepth(x, band, ROAM_Z_MAX);
      if (x <= band) expect(z).toBeLessThanOrEqual(0);
      expect(z).toBeGreaterThanOrEqual(BEHIND_Z);
      expect(z).toBeLessThanOrEqual(ROAM_Z_MAX);
    }
  });
});

describe("somersaultAngle", () => {
  it("floats level almost all of the time", () => {
    expect(somersaultAngle(0)).toBe(0);
    expect(somersaultAngle(SOMERSAULT_EVERY - SOMERSAULT_SECONDS - .1)).toBe(0);
  });

  it("turns one full circle at the end of each cycle", () => {
    const start = SOMERSAULT_EVERY - SOMERSAULT_SECONDS;
    expect(somersaultAngle(start + SOMERSAULT_SECONDS / 2)).toBeCloseTo(Math.PI);
    expect(somersaultAngle(SOMERSAULT_EVERY - .001)).toBeGreaterThan(Math.PI * 1.9);
    expect(somersaultAngle(SOMERSAULT_EVERY * 3 + 1)).toBe(0);
  });
});

describe("turnAngle", () => {
  it("eases from nothing to one full turn", () => {
    expect(turnAngle(0)).toBeCloseTo(0);
    expect(turnAngle(.5)).toBeCloseTo(Math.PI);
    expect(turnAngle(1)).toBeCloseTo(Math.PI * 2);
    expect(turnAngle(2)).toBeCloseTo(Math.PI * 2);
  });
});
