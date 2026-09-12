import { useEffect, useRef, useState } from "react";
import { GESTURE_CONFIG } from "./config";
import type { Gesture, HandFrame } from "./gestureClassifier";
import { GestureStateMachine, type GesturePhase } from "./gestureStateMachine";
import { mirroredPointerNdc, smoothPointer, type PointerNdc } from "./handMath";
import type { LocalHandTracker } from "./handLandmarker";

export type CameraStatus = "off" | "starting" | "ready" | "unavailable";
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
}

const emptyState = { status: "off" as CameraStatus, gesture: null, pointer: null, handedness: null, confidence: 0, isTracking: false };

/** Browser-local camera lifecycle plus stable hand gesture phases for scene consumers. */
export function useHandTracking({ enabled, onGestureStart, onGestureHold, onGestureEnd }: HandTrackingCallbacks): HandTrackingState {
  const video = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onGestureStart, onGestureHold, onGestureEnd });
  const [state, setState] = useState<Omit<HandTrackingState, "video">>(emptyState);
  useEffect(() => { callbacks.current = { onGestureStart, onGestureHold, onGestureEnd }; }, [onGestureStart, onGestureHold, onGestureEnd]);

  useEffect(() => {
    if (!enabled) { setState(emptyState); return; }
    let cancelled = false;
    let stream: MediaStream | undefined;
    let tracker: LocalHandTracker | undefined;
    let animation = 0;
    let lastInferenceAt = -Infinity;
    let lastVideoTime = -1;
    let pointer: PointerNdc | null = null;
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
    const setUnavailable = () => { stop(); if (!cancelled) setState({ ...emptyState, status: "unavailable" }); };
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
      if (frame && raw) pointer = smoothPointer(pointer, mirroredPointerNdc(frame.pointer ?? frame.landmarks[8]), GESTURE_CONFIG.pointerSmoothing, GESTURE_CONFIG.pointerDeadZone);
      emit(machine.update(raw, at));
      if (!cancelled) setState({ status: "ready", gesture: machine.gesture, pointer, handedness: frame?.handedness ?? null, confidence: frame?.confidence ?? 0, isTracking: Boolean(frame) });
    };
    const onHidden = () => { if (document.hidden) { cancelled = true; stop(); setState(emptyState); } };
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
          } catch { setUnavailable(); }
        };
        animation = requestAnimationFrame(tick);
      } catch { setUnavailable(); }
    })();
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled]);
  return { video, ...state };
}

// Kept as a function indirection so the classifier remains the sole gesture-definition module.
function requireGesture(frame: HandFrame) {
  // Dynamic import is unnecessary here: this static import is tree-shaken with the hook.
  return classify(frame);
}

import { classifyHand as classify } from "./gestureClassifier";
