import { expect, it } from "vitest";
import {
  CORRECT_PAD_PULSE_MS,
  WRONG_DROP_WOBBLE_MS,
  feedbackActive,
  rejectPushOffset,
} from "./magnetSceneFeel";

it("exposes sort feedback durations from the spec", () => {
  expect(WRONG_DROP_WOBBLE_MS).toBe(300);
  expect(CORRECT_PAD_PULSE_MS).toBe(280);
});

it("pushes an object radially away from the magnet", () => {
  const next = rejectPushOffset({ x: 0.5, y: 0.5 }, { x: 0.4, y: 0.5 }, 0.08);
  expect(next.x).toBeGreaterThan(0.5);
  expect(next.y).toBeCloseTo(0.5, 5);
});

it("reports whether timed feedback is still active", () => {
  expect(feedbackActive(1000, 1200, 300)).toBe(true);
  expect(feedbackActive(1000, 1300, 300)).toBe(false);
});
