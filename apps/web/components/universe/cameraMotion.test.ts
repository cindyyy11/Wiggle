import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Ray, Sphere, Vector3 } from "three";
import { createFollowFrame, transportFollowCamera } from "./cameraMotion";
import { RADIUS } from "./world";

describe("surface-relative follow camera", () => {
  it("keeps the explorer visible across opposite hemispheres while preserving orbit and zoom", () => {
    const camera = new PerspectiveCamera(45, 1, .1, 65);
    const target = new Vector3(0, 0, RADIUS + .03);
    const frame = createFollowFrame(target);
    camera.up.copy(target).normalize();
    // An off-center orbit chosen by the user, not a reset to the default view.
    camera.position.copy(target).add(new Vector3(1.6, -.7, 2.2));
    const distance = camera.position.distanceTo(target);
    const radialOffset = camera.position.clone().sub(target).dot(target.clone().normalize());
    const planet = new Sphere(new Vector3(), RADIUS);
    const ray = new Ray(); const intersection = new Vector3();
    for (let step = 1; step <= 120; step++) {
      const angle = step * Math.PI * 2 / 120;
      const explorer = new Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(RADIUS + .03);
      transportFollowCamera(camera, target, explorer, frame);
      camera.lookAt(explorer); camera.updateMatrixWorld();
      expect(target.distanceTo(explorer)).toBeLessThan(1e-10);
      expect(camera.position.distanceTo(target)).toBeCloseTo(distance, 9);
      expect(camera.position.clone().sub(target).dot(explorer.clone().normalize())).toBeCloseTo(radialOffset, 9);
      expect(camera.up.dot(explorer.clone().normalize())).toBeCloseTo(1, 9);
      ray.set(camera.position, explorer.clone().sub(camera.position).normalize());
      const hit = ray.intersectSphere(planet, intersection);
      // A sphere hit must be beyond the explorer, never between it and the camera.
      if (hit) expect(hit.distanceTo(camera.position)).toBeGreaterThan(distance);
      const projected = explorer.clone().project(camera);
      expect(Math.abs(projected.x)).toBeLessThan(1e-8);
      expect(Math.abs(projected.y)).toBeLessThan(1e-8);
      expect(projected.z).toBeGreaterThan(-1);
      expect(projected.z).toBeLessThan(1);
    }
  });

  it("transports over a pole and an exact antipode without invalid coordinates or changing zoom", () => {
    const camera = new PerspectiveCamera();
    const target = new Vector3(0, RADIUS + .03, 0);
    const frame = createFollowFrame(target);
    camera.up.copy(target).normalize(); camera.position.copy(target).add(new Vector3(1, 2.8, .6));
    const distance = camera.position.distanceTo(target);
    for (const explorer of [new Vector3(0, -RADIUS - .03, 0), new Vector3(0, 0, RADIUS + .03)]) {
      transportFollowCamera(camera, target, explorer, frame);
      expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
      expect(camera.position.distanceTo(target)).toBeCloseTo(distance, 9);
      expect(camera.position.clone().sub(target).dot(explorer.clone().normalize())).toBeGreaterThan(0);
    }
  });
});
