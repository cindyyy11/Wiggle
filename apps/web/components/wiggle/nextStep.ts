import type { LearnerTwin } from "@wiggle/contracts";
import { DEMO_CHILD_ID } from "../../lib/demo/seed";
import { planetStarProgressFor } from "../planet/planetCompletionMemory";
import { rankedLockedStars } from "./nextConstellationSuggestion";
import { starDestination } from "./starDestination";

export interface NextStep {
  /** The nearest not-yet-unlocked star's own title and description, unchanged. */
  title: string;
  description: string;
  /** The plain place name, e.g. "Colors Canyon" — for memory (nextStepMemory.ts) and copy. */
  missionName: string;
  /** Button copy for the link, e.g. "Go to Colors Canyon". */
  actionLabel: string;
  href: string;
}

/** Destinations that exist but are never offered as a "Go to …" suggestion. */
const EXCLUDED_MISSION_NAMES = new Set(["Magnet Lab", "Fraction Forest"]);

/**
 * Turns "you're close to a star" into something the child can actually click — the
 * gap the global launcher spec deliberately left open (no star-to-mission mapping
 * existed). Reuses rankedLockedStars as the single source of truth for *which*
 * star to suggest; only adds *where* to go for it.
 *
 * `avoidMissionName` (typically the last mission this browser already suggested —
 * see nextStepMemory.ts) lets the caller ask for a different idea than last time.
 * When every locked star points at the same place, or there's only one candidate,
 * the suggestion repeats rather than pretending there's a real alternative.
 */
export function getNextStep(twin: LearnerTwin, childId?: string, avoidMissionName?: string | null): NextStep | null {
  const id = childId ?? DEMO_CHILD_ID;
  const planetProgress =
    typeof window !== "undefined" ? planetStarProgressFor(id) : { scienceCompleted: 0, numeriaCompleted: 0 };
  const candidates = rankedLockedStars(twin, planetProgress).filter(
    candidate => !EXCLUDED_MISSION_NAMES.has(starDestination(candidate.id).missionName),
  );
  if (candidates.length === 0) return null;
  const star = (avoidMissionName
    ? candidates.find(candidate => starDestination(candidate.id).missionName !== avoidMissionName)
    : undefined) ?? candidates[0];
  const destination = starDestination(star.id);
  return {
    title: star.title,
    description: star.description,
    missionName: destination.missionName,
    actionLabel: `Go to ${destination.missionName}`,
    href: destination.href(childId),
  };
}
