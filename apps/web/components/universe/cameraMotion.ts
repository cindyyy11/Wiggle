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

const fromDirection = new Vector3();
const toDirection = new Vector3();
const fullTurn = new Quaternion();
const partialTurn = new Quaternion();
const noTurn = new Quaternion();

/** Ease a camera toward a goal along an arc around the planet, so it never cuts through the surface. */
export function arcLerp(position: Vector3, desired: Vector3, alpha: number) {
  const from = position.length();
  const to = desired.length();
  if (from < 1e-6 || to < 1e-6) return position.lerp(desired, alpha);
  fromDirection.copy(position).divideScalar(from);
  toDirection.copy(desired).divideScalar(to);
  fullTurn.setFromUnitVectors(fromDirection, toDirection);
  partialTurn.copy(noTurn).slerp(fullTurn, alpha);
  return position.copy(fromDirection).applyQuaternion(partialTurn).multiplyScalar(from + (to - from) * alpha);
}

// While the explorer auto-walks, the camera trails just behind and above so the whole walk is visible.
export const CHASE_BACK = 2.8;
export const CHASE_HEIGHT = 4.4;
export const CHASE_AHEAD = 2.2;

/** Camera pose for watching the explorer walk: behind and above, aimed at the ground just ahead. */
export function chaseFrame(explorer: Vector3, heading: Vector3, ahead: number, zoom: number, out: { position: Vector3; target: Vector3; up: Vector3 }) {
  out.up.copy(explorer).normalize();
  out.target.copy(explorer).addScaledVector(heading, ahead).setLength(explorer.length());
  out.position.copy(explorer).addScaledVector(out.up, CHASE_HEIGHT * zoom).addScaledVector(heading, -CHASE_BACK * zoom);
  return out;
}
