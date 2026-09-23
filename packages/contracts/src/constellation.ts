/**
 * "My Learning Constellation" — a child-facing catalog of discovered strengths and
 * strategies. Twin-signal stars derive from the Learner Digital Twin; planet explorer
 * stars derive from optional local land-completion counts. No star is ever unlocked by
 * an LLM decision, and no percentage is ever attached to a star.
 */
import type { LearnerTwin } from "./twin.js";

export const constellationStarIds = [
  "visual-explorer",
  "tiny-step-starter",
  "movement-explorer",
  "voice-navigator",
  "puzzle-solver",
  "brave-beginner",
  "science-explorer",
  "numeria-explorer",
] as const;

export type ConstellationStarId = (typeof constellationStarIds)[number];

export type PlanetStarProgress = {
  scienceCompleted: number;
  numeriaCompleted: number;
};

const UNLOCK_THRESHOLD = 0.7;
/** Brave Beginner rewards *low* initiation friction, so it uses an inverted threshold. */
const LOW_FRICTION_THRESHOLD = 0.3;
const MASTERY_STAR_THRESHOLD = 0.75;

interface StarDefinition {
  id: ConstellationStarId;
  title: string;
  description: string;
  /** Returns the 0-1 signal behind this star; unlocked once it crosses its threshold. */
  signal(twin: LearnerTwin): number;
  threshold: number;
  /** When true, unlocking requires the signal to fall *below* the threshold. */
  invert?: boolean;
}

const STAR_DEFINITIONS: readonly StarDefinition[] = [
  {
    id: "visual-explorer",
    title: "Visual Explorer",
    description: "Pictures and diagrams help you learn fast.",
    signal: twin => twin.modalityEffectiveness.visual,
    threshold: UNLOCK_THRESHOLD,
  },
  {
    id: "tiny-step-starter",
    title: "Tiny-Step Starter",
    description: "Breaking missions into small steps works great for you.",
    signal: twin => twin.strategyEffectiveness.chunking,
    threshold: UNLOCK_THRESHOLD,
  },
  {
    id: "movement-explorer",
    title: "Movement Explorer",
    description: "Moving your body helps ideas click into place.",
    signal: twin => Math.max(twin.modalityEffectiveness.movement, twin.strategyEffectiveness.movementBreak),
    threshold: UNLOCK_THRESHOLD,
  },
  {
    id: "voice-navigator",
    title: "Voice Navigator",
    description: "Hearing things out loud helps you understand.",
    signal: twin => Math.max(twin.modalityEffectiveness.voice, twin.strategyEffectiveness.voiceHint),
    threshold: UNLOCK_THRESHOLD,
  },
  {
    id: "puzzle-solver",
    title: "Puzzle Solver",
    description: "You're getting really good at figuring puzzles out.",
    signal: twin => Object.values(twin.mastery).reduce((max, value) => Math.max(max, value), 0),
    threshold: MASTERY_STAR_THRESHOLD,
  },
  {
    id: "brave-beginner",
    title: "Brave Beginner",
    description: "You jump into new missions bravely, all on your own.",
    signal: twin => twin.initiationFriction,
    threshold: LOW_FRICTION_THRESHOLD,
    invert: true,
  },
];

export interface ConstellationStar {
  id: ConstellationStarId;
  title: string;
  description: string;
  unlocked: boolean;
  /** 0-1 progress toward unlocking, for a glow/fill animation — never rendered as a percentage. */
  progress: number;
}

function isUnlocked(definition: StarDefinition, value: number): boolean {
  return definition.invert ? value <= definition.threshold : value >= definition.threshold;
}

function progressToward(definition: StarDefinition, value: number): number {
  const progress = definition.invert
    ? (1 - value) / (1 - definition.threshold)
    : value / definition.threshold;
  return Math.max(0, Math.min(1, progress));
}

function planetProgressToward(count: number): number {
  return Math.max(0, Math.min(1, count / 4));
}

function planetStars(planetProgress?: PlanetStarProgress | null): ConstellationStar[] {
  const scienceCompleted = planetProgress?.scienceCompleted ?? 0;
  const numeriaCompleted = planetProgress?.numeriaCompleted ?? 0;
  return [
    {
      id: "science-explorer",
      title: "Science Explorer",
      description: "You explored all four Science lands.",
      unlocked: scienceCompleted >= 4,
      progress: planetProgressToward(scienceCompleted),
    },
    {
      id: "numeria-explorer",
      title: "Numeria Explorer",
      description: "You explored all four Numeria regions.",
      unlocked: numeriaCompleted >= 4,
      progress: planetProgressToward(numeriaCompleted),
    },
  ];
}

/** Derive every constellation star's unlock state. Twin stars from Twin; planet stars from optional local counts. */
export function getConstellationStars(
  twin: LearnerTwin,
  planetProgress?: PlanetStarProgress | null,
): ConstellationStar[] {
  const twinStars = STAR_DEFINITIONS.map(definition => {
    const value = definition.signal(twin);
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      unlocked: isUnlocked(definition, value),
      progress: progressToward(definition, value),
    };
  });
  return [...twinStars, ...planetStars(planetProgress)];
}

/** Convenience for "what's newly unlocked" banners: stars unlocked now but not in `previous`. */
export function newlyUnlockedStars(
  twin: LearnerTwin,
  previouslyUnlocked: ReadonlySet<ConstellationStarId>,
  planetProgress?: PlanetStarProgress | null,
): ConstellationStar[] {
  return getConstellationStars(twin, planetProgress).filter(
    star => star.unlocked && !previouslyUnlocked.has(star.id),
  );
}
