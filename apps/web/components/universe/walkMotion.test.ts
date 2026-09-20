import { describe, expect, it } from "vitest";
import { AUTO_WALK_SPEED, gaitAmount, strideRate, walkPace } from "./walkMotion";

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
