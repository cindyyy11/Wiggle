import { expect, it } from 'vitest';
import { surfacePoint } from '../universe/world';
import { SCIENCE_LANDS } from './scienceLands';
import { isEntryKey, nearbyScienceLand } from './scienceInvitation';
it('finds each landmark and clears proximity on the far side', () => {
  for (const land of SCIENCE_LANDS) expect(nearbyScienceLand(surfacePoint(land.destination), null)).toBe(land.id);
  expect(nearbyScienceLand([0, 0, -3], 'magnet-lab')).toBeNull();
});
it('keeps the current invitation within the wider exit radius', () => {
  const point = surfacePoint({ latitude: .62, longitude: -.2 });
  expect(nearbyScienceLand(point, 'magnet-lab')).toBe('magnet-lab');
  expect(nearbyScienceLand(point, null)).toBeNull();
});
it('accepts a single B only, not repeats, shortcuts or typing targets', () => {
  expect(isEntryKey({ key: 'B' } as KeyboardEvent)).toBe(true);
  for (const extra of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) expect(isEntryKey({ key: 'b', ...extra } as unknown as KeyboardEvent)).toBe(false);
  expect(isEntryKey({ key: 'a' } as KeyboardEvent)).toBe(false);
});
