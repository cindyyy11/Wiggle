import type { ConstellationStarId } from "@wiggle/contracts";
import { buildWorldHref, type ScienceZoneId } from "../worlds/subjectRoute";

export interface StarDestination {
  /** The child-facing name of the place this star's suggestion points to. */
  missionName: string;
  /** The land guide who greets the child there (see LAND_GUIDES), for warmer copy. */
  guideName: string;
  href(childId?: string): string;
}

function science(zone: ScienceZoneId, missionName: string, guideName: string): StarDestination {
  return { missionName, guideName, href: childId => buildWorldHref({ world: "science", zone, child: childId }) };
}

const numeria: StarDestination = {
  missionName: "Fraction Forest",
  guideName: "Lexi",
  href: childId => buildWorldHref({ world: "math", child: childId }),
};

/**
 * Where a not-yet-unlocked constellation star's suggestion should actually send the
 * child — the missing link between "you're close to a star" and something to click
 * (see docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md, which
 * originally left this mapping out of scope). Only points at real, reachable places:
 * Numeria's one mission, and the four Science lands that exist today (sink-float and
 * ph-lab are still placeholders and are deliberately never suggested).
 */
const STAR_DESTINATIONS: Readonly<Record<ConstellationStarId, StarDestination>> = {
  "visual-explorer": science("colors", "Colors Canyon", "Prism the Crystal"),
  "tiny-step-starter": numeria,
  "movement-explorer": science("magnet-lab", "Magnet Lab", "Maggie the Magnet"),
  "voice-navigator": numeria,
  "puzzle-solver": science("animals", "Animal Types", "Pip the Bird"),
  "brave-beginner": science("life-cycle", "Life Cycle Garden", "Sprout"),
  "science-explorer": science("animals", "Animal Types", "Pip the Bird"),
  "numeria-explorer": {
    missionName: "Number Valley",
    guideName: "Lexi",
    href: childId => buildWorldHref({ world: "math", child: childId }),
  },
};

export function starDestination(id: ConstellationStarId): StarDestination {
  return STAR_DESTINATIONS[id];
}
