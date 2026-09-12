import { describe, expect, it } from "vitest";
import { MagnetHandGestureController } from "./magnetHandGesture";

describe("MagnetHandGestureController", () => {
  it("acquires an object once for a continuous pinch", () => {
    const controller = new MagnetHandGestureController();
    const input = { isTracking: true, gesture: "pinch" as const, target: "paper-clip" as const, at: 0 };
    expect(controller.update(input)).toEqual({ type: "grab", id: "paper-clip" });
    expect(controller.update({ ...input, at: 100 })).toBeNull();
  });

  it("drops only for an observed open palm over a sorting target", () => {
    const controller = new MagnetHandGestureController();
    controller.update({ isTracking: true, gesture: "pinch", target: "paper-clip", at: 0 });
    expect(controller.update({ isTracking: true, gesture: "open_palm", target: "attracted", at: 100 }))
      .toEqual({ type: "drop", id: "paper-clip", target: "attracted" });
  });

  it("clears a held object after 401 ms of lost tracking without dropping it", () => {
    const controller = new MagnetHandGestureController();
    controller.update({ isTracking: true, gesture: "pinch", target: "paper-clip", at: 0 });
    expect(controller.update({ isTracking: false, gesture: null, target: "attracted", at: 100 })).toBeNull();
    expect(controller.update({ isTracking: false, gesture: null, target: "toolbox", at: 501 })).toEqual({ type: "cancel", id: "paper-clip" });
    expect(controller.update({ isTracking: true, gesture: "open_palm", target: "attracted", at: 600 })).toBeNull();
  });

  it("does not investigate while tracking is lost", () => {
    const controller = new MagnetHandGestureController();
    expect(controller.update({ isTracking: false, gesture: "point", target: "toolbox", at: 0 })).toBeNull();
  });
});
