"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Object3D, Plane, Raycaster, Vector2, Vector3 } from "three";
import { createInteractionPlane, GestureInteractionController, type GestureInteractionAction, type InteractiveTarget } from "./gestureInteraction";
import type { HandInteractionPresentation, SceneInteractionTargets } from "./world";

export interface GestureInteractionLayerProps extends HandInteractionPresentation {
  targets: SceneInteractionTargets;
  onAction?: (action: GestureInteractionAction) => void;
}

/** Reads tags from the hit mesh itself; Three userData does not cascade from parent groups. */
export function interactiveTargetFromObject(object: Object3D): InteractiveTarget | null {
  if (object.userData.interactive !== true) return null;
  const role = object.userData.role as InteractiveTarget["role"] | undefined;
  const id = object.userData.objectId as string | undefined;
  return role && id ? { id, role, object: (object.userData.dragObject as Object3D | undefined) ?? object } : null;
}

/** Reads the Task 1 mutable frame at render time, avoiding a React update per camera frame. */
export function latestHandFrame(latest: HandInteractionPresentation["latest"]) {
  const frame = latest.current;
  return { pointer: frame.pointer ? new Vector2(frame.pointer.x, frame.pointer.y) : null, isTracking: frame.isTracking };
}

/**
 * R3F-only bridge between stable hand phases and actual scene meshes. It intentionally emits
 * semantic actions instead of making mission decisions or scheduling React state per frame.
 */
export function GestureInteractionLayer({ latest, gesture, phase, enabled, targets, onAction }: GestureInteractionLayerProps) {
  const { camera } = useThree();
  const controller = useRef(new GestureInteractionController());
  const raycaster = useMemo(() => new Raycaster(), []);
  const phaseRef = useRef(phase);
  const lastPhaseAt = useRef<number | null>(null);
  const plane = useRef<Plane | null>(null);
  const heldGesture = useRef<Extract<NonNullable<typeof gesture>, "pinch" | "fist"> | null>(null);
  const onActionRef = useRef(onAction);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);
  useEffect(() => {
    if (!enabled) {
      controller.current = new GestureInteractionController();
      plane.current = null;
      heldGesture.current = null;
      lastPhaseAt.current = null;
    }
  }, [enabled]);

  useFrame(({ clock }) => {
    if (!enabled) return;
    const { pointer: ndc, isTracking } = latestHandFrame(latest);
    const currentPhase = phaseRef.current;
    const phaseChanged = Boolean(currentPhase && currentPhase.at !== lastPhaseAt.current);
    // Continue an active drag at display-frame rate with the mutable pointer. A low-frequency
    // phase update still resolves release/switch edges, while tracking loss always reaches the
    // controller for its grace-period release.
    const framePhase = heldGesture.current && !phaseChanged && isTracking
      ? { type: "hold" as const, gesture: heldGesture.current, at: clock.elapsedTime * 1000 }
      : currentPhase;
    if (!phaseChanged && !heldGesture.current && isTracking) return;
    if (currentPhase) lastPhaseAt.current = currentPhase.at;

    let target: InteractiveTarget | null = null;
    if (ndc && targets.current.length) {
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(targets.current.map(item => item.object), false)[0];
      if (hit) target = interactiveTargetFromObject(hit.object);
    }

    // Pin the plane before the controller records a grab, preserving the slice depth.
    if (framePhase?.type === "start" && (framePhase.gesture === "pinch" || framePhase.gesture === "fist") && target?.role === "pizza-slice") {
      plane.current = createInteractionPlane(target.object, camera);
    }
    const targetPoint = plane.current && ndc ? raycaster.ray.intersectPlane(plane.current, new Vector3()) : null;
    const actions = controller.current.update({
      pointer: ndc,
      phase: framePhase,
      target,
      targetPoint,
      at: clock.elapsedTime * 1000,
      isTracking,
    });
    for (const action of actions) {
      if (action.type === "grab" && (action.gesture === "pinch" || action.gesture === "fist")) heldGesture.current = action.gesture;
      if (action.type === "drop" || action.type === "lost-hand") plane.current = null;
      if (action.type === "drop" || action.type === "lost-hand") heldGesture.current = null;
      onActionRef.current?.(action);
    }
    // gesture is deliberately consumed as presentation data too: keeping it in the props makes
    // debug/telemetry callers explicit without asking the controller to infer classification.
    void gesture;
  });
  return null;
}

export default GestureInteractionLayer;
