import { GESTURE_CONFIG } from "../../features/gestures/config";
import type { Gesture } from "../../features/gestures/gestureClassifier";
import type { MagnetObjectId, MagnetResult } from "./scienceWorld";

export type MagnetGestureTarget = MagnetObjectId | MagnetResult | "toolbox" | null;

export type MagnetGestureInput = {
  gesture: Gesture | null;
  target: MagnetGestureTarget;
  isTracking: boolean;
  at: number;
};

export type MagnetGestureAction =
  | { type: "cancel"; id: MagnetObjectId }
  | { type: "grab"; id: MagnetObjectId }
  | { type: "drop"; id: MagnetObjectId; target: MagnetResult }
  | { type: "investigate"; target: "toolbox" };

const magnetObjectIds = new Set<MagnetObjectId>([
  "paper-clip",
  "iron-nail",
  "wooden-block",
  "plastic-button",
]);

const isMagnetObjectId = (target: MagnetGestureTarget): target is MagnetObjectId =>
  target !== null && magnetObjectIds.has(target as MagnetObjectId);

const isMagnetResult = (target: MagnetGestureTarget): target is MagnetResult =>
  target === "attracted" || target === "not-attracted";

/**
 * Turns stable hand gestures and scene hit targets into curriculum actions.
 * Tracking loss only clears a held object after the shared grace period; it never drops or scores it.
 */
export class MagnetHandGestureController {
  private held: MagnetObjectId | null = null;
  private lostSince: number | null = null;
  private investigating = false;

  update(input: MagnetGestureInput): MagnetGestureAction | null {
    if (!input.isTracking) {
      return this.handleTrackingLoss(input.at);
    }

    this.lostSince = null;
    if (this.held) {
      if (input.gesture === "open_palm" && isMagnetResult(input.target)) {
        const action: MagnetGestureAction = { type: "drop", id: this.held, target: input.target };
        this.held = null;
        return action;
      }
      return null;
    }

    if ((input.gesture === "point" || input.gesture === "pinch") && input.target === "toolbox") {
      if (this.investigating) return null;
      this.investigating = true;
      return { type: "investigate", target: "toolbox" };
    }

    this.investigating = false;
    if (input.gesture !== "pinch" || !isMagnetObjectId(input.target)) return null;
    this.held = input.target;
    return { type: "grab", id: input.target };
  }

  reset(): void {
    this.held = null;
    this.lostSince = null;
    this.investigating = false;
  }

  private handleTrackingLoss(at: number): MagnetGestureAction | null {
    if (!this.held) {
      this.investigating = false;
      return null;
    }
    this.lostSince ??= at;
    if (at - this.lostSince >= GESTURE_CONFIG.lostHandGraceMs) {
      const id = this.held;
      this.held = null;
      this.lostSince = null;
      return { type: "cancel", id };
    }
    return null;
  }
}
