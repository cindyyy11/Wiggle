export const WRONG_DROP_WOBBLE_MS = 300;
export const CORRECT_PAD_PULSE_MS = 280;
export const REJECT_PUSH_STRENGTH = 0.08;
export const METAL_FOLLOW_LERP = 0.42;
export const HOME_LERP = 0.12;
export const FIELD_RING_IDLE_OPACITY = 0.22;
export const FIELD_RING_ACTIVE_OPACITY = 0.55;

/** Offset a table point away from `from` by `strength` (unit length direction). */
export function rejectPushOffset(
  object: { x: number; y: number },
  from: { x: number; y: number },
  strength: number,
): { x: number; y: number } {
  const dx = object.x - from.x;
  const dy = object.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: object.x + (dx / len) * strength, y: object.y + (dy / len) * strength };
}

/** True while `nowMs < startedAtMs + durationMs`. */
export function feedbackActive(startedAtMs: number, nowMs: number, durationMs: number): boolean {
  return nowMs < startedAtMs + durationMs;
}
