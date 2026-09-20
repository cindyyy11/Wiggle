export const WHEEL_THRESHOLD = 40;
export const WHEEL_COOLDOWN_MS = 450;
export const WHEEL_IDLE_MS = 250;

export type WheelState = { travel: number; lockedUntil: number; lastAt: number };
export const INITIAL_WHEEL_STATE: WheelState = { travel: 0, lockedUntil: 0, lastAt: 0 };

type WheelInput = { deltaX: number; deltaY: number; deltaMode: number };

const PIXELS_PER_UNIT = [1, 16, 400];

// One flick or one mouse-wheel notch moves exactly one planet; the trailing inertia of a trackpad flick is ignored.
export function wheelSlide(state: WheelState, event: WheelInput, now: number): { direction: -1 | 0 | 1; state: WheelState } {
  const unit = PIXELS_PER_UNIT[event.deltaMode] ?? 1;
  const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * unit;
  if (delta === 0) return { direction: 0, state };
  if (now < state.lockedUntil) return { direction: 0, state: { travel: 0, lockedUntil: state.lockedUntil, lastAt: now } };
  const carried = now - state.lastAt > WHEEL_IDLE_MS || Math.sign(state.travel) !== Math.sign(delta) ? 0 : state.travel;
  const travel = carried + delta;
  if (Math.abs(travel) < WHEEL_THRESHOLD) return { direction: 0, state: { travel, lockedUntil: state.lockedUntil, lastAt: now } };
  return { direction: travel > 0 ? 1 : -1, state: { travel: 0, lockedUntil: now + WHEEL_COOLDOWN_MS, lastAt: now } };
}
