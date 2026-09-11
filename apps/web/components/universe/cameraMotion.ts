import { Quaternion, Vector3, type Camera } from "three";

export function createFollowFrame(position: Vector3) {
  return {
    previousNormal: position.clone().normalize(),
    normal: new Vector3(),
    rotation: new Quaternion(),
    offset: new Vector3(),
  };
}

/** Parallel-transport the current user-selected orbit, rather than reset it. */
export function transportFollowCamera(
  camera: Pick<Camera, "position" | "up">,
  target: Vector3,
  explorer: Vector3,
  frame: ReturnType<typeof createFollowFrame>,
) {
  frame.normal.copy(explorer).normalize();
  frame.rotation.setFromUnitVectors(frame.previousNormal, frame.normal);
  frame.offset.copy(camera.position).sub(target).applyQuaternion(frame.rotation);
  camera.position.copy(explorer).add(frame.offset);
  camera.up.applyQuaternion(frame.rotation).normalize();
  target.copy(explorer);
  frame.previousNormal.copy(frame.normal);
}
