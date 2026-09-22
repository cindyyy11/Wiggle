import { describe, expect, it } from "vitest";
import { BENCH_HEIGHT, BENCH_WIDTH } from "../benchSpace";
import { crystalOffsets, polygonPoints, stoneTrail } from "./puzzleLayout";

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

describe("polygonPoints", () => {
  it("gives one corner per side, flat side down", () => {
    for (const sides of [3, 4, 6]) expect(polygonPoints(sides)).toHaveLength(sides);
    const square = polygonPoints(4);
    expect(square[0].y).toBeCloseTo(square[1].y);
  });

  it("keeps every corner on the bench, above the answer row", () => {
    for (const sides of [3, 4, 6]) {
      for (const point of polygonPoints(sides)) {
        expect(point.x).toBeGreaterThanOrEqual(.05);
        expect(point.x).toBeLessThanOrEqual(.95);
        expect(point.y).toBeGreaterThanOrEqual(.42);
        expect(point.y).toBeLessThanOrEqual(.98);
      }
    }
  });

  it("is centred left to right", () => {
    const hexagon = polygonPoints(6);
    const minX = Math.min(...hexagon.map((point) => point.x));
    const maxX = Math.max(...hexagon.map((point) => point.x));
    expect((minX + maxX) / 2).toBeCloseTo(.5, 1);
  });
});

describe("crystalOffsets", () => {
  it("gives one offset per crystal, centred on the origin", () => {
    for (const count of [2, 3, 4, 7]) {
      const offsets = crystalOffsets(count);
      expect(offsets).toHaveLength(count);
      const meanX = offsets.reduce((sum, point) => sum + point.x, 0) / count;
      expect(meanX).toBeCloseTo(0, 5);
    }
  });

  it("keeps neighbouring crystals from touching", () => {
    for (const count of [2, 4, 7]) {
      const offsets = crystalOffsets(count);
      for (let a = 0; a < offsets.length; a++) {
        for (let b = a + 1; b < offsets.length; b++) {
          const gap = Math.hypot(offsets[a].x - offsets[b].x, offsets[a].y - offsets[b].y);
          expect(gap, `${count} crystals: ${a} and ${b}`).toBeGreaterThanOrEqual(.16);
        }
      }
    }
  });

  it("draws nothing for none and one crystal at the centre", () => {
    expect(crystalOffsets(0)).toEqual([]);
    expect(crystalOffsets(1)).toEqual([{ x: 0, y: 0 }]);
  });
});
