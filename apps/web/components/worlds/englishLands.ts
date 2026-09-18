import type { Destination } from "../universe/world";

/** Locked-world grey palette — this planet reads as "coming soon" (see [[subjectRoute]]'s "???" naming), so its storybook-rainbow colors are muted to grey until it unlocks. */
export const ENGLISH_LANDS = [
  { id: "storybook-meadow", name: "Storybook Meadow", color: "#9aa1ab", destination: { latitude: .62, longitude: -.52 } },
  { id: "alphabet-hills", name: "Alphabet Hills", color: "#b3b9c2", destination: { latitude: -.16, longitude: .43 } },
  { id: "rhyme-canyon", name: "Rhyme Canyon", color: "#7d8590", destination: { latitude: .71, longitude: .72 } },
  { id: "word-orchard", name: "Word Orchard", color: "#c7cdd4", destination: { latitude: -.25, longitude: -.73 } },
] as const satisfies readonly { id: string; name: string; color: string; destination: Destination }[];
