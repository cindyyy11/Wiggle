import { describe, expect, it } from "vitest";
import { BENCH_HEIGHT, BENCH_WIDTH } from "../benchSpace";
import { stoneTrail } from "./puzzleLayout";

describe("stoneTrail", () => {
  it("gives one spot per stone, running left to right", () => {
    for (const count of [2, 3, 4]) {
      const spots = stoneTrail(count);
      expect(spots).toHaveLength(count);
      spots.slice(1).forEach((spot, index) => expect(spot.x).toBeGreaterThan(spots[index].x));
    }
  });

  it("keeps every stone on the bench, well above the answer row", () => {
    for (const spot of stoneTrail(4)) {
      expect(spot.x).toBeGreaterThanOrEqual(.1);
      expect(spot.x).toBeLessThanOrEqual(.9);
      expect(spot.y).toBeGreaterThanOrEqual(.5);
      expect(spot.y).toBeLessThanOrEqual(.9);
    }
  });

  it("curves: the middle of a four-stone trail is higher than its ends", () => {
    const spots = stoneTrail(4);
    expect(spots[1].y).toBeGreaterThan(spots[0].y);
    expect(spots[2].y).toBeGreaterThan(spots[3].y);
  });

  it("keeps neighbouring stones from touching, measured on the bench in world units", () => {
    const spots = stoneTrail(4);
    spots.slice(1).forEach((spot, index) => {
      const gap = Math.hypot((spot.x - spots[index].x) * BENCH_WIDTH, (spot.y - spots[index].y) * BENCH_HEIGHT);
      expect(gap).toBeGreaterThanOrEqual(.56);
    });
  });

  it("centres a single stone and draws nothing for none", () => {
    expect(stoneTrail(1)[0].x).toBeCloseTo(.5);
    expect(stoneTrail(0)).toEqual([]);
  });
});
