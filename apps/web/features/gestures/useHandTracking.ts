import { useCallback, useEffect, useRef, useState } from "react";
import { GESTURE_CONFIG } from "./config";
import type { Gesture, HandFrame } from "./gestureClassifier";
import { GestureStateMachine, type GesturePhase } from "./gestureStateMachine";
import { mirroredPointerNdc, smoothPointer, type PointerNdc } from "./handMath";
import type { LocalHandTracker } from "./handLandmarker";

export type CameraStatus = "off" | "starting" | "ready" | "denied" | "unavailable";
export interface HandTrackingCallbacks {
  enabled: boolean;
  onGestureStart?: (phase: GesturePhase) => void;
  onGestureHold?: (phase: GesturePhase) => void;
  onGestureEnd?: (phase: GesturePhase) => void;
}
export interface HandTrackingState {
  video: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  gesture: Gesture | null;
  pointer: PointerNdc | null;
  handedness: string | null;
  confidence: number;
  isTracking: boolean;
  /** Imperative frame data for render loops; updates do not schedule React work. */
  latest: React.RefObject<HandTrackingLatest>;
  retry(): void;
}
export interface HandTrackingLatest {
  pointer: PointerNdc | null;
  gesture: Gesture | null;
  handedness: string | null;
  confidence: number;
  isTracking: boolean;
}

const createEmptyLatest = (): HandTrackingLatest => ({ pointer: null, gesture: null, handedness: null, confidence: 0, isTracking: false });
const emptyState: { status: CameraStatus; gesture: Gesture | null } = { status: "off", gesture: null };

/** Browser-local camera lifecycle plus stable hand gesture phases for scene consumers. */
export function useHandTracking({ enabled, onGestureStart, onGestureHold, onGestureEnd }: HandTrackingCallbacks): HandTrackingState {
  const video = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onGestureStart, onGestureHold, onGestureEnd });
  const latest = useRef<HandTrackingLatest>(createEmptyLatest());
  const [state, setState] = useState(emptyState);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => { callbacks.current = { onGestureStart, onGestureHold, onGestureEnd }; }, [onGestureStart, onGestureHold, onGestureEnd]);

  useEffect(() => {
    if (!enabled) { latest.current = createEmptyLatest(); setState(emptyState); return; }
    let cancelled = false;
    let stream: MediaStream | undefined;
    let tracker: LocalHandTracker | undefined;
    let animation = 0;
    let lastInferenceAt = -Infinity;
    let lastVideoTime = -1;
    const element = video.current;
    const machine = new GestureStateMachine();
    const stop = () => {
      cancelAnimationFrame(animation);
      animation = 0;
      stream?.getTracks().forEach(track => track.stop());
      stream = undefined;
      tracker?.close();
      tracker = undefined;
      if (element) element.srcObject = null;
    };
    const setFailure = (error: unknown) => {
      stop();
      latest.current = createEmptyLatest();
      const status: CameraStatus = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")
        ? "denied" : "unavailable";
      if (!cancelled) setState({ ...emptyState, status });
    };
    const emit = (phases: GesturePhase[]) => {
      for (const phase of phases) {
        if (phase.type === "start") callbacks.current.onGestureStart?.(phase);
        else if (phase.type === "hold") callbacks.current.onGestureHold?.(phase);
        else callbacks.current.onGestureEnd?.(phase);
      }
    };
    const publish = (frame: HandFrame | null, at: number) => {
      const raw = frame?.confidence && frame.confidence >= GESTURE_CONFIG.minConfidence
        ? (requireGesture(frame) ?? null) : null;
      const confidentPointer = frame && frame.confidence >= GESTURE_CONFIG.minConfidence
        ? frame.pointer ?? frame.landmarks[8] : null;
      latest.current.pointer = confidentPointer && Number.isFinite(confidentPointer.x) && Number.isFinite(confidentPointer.y)
        ? smoothPointer(latest.current.pointer, mirroredPointerNdc(confidentPointer), GESTURE_CONFIG.pointerSmoothing, GESTURE_CONFIG.pointerDeadZone)
        : null;
      latest.current.gesture = raw;
      latest.current.handedness = frame?.handedness ?? null;
      latest.current.confidence = frame?.confidence ?? 0;
      latest.current.isTracking = Boolean(latest.current.pointer);
      const phases = machine.update(raw, at);
      emit(phases);
      if (phases.some(phase => phase.type !== "hold") && !cancelled) {
        setState(previous => previous.gesture === machine.gesture ? previous : { ...previous, gesture: machine.gesture });
      }
    };
    const onHidden = () => { if (document.hidden) { cancelled = true; stop(); latest.current = createEmptyLatest(); setState(emptyState); } };
    const onPageHide = () => { cancelled = true; stop(); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    setState({ ...emptyState, status: "starting" });
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !element) throw new Error("Camera unavailable");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (cancelled) { stop(); return; }
        element.srcObject = stream;
        await element.play();
        if (cancelled) { stop(); return; }
        const { loadHandLandmarker } = await import("./handLandmarker");
        if (cancelled) { stop(); return; }
        const loadedTracker = await loadHandLandmarker();
        if (cancelled) { loadedTracker.close(); stop(); return; }
        tracker = loadedTracker;
        setState({ ...emptyState, status: "ready" });
        const tick = (at: number) => {
          if (cancelled) return;
          try {
            if (at - lastInferenceAt >= 1000 / GESTURE_CONFIG.maxInferenceFps && element.readyState >= 2 && element.currentTime !== lastVideoTime) {
              lastInferenceAt = at;
              lastVideoTime = element.currentTime;
              publish(tracker!.detect(element, at), at);
            }
            animation = requestAnimationFrame(tick);
          } catch (error) { setFailure(error); }
        };
        animation = requestAnimationFrame(tick);
      } catch (error) { setFailure(error); }
    })();
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled, attempt]);
  return {
    video,
    latest,
    status: state.status,
    gesture: state.gesture,
    get pointer() { return latest.current.pointer; },
    get handedness() { return latest.current.handedness; },
    get confidence() { return latest.current.confidence; },
    get isTracking() { return latest.current.isTracking; },
    retry,
  };
}

// Kept as a function indirection so the classifier remains the sole gesture-definition module.
function requireGesture(frame: HandFrame) {
  // Dynamic import is unnecessary here: this static import is tree-shaken with the hook.
  return classify(frame);
}

import { classifyHand as classify } from "./gestureClassifier";
