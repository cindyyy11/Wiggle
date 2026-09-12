import { Quaternion, Vector3 } from "three";
import { surfacePoint, type Destination } from "./world";

export type ActivityView = { destination: Destination; resetKey: number };
/** Frame the activity's 2.2 x 1.4 world-unit envelope inside the unobstructed viewport. */
export function activityCameraFrame(destination: Destination, width: number, height: number, top: number, bottom: number) {
  const safeTop = Math.max(0, Math.min(height * .4, top));
  const safeBottom = Math.max(safeTop + height * .2, Math.min(height, bottom));
  const visibleHeight = safeBottom - safeTop;
  const tangent = Math.tan(Math.PI / 8);
  const distance = Math.max(3.8, 1.4 * height / (2 * tangent * visibleHeight), 2.2 * height / (2 * tangent * Math.max(180, width - 48)));
  const normal = new Vector3(...surfacePoint(destination, 1));
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal);
  const target = new Vector3(0, .4, .06).applyQuaternion(rotation).addScaledVector(normal, 3.025);
  const position = new Vector3(0, .65, 1).normalize().multiplyScalar(distance).applyQuaternion(rotation).add(target);
  return { target, position, up: normal, offsetY: height / 2 - (safeTop + safeBottom) / 2, distance };
}
