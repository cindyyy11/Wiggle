import type { Destination } from "../universe/world";

/** Storybook-rainbow palette for the English planet — kept distinct from Science's pastel nature tones and BM's batik jewel tones. */
export const ENGLISH_LANDS = [
  { id: "storybook-meadow", name: "Storybook Meadow", color: "#ff6f61", destination: { latitude: .62, longitude: -.52 } },
  { id: "alphabet-hills", name: "Alphabet Hills", color: "#4ea8de", destination: { latitude: -.16, longitude: .43 } },
  { id: "rhyme-canyon", name: "Rhyme Canyon", color: "#b185db", destination: { latitude: .71, longitude: .72 } },
  { id: "word-orchard", name: "Word Orchard", color: "#ffd23f", destination: { latitude: -.25, longitude: -.73 } },
] as const satisfies readonly { id: string; name: string; color: string; destination: Destination }[];
