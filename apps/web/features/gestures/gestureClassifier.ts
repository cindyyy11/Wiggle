export type Gesture = "pinch" | "point" | "open_palm" | "fist";
export interface Landmark { x: number; y: number; z: number }
export interface HandFrame { landmarks: Landmark[]; handedness: string; confidence: number }
export interface GestureEvent { gesture: Gesture; x: number; y: number }
const distance = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Scale/hand independent geometry; uncertain or incomplete hands produce no action. */
export function classifyHand(frame: HandFrame): Gesture | null {
  const points = frame.landmarks;
  if (points.length !== 21 || points.some(p => ![p.x, p.y, p.z].every(Number.isFinite))) return null;
  const scale = distance(points[0], points[9]);
  if (scale < .04) return null;
  const extension = [5, 9, 13, 17].map(base => distance(points[base + 3], points[0]) / distance(points[base + 1], points[0]));
  if (distance(points[4], points[8]) / scale < .22) return "pinch";
  if (extension.every(value => value > 1.3)) return "open_palm";
  if (extension[0] > 1.3 && extension.slice(1).every(value => value < .85)) return "point";
  if (extension.every(value => value < .85)) return "fist";
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
