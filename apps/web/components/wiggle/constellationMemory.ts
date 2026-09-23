import type { ConstellationStarId } from "@wiggle/contracts";
import { constellationStarIds } from "@wiggle/contracts";

/**
 * Which constellation stars this browser has already seen unlocked, purely so the
 * "New star!" celebration only shows once. This is presentational memory only — unlock
 * state is recomputed from the Learner Twin and optional local planet progress, never
 * stored here as a source of truth.
 */
function storageKey(childId: string): string {
  return `wiggle:constellation-seen:${childId}`;
}

export function seenConstellationStars(childId: string): ReadonlySet<ConstellationStarId> {
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is ConstellationStarId => constellationStarIds.includes(id)));
  } catch {
    return new Set();
  }
}

export function saveSeenConstellationStars(childId: string, ids: ReadonlyArray<ConstellationStarId>): void {
  try {
    window.localStorage.setItem(storageKey(childId), JSON.stringify(ids));
  } catch { /* Best-effort celebratory memory only; safe to lose. */ }
}
