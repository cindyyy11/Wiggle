import { SCIENCE_LANDS } from './scienceLands';
import { CHECKPOINTS, HIDING_PLACES } from './magnetAdventure';
import { destinationFromPoint, surfacePoint } from '../universe/world';
const centers = SCIENCE_LANDS.map(land => surfacePoint(land.destination, 1));
export function scienceRegion(point: readonly number[]) {
  let best = 0; let score = -Infinity;
  centers.forEach((center, i) => { const dot = center.reduce((sum, v, n) => sum + v * point[n], 0); if (dot > score) { score = dot; best = i; } });
  return best;
}
export function sceneryLayout(count: number) {
  const clearings = [...SCIENCE_LANDS, ...CHECKPOINTS, ...HIDING_PLACES].map(item => surfacePoint(item.destination, 1));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - 2 * (i + .5) / count; const radius = Math.sqrt(1 - y * y); const angle = i * 2.39996323;
    const point = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    return { index: i, destination: destinationFromPoint(...point as [number, number, number]), region: scienceRegion(point), point };
  }).filter(item => !clearings.some(center => Math.hypot(...center.map((v, i) => v - item.point[i])) < .32));
}
