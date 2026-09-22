import { describe, expect, it } from "vitest";
import {
  BENCH_HEIGHT,
  BENCH_SLAB_HEIGHT,
  BENCH_SLAB_WIDTH,
  BENCH_WIDTH,
  FIELD_OF_VIEW,
  benchCameraDistance,
  benchX,
  benchY,
} from "./benchSpace";

describe("bench coordinates", () => {
  it("centres 0.5 and spans the bench extents", () => {
    expect(benchX(.5)).toBe(0);
    expect(benchY(.5)).toBe(0);
    expect(benchX(1)).toBeCloseTo(BENCH_WIDTH / 2);
    expect(benchX(0)).toBeCloseTo(-BENCH_WIDTH / 2);
    expect(benchY(1)).toBeCloseTo(BENCH_HEIGHT / 2);
    expect(benchY(0)).toBeCloseTo(-BENCH_HEIGHT / 2);
  });

  it("keeps the movable area inside the slab it sits on", () => {
    expect(BENCH_SLAB_WIDTH).toBeGreaterThan(BENCH_WIDTH);
    expect(BENCH_SLAB_HEIGHT).toBeGreaterThan(BENCH_HEIGHT);
  });
});

describe("benchCameraDistance", () => {
  it("matches the distances checked in Round 1 for a desktop, phone, very wide and very narrow canvas", () => {
    expect(benchCameraDistance(1.67)).toBeCloseTo(3.735, 2);
    expect(benchCameraDistance(3)).toBeCloseTo(3.735, 2);
    expect(benchCameraDistance(.83)).toBeCloseTo(5.29, 1);
    expect(benchCameraDistance(.4)).toBeCloseTo(10.97, 0);
  });

  it("never lets the slab fill more than 68% of the height or 92% of the width", () => {
    const halfFov = Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
    for (let aspect = .3; aspect <= 4; aspect += .1) {
      const visibleHeight = 2 * halfFov * benchCameraDistance(aspect);
      const visibleWidth = visibleHeight * aspect;
      expect(BENCH_SLAB_HEIGHT / visibleHeight).toBeLessThanOrEqual(.68 + 1e-9);
      expect(BENCH_SLAB_WIDTH / visibleWidth).toBeLessThanOrEqual(.92 + 1e-9);
    }
  });

  it("stays finite for a degenerate canvas", () => {
    expect(Number.isFinite(benchCameraDistance(0))).toBe(true);
  });
});
