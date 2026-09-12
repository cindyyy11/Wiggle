import { describe, expect, it } from "vitest";
import { isFingerExtended, mirroredPointerNdc, pinchRatio, smoothPointer } from "./handMath";
import type { Landmark } from "./gestureClassifier";

function pointHand(): Landmark[] {
  const hand = Array.from({ length: 21 }, () => ({ x: .5, y: .7, z: 0 }));
  hand[0] = { x: .5, y: .9, z: 0 };
  for (const [base, x] of [[5, .4], [9, .5], [13, .6], [17, .7]]) {
    const extended = base === 5;
    hand[base] = { x, y: .6, z: 0 };
    hand[base + 1] = { x, y: .45, z: 0 };
    hand[base + 2] = { x, y: extended ? .3 : .6, z: 0 };
    hand[base + 3] = { x, y: extended ? .15 : .75, z: 0 };
  }
  hand[4] = { x: .15, y: .65, z: 0 };
  return hand;
}

describe("hand geometry", () => {
  it("recognizes an extended finger after the hand is rotated", () => {
    const hand = pointHand().map(point => ({ x: .5 + (point.y - .5), y: .5 - (point.x - .5), z: point.z }));
    expect(isFingerExtended(hand, 5)).toBe(true);
    expect(isFingerExtended(hand, 9)).toBe(false);
  });
  it("normalizes pinch distance to palm scale", () => {
    const hand = pointHand(); hand[4] = { ...hand[8], x: hand[8].x + .01 };
    const doubled = hand.map(point => ({ x: point.x * 2, y: point.y * 2, z: point.z * 2 }));
    expect(pinchRatio(doubled)).toBeCloseTo(pinchRatio(hand));
  });
  it("mirrors and smooths a bounded pointer with a dead zone", () => {
    expect(mirroredPointerNdc({ x: .2, y: .25, z: 0 })).toEqual({ x: .6, y: .5 });
    expect(smoothPointer({ x: 0, y: 0 }, { x: .01, y: -.01 }, .5, .02)).toEqual({ x: 0, y: 0 });
    expect(smoothPointer({ x: 0, y: 0 }, { x: 1, y: -1 }, .5, .02)).toEqual({ x: .5, y: -.5 });
  });
});
