import { describe, expect, it } from "vitest";
import { LANDMARKS, surfacePoint } from "./world";
import { CLEARING_RADIUS, mathSceneryLayout } from "./mathSceneryLayout";

const centers = LANDMARKS.slice(0, 4).map(land => surfacePoint(land.destination, 1));

function distance(a: readonly number[], b: readonly number[]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe("mathSceneryLayout", () => {
  it("returns nothing for a degenerate count", () => {
    expect(mathSceneryLayout(0)).toEqual([]);
  });

  it("keeps every point outside the clearing radius of every land", () => {
    for (const item of mathSceneryLayout(200)) {
      for (const center of centers) expect(distance(center, item.point)).toBeGreaterThanOrEqual(CLEARING_RADIUS);
    }
  });

  it("tags each point with its nearest land", () => {
    for (const item of mathSceneryLayout(200)) {
      const distances = centers.map(center => distance(center, item.point));
      expect(item.region).toBe(distances.indexOf(Math.min(...distances)));
    }
  });

  it("drops some points to keep clearings clear, but keeps most of what was requested", () => {
    const requested = 300;
    const kept = mathSceneryLayout(requested).length;
    expect(kept).toBeLessThan(requested);
    expect(kept).toBeGreaterThan(requested * .3);
  });

  it("gives each point a destination consistent with its 3D point", () => {
    const [item] = mathSceneryLayout(1);
    const recomputed = surfacePoint(item.destination, 1);
    expect(recomputed[0]).toBeCloseTo(item.point[0], 5);
    expect(recomputed[1]).toBeCloseTo(item.point[1], 5);
    expect(recomputed[2]).toBeCloseTo(item.point[2], 5);
  });
});
