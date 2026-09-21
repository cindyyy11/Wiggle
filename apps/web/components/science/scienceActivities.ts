export type StarterLand = 'animals' | 'colors' | 'life-cycle';
export type ActivityItem = { id: string; name: string; fact: string; target: string; color: string };
export type StarterProgress = { observed: string[]; matched: string[] };
export const SCIENCE_ACTIVITIES: Record<StarterLand, { title: string; instruction: string; items: ActivityItem[]; targets: { id: string; name: string }[] }> = {
  animals: {
    title: 'Meet the neighbours', instruction: 'Discover each animal, then help it find its habitat.',
    items: [
      { id: 'horse', name: 'Horse', fact: 'Horses walk and run on land. They eat grasses.', target: 'land', color: '#b9825d' },
      { id: 'frog', name: 'Frog', fact: 'Frogs are amphibians. Many live on land and return to water to lay eggs.', target: 'both', color: '#78d56b' },
      { id: 'bird', name: 'Bird', fact: 'Birds have feathers. Many fly through the air and rest or nest on land.', target: 'air-land', color: '#6dccf3' },
      { id: 'fish', name: 'Fish', fact: 'Fish live in water and use gills to breathe.', target: 'water', color: '#ffa86d' },
    ],
    targets: [{ id: 'land', name: 'Land' }, { id: 'both', name: 'Land + water' }, { id: 'air-land', name: 'Air + land' }, { id: 'water', name: 'Water' }],
  },
  colors: {
    title: 'A rainbow of discoveries', instruction: 'Discover the colours, then match each crystal to its named target.',
    items: [
      { id: 'red', name: 'Red circle', fact: 'This red crystal has a circle symbol. Look for the same colour name and symbol.', target: 'red', color: '#ee6f7c' },
      { id: 'yellow', name: 'Yellow triangle', fact: 'This yellow crystal has a triangle symbol with three sides.', target: 'yellow', color: '#ffda65' },
      { id: 'blue', name: 'Blue square', fact: 'This blue crystal has a square symbol with four equal sides.', target: 'blue', color: '#74c7f7' },
      { id: 'purple', name: 'Purple diamond', fact: 'This purple crystal has a diamond symbol. Match both the name and the symbol.', target: 'purple', color: '#bd94ef' },
    ],
    targets: [{ id: 'red', name: 'Red circle' }, { id: 'yellow', name: 'Yellow triangle' }, { id: 'blue', name: 'Blue square' }, { id: 'purple', name: 'Purple diamond' }],
  },
  'life-cycle': {
    title: 'From a seed to a flower', instruction: 'Discover the growing stages, then place them in order.',
    items: [
      { id: 'flower', name: 'Flowering plant', fact: 'The plant grows bigger and makes flowers. Flowers can help make new seeds.', target: 'third', color: '#f5a1b9' },
      { id: 'seed', name: 'Seed', fact: 'A seed holds a tiny new plant. With water and suitable warmth, it can start to grow.', target: 'first', color: '#dbb37d' },
      { id: 'sprout', name: 'Sprout', fact: 'The young plant grows roots and its first leaves. Leaves use light to help the plant grow.', target: 'second', color: '#89d99d' },
    ],
    targets: [{ id: 'first', name: '1 · First' }, { id: 'second', name: '2 · Next' }, { id: 'third', name: '3 · Then' }],
  },
};
export function matchesActivity(land: StarterLand, item: string, target: string) { return SCIENCE_ACTIVITIES[land].items.find(entry => entry.id === item)?.target === target; }

/** A held item is released only by a positively tracked open palm, never an end edge. */
export class StarterHandController {
  held: string | null = null;
  private lostAt: number | null = null;
  private pointing: string | null = null;
  reset() { this.held = null; this.lostAt = null; this.pointing = null; }
  update({ tracking, gesture, item, target, discover, at }: { tracking: boolean; gesture: string | null; item: string | null; target: string | null; discover: boolean; at: number }): { type: 'discover' | 'grab'; item: string } | { type: 'drop'; item: string; target: string } | null {
    if (!tracking) { this.lostAt ??= at; if (at - this.lostAt >= 400) this.reset(); return null; }
    this.lostAt = null;
    if (discover) {
      if (gesture !== 'point' || !item) { this.pointing = null; return null; }
      if (this.pointing === item) return null;
      this.pointing = item; return { type: 'discover', item };
    }
    if (gesture === 'pinch' && item && !this.held) { this.held = item; return { type: 'grab', item }; }
    if (gesture === 'open_palm' && this.held) { const held = this.held; this.held = null; return target ? { type: 'drop', item: held, target } : null; }
    return null;
  }
}
