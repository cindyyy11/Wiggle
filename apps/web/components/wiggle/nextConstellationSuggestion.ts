import type { ConstellationStar, LearnerTwin } from "@wiggle/contracts";
import { getConstellationStars } from "@wiggle/contracts";

/**
 * The not-yet-unlocked constellation star closest to unlocking — the "What can I
 * try?" line in the global Twin launcher (see
 * docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md).
 * Reuses getConstellationStars as the single source of truth and adds no new
 * signal of its own. Returns null once every star is unlocked.
 */
export function nextConstellationSuggestion(twin: LearnerTwin): ConstellationStar | null {
  const locked = getConstellationStars(twin).filter(star => !star.unlocked);
  if (locked.length === 0) return null;
  return locked.reduce((closest, star) => (star.progress > closest.progress ? star : closest));
}
