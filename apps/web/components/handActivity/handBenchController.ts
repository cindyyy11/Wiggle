import { GESTURE_CONFIG } from "../../features/gestures/config";
import type { Gesture } from "../../features/gestures/gestureClassifier";
import type { BenchAction, BenchPhase } from "./handBenchPlay";

export type BenchControllerInput = {
  phase: BenchPhase;
  gesture: Gesture | null;
  /** The resting item under the hand, if any. */
  item: string | null;
  /** The target under the hand while carrying an item, if any. */
  target: string | null;
  isTracking: boolean;
  /** Milliseconds, monotonic. */
  at: number;
};

/**
 * Turns stable hand gestures and bench hits into lesson actions.
 * Losing the hand never drops or scores an item; after the shared grace period it is simply put back.
 */
export class HandBenchController {
  private held: string | null = null;
  private lostSince: number | null = null;
  private pointing: string | null = null;

  /** The id of the item this controller believes is being carried, if any. */
  get holding(): string | null {
    return this.held;
  }

  reset() {
    this.held = null;
    this.lostSince = null;
    this.pointing = null;
  }

  update(input: BenchControllerInput): BenchAction | null {
    if (!input.isTracking) {
      this.lostSince ??= input.at;
      if (input.at - this.lostSince < GESTURE_CONFIG.lostHandGraceMs) return null;
      const id = this.held;
      this.reset();
      return id ? { type: "cancel", id } : null;
    }
    this.lostSince = null;

    if (input.phase === "discover") {
      if (input.gesture !== "point" || !input.item) { this.pointing = null; return null; }
      if (this.pointing === input.item) return null;
      this.pointing = input.item;
      return { type: "observe", id: input.item };
    }
    if (input.phase !== "match") return null;

    if (this.held) {
      if (input.gesture !== "open_palm") return null;
      const id = this.held;
      this.held = null;
      return input.target ? { type: "drop", id, target: input.target } : { type: "cancel", id };
    }
    if (input.gesture === "pinch" && input.item) {
      this.held = input.item;
      return { type: "grab", id: input.item };
    }
    return null;
  }
}
