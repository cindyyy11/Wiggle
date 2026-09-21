import { RADIUS } from "./world";

export const AUTO_WALK_SPEED = .5;
export const AUTO_RUN_SPEED = 1.3;
const SLOW_ZONE = .3;
const FACING_FULL = .25;
const FACING_NONE = .9;
const MAX_STRIDE_RATE = 22;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Angular speed for an auto-walk: eases into the goal and waits until the explorer faces it. */
export function walkPace(cruise: number, remaining: number, misalignment: number) {
  const arriving = Math.max(.3, clamp01(remaining / SLOW_ZONE));
  const facing = clamp01(1 - (misalignment - FACING_FULL) / (FACING_NONE - FACING_FULL));
  return cruise * arriving * facing;
}

/** Leg-cycle rate that follows ground speed, so feet never skate faster or slower than the body moves. */
export function strideRate(angularSpeed: number) {
  return Math.min(MAX_STRIDE_RATE, angularSpeed * RADIUS * 10);
}

/** Share of a full stride to show; a turn on the spot still shuffles the feet. */
export function gaitAmount(angularSpeed: number, cruise: number, turning: boolean) {
  return Math.max(clamp01(angularSpeed / cruise), turning ? .45 : 0);
}

export const WAVE_SECONDS = 1.8;
const WAVE_RAISE_SECONDS = .18;
const WAVE_LOWER_SECONDS = .35;

/** How far the waving arm is raised (0 to 1) for a wave begun at elapsed = 0: up fast, held, then eased back down. */
export function waveAmount(elapsed: number) {
  if (elapsed < 0 || elapsed >= WAVE_SECONDS) return 0;
  return Math.min(clamp01(elapsed / WAVE_RAISE_SECONDS), clamp01((WAVE_SECONDS - elapsed) / WAVE_LOWER_SECONDS));
}

export const MAX_GLANCE = .45;

/** Radians the head turns to look about while the explorer stands still; `standing` (0 to 1) fades it out whenever it moves. */
export function idleGlance(time: number, standing: number) {
  return Math.sin(time * .8) * MAX_GLANCE * clamp01(standing);
}
