import { expect, it } from 'vitest';
import { matchesActivity, SCIENCE_ACTIVITIES, StarterHandController } from './scienceActivities';
it('validates subject-specific answers without forcing frogs into one habitat', () => {
  expect(matchesActivity('animals', 'frog', 'both')).toBe(true);
  expect(matchesActivity('animals', 'frog', 'water')).toBe(false);
  expect(matchesActivity('colors', 'red', 'blue')).toBe(false);
  expect(matchesActivity('life-cycle', 'seed', 'first')).toBe(true);
  for (const land of Object.keys(SCIENCE_ACTIVITIES) as (keyof typeof SCIENCE_ACTIVITIES)[]) for (const item of SCIENCE_ACTIVITIES[land].items) expect(matchesActivity(land, item.id, item.target)).toBe(true);
  expect(matchesActivity('animals', 'unknown', 'land')).toBe(false);
});
it('never drops on ambiguous/lost tracking and cancels after grace', () => {
  const hand = new StarterHandController();
  const input = { tracking: true, gesture: 'pinch', item: 'frog', target: null, discover: false, at: 0 };
  expect(hand.update(input)?.type).toBe('grab');
  expect(hand.update({ ...input, tracking: false, gesture: null, at: 10 })).toBeNull();
  expect(hand.held).toBe('frog');
  expect(hand.update({ ...input, gesture: 'open_palm', item: null, target: 'both', at: 100 })).toEqual({ type: 'drop', item: 'frog', target: 'both' });
  hand.update({ ...input, at: 200 }); hand.update({ ...input, tracking: false, at: 210 }); hand.update({ ...input, tracking: false, at: 611 });
  expect(hand.held).toBeNull();
  expect(hand.update({ ...input, gesture: 'open_palm', target: 'both', at: 700 })).toBeNull();
});
