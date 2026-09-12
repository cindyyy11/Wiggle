import { surfacePoint } from '../universe/world';
import type { ScienceZoneId } from '../worlds/subjectRoute';
import { SCIENCE_LANDS } from './scienceLands';
const centers = SCIENCE_LANDS.map(land => ({ id: land.id, point: surfacePoint(land.destination) }));
export function nearbyScienceLand(position: readonly number[], previous: ScienceZoneId | null): ScienceZoneId | null {
  const distances = centers.map(center => ({ id: center.id, distance: Math.hypot(...center.point.map((value, i) => value - position[i])) }));
  if (previous && distances.some(item => item.id === previous && item.distance < .95)) return previous;
  return distances.filter(item => item.distance < .7).sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
}
export function isEntryKey(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return event.key.toLowerCase() === 'b' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey &&
    !(target?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
}
export const LAND_GUIDES: Record<ScienceZoneId, { name: string; message: string }> = {
  'sink-float': { name: 'Maggie the Magnet', message: 'Let’s explore Magnet Lands together!' },
  'ph-lab': { name: 'Maggie the Magnet', message: 'Let’s explore Magnet Lands together!' },
  'magnet-lab': { name: 'Maggie the Magnet', message: 'Hi, explorer! Want to discover my magnetic powers?' },
  animals: { name: 'Pip the Bird', message: 'Come meet my friends! Where do you think each animal lives?' },
  colors: { name: 'Prism the Crystal', message: 'My canyon is full of colours. Will you help me match them?' },
  'life-cycle': { name: 'Sprout', message: 'Every big plant starts small. Let’s grow something together!' },
};
