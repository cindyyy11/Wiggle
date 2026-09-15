/**
 * Remembers the last mission this browser suggested to a child via "What can I
 * try?", purely so the same idea isn't repeated back-to-back when the Twin's own
 * signals give a real alternative. Never a source of truth — losing this is safe;
 * worst case, the same suggestion repeats once more than ideal. Follows the same
 * best-effort localStorage pattern as twinMemory.ts and constellationMemory.ts.
 */
function storageKey(childId: string): string {
  return `wiggle:last-suggested:${childId}`;
}

export function getLastSuggestedMission(childId: string): string | null {
  try { return window.localStorage.getItem(storageKey(childId)); } catch { return null; }
}

export function saveSuggestedMission(childId: string, missionName: string): void {
  try { window.localStorage.setItem(storageKey(childId), missionName); } catch { /* best-effort memory only */ }
}
