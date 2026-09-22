/** The area items can be moved over, in world units. Bench coordinates run 0 to 1 across it, y up. */
export const BENCH_WIDTH = 2.8;
export const BENCH_HEIGHT = 1.7;
/** The slab the lesson sits on is a little larger than the movable area. */
export const BENCH_SLAB_WIDTH = 3.1;
export const BENCH_SLAB_HEIGHT = 1.95;
export const FIELD_OF_VIEW = 42;

export const benchX = (x: number) => (x - .5) * BENCH_WIDTH;
export const benchY = (y: number) => (y - .5) * BENCH_HEIGHT;

const HEIGHT_SHARE = .68;
const WIDTH_SHARE = .92;

/**
 * How far the camera sits from the bench so the slab fills at most 68% of the canvas height and 92% of its width,
 * whatever the canvas shape.
 */
export function benchCameraDistance(aspect: number): number {
  const halfFov = Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
  return Math.max(
    BENCH_SLAB_HEIGHT / (HEIGHT_SHARE * 2 * halfFov),
    BENCH_SLAB_WIDTH / (WIDTH_SHARE * 2 * halfFov * Math.max(aspect, .01)),
  );
}
