"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Quaternion, Vector3 } from "three";
import { INITIAL_DESTINATION, RADIUS, surfacePoint, type InputRef } from "./world";
import { AUTO_RUN_SPEED, AUTO_WALK_SPEED, gaitAmount, strideRate, walkPace } from "./walkMotion";

const SCALE = 1.3;
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
  const leftLeg = useRef<Group>(null); const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null); const rightArm = useRef<Group>(null);
  const { camera } = useThree();
  const motion = useMemo(createMotion, []);

  useFrame((_, rawDelta) => {
    if (!explorer.current) return;
    const delta = Math.min(rawDelta, .05); const state = input.current;
    if (state.teleport) { motion.normal.set(...surfacePoint(state.teleport, 1)); state.teleport = null; motion.hopTime = -1; motion.speed = 0; state.destination = null; }
    if (state.paused) { state.keys.clear(); state.horizontal = 0; state.vertical = 0; state.hop = false; state.destination = null; }
    const horizontal = state.horizontal + Number(state.keys.has("arrowright") || state.keys.has("d")) - Number(state.keys.has("arrowleft") || state.keys.has("a"));
    const vertical = state.vertical + Number(state.keys.has("arrowup") || state.keys.has("w")) - Number(state.keys.has("arrowdown") || state.keys.has("s"));
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
      motion.normal.addScaledVector(motion.east, horizontal * motion.speed * delta / length).addScaledVector(motion.north, vertical * motion.speed * delta / length).normalize();
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
      hop = Math.sin(Math.min(1, motion.hopTime / .65) * Math.PI) * (reducedMotion ? .08 : .33);
      if (motion.hopTime >= .65) motion.hopTime = -1;
    }
    explorer.current.position.copy(motion.normal).multiplyScalar(RADIUS + .03 + hop);
    motion.surface.setFromUnitVectors(UP, motion.normal);
    motion.forward.copy(motion.heading).applyQuaternion(motion.surfaceInverse.copy(motion.surface).invert());
    motion.yaw.setFromAxisAngle(UP, Math.atan2(motion.forward.x, motion.forward.z));
    explorer.current.quaternion.copy(motion.surface).multiply(motion.yaw);
    explorer.current.position.toArray(state.position);
    state.heading ??= [0, 0, 0]; motion.heading.toArray(state.heading);

    const gait = moving || turning ? gaitAmount(motion.speed, gaitCruise, turning && !moving) : 0;
    if (gait > 0) motion.step += delta * strideRate(Math.max(motion.speed, .2));
    const animate = gait > 0 && !reducedMotion;
    const stride = animate ? Math.sin(motion.step) * (sprinting ? .75 : .55) * gait : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
    if (leftArm.current) leftArm.current.rotation.x = -stride * .8;
    if (rightArm.current) rightArm.current.rotation.x = stride * .8;
    if (body.current) {
      const grounded = animate && moving;
      body.current.position.y = grounded ? Math.abs(Math.sin(motion.step)) * .04 * gait : 0;
      body.current.rotation.x += ((grounded ? .1 * gait : 0) - body.current.rotation.x) * (1 - Math.exp(-8 * delta));
      body.current.rotation.z = grounded ? Math.sin(motion.step) * .05 * gait : 0;
    }
  });

  return <group ref={explorer} name="Wiggle explorer" position={surfacePoint(INITIAL_DESTINATION, RADIUS + .03)} scale={SCALE}>
    <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.2, 14]} /><meshBasicMaterial color="#285c85" transparent opacity={.16} depthWrite={false} /></mesh>
    <group ref={body}>
    <group ref={leftLeg} position={[-.073, .19, 0]}><mesh position={[0, -.08, 0]}><capsuleGeometry args={[.057, .105, 2, 6]} /><meshStandardMaterial color="#fff7e7" roughness={.92} /></mesh><mesh position={[0, -.15, .04]}><boxGeometry args={[.115, .08, .16]} /><meshStandardMaterial color="#ef8b78" roughness={.9} /></mesh></group>
    <group ref={rightLeg} position={[.073, .19, 0]}><mesh position={[0, -.08, 0]}><capsuleGeometry args={[.057, .105, 2, 6]} /><meshStandardMaterial color="#fff7e7" roughness={.92} /></mesh><mesh position={[0, -.15, .04]}><boxGeometry args={[.115, .08, .16]} /><meshStandardMaterial color="#ef8b78" roughness={.9} /></mesh></group>
    <mesh position={[0, .31, 0]}><capsuleGeometry args={[.13, .14, 3, 8]} /><meshStandardMaterial color="#fff7e7" roughness={.9} /></mesh>
    <mesh position={[0, .31, -.13]}><boxGeometry args={[.2, .24, .12]} /><meshStandardMaterial color="#9dc99a" roughness={1} /></mesh>
    <mesh position={[0, .33, .119]}><boxGeometry args={[.13, .095, .026]} /><meshStandardMaterial color="#f4c95d" roughness={.88} /></mesh>
    <group ref={leftArm} position={[-.17, .31, 0]} rotation={[0, 0, -.2]}><mesh><capsuleGeometry args={[.05, .15, 2, 6]} /><meshStandardMaterial color="#d9efd7" roughness={.9} /></mesh></group>
    <group ref={rightArm} position={[.17, .31, 0]} rotation={[0, 0, .2]}><mesh><capsuleGeometry args={[.05, .15, 2, 6]} /><meshStandardMaterial color="#d9efd7" roughness={.9} /></mesh></group>
    <mesh position={[0, .55, 0]}><sphereGeometry args={[.205, 12, 9]} /><meshStandardMaterial color="#fff7e7" roughness={.72} /></mesh>
    <mesh position={[0, .557, .113]} scale={[1, .78, .56]}><sphereGeometry args={[.174, 12, 8]} /><meshStandardMaterial color="#285c85" metalness={0} roughness={.42} /></mesh>
    <mesh position={[-.062, .62, .188]} scale={[1, .3, .1]} rotation={[0, 0, -.3]}><sphereGeometry args={[.053, 8, 5]} /><meshBasicMaterial color="#a9d9ee" /></mesh>
    <mesh position={[.13, .72, 0]}><cylinderGeometry args={[.009, .009, .14, 4]} /><meshStandardMaterial color="#9dc99a" roughness={.9} /></mesh>
    <mesh position={[.13, .8, 0]}><sphereGeometry args={[.025, 6, 4]} /><meshBasicMaterial color="#f4c95d" /></mesh>
    </group>
  </group>;
}
