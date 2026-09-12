import type { PlanetId } from "./worlds";

const MIN_TRAVEL_MS = 2_400;
const MAX_TRAVEL_MS = 3_300;

const planetOrder: readonly PlanetId[] = ["numeria", "lexicon", "novalab", "reset-moon", "constellation"];

/**
 * Keeps a trip long enough to be legible, without turning a destination choice
 * into a loading screen. The result is deterministic for a given pair.
 */
export function travelDuration(from: PlanetId, to: PlanetId): number {
  const distance = Math.abs(planetOrder.indexOf(from) - planetOrder.indexOf(to));
  return Math.min(MAX_TRAVEL_MS, MIN_TRAVEL_MS + distance * 220);
}

/** A clamped, deterministic value for the hub's DOM travel treatment. */
export function travelProgress(from: PlanetId, to: PlanetId, elapsedMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  return Math.min(1, Math.max(0, elapsedMs / travelDuration(from, to)));
}
