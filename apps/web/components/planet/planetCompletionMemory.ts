import type { PlanetStarProgress } from "@wiggle/contracts";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import type { MathRegionId } from "../math/mathActivities";

const SCIENCE_IDS = ["magnet-lab", "animals", "colors", "life-cycle"] as const satisfies readonly ScienceZoneId[];
const NUMERIA_IDS = ["fraction-forest", "number-valley", "geometry-ridge", "crystal-crater"] as const satisfies readonly MathRegionId[];

function key(childId: string, planet: "science" | "numeria"): string {
  return `wiggle:planet-complete:${childId}:${planet}`;
}

function loadSet<T extends string>(childId: string, planet: "science" | "numeria", allowed: readonly T[]): ReadonlySet<T> {
  try {
    const raw = window.localStorage.getItem(key(childId, planet));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is T => typeof id === "string" && (allowed as readonly string[]).includes(id)));
  } catch {
    return new Set();
  }
}

function saveSet(childId: string, planet: "science" | "numeria", ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(key(childId, planet), JSON.stringify([...ids]));
  } catch { /* best-effort */ }
}

export function loadCompletedScienceZones(childId: string): ReadonlySet<ScienceZoneId> {
  return loadSet(childId, "science", SCIENCE_IDS);
}

export function saveCompletedScienceZones(childId: string, zones: ReadonlySet<ScienceZoneId>): void {
  saveSet(childId, "science", zones);
}

export function loadCompletedNumeriaRegions(childId: string): ReadonlySet<MathRegionId> {
  return loadSet(childId, "numeria", NUMERIA_IDS);
}

export function saveCompletedNumeriaRegions(childId: string, regions: ReadonlySet<MathRegionId>): void {
  saveSet(childId, "numeria", regions);
}

export function planetStarProgressFor(childId: string): PlanetStarProgress {
  return {
    scienceCompleted: loadCompletedScienceZones(childId).size,
    numeriaCompleted: loadCompletedNumeriaRegions(childId).size,
  };
}
