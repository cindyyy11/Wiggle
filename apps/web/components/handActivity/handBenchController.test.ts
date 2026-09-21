import { describe, expect, it } from "vitest";
import { GESTURE_CONFIG } from "../../features/gestures/config";
import { HandBenchController, type BenchControllerInput } from "./handBenchController";

const base: BenchControllerInput = { phase: "match", gesture: null, item: null, target: null, isTracking: true, at: 0 };
const step = (controller: HandBenchController, patch: Partial<BenchControllerInput>) => controller.update({ ...base, ...patch });

describe("HandBenchController while discovering", () => {
  it("observes an item when the finger points at it, once per visit", () => {
    const controller = new HandBenchController();
    expect(step(controller, { phase: "discover", gesture: "point", item: "horse" })).toEqual({ type: "observe", id: "horse" });
    expect(step(controller, { phase: "discover", gesture: "point", item: "horse", at: 20 })).toBeNull();
    expect(step(controller, { phase: "discover", gesture: "open_palm", item: "horse", at: 40 })).toBeNull();
    expect(step(controller, { phase: "discover", gesture: "point", item: "horse", at: 60 })).toEqual({ type: "observe", id: "horse" });
  });

  it("ignores pointing at nothing", () => {
    expect(step(new HandBenchController(), { phase: "discover", gesture: "point", item: null })).toBeNull();
  });
});

describe("HandBenchController.holding", () => {
  it("is null until an item is grabbed", () => {
    expect(new HandBenchController().holding).toBeNull();
  });

  it("is the grabbed id after a pinch", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(controller.holding).toBe("frog");
  });

  it("is null again after a drop", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    step(controller, { gesture: "open_palm", target: "both", at: 100 });
    expect(controller.holding).toBeNull();
  });

  it("is null again after the palm opens away from every target", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    step(controller, { gesture: "open_palm", target: null, at: 100 });
    expect(controller.holding).toBeNull();
  });

  it("is null again once the lost-hand grace period expires, and not before", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    step(controller, { isTracking: false, at: 10 });
    step(controller, { isTracking: false, at: 10 + GESTURE_CONFIG.lostHandGraceMs - 1 });
    expect(controller.holding).toBe("frog");
    step(controller, { isTracking: false, at: 10 + GESTURE_CONFIG.lostHandGraceMs });
    expect(controller.holding).toBeNull();
  });
});

describe("HandBenchController while matching", () => {
  it("grabs on a pinch over an item", () => {
    expect(step(new HandBenchController(), { gesture: "pinch", item: "frog" })).toEqual({ type: "grab", id: "frog" });
  });

  it("does not grab without a pinch or without an item under the hand", () => {
    const controller = new HandBenchController();
    expect(step(controller, { gesture: "point", item: "frog" })).toBeNull();
    expect(step(controller, { gesture: "pinch", item: null })).toBeNull();
  });

  it("drops on an open palm over a target", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(step(controller, { gesture: "open_palm", target: "both", at: 100 })).toEqual({ type: "drop", id: "frog", target: "both" });
  });

  it("puts the item back when the palm opens away from every target", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(step(controller, { gesture: "open_palm", target: null, at: 100 })).toEqual({ type: "cancel", id: "frog" });
  });

  it("keeps holding through other gestures", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(step(controller, { gesture: "point", target: "both", at: 50 })).toBeNull();
    expect(step(controller, { gesture: "open_palm", target: "both", at: 100 })?.type).toBe("drop");
  });

  it("never drops or scores when tracking is lost, and gives the item back only after the grace period", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(step(controller, { isTracking: false, at: 10 })).toBeNull();
    expect(step(controller, { isTracking: false, at: 10 + GESTURE_CONFIG.lostHandGraceMs - 1 })).toBeNull();
    expect(step(controller, { isTracking: false, at: 10 + GESTURE_CONFIG.lostHandGraceMs })).toEqual({ type: "cancel", id: "frog" });
    expect(step(controller, { gesture: "open_palm", target: "both", at: 900 })).toBeNull();
  });

  it("keeps the item if the hand comes back inside the grace period", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    step(controller, { isTracking: false, at: 10 });
    step(controller, { gesture: "point", at: 200 });
    expect(step(controller, { isTracking: false, at: 300 })).toBeNull();
    expect(step(controller, { isTracking: false, at: 300 + GESTURE_CONFIG.lostHandGraceMs - 1 })).toBeNull();
  });

  it("does nothing once the lesson is done", () => {
    expect(step(new HandBenchController(), { phase: "done", gesture: "pinch", item: "frog" })).toBeNull();
  });
});
