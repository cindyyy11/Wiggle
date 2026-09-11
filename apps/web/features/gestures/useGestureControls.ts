import { useEffect, useRef, useState } from "react";
import { GestureClassifier, type GestureEvent } from "./gestureClassifier";
import type { LocalHandTracker } from "./handLandmarker";

export type CameraStatus = "off" | "starting" | "ready" | "unavailable";
export function useGestureControls(enabled: boolean, onGesture: (event: GestureEvent) => void) {
  const video = useRef<HTMLVideoElement>(null);
  const handler = useRef(onGesture);
  const [status, setStatus] = useState<CameraStatus>("off");
  useEffect(() => { handler.current = onGesture; }, [onGesture]);
  useEffect(() => {
    if (!enabled) { setStatus("off"); return; }
    let cancelled = false; let stream: MediaStream | undefined; let tracker: LocalHandTracker | undefined;
    let animation = 0; let lastFrame = -Infinity; let lastVideoTime = -1;
    const element = video.current;
    const classifier = new GestureClassifier();
    const stop = () => {
      cancelAnimationFrame(animation);
      stream?.getTracks().forEach(track => track.stop()); stream = undefined;
      tracker?.close(); tracker = undefined;
      if (element) element.srcObject = null;
    };
    const onHidden = () => { if (document.hidden) { cancelled = true; stop(); setStatus("off"); } };
    const onPageHide = () => { cancelled = true; stop(); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    setStatus("starting");
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
        tracker = await loadHandLandmarker();
        if (cancelled) { stop(); return; }
        setStatus("ready");
        const tick = (time: number) => {
          if (cancelled) return;
          try {
            // Bound inference to 12 FPS, and never reprocess the same decoded frame.
            if (time - lastFrame >= 80 && element.readyState >= 2 && element.currentTime !== lastVideoTime) {
              lastFrame = time; lastVideoTime = element.currentTime;
              const event = classifier.update(tracker!.detect(element, time), time);
              if (event) handler.current(event);
            }
            animation = requestAnimationFrame(tick);
          } catch { stop(); setStatus("unavailable"); }
        };
        animation = requestAnimationFrame(tick);
      } catch { stop(); if (!cancelled) setStatus("unavailable"); }
    })();
    return () => { cancelled = true; stop(); document.removeEventListener("visibilitychange", onHidden); window.removeEventListener("pagehide", onPageHide); };
  }, [enabled]);
  return { video, status };
}
