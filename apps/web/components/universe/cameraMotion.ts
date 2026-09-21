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

// Once the explorer has stopped, the camera settles into a close, near-level view aimed at its head and chest so its face shows.
export const PORTRAIT_BACK = 3.2;
export const PORTRAIT_HEIGHT = 1.7;
export const PORTRAIT_LOOK = .95;

/**
 * Camera pose for watching the explorer: behind and above while it walks, aimed at the ground just ahead.
 * `portrait` (0 to 1) blends toward the close, level view used once it has stopped.
 */
export function chaseFrame(explorer: Vector3, heading: Vector3, ahead: number, zoom: number, out: { position: Vector3; target: Vector3; up: Vector3 }, portrait = 0) {
  const blend = Math.max(0, Math.min(1, portrait));
  const height = (CHASE_HEIGHT + (PORTRAIT_HEIGHT - CHASE_HEIGHT) * blend) * zoom;
  const back = (CHASE_BACK + (PORTRAIT_BACK - CHASE_BACK) * blend) * zoom;
  out.up.copy(explorer).normalize();
  out.target.copy(explorer).addScaledVector(heading, ahead).setLength(explorer.length()).addScaledVector(out.up, PORTRAIT_LOOK * blend);
  out.position.copy(explorer).addScaledVector(out.up, height).addScaledVector(heading, -back);
  return out;
}
