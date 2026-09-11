"use client";

import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { Vector3 } from "three";
import { createFollowFrame, transportFollowCamera } from "./cameraMotion";
import { MISSION_DESTINATION, RADIUS, surfacePoint, type CameraMode, type InputRef } from "./world";

export function CameraRig({ mode, input, reducedMotion }: { mode: CameraMode; input: InputRef; reducedMotion: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size } = useThree();
  const transition = useRef(true);
  const firstFrame = useRef(true);
  const scratch = useMemo(() => ({ target: new Vector3(), desired: new Vector3(), normal: new Vector3(), offset: new Vector3(), elevation: new Vector3(.2, 1.25, .8), follow: createFollowFrame(new Vector3(...input.current.position)) }), [input]);
  const narrow = size.width < 600;
  useEffect(() => { transition.current = true; }, [mode, narrow]);

  useFrame((_, rawDelta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const alpha = reducedMotion || firstFrame.current ? 1 : 1 - Math.exp(-Math.min(rawDelta, .05) * 6);
    if (mode === "globe") { camera.up.set(0, 1, 0); scratch.target.set(narrow ? 0 : -.32, narrow ? -1.15 : .05, 0); scratch.desired.set(narrow ? 0 : .6, narrow ? 1.5 : 1.45, narrow ? 23 : 10.8); }
    else {
      scratch.target.set(...(mode === "mission" ? surfacePoint(MISSION_DESTINATION, RADIUS + .3) : input.current.position));
      scratch.normal.copy(scratch.target).normalize();
      scratch.desired.copy(scratch.target).addScaledVector(scratch.normal, mode === "mission" ? 2.65 : 2.4).add(scratch.elevation);
    }
    if (transition.current) {
      if (mode !== "globe") camera.up.copy(scratch.normal);
      camera.position.lerp(scratch.desired, alpha); orbit.target.lerp(scratch.target, alpha);
      if (camera.position.distanceToSquared(scratch.desired) < .0001 && orbit.target.distanceToSquared(scratch.target) < .0001) transition.current = false;
    } else if (mode === "follow") {
      transportFollowCamera(camera, orbit.target, scratch.target, scratch.follow);
    }
    scratch.follow.previousNormal.set(...input.current.position).normalize();
    if (input.current.zoom) {
      scratch.offset.copy(camera.position).sub(orbit.target);
      const distance = Math.max(orbit.minDistance, Math.min(orbit.maxDistance, scratch.offset.length() * Math.pow(1.17, input.current.zoom)));
      camera.position.copy(orbit.target).add(scratch.offset.setLength(distance));
      input.current.zoom = 0; transition.current = false;
    }
    // Close-follow orbit cannot cross through the planet, including touch gestures.
    if (camera.position.length() < RADIUS + .5) camera.position.setLength(RADIUS + .5);
    orbit.update();
    firstFrame.current = false;
  });
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={.09} rotateSpeed={.65} zoomSpeed={.65} minDistance={mode === "globe" ? 7.2 : 1.7} maxDistance={mode === "globe" ? (narrow ? 30 : 17) : 5.3} minPolarAngle={.12} maxPolarAngle={mode === "globe" ? Math.PI - .12 : Math.PI / 2 - .12} onStart={() => { transition.current = false; }} />;
}
