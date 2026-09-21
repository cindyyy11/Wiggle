"use client";

import { useRef, type MutableRefObject, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, type Group, type Mesh } from "three";

// lookX/lookY (-1..1) point the helmet at the pointer; cheer (0..1) is the burst of excitement after a tap.
// stride is the leg-swing angle in radians for a grounded explorer walking on a surface.
export type AstronautMotion = { speed: number; hover: number; time: number; lookX: number; lookY: number; cheer: number; stride?: number };
export type AstronautNozzles = { left: RefObject<Group | null>; right: RefObject<Group | null> };

const SUIT = "#fdf8ee";
const SUIT_SHADE = "#e4dccb";
const SLEEVE = "#d9efd7";
const PACK = "#9dc99a";
const TANK = "#e3f2e1";
const GOLD = "#f4c95d";
const NAVY = "#17304d";
const VISOR = "#2a6a9e";
const GLINT = "#d6f0fb";
const BOOT = "#ef8b78";
const METAL = "#6d8096";
const JET = "#9fe3ff";

const FACE = "#d8f7ff";
// The waving arm is modelled raised out to the side; this swings it down to hang beside the body when walking.
const ARM_DOWN = -1.86;

const LIGHTS: readonly [number, string][] = [[-.04, "#8fe6ff"], [0, GOLD], [.04, "#ff9f80"]];

// The whole visual rig; FloatingAstronaut and the walking explorer only move it, this component animates the limbs from the
// shared motion state. `grounded` is the walking pose: legs stride, arms hang and swing, and the thrusters stay dark.
export function AstronautRig({ motion, nozzles, grounded = false }: { motion: MutableRefObject<AstronautMotion>; nozzles: AstronautNozzles; grounded?: boolean }) {
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const waveArm = useRef<Group>(null);
  const helmet = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const jetLeft = useRef<Mesh>(null);
  const jetRight = useRef<Mesh>(null);
  const tip = useRef<Mesh>(null);
  const lights = useRef<(Mesh | null)[]>([]);

  useFrame(() => {
    const { speed, hover, time, lookX, lookY, cheer, stride = 0 } = motion.current;
    const wave = Math.max(hover, cheer);
    if (grounded) {
      if (leftLeg.current) leftLeg.current.rotation.set(stride, 0, .05);
      if (rightLeg.current) rightLeg.current.rotation.set(-stride, 0, -.05);
      if (leftArm.current) leftArm.current.rotation.set(-stride * .8, 0, -.14);
      if (waveArm.current) waveArm.current.rotation.set(stride * .8 * (1 - wave), 0, ARM_DOWN + wave * (2.25 + Math.sin(time * 9) * .28));
    } else {
      const swing = .26 + Math.min(speed, 8) * .035 + wave * .12;
      if (leftLeg.current) leftLeg.current.rotation.x = .24 + Math.sin(time * 1.7) * swing;
      if (rightLeg.current) rightLeg.current.rotation.x = -.1 + Math.sin(time * 1.7 + Math.PI) * swing;
      if (leftArm.current) { leftArm.current.rotation.z = -.38 + Math.sin(time * 1.3 + 1) * .14; leftArm.current.rotation.x = Math.sin(time * 1.1) * .18; }
      if (waveArm.current) waveArm.current.rotation.z = Math.sin(time * (2.1 + wave * 4)) * (.22 + .3 * wave) + wave * .35;
    }
    if (helmet.current) { helmet.current.rotation.y = Math.sin(time * .7) * .17 + lookX * .55; helmet.current.rotation.x = Math.sin(time * .9 + 1) * .06 - lookY * .35; }
    const flame = grounded ? .001 : .55 + Math.min(speed, 8) * .16 + Math.sin(time * 11) * .07;
    jetLeft.current?.scale.set(1, flame, 1);
    jetRight.current?.scale.set(1, flame * .95, 1);
    if (tip.current) tip.current.scale.setScalar(1 + Math.sin(time * 4) * .28);
    // A quick blink every few seconds.
    if (eyes.current) eyes.current.scale.y = time > .05 && time % 4.6 < .11 ? .12 : 1;
    lights.current.forEach((light, index) => { if (light) light.visible = Math.sin(time * 2.6 + index * 2.1) > -.35; });
  });

  return <>
    <group ref={leftLeg} position={[-.105, .19, 0]} rotation={[.24, 0, .16]}>
      <mesh position={[0, -.085, 0]}><capsuleGeometry args={[.062, .11, 4, 12]} /><meshStandardMaterial color={SUIT} roughness={.6} /></mesh>
      <mesh position={[0, -.14, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.06, .012, 6, 16]} /><meshStandardMaterial color={GOLD} metalness={.5} roughness={.35} /></mesh>
      <mesh position={[0, -.175, .03]} scale={[.85, .62, 1.25]}><sphereGeometry args={[.075, 14, 10]} /><meshStandardMaterial color={BOOT} roughness={.55} /></mesh>
      <mesh position={[0, -.205, .03]} scale={[.9, .22, 1.3]}><sphereGeometry args={[.075, 12, 8]} /><meshStandardMaterial color={SUIT} roughness={.7} /></mesh>
    </group>
    <group ref={rightLeg} position={[.105, .19, 0]} rotation={[-.1, 0, -.18]}>
      <mesh position={[0, -.085, 0]}><capsuleGeometry args={[.062, .11, 4, 12]} /><meshStandardMaterial color={SUIT} roughness={.6} /></mesh>
      <mesh position={[0, -.14, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.06, .012, 6, 16]} /><meshStandardMaterial color={GOLD} metalness={.5} roughness={.35} /></mesh>
      <mesh position={[0, -.175, .03]} scale={[.85, .62, 1.25]}><sphereGeometry args={[.075, 14, 10]} /><meshStandardMaterial color={BOOT} roughness={.55} /></mesh>
      <mesh position={[0, -.205, .03]} scale={[.9, .22, 1.3]}><sphereGeometry args={[.075, 12, 8]} /><meshStandardMaterial color={SUIT} roughness={.7} /></mesh>
    </group>

    <mesh position={[0, .31, 0]}><capsuleGeometry args={[.135, .13, 5, 16]} /><meshStandardMaterial color={SUIT} roughness={.55} /></mesh>
    <mesh position={[0, .2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.138, .02, 8, 24]} /><meshStandardMaterial color={GOLD} metalness={.55} roughness={.3} /></mesh>
    <mesh position={[0, .4, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.12, .028, 8, 24]} /><meshStandardMaterial color={GOLD} metalness={.55} roughness={.3} /></mesh>
    <mesh position={[0, .335, .128]}><boxGeometry args={[.14, .09, .03]} /><meshStandardMaterial color={NAVY} roughness={.4} /></mesh>
    {LIGHTS.map(([x, color], index) => <mesh key={color} ref={node => { lights.current[index] = node; }} position={[x, .335, .146]}>
      <sphereGeometry args={[.013, 8, 6]} /><meshBasicMaterial color={color} />
    </mesh>)}
    <mesh position={[.075, .395, .122]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.028, .028, .012, 14]} /><meshStandardMaterial color={GOLD} metalness={.5} roughness={.35} /></mesh>

    <mesh position={[0, .31, -.145]}><boxGeometry args={[.22, .27, .12]} /><meshStandardMaterial color={PACK} roughness={.75} /></mesh>
    {[-.09, .09].map(x => <mesh key={x} position={[x, .31, -.215]}><cylinderGeometry args={[.034, .034, .26, 12]} /><meshStandardMaterial color={TANK} roughness={.4} /></mesh>)}
    <group ref={nozzles.left} position={[-.06, .155, -.15]}>
      <mesh><cylinderGeometry args={[.026, .036, .05, 10]} /><meshStandardMaterial color={METAL} metalness={.5} roughness={.4} /></mesh>
      <mesh ref={jetLeft} position={[0, -.1, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[.03, .15, 10]} /><meshBasicMaterial color={JET} transparent opacity={.6} depthWrite={false} blending={AdditiveBlending} /></mesh>
    </group>
    <group ref={nozzles.right} position={[.06, .155, -.15]}>
      <mesh><cylinderGeometry args={[.026, .036, .05, 10]} /><meshStandardMaterial color={METAL} metalness={.5} roughness={.4} /></mesh>
      <mesh ref={jetRight} position={[0, -.1, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[.03, .15, 10]} /><meshBasicMaterial color={JET} transparent opacity={.6} depthWrite={false} blending={AdditiveBlending} /></mesh>
    </group>

    <group ref={leftArm} position={[-.165, .365, 0]} rotation={[0, 0, -.38]}>
      <mesh><sphereGeometry args={[.058, 14, 10]} /><meshStandardMaterial color={SUIT} roughness={.6} /></mesh>
      <mesh position={[0, -.1, 0]}><capsuleGeometry args={[.05, .12, 4, 12]} /><meshStandardMaterial color={SLEEVE} roughness={.6} /></mesh>
      <mesh position={[0, -.185, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.05, .011, 6, 14]} /><meshStandardMaterial color={GOLD} metalness={.5} roughness={.35} /></mesh>
      <mesh position={[0, -.225, 0]}><sphereGeometry args={[.052, 12, 9]} /><meshStandardMaterial color={SUIT_SHADE} roughness={.7} /></mesh>
    </group>
    <group ref={waveArm} position={[.165, .365, 0]}>
      <mesh><sphereGeometry args={[.058, 14, 10]} /><meshStandardMaterial color={SUIT} roughness={.6} /></mesh>
      <mesh position={[.088, .07, 0]} rotation={[0, 0, -.85]}><capsuleGeometry args={[.05, .12, 4, 12]} /><meshStandardMaterial color={SLEEVE} roughness={.6} /></mesh>
      <mesh position={[.157, .143, 0]} rotation={[0, 0, -.85]}><torusGeometry args={[.05, .011, 6, 14]} /><meshStandardMaterial color={GOLD} metalness={.5} roughness={.35} /></mesh>
      <mesh position={[.19, .182, 0]}><sphereGeometry args={[.052, 12, 9]} /><meshStandardMaterial color={SUIT_SHADE} roughness={.7} /></mesh>
    </group>

    <group ref={helmet} position={[0, .56, 0]}>
      <mesh><sphereGeometry args={[.215, 28, 20]} /><meshStandardMaterial color={SUIT} roughness={.4} /></mesh>
      <mesh position={[0, .004, .098]} scale={[1, .8, .64]}><sphereGeometry args={[.182, 24, 16]} /><meshStandardMaterial color={NAVY} roughness={.5} /></mesh>
      <mesh position={[0, .008, .13]} scale={[1, .78, .6]}><sphereGeometry args={[.167, 24, 16]} /><meshPhysicalMaterial color={VISOR} roughness={.14} clearcoat={1} clearcoatRoughness={.05} emissive="#0b2a4a" emissiveIntensity={.5} /></mesh>
      <mesh position={[-.095, .085, .192]} scale={[1, .3, .1]} rotation={[0, 0, -.5]}><sphereGeometry args={[.053, 10, 6]} /><meshBasicMaterial color={GLINT} /></mesh>
      <group ref={eyes}>
        {[-.056, .056].map(x => <mesh key={x} position={[x, .035, .234]} scale={[1, 1.25, .3]}><sphereGeometry args={[.024, 14, 10]} /><meshBasicMaterial color={FACE} /></mesh>)}
      </group>
      <mesh position={[0, .004, .234]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.044, .0075, 6, 22, Math.PI]} /><meshBasicMaterial color={FACE} /></mesh>
      {[-.208, .208].map(x => <mesh key={x} position={[x, -.005, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.042, .042, .05, 14]} /><meshStandardMaterial color={GOLD} metalness={.55} roughness={.3} /></mesh>)}
      <mesh position={[.115, .2, -.02]} rotation={[0, 0, -.25]}><cylinderGeometry args={[.008, .008, .15, 6]} /><meshStandardMaterial color={METAL} metalness={.5} roughness={.4} /></mesh>
      <mesh ref={tip} position={[.13, .282, -.02]}><sphereGeometry args={[.028, 10, 8]} /><meshBasicMaterial color="#ff9f80" /></mesh>
    </group>
  </>;
}
