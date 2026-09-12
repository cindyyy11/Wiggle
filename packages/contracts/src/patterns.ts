/**
 * Parent-facing "learning patterns" — a plain-language bucketing of the same Twin
 * numbers used everywhere else. This is explicitly not a diagnosis: it never produces
 * a score, a medical label, or an attention/ADHD rating, only which ways of learning
 * currently work well, which are improving, and which don't have enough evidence yet.
 */
import type { LearnerTwin, ModalityEffectiveness, StrategyEffectiveness } from "./twin.js";

export type PatternKey = keyof ModalityEffectiveness | keyof StrategyEffectiveness;

const EFFECTIVE_THRESHOLD = 0.7;
const IMPROVING_DELTA = 0.05;
/** Signals default to 0.5 until evidence arrives; values still this close to that prior are unproven. */
const NEUTRAL_BAND = 0.03;

export const patternLabels: Readonly<Record<PatternKey, string>> = {
  visual: "Visual",
  voice: "Voice",
  gesture: "Gesture",
  movement: "Movement",
  story: "Stories",
  text: "Reading",
  chunking: "Small steps",
  movementBreak: "Movement breaks",
  visualHint: "Picture hints",
  voiceHint: "Spoken hints",
  choice: "Choice of activities",
};

export interface LearnerPatterns {
  effective: readonly PatternKey[];
  improving: readonly PatternKey[];
  needsMoreData: readonly PatternKey[];
}

function entries(twin: LearnerTwin): readonly [PatternKey, number][] {
  return [
    ...(Object.entries(twin.modalityEffectiveness) as [PatternKey, number][]),
    ...(Object.entries(twin.strategyEffectiveness) as [PatternKey, number][]),
  ];
}

/** Bucket every modality and strategy signal into effective / improving / needs-more-data. */
export function getLearnerPatterns(twin: LearnerTwin, previous?: LearnerTwin | null): LearnerPatterns {
  const effective: PatternKey[] = [];
  const improving: PatternKey[] = [];
  const needsMoreData: PatternKey[] = [];
  for (const [key, value] of entries(twin)) {
    const wasNeutral = Math.abs(value - 0.5) <= NEUTRAL_BAND;
    if (value >= EFFECTIVE_THRESHOLD) {
      effective.push(key);
      continue;
    }
    const before = previous ? previousValue(previous, key) : null;
    if (before !== null && value - before >= IMPROVING_DELTA) {
      improving.push(key);
    } else if (wasNeutral) {
      needsMoreData.push(key);
    }
  }
  return { effective, improving, needsMoreData };
}

function previousValue(twin: LearnerTwin, key: PatternKey): number {
  const modality = twin.modalityEffectiveness as unknown as Record<string, number>;
  const strategy = twin.strategyEffectiveness as unknown as Record<string, number>;
  return modality[key] ?? strategy[key] ?? 0.5;
}
