/** All hand-gesture tuning belongs here so activities share one interaction feel. */
export const GESTURE_CONFIG = {
  pinchRatio: 0.22,
  minConfidence: 0.6,
  stableHoldMs: 150,
  releaseMs: 150,
  lostHandGraceMs: 400,
  pointerSmoothing: 0.35,
  pointerDeadZone: 0.015,
  maxInferenceFps: 20,
} as const;
