export type Gesture = "pinch" | "point" | "open_palm" | "fist";
export interface Landmark { x: number; y: number; z: number }
export interface HandFrame { landmarks: Landmark[]; pointer?: Landmark; handedness: string; confidence: number }
export interface GestureEvent { gesture: Gesture; x: number; y: number }
import { GESTURE_CONFIG } from "./config";
import { isFingerExtended, pinchRatio } from "./handMath";

/** Scale/hand independent geometry; uncertain or incomplete hands produce no action. */
export function classifyHand(frame: HandFrame): Gesture | null {
  const points = frame.landmarks;
  if (points.length !== 21 || points.some(p => ![p.x, p.y, p.z].every(Number.isFinite))) return null;
  const extension = [5, 9, 13, 17].map(base => isFingerExtended(points, base));
  if (pinchRatio(points) < GESTURE_CONFIG.pinchRatio) return "pinch";
  if (extension.every(Boolean)) return "open_palm";
  if (extension[0] && extension.slice(1).every(value => !value)) return "point";
  if (extension.every(value => !value)) return "fist";
  return null;
}

/** Consecutive activation/release, EMA confidence, one action per hold and a cooldown. */
export class GestureClassifier {
  private candidate: string | null = null;
  private confidence = 0;
  private frames = 0;
  private released = 0;
  private held = false;
  private lastEvent = -Infinity;
  update(frame: HandFrame | null, time: number): GestureEvent | null {
    const gesture = frame ? classifyHand(frame) : null;
    const key = gesture && frame ? `${frame.handedness}:${gesture}` : null;
    if (!frame || !gesture || !Number.isFinite(frame.confidence)) {
      this.frames = 0;
      if (++this.released >= 3) { this.held = false; this.candidate = null; this.confidence = 0; }
      return null;
    }
    this.released = 0;
    if (key !== this.candidate) { this.candidate = key; this.frames = 0; this.confidence = frame.confidence; }
    else this.confidence = .5 * frame.confidence + .5 * this.confidence;
    if (this.confidence < .8 || frame.confidence < .6) { this.frames = 0; return null; }
    this.frames++;
    if (this.frames < 3 || this.held || time - this.lastEvent < 600) return null;
    this.held = true; this.lastEvent = time;
    // Mirrored preview: the child's right side corresponds to the right-hand target.
    return { gesture, x: Math.max(0, Math.min(1, 1 - frame.landmarks[8].x)), y: Math.max(0, Math.min(1, frame.landmarks[8].y)) };
  }
}
