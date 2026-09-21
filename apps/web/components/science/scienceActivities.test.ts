import { expect, it } from 'vitest';
import { matchesActivity, SCIENCE_ACTIVITIES } from './scienceActivities';
it('validates subject-specific answers without forcing frogs into one habitat', () => {
  expect(matchesActivity('animals', 'frog', 'both')).toBe(true);
  expect(matchesActivity('animals', 'frog', 'water')).toBe(false);
  expect(matchesActivity('colors', 'red', 'blue')).toBe(false);
  expect(matchesActivity('life-cycle', 'seed', 'first')).toBe(true);
  for (const land of Object.keys(SCIENCE_ACTIVITIES) as (keyof typeof SCIENCE_ACTIVITIES)[]) for (const item of SCIENCE_ACTIVITIES[land].items) expect(matchesActivity(land, item.id, item.target)).toBe(true);
  expect(matchesActivity('animals', 'unknown', 'land')).toBe(false);
});
