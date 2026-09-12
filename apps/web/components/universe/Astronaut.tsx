"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Quaternion, Vector3 } from "three";
import { INITIAL_DESTINATION, RADIUS, surfacePoint, type InputRef } from "./world";

export function Astronaut({ input, reducedMotion }: { input: InputRef; reducedMotion: boolean }) {
  const explorer = useRef<Group>(null);
  const leftLeg = useRef<Group>(null); const rightLeg = useRef<Group>(null);
  const { camera } = useThree();
  const motion = useMemo(() => ({ normal: new Vector3(...surfacePoint(INITIAL_DESTINATION, 1)), target: new Vector3(), east: new Vector3(), north: new Vector3(), forward: new Vector3(), up: new Vector3(0, 1, 0), orientation: new Quaternion(), facing: new Quaternion(), step: 0, hopTime: -1 }), []);

  useFrame((_, rawDelta) => {
    if (!explorer.current) return;
    const delta = Math.min(rawDelta, .05); const state = input.current;
    const horizontal = state.horizontal + Number(state.keys.has("arrowright") || state.keys.has("d")) - Number(state.keys.has("arrowleft") || state.keys.has("a"));
    const vertical = state.vertical + Number(state.keys.has("arrowup") || state.keys.has("w")) - Number(state.keys.has("arrowdown") || state.keys.has("s"));
    const speed = state.keys.has("shift") || state.running ? .75 : .42;
    let moving = false;
    if (horizontal || vertical) {
      state.destination = null;
      camera.getWorldDirection(motion.forward);
      motion.east.crossVectors(motion.forward, camera.up).normalize();
      motion.east.addScaledVector(motion.normal, -motion.east.dot(motion.normal)).normalize();
      if (motion.east.lengthSq() < .01) motion.east.set(1, 0, 0);
      motion.north.crossVectors(motion.normal, motion.east).normalize();
      const length = Math.max(1, Math.hypot(horizontal, vertical));
      motion.normal.addScaledVector(motion.east, horizontal * speed * delta / length).addScaledVector(motion.north, vertical * speed * delta / length).normalize();
      moving = true;
    } else if (state.destination) {
      motion.target.set(...surfacePoint(state.destination, 1));
      const angle = motion.normal.angleTo(motion.target);
      if (angle < .007) { motion.normal.copy(motion.target); state.destination = null; }
      else {
        // Bounded great-circle movement also handles destinations on the far side.
        motion.orientation.setFromUnitVectors(motion.normal, motion.target);
        motion.facing.identity().slerp(motion.orientation, Math.min(1, speed * delta / angle));
        motion.normal.applyQuaternion(motion.facing).normalize(); moving = true;
      }
    }
    if (state.hop) { if (motion.hopTime < 0) motion.hopTime = 0; state.hop = false; }
    let hop = 0;
    if (motion.hopTime >= 0) {
      motion.hopTime += delta;
      hop = Math.sin(Math.min(1, motion.hopTime / .65) * Math.PI) * (reducedMotion ? .08 : .33);
      if (motion.hopTime >= .65) motion.hopTime = -1;
    }
    explorer.current.position.copy(motion.normal).multiplyScalar(RADIUS + .03 + hop);
    explorer.current.quaternion.setFromUnitVectors(motion.up, motion.normal);
    explorer.current.position.toArray(state.position);
    if (moving) motion.step += delta * 10;
    const stride = moving && !reducedMotion ? Math.sin(motion.step) * .42 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
  });

  return <group ref={explorer} name="Wiggle explorer" position={surfacePoint(INITIAL_DESTINATION, RADIUS + .03)} scale={.83}>
    <mesh position={[0, .025, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.2, 14]} /><meshBasicMaterial color="#285c85" transparent opacity={.16} depthWrite={false} /></mesh>
    <group ref={leftLeg} position={[-.073, .19, 0]}><mesh position={[0, -.08, 0]}><capsuleGeometry args={[.057, .105, 2, 6]} /><meshStandardMaterial color="#fff7e7" roughness={.92} /></mesh><mesh position={[0, -.15, .04]}><boxGeometry args={[.115, .08, .16]} /><meshStandardMaterial color="#ef8b78" roughness={.9} /></mesh></group>
    <group ref={rightLeg} position={[.073, .19, 0]}><mesh position={[0, -.08, 0]}><capsuleGeometry args={[.057, .105, 2, 6]} /><meshStandardMaterial color="#fff7e7" roughness={.92} /></mesh><mesh position={[0, -.15, .04]}><boxGeometry args={[.115, .08, .16]} /><meshStandardMaterial color="#ef8b78" roughness={.9} /></mesh></group>
    <mesh position={[0, .31, 0]}><capsuleGeometry args={[.13, .14, 3, 8]} /><meshStandardMaterial color="#fff7e7" roughness={.9} /></mesh>
    <mesh position={[0, .31, -.13]}><boxGeometry args={[.2, .24, .12]} /><meshStandardMaterial color="#9dc99a" roughness={1} /></mesh>
    <mesh position={[0, .33, .119]}><boxGeometry args={[.13, .095, .026]} /><meshStandardMaterial color="#f4c95d" roughness={.88} /></mesh>
    <mesh position={[-.17, .31, 0]} rotation={[0, 0, -.2]}><capsuleGeometry args={[.05, .15, 2, 6]} /><meshStandardMaterial color="#d9efd7" roughness={.9} /></mesh>
    <mesh position={[.17, .31, 0]} rotation={[0, 0, .2]}><capsuleGeometry args={[.05, .15, 2, 6]} /><meshStandardMaterial color="#d9efd7" roughness={.9} /></mesh>
    <mesh position={[0, .55, 0]}><sphereGeometry args={[.205, 12, 9]} /><meshStandardMaterial color="#fff7e7" roughness={.72} /></mesh>
    <mesh position={[0, .557, .113]} scale={[1, .78, .56]}><sphereGeometry args={[.174, 12, 8]} /><meshStandardMaterial color="#285c85" metalness={0} roughness={.42} /></mesh>
    <mesh position={[-.062, .62, .188]} scale={[1, .3, .1]} rotation={[0, 0, -.3]}><sphereGeometry args={[.053, 8, 5]} /><meshBasicMaterial color="#a9d9ee" /></mesh>
    <mesh position={[.13, .72, 0]}><cylinderGeometry args={[.009, .009, .14, 4]} /><meshStandardMaterial color="#9dc99a" roughness={.9} /></mesh>
    <mesh position={[.13, .8, 0]}><sphereGeometry args={[.025, 6, 4]} /><meshBasicMaterial color="#f4c95d" /></mesh>
  </group>;
}
