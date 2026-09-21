"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Group, Quaternion, Vector3 } from "three";
import { INITIAL_DESTINATION, RADIUS, surfacePoint, type InputRef } from "./world";
import { AstronautRig, type AstronautMotion } from "../worlds/AstronautRig";
import { AUTO_RUN_SPEED, AUTO_WALK_SPEED, FACE_DELAY_SECONDS, easeAngle, gaitAmount, idleGlance, strideRate, walkPace, waveAmount } from "./walkMotion";

const SCALE = 1.9;
// The rig's boots sit a hair below its origin; lift it so they rest on the ground.
const RIG_LIFT = .045;
// Hops were tuned for the original 1.3 size; keep them in proportion as the explorer grows.
const SIZE_RATIO = SCALE / 1.3;
const WALK_SPEED = .42;
const RUN_SPEED = 1.3;
const ARRIVAL_ANGLE = .01;
const TURN_EASE = 9;
const KEY_TURN_EASE = 16;
const UP = new Vector3(0, 1, 0);

function createMotion() {
  const normal = new Vector3(...surfacePoint(INITIAL_DESTINATION, 1));
  const heading = new Vector3(1, 0, 0);
  heading.addScaledVector(normal, -heading.dot(normal)).normalize();
  return {
    normal, heading, aim: new Vector3(), axis: new Vector3(), target: new Vector3(),
    east: new Vector3(), north: new Vector3(), forward: new Vector3(),
    surface: new Quaternion(), surfaceInverse: new Quaternion(), yaw: new Quaternion(),
    speed: 0, step: 0, hopTime: -1,
  };
}

export function Astronaut({ input, reducedMotion }: { input: InputRef; reducedMotion: boolean }) {
  const explorer = useRef<Group>(null); const body = useRef<Group>(null);
  const nozzles = { left: useRef<Group>(null), right: useRef<Group>(null) };
  const rigMotion = useRef<AstronautMotion>({ speed: 0, hover: 0, time: 0, lookX: 0, lookY: 0, cheer: 0, stride: 0 });
  const settle = useRef(0);
  const faceYaw = useRef(0);
  const { camera, clock, gl } = useThree();
  const motion = useMemo(createMotion, []);
  const waveStart = useRef(-Infinity);
  const hovered = useRef(false);
  const hover = useRef(0);
  const standing = useRef(1);

  // Tapping the explorer is a high-five: it hops and waves back, unless a lesson has paused it.
  const cheer = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    waveStart.current = clock.getElapsedTime();
    if (!input.current.paused) input.current.hop = true;
  };

  useEffect(() => () => { gl.domElement.style.cursor = ""; }, [gl]);

  useFrame((_, rawDelta) => {
    if (!explorer.current) return;
    const delta = Math.min(rawDelta, .05); const state = input.current;
    if (state.teleport) {
      motion.normal.set(...surfacePoint(state.teleport, 1));
      state.teleport = null; motion.hopTime = -1; motion.speed = 0; state.destination = null;
    }
    if (state.paused) { state.keys.clear(); state.horizontal = 0; state.vertical = 0; state.hop = false; state.destination = null; }
    const held = (...keys: string[]) => Number(keys.some(key => state.keys.has(key)));
    const horizontal = state.horizontal + held("arrowright", "d") - held("arrowleft", "a");
    const vertical = state.vertical + held("arrowup", "w") - held("arrowdown", "s");
    const sprinting = state.keys.has("shift") || state.running;

    // The heading stays a unit tangent of the sphere wherever the explorer walks.
    motion.heading.addScaledVector(motion.normal, -motion.heading.dot(motion.normal));
    if (motion.heading.lengthSq() < .01) motion.heading.crossVectors(UP, motion.normal);
    motion.heading.normalize();

    let turning = false;
    const turnToward = (aim: Vector3, ease: number) => {
      const angle = motion.heading.angleTo(aim);
      turning = angle > .3;
      if (angle < 1e-4) return angle;
      const side = motion.normal.dot(motion.axis.crossVectors(motion.heading, aim)) < 0 ? -1 : 1;
      motion.heading.applyAxisAngle(motion.normal, side * angle * (1 - Math.exp(-ease * delta))).normalize();
      return angle;
    };

    if (horizontal || vertical) {
      state.destination = null;
      camera.getWorldDirection(motion.forward);
      motion.east.crossVectors(motion.forward, camera.up).normalize();
      motion.east.addScaledVector(motion.normal, -motion.east.dot(motion.normal)).normalize();
      if (motion.east.lengthSq() < .01) motion.east.set(1, 0, 0);
      motion.north.crossVectors(motion.normal, motion.east).normalize();
      const length = Math.max(1, Math.hypot(horizontal, vertical));
      motion.speed = sprinting ? RUN_SPEED : WALK_SPEED;
      motion.aim.copy(motion.east).multiplyScalar(horizontal).addScaledVector(motion.north, vertical).normalize();
      const keyStep = motion.speed * delta / length;
      motion.normal.addScaledVector(motion.east, horizontal * keyStep).addScaledVector(motion.north, vertical * keyStep).normalize();
      turnToward(motion.aim, KEY_TURN_EASE);
    } else if (state.destination) {
      motion.target.set(...surfacePoint(state.destination, 1));
      const remaining = motion.normal.angleTo(motion.target);
      if (remaining < ARRIVAL_ANGLE) { motion.normal.copy(motion.target); state.destination = null; motion.speed = 0; }
      else {
        // Turn to face the goal first, then walk the great circle toward it; far-side goals work too.
        motion.aim.copy(motion.target).addScaledVector(motion.normal, -motion.target.dot(motion.normal));
        if (motion.aim.lengthSq() < 1e-6) motion.aim.copy(motion.heading); else motion.aim.normalize();
        const misalignment = turnToward(motion.aim, TURN_EASE);
        const cruise = sprinting ? AUTO_RUN_SPEED : AUTO_WALK_SPEED;
        motion.speed += (walkPace(cruise, remaining, misalignment) - motion.speed) * (1 - Math.exp(-7 * delta));
        const travel = Math.min(motion.speed * delta, remaining);
        if (travel > 0) {
          motion.axis.crossVectors(motion.normal, motion.heading).normalize();
          motion.normal.applyAxisAngle(motion.axis, travel).normalize();
          motion.heading.applyAxisAngle(motion.axis, travel);
        }
      }
    } else motion.speed *= Math.exp(-12 * delta);
    if (motion.speed < .005) motion.speed = 0;
    const moving = motion.speed > 0;
    const gaitCruise = sprinting ? RUN_SPEED : WALK_SPEED;

    if (state.hop) { if (motion.hopTime < 0) motion.hopTime = 0; state.hop = false; }
    let hop = 0;
    if (motion.hopTime >= 0) {
      motion.hopTime += delta;
      hop = Math.sin(Math.min(1, motion.hopTime / .65) * Math.PI) * (reducedMotion ? .08 : .33) * SIZE_RATIO;
      if (motion.hopTime >= .65) motion.hopTime = -1;
    }
    explorer.current.position.copy(motion.normal).multiplyScalar(RADIUS + .03 + hop);
    motion.surface.setFromUnitVectors(UP, motion.normal);
    motion.forward.copy(motion.heading).applyQuaternion(motion.surfaceInverse.copy(motion.surface).invert());
    // Once it has stopped it turns to show its face to the camera. This is only how it is drawn: state.heading, which the
    // chase camera reads, stays the walking direction, so the camera never chases it round in circles.
    const settled = !moving && !turning && !horizontal && !vertical && !state.destination;
    settle.current = settled ? settle.current + delta : 0;
    let faceTarget = 0;
    if (settle.current > FACE_DELAY_SECONDS) {
      motion.aim.copy(camera.position).sub(explorer.current.position);
      motion.aim.addScaledVector(motion.normal, -motion.aim.dot(motion.normal));
      if (motion.aim.lengthSq() > 1e-4) {
        const side = motion.normal.dot(motion.axis.crossVectors(motion.heading, motion.aim)) < 0 ? -1 : 1;
        faceTarget = side * motion.heading.angleTo(motion.aim);
      }
    }
    faceYaw.current = reducedMotion ? faceTarget : easeAngle(faceYaw.current, faceTarget, settled ? 4.5 : 9, delta);
    motion.yaw.setFromAxisAngle(UP, Math.atan2(motion.forward.x, motion.forward.z) + faceYaw.current);
    explorer.current.quaternion.copy(motion.surface).multiply(motion.yaw);
    explorer.current.position.toArray(state.position);
    state.heading ??= [0, 0, 0]; motion.heading.toArray(state.heading);

    const gait = moving || turning ? gaitAmount(motion.speed, gaitCruise, turning && !moving) : 0;
    if (gait > 0) motion.step += delta * strideRate(Math.max(motion.speed, .2));
    const animate = gait > 0 && !reducedMotion;
    const stride = animate ? Math.sin(motion.step) * (sprinting ? .75 : .55) * gait : 0;

    // It waves at a pointer resting on it, and back at a tap; while standing about it glances around.
    const time = clock.getElapsedTime();
    hover.current += ((hovered.current ? 1 : 0) - hover.current) * (1 - Math.exp(-8 * delta));
    const tapWave = waveAmount(time - waveStart.current);
    const wave = Math.max(tapWave, hover.current * .85);
    standing.current += ((moving || turning || wave > .05 ? 0 : 1) - standing.current) * (1 - Math.exp(-3 * delta));
    const glance = reducedMotion ? 0 : idleGlance(time, standing.current);
    rigMotion.current = { speed: motion.speed, hover: hover.current * .85, time: reducedMotion ? 0 : time, lookX: glance / .55, lookY: 0, cheer: tapWave, stride };
    explorer.current.scale.setScalar(reducedMotion ? SCALE : SCALE * (1 + .04 * hover.current + .08 * tapWave));
    if (body.current) {
      const grounded = animate && moving;
      body.current.position.y = RIG_LIFT + (grounded ? Math.abs(Math.sin(motion.step)) * .04 * gait : 0);
      body.current.rotation.x += ((grounded ? .1 * gait : 0) - body.current.rotation.x) * (1 - Math.exp(-8 * delta));
      body.current.rotation.z = grounded ? Math.sin(motion.step) * .05 * gait : 0;
    }
  });

  return (
    <group ref={explorer} name="Wiggle explorer" position={surfacePoint(INITIAL_DESTINATION, RADIUS + .03)} scale={SCALE}
      onClick={cheer}
      onPointerOver={() => { hovered.current = true; gl.domElement.style.cursor = "pointer"; }}
      onPointerOut={() => { hovered.current = false; gl.domElement.style.cursor = ""; }}>
      <mesh position={[0, .4, 0]} visible={false}><capsuleGeometry args={[.3, .55, 2, 6]} /><meshBasicMaterial /></mesh>
      <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[.2, 14]} />
        <meshBasicMaterial color="#285c85" transparent opacity={.16} depthWrite={false} />
      </mesh>
      <group ref={body} position={[0, RIG_LIFT, 0]}>
        <AstronautRig motion={rigMotion} nozzles={nozzles} grounded />
      </group>
    </group>
  );
}
