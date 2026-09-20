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
