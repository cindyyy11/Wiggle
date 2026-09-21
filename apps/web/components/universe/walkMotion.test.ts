import { describe, expect, it } from "vitest";
import { AUTO_WALK_SPEED, MAX_GLANCE, WAVE_SECONDS, gaitAmount, idleGlance, strideRate, walkPace, waveAmount } from "./walkMotion";

describe("walkPace", () => {
  it("waits until the explorer faces the goal, then walks at full pace", () => {
    expect(walkPace(AUTO_WALK_SPEED, 2, Math.PI)).toBe(0);
    expect(walkPace(AUTO_WALK_SPEED, 2, .1)).toBe(AUTO_WALK_SPEED);
    const halfTurned = walkPace(AUTO_WALK_SPEED, 2, .55);
    expect(halfTurned).toBeGreaterThan(0);
    expect(halfTurned).toBeLessThan(AUTO_WALK_SPEED);
  });

  it("slows into the destination but never stalls short of it", () => {
    const near = walkPace(AUTO_WALK_SPEED, .05, 0);
    expect(near).toBeLessThan(AUTO_WALK_SPEED);
    expect(near).toBeGreaterThan(0);
    expect(walkPace(AUTO_WALK_SPEED, .001, 0)).toBeCloseTo(AUTO_WALK_SPEED * .3);
  });
});

describe("gait", () => {
  it("ties the leg cycle to ground speed and caps it", () => {
    expect(strideRate(0)).toBe(0);
    expect(strideRate(.5)).toBeGreaterThan(strideRate(.25));
    expect(strideRate(5)).toBe(22);
  });

  it("still shuffles the feet while turning on the spot", () => {
    expect(gaitAmount(0, .42, false)).toBe(0);
    expect(gaitAmount(0, .42, true)).toBeGreaterThan(0);
    expect(gaitAmount(.84, .42, false)).toBe(1);
  });
});

describe("waveAmount", () => {
  it("is still before a wave begins and once it has finished", () => {
    expect(waveAmount(-1)).toBe(0);
    expect(waveAmount(WAVE_SECONDS)).toBe(0);
    expect(waveAmount(WAVE_SECONDS + 10)).toBe(0);
    expect(waveAmount(-Infinity)).toBe(0);
    expect(waveAmount(Infinity)).toBe(0);
  });

  it("raises the arm quickly, holds it up, then lowers it gently", () => {
    expect(waveAmount(0)).toBe(0);
    expect(waveAmount(.09)).toBeCloseTo(.5);
    expect(waveAmount(.5)).toBe(1);
    expect(waveAmount(WAVE_SECONDS - .175)).toBeCloseTo(.5);
    expect(waveAmount(WAVE_SECONDS - .001)).toBeLessThan(.01);
  });

  it("never leaves the range of the arm", () => {
    for (let elapsed = -.5; elapsed < WAVE_SECONDS + .5; elapsed += .01) {
      expect(waveAmount(elapsed)).toBeGreaterThanOrEqual(0);
      expect(waveAmount(elapsed)).toBeLessThanOrEqual(1);
    }
  });
});

describe("idleGlance", () => {
  it("looks about a little while standing still", () => {
    let widest = 0;
    for (let time = 0; time < 30; time += .05) {
      const turn = idleGlance(time, 1);
      expect(Math.abs(turn)).toBeLessThanOrEqual(MAX_GLANCE + 1e-9);
      widest = Math.max(widest, Math.abs(turn));
    }
    expect(widest).toBeGreaterThan(MAX_GLANCE * .9);
  });

  it("faces front whenever the explorer is on the move", () => {
    for (let time = 0; time < 10; time += .3) expect(idleGlance(time, 0)).toBeCloseTo(0);
    expect(Math.abs(idleGlance(2, .5))).toBeLessThan(Math.abs(idleGlance(2, 1)) + 1e-9);
  });
});
