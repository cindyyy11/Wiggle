export type PlanetId =
  | "numeria"
  | "lexicon"
  | "novalab"
  | "reset-moon"
  | "constellation";

export type PlanetPalette = {
  primary: string;
  accent: string;
  glow: string;
  surface: string;
};

export type OrbitalPosition = {
  angle: number;
  radius: number;
};

export type PlanetDefinition = {
  id: PlanetId;
  label: string;
  subject: string;
  palette: PlanetPalette;
  orbitalPosition: OrbitalPosition;
  previewCopy: string;
  playable: boolean;
};

export type WonderDefinition = {
  id: string;
  planetId: PlanetId;
  label: string;
  description: string;
  firstDiscovery?: boolean;
};

export const PLANETS: PlanetDefinition[] = [
  {
    id: "numeria",
    label: "Numeria",
    subject: "Mathematics",
    palette: { primary: "#f4b860", accent: "#f7e7b2", glow: "#ffcf70", surface: "#27233f" },
    orbitalPosition: { angle: -72, radius: 0.32 },
    previewCopy: "A playful world of patterns, puzzles, and surprising number magic.",
    playable: true,
  },
  {
    id: "lexicon",
    label: "Lexicon",
    subject: "Language",
    palette: { primary: "#d39bff", accent: "#f8dcff", glow: "#df9dff", surface: "#2c2040" },
    orbitalPosition: { angle: -10, radius: 0.48 },
    previewCopy: "Words come alive here, building bridges between ideas and people.",
    playable: false,
  },
  {
    id: "novalab",
    label: "Nova Lab",
    subject: "Science",
    palette: { primary: "#65d6c5", accent: "#c9fff0", glow: "#65ead4", surface: "#17353b" },
    orbitalPosition: { angle: 54, radius: 0.64 },
    previewCopy: "An experimental frontier for curious minds and bright questions.",
    playable: false,
  },
  {
    id: "reset-moon",
    label: "Reset Moon",
    subject: "Wellbeing",
    palette: { primary: "#a9c6ff", accent: "#e7efff", glow: "#b8d0ff", surface: "#1f2b4a" },
    orbitalPosition: { angle: 124, radius: 0.78 },
    previewCopy: "A gentle moon for noticing, breathing, and finding your next small step.",
    playable: false,
  },
  {
    id: "constellation",
    label: "Constellation",
    subject: "Big Ideas",
    palette: { primary: "#f28d8d", accent: "#ffe1bf", glow: "#ff9b83", surface: "#432536" },
    orbitalPosition: { angle: 194, radius: 0.91 },
    previewCopy: "A far-off gathering place where every subject connects.",
    playable: false,
  },
];

export const WONDERS: WonderDefinition[] = [
  { id: "forest-firefly", planetId: "numeria", label: "Forest Firefly", description: "A tiny light that traces a perfect sequence through the trees.", firstDiscovery: true },
  { id: "infinite-stairs", planetId: "numeria", label: "Infinite Stairs", description: "A staircase that climbs by a pattern only you can unlock." },
  { id: "word-garden", planetId: "lexicon", label: "Word Garden", description: "New meanings bloom whenever two curious words meet." },
  { id: "echo-bridge", planetId: "lexicon", label: "Echo Bridge", description: "A bridge that carries a thought from one side to the other." },
  { id: "cloud-orchard", planetId: "novalab", label: "Cloud Orchard", description: "A pocket experiment where clouds grow like fruit." },
  { id: "quiet-tide", planetId: "reset-moon", label: "Quiet Tide", description: "A silver tide that rises and falls with your breathing." },
  { id: "idea-thread", planetId: "constellation", label: "Idea Thread", description: "A glowing thread connecting two seemingly distant ideas." },
];
