import { GESTURE_CONFIG } from "./config";
import type { Gesture } from "./gestureClassifier";

export interface GesturePhase { type: "start" | "hold" | "end"; gesture: Gesture; at: number }

/** Turns noisy classifications into semantic gesture edges without coupling to React. */
export class GestureStateMachine {
  private active: Gesture | null = null;
  private candidate: Gesture | null = null;
  private candidateSince = 0;
  private releaseSince: number | null = null;
  private lastSeenAt: number | null = null;

  get gesture() { return this.active; }

  update(raw: Gesture | null, at: number): GesturePhase[] {
    const phases: GesturePhase[] = [];
    if (raw) this.lastSeenAt = at;

    if (this.active) {
      if (raw === this.active) {
        this.releaseSince = null;
        phases.push({ type: "hold", gesture: this.active, at });
        return phases;
      }
      const lossElapsed = raw === null && this.lastSeenAt !== null ? at - this.lastSeenAt : 0;
      const releaseElapsed = this.releaseSince === null ? 0 : at - this.releaseSince;
      if (raw === null) {
        if (lossElapsed < GESTURE_CONFIG.lostHandGraceMs) return phases;
        phases.push({ type: "end", gesture: this.active, at });
        this.active = null;
        this.releaseSince = null;
        this.candidate = null;
        return phases;
      }
      if (this.releaseSince === null) {
        this.releaseSince = at;
        return phases;
      }
      if (raw !== null && releaseElapsed < GESTURE_CONFIG.releaseMs) return phases;
      phases.push({ type: "end", gesture: this.active, at });
      this.active = null;
      this.releaseSince = null;
      this.candidate = null;
    }

    if (!raw) {
      this.candidate = null;
      return phases;
    }
    if (this.candidate !== raw) {
      this.candidate = raw;
      this.candidateSince = at;
      return phases;
    }
    if (at - this.candidateSince >= GESTURE_CONFIG.stableHoldMs) {
      this.active = raw;
      this.candidate = null;
      phases.push({ type: "start", gesture: raw, at });
    }
    return phases;
  }
}
