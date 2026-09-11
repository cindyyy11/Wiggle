import { describe, expect, it } from "vitest";
import { GestureClassifier, classifyHand, type Gesture, type HandFrame } from "./gestureClassifier";

export function fixture(gesture: Gesture, hand: "Left" | "Right" = "Right", confidence = .98): HandFrame {
  const landmarks = Array.from({ length: 21 }, () => ({ x: .5, y: .7, z: 0 }));
  landmarks[0] = { x: .5, y: .9, z: 0 };
  for (const [base, x] of [[5, .4], [9, .5], [13, .6], [17, .7]]) {
    const extended = gesture === "open_palm" || (base === 5 && (gesture === "point" || gesture === "pinch"));
    landmarks[base] = { x, y: .6, z: 0 };
    landmarks[base + 1] = { x, y: .45, z: 0 };
    landmarks[base + 2] = { x, y: extended ? .3 : .6, z: 0 };
    landmarks[base + 3] = { x, y: extended ? .15 : .75, z: 0 };
  }
  landmarks[4] = gesture === "pinch" ? { ...landmarks[8], x: landmarks[8].x + .01 } : { x: .15, y: .65, z: 0 };
  if (hand === "Left") for (const point of landmarks) point.x = 1 - point.x;
  return { landmarks, handedness: hand, confidence };
}

describe("local gesture interpretation", () => {
  for (const hand of ["Left", "Right"] as const) for (const gesture of ["pinch", "point", "open_palm", "fist"] as const) {
    it(`recognizes ${gesture} from ${hand} landmarks`, () => expect(classifyHand(fixture(gesture, hand))).toBe(gesture));
  }
  it("requires activation frames and smooths confidence", () => {
    const classifier = new GestureClassifier();
    expect(classifier.update(fixture("point", "Right", .5), 0)).toBeNull();
    expect(classifier.update(fixture("point"), 50)).toBeNull();
    expect(classifier.update(fixture("point"), 100)).toBeNull();
    expect(classifier.update(fixture("point"), 150)).toBeNull();
    expect(classifier.update(fixture("point"), 200)?.gesture).toBe("point");
  });
  it("fires once per hold, tolerates a missing frame, requires release and cooldown", () => {
    const classifier = new GestureClassifier();
    for (const time of [0, 50]) expect(classifier.update(fixture("pinch"), time)).toBeNull();
    expect(classifier.update(fixture("pinch"), 100)?.gesture).toBe("pinch");
    expect(classifier.update(null, 150)).toBeNull();
    for (const time of [200, 250, 300]) expect(classifier.update(fixture("pinch"), time)).toBeNull();
    for (const time of [350, 400, 450]) classifier.update(null, time);
    for (const time of [500, 550, 600]) expect(classifier.update(fixture("pinch"), time)).toBeNull();
    expect(classifier.update(fixture("pinch"), 750)?.gesture).toBe("pinch");
  });
  it("rejects jitter, invalid landmarks, low confidence and hand switching", () => {
    const classifier = new GestureClassifier();
    for (let i = 0; i < 15; i++) expect(classifier.update(fixture(i % 2 ? "fist" : "point"), i * 100)).toBeNull();
    expect(classifyHand({ ...fixture("point"), landmarks: [] })).toBeNull();
    const invalid = fixture("point"); invalid.landmarks[8].x = NaN;
    expect(classifyHand(invalid)).toBeNull();
    for (let i = 0; i < 12; i++) expect(classifier.update(fixture("point", i % 2 ? "Right" : "Left"), 2000 + i * 50)).toBeNull();
    for (let i = 0; i < 12; i++) expect(classifier.update(fixture("point", "Right", .2), 3000 + i * 50)).toBeNull();
  });
});
