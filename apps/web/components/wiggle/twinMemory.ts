import type { LearnerTwin } from "@wiggle/contracts";
import { assertLearnerTwin } from "@wiggle/contracts";

/**
 * The last Twin snapshot this browser saw for a child, used only to notice recent
 * growth (getTwinVisualState's "progressing" state, and constellation "new star"
 * banners). Never a source of truth — the authoritative twin always comes fresh
 * from the backend; this is just a presentational memory of what the child already
 * saw last time, so we do not have to guess.
 */
function storageKey(childId: string): string {
  return `wiggle:last-twin:${childId}`;
}

export function getLastSeenTwin(childId: string): LearnerTwin | null {
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return null;
    return assertLearnerTwin(JSON.parse(raw) as LearnerTwin);
  } catch {
    return null;
  }
}

export function saveSeenTwin(childId: string, twin: LearnerTwin): void {
  try {
    window.localStorage.setItem(storageKey(childId), JSON.stringify(twin));
  } catch { /* Best-effort memory only; safe to lose. */ }
}
