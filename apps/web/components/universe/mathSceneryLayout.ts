import { LANDMARKS, destinationFromPoint, surfacePoint, type Destination } from "./world";

const MATH_LANDS = LANDMARKS.slice(0, 4);
const CENTERS = MATH_LANDS.map(land => surfacePoint(land.destination, 1));

/**
 * How close (3D chord distance on the unit sphere) a filler point may get to a land's center before it is dropped.
 * At .65 this clears each region plateau with margin (the plateau discs have radius ~.98 on a globe of RADIUS 3, so
 * ~.33 here) and clears the dense middle of each cluster. It does NOT clear every cluster's extent: measured from
 * their centers, Fraction Forest's trees reach ~.677, Geometry Ridge's hills ~.504, Crystal Crater's berries ~.488 and
 * Number Valley's boxes ~.467, so the Forest's outermost trees still fall outside the clearing and a filler prop can
 * sit among them. Science's equivalent radius is .32; Numeria's clusters reach further, hence the larger value here.
 */
export const CLEARING_RADIUS = .65;

export type MathSceneryPoint = { index: number; destination: Destination; region: number; point: readonly [number, number, number] };

function nearestRegion(point: readonly [number, number, number]): number {
  let best = 0; let score = -Infinity;
  CENTERS.forEach((center, region) => {
    const dot = center[0] * point[0] + center[1] * point[1] + center[2] * point[2];
    if (dot > score) { score = dot; best = region; }
  });
  return best;
}

/**
 * Scatters `count` points across the whole unit sphere (Fibonacci spiral), tags each with its nearest of the four
 * Numeria lands, and drops any point that falls inside `CLEARING_RADIUS` of a land's center.
 */
export function mathSceneryLayout(count: number): MathSceneryPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - 2 * (index + .5) / count;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * 2.39996323;
    const point: [number, number, number] = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    return { index, destination: destinationFromPoint(...point), region: nearestRegion(point), point };
  }).filter(item => !CENTERS.some(center => Math.hypot(center[0] - item.point[0], center[1] - item.point[1], center[2] - item.point[2]) < CLEARING_RADIUS));
}
