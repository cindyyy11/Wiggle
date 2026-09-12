import { Object3D, PerspectiveCamera, Vector2, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import type { GesturePhase } from "../../features/gestures/gestureStateMachine";
import {
  createInteractionPlane,
  GestureInteractionController,
  type GestureInteractionInput,
  type InteractiveTarget,
} from "./gestureInteraction";

const phase = (type: GesturePhase["type"], gesture: GesturePhase["gesture"], at = 0): GesturePhase => ({ type, gesture, at });
const target = (id: string, role: InteractiveTarget["role"], position = new Vector3()): InteractiveTarget => {
  const object = new Object3D();
  object.position.copy(position);
  return { id, role, object };
};
const input = (overrides: Partial<GestureInteractionInput> = {}): GestureInteractionInput => ({
  pointer: new Vector2(), phase: null, target: null, targetPoint: null, at: 0, ...overrides,
});

describe("GestureInteractionController", () => {
  it("focuses an interactive target when pointing", () => {
    const controller = new GestureInteractionController();
    const slice = target("slice-1", "pizza-slice");
    expect(controller.update(input({ phase: phase("start", "point"), target: slice }))).toEqual([
      { type: "focus", gesture: "point", targetId: "slice-1" },
    ]);
  });

  it.each(["pinch", "fist"] as const)("acquires a slice with %s", gesture => {
    const controller = new GestureInteractionController();
    const slice = target("slice-1", "pizza-slice");
    expect(controller.update(input({ phase: phase("start", gesture), target: slice }))).toEqual([
      { type: "grab", gesture, targetId: "slice-1" },
    ]);
  });

  it("smooths held slice movement using the interaction-plane point", () => {
    const controller = new GestureInteractionController({ smoothing: .5 });
    const slice = target("slice-1", "pizza-slice");
    controller.update(input({ phase: phase("start", "pinch"), target: slice }));
    const actions = controller.update(input({ phase: phase("hold", "pinch", 16), targetPoint: new Vector3(4, 2, -3), at: 16 }));
    expect(slice.object.position).toEqual(new Vector3(2, 1, -1.5));
    expect(actions).toEqual([{ type: "move", gesture: "pinch", targetId: "slice-1", position: new Vector3(2, 1, -1.5) }]);
  });

  it("resolves valid and invalid drops", () => {
    const controller = new GestureInteractionController();
    const slice = target("slice-1", "pizza-slice");
    const plate = target("plate", "plate");
    controller.update(input({ phase: phase("start", "pinch"), target: slice }));
    expect(controller.update(input({ phase: phase("end", "pinch", 20), target: plate, at: 20 }))).toEqual([
      { type: "drop", gesture: "pinch", targetId: "slice-1", success: true },
    ]);
    controller.update(input({ phase: phase("start", "fist", 30), target: slice, at: 30 }));
    expect(controller.update(input({ phase: phase("end", "fist", 40), target: null, at: 40 }))).toEqual([
      { type: "drop", gesture: "fist", targetId: "slice-1", success: false },
    ]);
  });

  it("allows a placed slice to be grabbed again", () => {
    const controller = new GestureInteractionController();
    const slice = target("slice-1", "pizza-slice");
    const plate = target("plate", "plate");
    controller.update(input({ phase: phase("start", "pinch"), target: slice }));
    controller.update(input({ phase: phase("end", "pinch", 20), target: plate, at: 20 }));
    expect(controller.update(input({ phase: phase("start", "fist", 30), target: slice, at: 30 }))).toEqual([
      { type: "grab", gesture: "fist", targetId: "slice-1" },
    ]);
  });

  it("opens Lexi only for a fresh open palm over its beacon", () => {
    const controller = new GestureInteractionController();
    const beacon = target("lexi", "lexi-beacon");
    expect(controller.update(input({ phase: phase("start", "open_palm"), target: beacon }))).toEqual([
      { type: "open-lexi", gesture: "open_palm", targetId: "lexi" },
    ]);
    expect(controller.update(input({ phase: phase("hold", "open_palm", 10), target: beacon, at: 10 }))).toEqual([]);
  });

  it("resolves a drag before allowing a new gesture to act", () => {
    const controller = new GestureInteractionController();
    const slice = target("slice-1", "pizza-slice");
    const beacon = target("lexi", "lexi-beacon");
    controller.update(input({ phase: phase("start", "fist"), target: slice }));
    expect(controller.update(input({ phase: phase("start", "open_palm", 20), target: beacon, at: 20 }))).toEqual([
      { type: "drop", gesture: "fist", targetId: "slice-1", success: false },
    ]);
    expect(controller.update(input({ phase: phase("hold", "open_palm", 30), target: beacon, at: 30 }))).toEqual([]);
  });

  it("releases a held slice safely after the lost-hand grace period", () => {
    const controller = new GestureInteractionController({ lostHandGraceMs: 400 });
    const slice = target("slice-1", "pizza-slice");
    controller.update(input({ phase: phase("start", "pinch"), target: slice }));
    controller.update(input({ isTracking: false, at: 0 }));
    expect(controller.update(input({ isTracking: false, at: 399 }))).toEqual([]);
    expect(controller.update(input({ isTracking: false, at: 400 }))).toEqual([
      { type: "lost-hand", gesture: "pinch", targetId: "slice-1" },
      { type: "drop", gesture: "pinch", targetId: "slice-1", success: false },
    ]);
  });
});

describe("createInteractionPlane", () => {
  it("locks the plane to the object's depth without changing the object", () => {
    const camera = new PerspectiveCamera();
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const object = new Object3D();
    object.position.set(2, 3, -4);
    const before = object.position.clone();
    const plane = createInteractionPlane(object, camera);
    expect(object.position).toEqual(before);
    expect(plane.distanceToPoint(new Vector3(2, 3, -4))).toBeCloseTo(0);
  });
});
