import { GESTURE_CONFIG } from "../../features/gestures/config";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { handPointerToBench, type BenchPhase, type BenchPoint } from "./handBenchPlay";
import type { AnswerPhase } from "./answerPlay";

/** The bench point under a confidently tracked hand, or null so unreliable frames never earn actions. */
export function trackedBenchPoint(frame: HandTrackingLatest): BenchPoint | null {
  const pointer = frame.pointer;
  return frame.isTracking && frame.confidence >= GESTURE_CONFIG.minConfidence && pointer &&
    Number.isFinite(pointer.x) && Number.isFinite(pointer.y) ? handPointerToBench(pointer) : null;
}

/** The item to put back when the lesson thinks one is held but this controller is not, as after the scene remounts. */
export function staleHoldToCancel(reducerHeld: string | null, controllerHeld: string | null): string | null {
  return reducerHeld !== null && reducerHeld !== controllerHeld ? reducerHeld : null;
}

export function benchStatusForFrame(phase: BenchPhase, tracked: boolean, holding: boolean): string {
  if (!tracked) return holding ? "Tracking paused. Keep your hand in view." : "Show your hand to the camera.";
  if (phase === "discover") return "Point at an item to discover it.";
  if (phase === "done") return "All done!";
  return holding ? "Open your palm over a target to place it." : "Pinch an item to pick it up.";
}

export function answerStatusForFrame(phase: AnswerPhase, tracked: boolean): string {
  if (phase === "done") return "All done!";
  if (phase === "celebrating") return "Well done!";
  return tracked ? "Hold your hand over an answer." : "Show your hand to the camera.";
}
