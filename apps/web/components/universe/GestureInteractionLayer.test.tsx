import { Group, Mesh, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { GestureInteractionController } from "./gestureInteraction";
import { interactiveTargetFromObject } from "./GestureInteractionLayer";

describe("GestureInteractionLayer scene boundary", () => {
  it("reads stable ids and roles only from tagged hit meshes", () => {
    const parent = new Group();
    parent.userData = { interactive: true, objectId: "pizza-slice-1", role: "pizza-slice" };
    const hitMesh = new Mesh(); parent.add(hitMesh);
    expect(interactiveTargetFromObject(hitMesh)).toBeNull();
    hitMesh.userData = { interactive: true, objectId: "pizza-slice-1", role: "pizza-slice", dragObject: parent };
    expect(interactiveTargetFromObject(hitMesh)).toMatchObject({ id: "pizza-slice-1", role: "pizza-slice", object: parent });
  });

  it.each(["pinch", "fist"] as const)("emits a %s grab, move, and successful plate drop", gesture => {
    const controller = new GestureInteractionController({ smoothing: 1 });
    const slice = { id: "pizza-slice-1", role: "pizza-slice" as const, object: new Group() };
    const plate = { id: "pizza-plate", role: "plate" as const, object: new Mesh() };
    expect(controller.update({ pointer: null, phase: { type: "start", gesture, at: 0 }, target: slice, targetPoint: null, at: 0, isTracking: true })).toEqual([{ type: "grab", gesture, targetId: slice.id }]);
    expect(controller.update({ pointer: null, phase: { type: "hold", gesture, at: 16 }, target: slice, targetPoint: new Vector3(1, 2, 3), at: 16, isTracking: true })[0]).toMatchObject({ type: "move", targetId: slice.id });
    expect(controller.update({ pointer: null, phase: { type: "end", gesture, at: 32 }, target: plate, targetPoint: null, at: 32, isTracking: true })).toEqual([{ type: "drop", gesture, targetId: slice.id, success: true }]);
  });
});
