/** How long a hand must stay over an answer token for it to be chosen. */
export const DWELL_MS = 1200;
/** How long a hand may drift off a token before its ring resets, so a shaky hand is forgiven. */
export const LEAVE_GRACE_MS = 300;

export type DwellInput = {
  /** The token under the hand, or null. */
  over: string | null;
  /** False when no hand is confidently seen; the ring resets at once. */
  isTracking: boolean;
  /** False when nothing may be chosen right now (for example while celebrating). */
  enabled: boolean;
  /** Milliseconds, monotonic. */
  at: number;
};

export type DwellOutput = {
  /** The token whose ring is filling, or null. */
  id: string | null;
  /** Ring fill from 0 to 1. */
  progress: number;
  /** The token that has just been chosen; set on exactly one update. */
  selected: string | null;
};

const IDLE: DwellOutput = { id: null, progress: 0, selected: null };

/**
 * Point and hold. A ring fills while the hand stays over one token; a full ring chooses it. Losing the hand resets the
 * ring and never chooses anything. After a choice the same token cannot be chosen again until the hand has left it.
 */
export class DwellSelector {
  private id: string | null = null;
  private startedAt = 0;
  private leftAt: number | null = null;
  private locked: string | null = null;

  reset() {
    this.id = null;
    this.leftAt = null;
    this.locked = null;
  }

  update({ over, isTracking, enabled, at }: DwellInput): DwellOutput {
    if (!enabled || !isTracking) { this.reset(); return IDLE; }

    if (this.locked !== null) {
      if (over === this.locked) return IDLE;
      this.locked = null;
    }

    if (over !== null && over !== this.id) {
      this.id = over;
      this.startedAt = at;
      this.leftAt = null;
    } else if (over !== null) {
      if (this.leftAt !== null) { this.startedAt += at - this.leftAt; this.leftAt = null; }
    } else if (this.id !== null) {
      this.leftAt ??= at;
      if (at - this.leftAt >= LEAVE_GRACE_MS) { this.reset(); return IDLE; }
    }

    if (this.id === null) return IDLE;
    const now = this.leftAt ?? at;
    const progress = Math.min(1, Math.max(0, (now - this.startedAt) / DWELL_MS));
    if (progress >= 1 && this.leftAt === null) {
      const id = this.id;
      this.locked = id;
      this.id = null;
      return { id, progress: 1, selected: id };
    }
    return { id: this.id, progress, selected: null };
  }
}
