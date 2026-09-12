/**
 * Child-facing visual state for the Learner Digital Twin.
 *
 * This is a pure, deterministic mapping from the numeric LearnerTwin (the backend's
 * source of truth) to a small set of moods the Twin avatar can express. It never uses
 * an LLM and never surfaces raw numbers to the child — only this state and its paired
 * copy do. The same function drives the child's Twin screen, the child's progress
 * screen, and the parent's Twin view: three views of one underlying model.
 */
import type { LearnerTwin } from "./twin.js";

export const twinVisualStates = [
  "needs_reset",
  "overwhelmed",
  "stuck",
  "mastered",
  "progressing",
  "ready",
] as const;

export type TwinVisualState = (typeof twinVisualStates)[number];

/** How much a mastery objective must rise since the last snapshot to count as "progressing". */
const MASTERY_PROGRESS_DELTA = 0.08;
const HIGH_FRICTION_THRESHOLD = 0.7;
const MASTERED_THRESHOLD = 0.9;

function bestMastery(twin: LearnerTwin): number {
  const values = Object.values(twin.mastery);
  return values.length ? Math.max(...values) : 0;
}

/** True when any tracked objective grew by at least the progress delta since `previous`. */
function masteryImproved(twin: LearnerTwin, previous: LearnerTwin | null | undefined): boolean {
  if (!previous) return false;
  return Object.entries(twin.mastery).some(
    ([objective, value]) => value - (previous.mastery[objective] ?? 0) >= MASTERY_PROGRESS_DELTA,
  );
}

/**
 * Map the backend Learner Digital Twin to one child-safe visual state.
 *
 * Wellbeing signals (needing a reset, feeling overwhelmed, or stuck starting) take
 * priority over celebration, because Wiggle's environment should adapt to the child
 * before it congratulates them. `previous` is an optional earlier snapshot (e.g. from
 * the last time the child opened their Twin) used only to notice recent growth.
 */
export function getTwinVisualState(
  twin: LearnerTwin,
  previous?: LearnerTwin | null,
): TwinVisualState {
  if (twin.fatigueEstimate > HIGH_FRICTION_THRESHOLD) return "needs_reset";
  if (twin.cognitiveLoad > HIGH_FRICTION_THRESHOLD) return "overwhelmed";
  if (twin.initiationFriction > HIGH_FRICTION_THRESHOLD) return "stuck";
  if (bestMastery(twin) > MASTERED_THRESHOLD) return "mastered";
  if (masteryImproved(twin, previous)) return "progressing";
  return "ready";
}

/** Short, warm, non-clinical copy for each visual state. Never a number, never a label like "friction". */
export const twinVisualCopy: Readonly<Record<TwinVisualState, string>> = {
  ready: "Ready for a mission whenever you are!",
  overwhelmed: "Let's make things a little calmer.",
  stuck: "Lexi thinks we should try this another way.",
  progressing: "Your Twin is finding its groove!",
  needs_reset: "Time for a little rest stop.",
  mastered: "Wow — your Twin is glowing with pride!",
} as const;
