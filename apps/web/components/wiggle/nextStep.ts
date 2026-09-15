import type { LearnerTwin } from "@wiggle/contracts";
import { nextConstellationSuggestion } from "./nextConstellationSuggestion";
import { starDestination } from "./starDestination";

export interface NextStep {
  /** The nearest not-yet-unlocked star's own title and description, unchanged. */
  title: string;
  description: string;
  /** Button copy for the link, e.g. "Go to Colors Canyon". */
  actionLabel: string;
  href: string;
}

/**
 * Turns "you're close to a star" into something the child can actually click — the
 * gap the global launcher spec deliberately left open (no star-to-mission mapping
 * existed). Reuses nextConstellationSuggestion as the single source of truth for
 * *which* star to suggest; only adds *where* to go for it.
 */
export function getNextStep(twin: LearnerTwin, childId?: string): NextStep | null {
  const star = nextConstellationSuggestion(twin);
  if (!star) return null;
  const destination = starDestination(star.id);
  return {
    title: star.title,
    description: star.description,
    actionLabel: `Go to ${destination.missionName}`,
    href: destination.href(childId),
  };
}
