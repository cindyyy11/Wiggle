import { useEffect, useRef } from "react";
import type { GestureEvent } from "./gestureClassifier";
import { useHandTracking } from "./useHandTracking";

export type { CameraStatus } from "./useHandTracking";
/** Compatibility adapter for UI callers while scene interaction migrates to useHandTracking. */
export function useGestureControls(enabled: boolean, onGesture: (event: GestureEvent) => void) {
  const tracking = useHandTracking({ enabled });
  const previous = useRef<GestureEvent["gesture"] | null>(null);
  useEffect(() => {
    if (!tracking.gesture || tracking.gesture === previous.current) return;
    previous.current = tracking.gesture;
    onGesture({ gesture: tracking.gesture, x: tracking.pointer ? (tracking.pointer.x + 1) / 2 : .5, y: tracking.pointer ? (1 - tracking.pointer.y) / 2 : .5 });
  }, [onGesture, tracking.gesture, tracking.pointer]);
  useEffect(() => { if (!tracking.gesture) previous.current = null; }, [tracking.gesture]);
  return { video: tracking.video, status: tracking.status };
}
