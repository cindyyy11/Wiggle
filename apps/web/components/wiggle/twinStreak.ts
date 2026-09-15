/**
 * A light "opened my Twin today" streak — purely a presentational habit-loop nudge,
 * never a source of truth for learning. Losing this is safe; it just resets the
 * visible count back to 1 on the next visit. Follows the same best-effort
 * localStorage pattern as twinMemory.ts and constellationMemory.ts.
 */
function storageKey(childId: string): string {
  return `wiggle:twin-streak:${childId}`;
}

interface StreakRecord {
  count: number;
  /** yyyy-mm-dd, so a visit only ever counts once per calendar day. */
  lastVisit: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function isStreakRecord(value: unknown): value is StreakRecord {
  return !!value && typeof value === "object"
    && typeof (value as StreakRecord).count === "number"
    && typeof (value as StreakRecord).lastVisit === "string";
}

/**
 * Record a visit to the Twin screen and return the up-to-date streak count (>= 1).
 * A second visit on the same day does not double-count; a gap of more than one day
 * resets the streak rather than pretending it continued.
 */
export function recordTwinVisit(childId: string): number {
  const now = today();
  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    const previous: unknown = raw ? JSON.parse(raw) : null;
    let count = 1;
    if (isStreakRecord(previous)) {
      const gap = daysBetween(previous.lastVisit, now);
      if (gap === 0) count = previous.count;
      else if (gap === 1) count = previous.count + 1;
    }
    window.localStorage.setItem(storageKey(childId), JSON.stringify({ count, lastVisit: now }));
    return count;
  } catch {
    return 1;
  }
}
