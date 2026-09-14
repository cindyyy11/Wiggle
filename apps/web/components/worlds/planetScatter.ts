import { surfacePoint, destinationFromPoint, type Destination } from "../universe/world";

/** Evenly scatters `count` points across a whole sphere (Fibonacci spiral) and tags each with the nearest themed land, for a full-surface filler layer of small decorations. */
export function fibonacciSphereRegions(count: number, lands: readonly { color: string; destination: Destination }[]) {
  const centers = lands.map(land => surfacePoint(land.destination, 1));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - 2 * (index + .5) / count;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * 2.39996323;
    const point: [number, number, number] = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    let region = 0; let best = -Infinity;
    centers.forEach((center, candidate) => {
      const dot = center[0] * point[0] + center[1] * point[1] + center[2] * point[2];
      if (dot > best) { best = dot; region = candidate; }
    });
    return { index, destination: destinationFromPoint(...point), region, color: lands[region].color };
  });
}
