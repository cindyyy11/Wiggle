import { Plane, Vector2, Vector3, type Camera, type Object3D } from "three";
import type { Gesture } from "../../features/gestures/gestureClassifier";
import type { GesturePhase } from "../../features/gestures/gestureStateMachine";

export type InteractiveRole = "pizza-slice" | "plate" | "lexi-beacon";

export interface InteractiveTarget {
  id: string;
  role: InteractiveRole;
  object: Object3D;
}

export interface GestureInteractionAction {
  type: "focus" | "grab" | "move" | "drop" | "open-lexi" | "lost-hand";
  gesture?: Gesture;
  targetId?: string;
  position?: Vector3;
  success?: boolean;
}

/** Values supplied by the R3F boundary after it has projected the hand and raycast the scene. */
export interface GestureInteractionInput {
  pointer: Vector2 | null;
  phase: GesturePhase | null;
  target: InteractiveTarget | null;
  targetPoint: Vector3 | null;
  at: number;
  /** Omit when tracking state is unavailable; explicit false begins the safe-release grace period. */
  isTracking?: boolean;
}

export interface GestureInteractionControllerOptions {
  /** Fraction of the remaining distance applied on each movement update. */
  smoothing?: number;
  lostHandGraceMs?: number;
}

interface HeldTarget {
  target: InteractiveTarget;
  gesture: Extract<Gesture, "pinch" | "fist">;
}

const DEFAULT_SMOOTHING = .22;
const DEFAULT_LOST_HAND_GRACE_MS = 400;

/**
 * Maps already-stable hand phases plus scene hit-test results to semantic mission actions.
 * It deliberately owns no React or camera lifecycle state.
 */
export class GestureInteractionController {
  private readonly smoothing: number;
  private readonly lostHandGraceMs: number;
  private held: HeldTarget | null = null;
  private focusedId: string | null = null;
  private lostSince: number | null = null;

  constructor(options: GestureInteractionControllerOptions = {}) {
    this.smoothing = Math.min(1, Math.max(0, options.smoothing ?? DEFAULT_SMOOTHING));
    this.lostHandGraceMs = Math.max(0, options.lostHandGraceMs ?? DEFAULT_LOST_HAND_GRACE_MS);
  }

  update(input: GestureInteractionInput): GestureInteractionAction[] {
    const actions: GestureInteractionAction[] = [];

    if (this.held && input.isTracking === false) {
      this.lostSince ??= input.at;
      if (input.at - this.lostSince >= this.lostHandGraceMs) this.releaseLostHand(actions);
      return actions;
    }
    this.lostSince = null;

    const phase = input.phase;
    if (this.held) {
      if (phase?.type === "end" && phase.gesture === this.held.gesture) {
        this.drop(actions, input.target);
        return actions;
      }
      // The state machine should emit an end before a new start. If an upstream caller
      // coalesces them, finish the existing drag and require a fresh start to activate it.
      if (phase?.type === "start" && phase.gesture !== this.held.gesture) {
        this.drop(actions, null);
        return actions;
      }
      if (phase?.type === "hold" && phase.gesture === this.held.gesture && input.targetPoint) {
        actions.push(this.moveHeld(input.targetPoint));
      }
      return actions;
    }

    if (!phase) return actions;
    if (phase.gesture === "point") {
      if (phase.type === "start" || phase.type === "hold") this.focus(actions, input.target, phase.gesture);
      else if (phase.type === "end") this.focus(actions, null, phase.gesture);
      return actions;
    }

    if (phase.type !== "start") return actions;
    if ((phase.gesture === "pinch" || phase.gesture === "fist") && input.target?.role === "pizza-slice") {
      this.held = { target: input.target, gesture: phase.gesture };
      this.focusedId = input.target.id;
      actions.push({ type: "grab", gesture: phase.gesture, targetId: input.target.id });
    } else if (phase.gesture === "open_palm" && input.target?.role === "lexi-beacon") {
      actions.push({ type: "open-lexi", gesture: phase.gesture, targetId: input.target.id });
    }
    return actions;
  }

  private focus(actions: GestureInteractionAction[], target: InteractiveTarget | null, gesture: Gesture) {
    const nextId = target?.id ?? null;
    if (nextId === this.focusedId) return;
    this.focusedId = nextId;
    actions.push(nextId ? { type: "focus", gesture, targetId: nextId } : { type: "focus", gesture });
  }

  private moveHeld(targetPoint: Vector3): GestureInteractionAction {
    const held = this.held!;
    const object = held.target.object;
    const localTarget = targetPoint.clone();
    if (object.parent) object.parent.worldToLocal(localTarget);
    object.position.lerp(localTarget, this.smoothing);
    object.updateMatrixWorld();
    const position = object.getWorldPosition(new Vector3());
    return { type: "move", gesture: held.gesture, targetId: held.target.id, position };
  }

  private drop(actions: GestureInteractionAction[], target: InteractiveTarget | null) {
    const held = this.held!;
    actions.push({
      type: "drop",
      gesture: held.gesture,
      targetId: held.target.id,
      success: target?.role === "plate",
    });
    this.held = null;
    this.lostSince = null;
  }

  private releaseLostHand(actions: GestureInteractionAction[]) {
    const held = this.held!;
    actions.push({ type: "lost-hand", gesture: held.gesture, targetId: held.target.id });
    this.drop(actions, null);
  }
}

/**
 * Creates a camera-facing plane through the object's current world position. The plane is
 * depth-locked; this helper never mutates the object, so a drag cannot snap it toward camera.
 */
export function createInteractionPlane(object: Object3D, camera: Pick<Camera, "getWorldDirection">): Plane {
  const worldPosition = object.getWorldPosition(new Vector3());
  const normal = camera.getWorldDirection(new Vector3()).normalize();
  return new Plane().setFromNormalAndCoplanarPoint(normal, worldPosition);
}
