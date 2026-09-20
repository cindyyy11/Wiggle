import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Ray, Sphere, Vector3 } from "three";
import { arcLerp, CHASE_AHEAD, CHASE_HEIGHT, chaseFrame, createFollowFrame, transportFollowCamera } from "./cameraMotion";
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

describe("arcLerp", () => {
  it("swings around the planet instead of cutting through it", () => {
    const camera = new Vector3(0, 0, 8);
    const goal = new Vector3(0, 0, -8);
    let closest = Infinity;
    for (let frame = 0; frame < 60; frame++) { arcLerp(camera, goal, .1); closest = Math.min(closest, camera.length()); }
    expect(closest).toBeGreaterThan(7.9);
    expect(camera.distanceTo(goal)).toBeLessThan(.5);
  });

  it("eases the distance from the planet toward the goal", () => {
    const camera = new Vector3(0, 0, 10);
    arcLerp(camera, new Vector3(0, 0, 6), .5);
    expect(camera.length()).toBeCloseTo(8);
  });
});

describe("chaseFrame", () => {
  const pose = () => ({ position: new Vector3(), target: new Vector3(), up: new Vector3() });
  const spots = [[0, 1, 0], [1, 0, 0], [0, -1, 0], [0, 0, -1], [.6, -.5, .6], [-.7, .2, -.7]].map(([x, y, z]) => new Vector3(x, y, z).normalize().multiplyScalar(RADIUS + .05));

  it("puts the camera behind and above the explorer, looking at the ground ahead, everywhere on the planet", () => {
    for (const explorer of spots) {
      const normal = explorer.clone().normalize();
      const heading = new Vector3(0, 1, 0).addScaledVector(normal, -normal.y);
      if (heading.lengthSq() < .01) heading.set(1, 0, 0).addScaledVector(normal, -normal.x);
      heading.normalize();
      const frame = chaseFrame(explorer, heading, CHASE_AHEAD, 1, pose());
      const back = frame.position.clone().sub(explorer);
      expect(back.dot(heading)).toBeLessThan(0);
      expect(back.dot(normal)).toBeGreaterThan(CHASE_HEIGHT - .01);
      expect(frame.position.length()).toBeGreaterThan(RADIUS + 1);
      expect(frame.target.length()).toBeCloseTo(explorer.length());
      expect(frame.target.clone().sub(explorer).dot(heading)).toBeGreaterThan(0);
      expect(frame.up.distanceTo(normal)).toBeLessThan(1e-6);
    }
  });

  it("scales the whole offset with zoom", () => {
    const explorer = spots[0];
    const heading = new Vector3(1, 0, 0);
    const near = chaseFrame(explorer, heading, 0, .7, pose()).position.distanceTo(explorer);
    const far = chaseFrame(explorer, heading, 0, 1.25, pose()).position.distanceTo(explorer);
    expect(far / near).toBeCloseTo(1.25 / .7);
  });
});
