"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Group, MathUtils } from "three";
import { Numeria } from "../universe/Numeria";
import { Landmarks } from "../universe/Landmarks";
import { SUBJECT_WORLDS, SUBJECT_WORLD_ORDER, type SubjectWorldId } from "./subjectRoute";
import styles from "./SubjectWorlds.module.css";

export const PLANET_ORDER: readonly SubjectWorldId[] = SUBJECT_WORLD_ORDER;
const noop = () => undefined;
const SELECTED_SPIN_SPEED = 0.12;
const SIDE_SPIN_SPEED = 0.075;
const MAX_FRAME_DELTA = 0.05;
export const LOCK_BADGE_SURFACE_Z = 3.82;
export const LOCK_BADGE_CENTER_Y = -0.18;

export function planetSpinStep(delta: number, offset: number, reducedMotion: boolean, pressed: boolean): number {
  if (reducedMotion || pressed) return 0;
  return Math.min(delta, MAX_FRAME_DELTA) * (offset === 0 ? SELECTED_SPIN_SPEED : SIDE_SPIN_SPEED);
}

function Planet({ world, offset, reducedMotion, onSelect, onChoose }: {
  world: SubjectWorldId; offset: number; reducedMotion: boolean;
  onSelect: (world: SubjectWorldId) => void; onChoose: (world: SubjectWorldId) => void;
}) {
  const group = useRef<Group>(null);
  const visual = useRef<Group>(null);
  const pressed = useRef(false);
  const { viewport } = useThree();
  const mystery = SUBJECT_WORLDS.find(item => item.id === world)?.mystery ?? false;
  const radiusScale = Math.min(.9, viewport.width / 8.5);
  const spacing = Math.min(7.2, viewport.width * .86);
  const [initialPosition] = useState<[number, number, number]>(() => [offset * spacing, -.25, 0]);
  const [initialScale] = useState(() => radiusScale * (offset === 0 ? 1 : .66));
  useFrame((_, delta) => {
    if (!group.current) return;
    const blend = reducedMotion ? 1 : 1 - Math.exp(-14 * Math.min(delta, .05));
    group.current.position.x = MathUtils.lerp(group.current.position.x, offset * spacing, blend);
    const scale = radiusScale * (offset === 0 ? 1 : .66);
    group.current.scale.lerp({ x: scale, y: scale, z: scale }, blend);
    if (visual.current) visual.current.rotation.y += planetSpinStep(delta, offset, reducedMotion, pressed.current);
  });
  return <group ref={group} position={initialPosition} scale={initialScale}
    onClick={event => { event.stopPropagation(); if (event.delta > 7) return; if (offset === 0) onSelect(world); else onChoose(world); }}
    onPointerDown={event => { pressed.current = true; (event.target as Element | null)?.setPointerCapture(event.pointerId); }}
    onPointerUp={event => { pressed.current = false; (event.target as Element | null)?.releasePointerCapture(event.pointerId); }}
    onPointerCancel={event => { pressed.current = false; (event.target as Element | null)?.releasePointerCapture(event.pointerId); }}>
    <group ref={visual}>
      <group rotation={[.2, -.45, -.12]}>
      <Numeria quality="low" dimmed={false} theme={world} preview onDestination={noop} />
      {world === "math" ? <group onClick={event => { event.stopPropagation(); if (event.delta <= 7) { if (offset === 0) onSelect(world); else onChoose(world); } }}>
        <Landmarks selected="fraction-forest" onSelect={() => { if (offset === 0) onSelect(world); else onChoose(world); }} reducedMotion={reducedMotion} mission={false} />
      </group> : null}
      </group>
    </group>
    {mystery ? <group position={[0, LOCK_BADGE_CENTER_Y, LOCK_BADGE_SURFACE_Z]} scale={offset === 0 ? 1.05 : .82}>
      <mesh><boxGeometry args={[1.05, .8, .2]} /><meshStandardMaterial color="#fff7e7" roughness={.8} /></mesh>
      <mesh position={[0, .48, 0]}><torusGeometry args={[.36, .1, 8, 24, Math.PI]} /><meshStandardMaterial color="#fff7e7" /></mesh>
      <mesh position={[0, 0, .12]}><sphereGeometry args={[.1, 10, 8]} /><meshBasicMaterial color="#27395b" /></mesh>
    </group> : null}
  </group>;
}

export const ASTRONAUT_CENTER_Y = .18;
// The rig below copies the in-world explorer's proportions, so it scales up from that size.
export const ASTRONAUT_RIG_HEIGHT = .83;
export const ASTRONAUT_SCALE = 4.4;
// It floats off the left edge, so it turns toward the camera rather than facing straight down +Z.
export const ASTRONAUT_FACING = .55;

export function astronautDrift(time: number): { lift: number; tilt: number; turn: number } {
  return { lift: Math.sin(time * .62) * .22, tilt: Math.sin(time * .45) * .12, turn: Math.sin(time * .28) * .18 };
}

const SUIT = "#fff7e7";
const SLEEVE = "#d9efd7";
const PACK = "#9dc99a";
const VISOR = "#285c85";
const GLINT = "#a9d9ee";
const TRIM = "#f4c95d";
const BOOT = "#ef8b78";

function FloatingAstronaut({ offset, reducedMotion }: { offset: number; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const { viewport } = useThree();
  const radiusScale = Math.min(.9, viewport.width / 8.5);
  const spacing = Math.min(7.2, viewport.width * .86);
  const scale = radiusScale * ASTRONAUT_SCALE;
  const [initialPosition] = useState<[number, number, number]>(() => [offset * spacing, ASTRONAUT_CENTER_Y, 1.1]);
  const waveArm = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const blend = reducedMotion ? 1 : 1 - Math.exp(-14 * Math.min(delta, .05));
    group.current.position.x = MathUtils.lerp(group.current.position.x, offset * spacing, blend);
    if (reducedMotion || !body.current) return;
    const time = clock.getElapsedTime();
    const drift = astronautDrift(time);
    group.current.position.y = ASTRONAUT_CENTER_Y + drift.lift;
    body.current.rotation.z = drift.tilt;
    body.current.rotation.y = ASTRONAUT_FACING + drift.turn;
    if (waveArm.current) waveArm.current.rotation.z = Math.sin(time * 2.1) * .22;
  });
  return <group ref={group} position={initialPosition} scale={scale}>
    <group ref={body} rotation={[.06, ASTRONAUT_FACING, 0]} position={[0, -.42, 0]}>
      <group position={[-.105, .19, 0]} rotation={[.24, 0, .16]}>
        <mesh position={[0, -.08, 0]}><capsuleGeometry args={[.057, .105, 2, 6]} /><meshStandardMaterial color={SUIT} roughness={.92} /></mesh>
        <mesh position={[0, -.15, .04]} rotation={[0, .2, 0]}><boxGeometry args={[.115, .08, .16]} /><meshStandardMaterial color={BOOT} roughness={.9} /></mesh>
      </group>
      <group position={[.105, .19, 0]} rotation={[-.1, 0, -.18]}>
        <mesh position={[0, -.08, 0]}><capsuleGeometry args={[.057, .105, 2, 6]} /><meshStandardMaterial color={SUIT} roughness={.92} /></mesh>
        <mesh position={[0, -.15, .04]} rotation={[0, -.2, 0]}><boxGeometry args={[.115, .08, .16]} /><meshStandardMaterial color={BOOT} roughness={.9} /></mesh>
      </group>
      <mesh position={[0, .31, 0]}><capsuleGeometry args={[.13, .14, 3, 8]} /><meshStandardMaterial color={SUIT} roughness={.9} /></mesh>
      <mesh position={[0, .31, -.13]}><boxGeometry args={[.2, .24, .12]} /><meshStandardMaterial color={PACK} roughness={1} /></mesh>
      <mesh position={[0, .33, .119]}><boxGeometry args={[.13, .095, .026]} /><meshStandardMaterial color={TRIM} roughness={.88} /></mesh>
      <mesh position={[-.17, .27, 0]} rotation={[0, 0, -.42]}><capsuleGeometry args={[.05, .15, 2, 6]} /><meshStandardMaterial color={SLEEVE} roughness={.9} /></mesh>
      <group ref={waveArm} position={[.13, .33, 0]}>
        <mesh position={[.086, .076, 0]} rotation={[0, 0, -.85]}><capsuleGeometry args={[.05, .15, 2, 6]} /><meshStandardMaterial color={SLEEVE} roughness={.9} /></mesh>
      </group>
      <mesh position={[0, .55, 0]}><sphereGeometry args={[.205, 12, 9]} /><meshStandardMaterial color={SUIT} roughness={.72} /></mesh>
      <mesh position={[0, .553, .118]} scale={[1, .78, .62]}><sphereGeometry args={[.166, 12, 8]} /><meshStandardMaterial color={VISOR} metalness={0} roughness={.42} /></mesh>
      <mesh position={[-.062, .608, .2]} scale={[1, .3, .1]} rotation={[0, 0, -.3]}><sphereGeometry args={[.053, 8, 5]} /><meshBasicMaterial color={GLINT} /></mesh>
      <mesh position={[.13, .72, 0]}><cylinderGeometry args={[.009, .009, .14, 4]} /><meshStandardMaterial color={PACK} roughness={.9} /></mesh>
      <mesh position={[.13, .8, 0]}><sphereGeometry args={[.025, 6, 4]} /><meshBasicMaterial color={TRIM} /></mesh>
    </group>
  </group>;
}

const GHOST_SPARKLES: readonly [number, number, number][] = [
  [1.55, .62, .3], [-1.4, -.5, .55], [.35, 1.5, -.2],
  [-.9, 1.05, .4], [1.15, -1.2, -.15], [-1.6, .2, -.4],
];

function MoreAdventuresGhost({ offset, reducedMotion }: { offset: number; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const core = useRef<Group>(null);
  const glow = useRef<Group>(null);
  const sparkles = useRef<Group>(null);
  const { viewport } = useThree();
  const radiusScale = Math.min(.9, viewport.width / 8.5);
  const spacing = Math.min(7.2, viewport.width * .86);
  const scale = radiusScale * .55;
  const [initialPosition] = useState<[number, number, number]>(() => [offset * spacing, -.25, -1.6]);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const blend = reducedMotion ? 1 : 1 - Math.exp(-14 * Math.min(delta, .05));
    group.current.position.x = MathUtils.lerp(group.current.position.x, offset * spacing, blend);
    if (reducedMotion) return;
    const t = clock.getElapsedTime();
    const breathe = 1 + Math.sin(t * .8) * .04;
    if (glow.current) glow.current.scale.setScalar(breathe);
    if (core.current) core.current.rotation.y += delta * .05;
    if (sparkles.current) {
      sparkles.current.rotation.y += delta * .06;
      sparkles.current.children.forEach((child, i) => {
        child.position.y += Math.sin(t * 1.4 + i) * .0025;
      });
    }
  });
  return <group ref={group} position={initialPosition} scale={scale}>
    <group ref={glow}>
      <mesh><sphereGeometry args={[1.55, 24, 24]} /><meshBasicMaterial color="#b9d3f2" transparent opacity={.12} depthWrite={false} /></mesh>
    </group>
    <group ref={core}>
      <mesh><sphereGeometry args={[1, 32, 32]} /><meshStandardMaterial color="#dbe6f7" emissive="#8fa9d6" emissiveIntensity={.35} transparent opacity={.55} roughness={.6} /></mesh>
      <mesh rotation={[Math.PI / 2.4, .3, 0]}><torusGeometry args={[1.28, .02, 8, 48]} /><meshBasicMaterial color="#f4c95d" transparent opacity={.35} /></mesh>
    </group>
    <group ref={sparkles}>
      {GHOST_SPARKLES.map((position, i) => <mesh key={i} position={position}>
        <sphereGeometry args={[.045, 6, 6]} /><meshBasicMaterial color="#fff7e7" transparent opacity={.75} />
      </mesh>)}
    </group>
    {Math.abs(offset) <= 1.5 ? <Html center position={[0, 1.85, 0]} style={{ pointerEvents: "none" }} zIndexRange={[5, 0]}>
      <div className={styles.ghostHint}>✨ More worlds ahead</div>
    </Html> : null}
  </group>;
}

export function PlanetCarousel({ selectedWorld, reducedMotion, onSelect, onChoose }: {
  selectedWorld: SubjectWorldId; reducedMotion: boolean;
  onSelect: (world: SubjectWorldId) => void; onChoose: (world: SubjectWorldId) => void;
}) {
  const index = PLANET_ORDER.indexOf(selectedWorld);
  return <>
    <FloatingAstronaut offset={-1 - index} reducedMotion={reducedMotion} />
    {PLANET_ORDER.map((world, position) => <Planet key={world} world={world} offset={position - index} reducedMotion={reducedMotion} onSelect={onSelect} onChoose={onChoose} />)}
    <MoreAdventuresGhost offset={PLANET_ORDER.length - index} reducedMotion={reducedMotion} />
  </>;
}
