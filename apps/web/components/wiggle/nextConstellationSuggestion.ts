import type { ConstellationStar, LearnerTwin, PlanetStarProgress } from "@wiggle/contracts";
import { getConstellationStars } from "@wiggle/contracts";

/**
 * Every not-yet-unlocked constellation star, nearest-to-unlocking first. Reuses
 * getConstellationStars as the single source of truth and adds no new signal of
 * its own. The ranking exists so a caller can offer an alternative when the
 * closest star was already suggested last time (see nextStep.ts).
 */
export function rankedLockedStars(
  twin: LearnerTwin,
  planetProgress?: PlanetStarProgress | null,
): ConstellationStar[] {
  return getConstellationStars(twin, planetProgress)
    .filter(star => !star.unlocked)
    .sort((a, b) => b.progress - a.progress);
}

/**
 * The not-yet-unlocked constellation star closest to unlocking — the "What can I
 * try?" line in the global Twin launcher (see
 * docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md).
 * Returns null once every star is unlocked.
 */
export function nextConstellationSuggestion(
  twin: LearnerTwin,
  planetProgress?: PlanetStarProgress | null,
): ConstellationStar | null {
  return rankedLockedStars(twin, planetProgress)[0] ?? null;
}
