import { expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { activityCameraFrame } from "./activityCamera";
it.each([[1280, 720, 140, 470], [390, 844, 180, 510], [640, 575, 115, 350]])("frames the activity between HUD obstacles at %sx%s", (width, height, top, bottom) => {
  const frame = activityCameraFrame({ latitude: .48, longitude: -.45 }, width, height, top, bottom);
  const camera = new PerspectiveCamera(45, width / height, .1, 65);
  camera.position.copy(frame.position); camera.up.copy(frame.up); camera.lookAt(frame.target);
  camera.setViewOffset(width, height, 0, frame.offsetY, width, height); camera.updateMatrixWorld();
  const projected = frame.target.clone().project(camera);
  const y = (1 - projected.y) * height / 2;
  expect(y).toBeGreaterThan(top); expect(y).toBeLessThan(bottom);
  expect(y).toBeCloseTo((top + bottom) / 2, 1);
  expect(frame.position.length()).toBeGreaterThan(3.5);
  expect(frame.position.clone().sub(frame.target).normalize().dot(frame.up)).toBeLessThan(.7);
  expect(new Vector3().copy(frame.up).length()).toBeCloseTo(1);
});
