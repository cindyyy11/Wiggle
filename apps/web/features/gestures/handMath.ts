import type { Landmark } from "./gestureClassifier";

export interface PointerNdc { x: number; y: number }

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function distance(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Uses the wrist-to-middle-MCP distance, which is stable across camera distance. */
export function pinchRatio(landmarks: Landmark[]) {
  if (landmarks.length !== 21) return Infinity;
  const palmSize = distance(landmarks[0], landmarks[9]);
  return palmSize > 0 ? distance(landmarks[4], landmarks[8]) / palmSize : Infinity;
}

/** A straight finger bends backwards at the PIP joint; screen Y is deliberately irrelevant. */
export function isFingerExtended(landmarks: Landmark[], mcp: number) {
  const pip = landmarks[mcp + 1], tip = landmarks[mcp + 3], base = landmarks[mcp];
  if (!pip || !tip || !base) return false;
  const towardBase = { x: base.x - pip.x, y: base.y - pip.y, z: base.z - pip.z };
  const towardTip = { x: tip.x - pip.x, y: tip.y - pip.y, z: tip.z - pip.z };
  const baseLength = Math.hypot(towardBase.x, towardBase.y, towardBase.z);
  const tipLength = Math.hypot(towardTip.x, towardTip.y, towardTip.z);
  if (baseLength === 0 || tipLength === 0) return false;
  const alignment = (towardBase.x * towardTip.x + towardBase.y * towardTip.y + towardBase.z * towardTip.z) / (baseLength * tipLength);
  return alignment < -0.65;
}

/** Converts a mirrored camera point to conventional normalized device coordinates. */
export function mirroredPointerNdc(point: Landmark): PointerNdc {
  return { x: clamp(1 - point.x * 2), y: clamp(1 - point.y * 2) };
}

export function smoothPointer(previous: PointerNdc | null, next: PointerNdc, smoothing: number, deadZone: number): PointerNdc {
  if (!previous) return next;
  const blend = Math.max(0, Math.min(1, smoothing));
  const x = Math.abs(next.x - previous.x) <= deadZone ? previous.x : previous.x + (next.x - previous.x) * blend;
  const y = Math.abs(next.y - previous.y) <= deadZone ? previous.y : previous.y + (next.y - previous.y) * blend;
  return { x: clamp(x), y: clamp(y) };
}
