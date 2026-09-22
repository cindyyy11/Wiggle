import type { BenchPoint } from "../handBenchPlay";

/**
 * Stepping stones for a number trail: an arch from the left of the bench to the right, in bench coordinates. Stones are
 * about .56 world units wide, so this is laid out for up to four stones; more would touch.
 */
export function stoneTrail(count: number): BenchPoint[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const t = count === 1 ? .5 : index / (count - 1);
    return { x: .14 + t * .72, y: .62 + Math.sin(t * Math.PI) * .14 };
  });
}
