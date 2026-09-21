"use client";

import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { PerspectiveCamera, TOUCH, Vector3 } from "three";
import { activityCameraFrame, type ActivityView } from "./activityCamera";
import { arcLerp, CHASE_AHEAD, chaseFrame, createFollowFrame, transportFollowCamera } from "./cameraMotion";
import { MISSION_DESTINATION, RADIUS, surfacePoint, type CameraMode, type Destination, type InputRef } from "./world";

// One finger sliding over the planet flies the explorer, so only two fingers steer the camera.
const ONE_FINGER_FLIES = { ONE: -1 as unknown as TOUCH, TWO: TOUCH.DOLLY_ROTATE };

const CHASE_HOLD = .9;

export function CameraRig({ mode, input, reducedMotion, activityView, resetViewKey, theme }: { mode: CameraMode; input: InputRef; reducedMotion: boolean; activityView?: ActivityView; resetViewKey?: number; theme?: "math" | "science" }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, gl } = useThree();
  const guided = !!activityView && mode !== "globe";
  const [safe, setSafe] = useState({ top: 130, bottom: size.height - 250 });
  const zoomScale = useRef(1);
  useEffect(() => {
    zoomScale.current = 1; transition.current = true;
  }, [resetViewKey, activityView?.resetKey, activityView?.destination.latitude, activityView?.destination.longitude, guided]);
  useEffect(() => {
    if (!guided) { if (camera instanceof PerspectiveCamera) camera.clearViewOffset(); return; }
    const root = gl.domElement.closest("section");
    const top = root?.querySelector("[data-camera-obstacle='top']");
    const bottom = root?.querySelector("[data-camera-obstacle='bottom']");
    const measure = () => {
      const rect = gl.domElement.getBoundingClientRect();
      setSafe({ top: (top?.getBoundingClientRect().bottom ?? rect.top + 120) - rect.top + 12, bottom: (bottom?.getBoundingClientRect().top ?? rect.bottom - 220) - rect.top - 12 });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (top) observer?.observe(top); if (bottom) observer?.observe(bottom);
    observer?.observe(gl.domElement);
    return () => { observer?.disconnect(); if (camera instanceof PerspectiveCamera) camera.clearViewOffset(); };
  }, [guided, camera, gl, size.width, size.height]);
  const framing = activityView ? activityCameraFrame(activityView.destination, size.width, size.height, safe.top, safe.bottom) : null;
  const transition = useRef(true);
  const firstFrame = useRef(true);
  const chase = useRef<{ goal: Destination | null; userOrbited: boolean; hold: number; ahead: number; zoom: number }>({ goal: null, userOrbited: false, hold: 0, ahead: 0, zoom: 1 });
  const scratch = useMemo(() => ({ target: new Vector3(), desired: new Vector3(), normal: new Vector3(), offset: new Vector3(), explorer: new Vector3(), heading: new Vector3(), chase: { position: new Vector3(), target: new Vector3(), up: new Vector3() }, elevation: new Vector3(.2, 1.25, .8), follow: createFollowFrame(new Vector3(...input.current.position)) }), [input]);
  const narrow = size.width < 600;
  useEffect(() => { transition.current = true; }, [mode, narrow]);

  useFrame((_, rawDelta) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (input.current.restoreCamera) {
      const pose = input.current.restoreCamera; input.current.restoreCamera = null;
      camera.position.fromArray(pose.position); camera.up.fromArray(pose.up); orbit.target.fromArray(pose.target);
      if (camera instanceof PerspectiveCamera) camera.clearViewOffset();
      orbit.update(); transition.current = false; firstFrame.current = false;
      scratch.follow.previousNormal.set(...input.current.position).normalize();
      return;
    }
    if (theme === 'science' && !guided) input.current.cameraPose = { position: camera.position.toArray() as [number, number, number], target: orbit.target.toArray() as [number, number, number], up: camera.up.toArray() as [number, number, number] };
    const alpha = reducedMotion || firstFrame.current ? 1 : 1 - Math.exp(-Math.min(rawDelta, .05) * 6);
    if (guided && framing) {
      if (input.current.zoom) { zoomScale.current = Math.max(.9, Math.min(1.3, zoomScale.current * Math.pow(1.17, input.current.zoom))); input.current.zoom = 0; }
      scratch.desired.copy(framing.position).sub(framing.target).multiplyScalar(zoomScale.current).add(framing.target);
      camera.up.copy(framing.up);
      camera.position.lerp(scratch.desired, alpha); orbit.target.lerp(framing.target, alpha);
      if (camera instanceof PerspectiveCamera) camera.setViewOffset(size.width, size.height, 0, framing.offsetY, size.width, size.height);
      camera.lookAt(orbit.target); firstFrame.current = false;
      return;
    }
    const goal = input.current.destination;
    const walk = chase.current;
    if (goal && goal !== walk.goal) { walk.goal = goal; walk.userOrbited = false; }
    walk.hold = goal ? CHASE_HOLD : Math.max(0, walk.hold - rawDelta);
    if (mode === "follow" && !reducedMotion && !walk.userOrbited && !input.current.paused && input.current.heading && (walk.hold > 0 || (input.current.portrait ?? 0) > .01)) {
      const chaseAlpha = 1 - Math.exp(-Math.min(rawDelta, .05) * 4);
      if (input.current.zoom) { walk.zoom = Math.max(.7, Math.min(1.25, walk.zoom * Math.pow(1.17, input.current.zoom))); input.current.zoom = 0; }
      scratch.explorer.set(...input.current.position);
      scratch.heading.set(...input.current.heading);
      walk.ahead += ((goal ? CHASE_AHEAD : 0) - walk.ahead) * chaseAlpha;
      chaseFrame(scratch.explorer, scratch.heading, walk.ahead, walk.zoom, scratch.chase, input.current.portrait ?? 0);
      arcLerp(camera.position, scratch.chase.position, chaseAlpha); orbit.target.lerp(scratch.chase.target, chaseAlpha);
      camera.up.lerp(scratch.chase.up, chaseAlpha).normalize();
      scratch.follow.previousNormal.copy(scratch.chase.up);
      transition.current = false; firstFrame.current = false;
      if (camera.position.length() < RADIUS + .5) camera.position.setLength(RADIUS + .5);
      orbit.update();
      return;
    }
    if (mode === "globe") { camera.up.set(0, 1, 0); scratch.target.set(narrow ? 0 : -.32, narrow ? -1.15 : .05, 0); scratch.desired.set(narrow ? 0 : .6, narrow ? 1.5 : 1.45, theme === "science" ? Math.max(10.8, 8 * size.height / Math.max(size.width, 240)) : narrow ? 23 : 10.8); }
    else {
      scratch.target.set(...(mode === "mission" ? surfacePoint(MISSION_DESTINATION, RADIUS + .3) : input.current.position));
      scratch.normal.copy(scratch.target).normalize();
      scratch.desired.copy(scratch.target).addScaledVector(scratch.normal, mode === "mission" ? 2.65 : 3.4).add(scratch.elevation);
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
  return <OrbitControls ref={controls} makeDefault enabled={!guided} enablePan={false} touches={ONE_FINGER_FLIES} enableRotate={!guided} enableZoom={!guided} enableDamping={!reducedMotion && !guided} dampingFactor={.09} rotateSpeed={.65} zoomSpeed={.65} minDistance={guided ? 1 : mode === "globe" ? 7.2 : 1.7} maxDistance={guided ? 25 : mode === "globe" ? (narrow ? 30 : 17) : 8.5} minPolarAngle={.12} maxPolarAngle={mode === "globe" ? Math.PI - .12 : Math.PI / 2 - .12} onStart={() => { transition.current = false; chase.current.userOrbited = true; }} />;
}
