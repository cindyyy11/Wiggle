"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Sparkles } from "lucide-react";
import { Group, MathUtils } from "three";
import { Numeria } from "../universe/Numeria";
import { Landmarks } from "../universe/Landmarks";
import { FloatingAstronaut } from "./FloatingAstronaut";
import { SUBJECT_WORLDS, SUBJECT_WORLD_ORDER, type SubjectWorldId } from "./subjectRoute";
import styles from "./SubjectWorlds.module.css";

export const PLANET_ORDER: readonly SubjectWorldId[] = SUBJECT_WORLD_ORDER;
const noop = () => undefined;
const SELECTED_SPIN_SPEED = 0.12;
const SIDE_SPIN_SPEED = 0.075;
const MAX_FRAME_DELTA = 0.05;
export const LOCK_BADGE_SURFACE_Z = 3.82;
export const LOCK_BADGE_CENTER_Y = -0.18;
export const WORLDS_CAMERA_Z = 9.4;

// The badge floats in front of the planet, so on a side planet it must slide toward the camera's axis to stay over the planet's centre.
export function lockBadgeLocalX(planetX: number): number {
  return -planetX * LOCK_BADGE_SURFACE_Z / WORLDS_CAMERA_Z;
}

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
  const lock = useRef<Group>(null);
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
    if (lock.current) lock.current.position.x = lockBadgeLocalX(group.current.position.x);
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
    {mystery ? <group ref={lock} position={[lockBadgeLocalX(initialPosition[0]), LOCK_BADGE_CENTER_Y, LOCK_BADGE_SURFACE_Z]} scale={offset === 0 ? 1.05 : .82}>
      <mesh><boxGeometry args={[1.05, .8, .2]} /><meshStandardMaterial color="#fff7e7" roughness={.8} /></mesh>
      <mesh position={[0, .48, 0]}><torusGeometry args={[.36, .1, 8, 24, Math.PI]} /><meshStandardMaterial color="#fff7e7" /></mesh>
      <mesh position={[0, 0, .12]}><sphereGeometry args={[.1, 10, 8]} /><meshBasicMaterial color="#27395b" /></mesh>
    </group> : null}
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
      <div className={styles.ghostHint}><Sparkles aria-hidden="true" size={15} /> More worlds ahead</div>
    </Html> : null}
  </group>;
}

export function PlanetCarousel({ selectedWorld, reducedMotion, onSelect, onChoose }: {
  selectedWorld: SubjectWorldId; reducedMotion: boolean;
  onSelect: (world: SubjectWorldId) => void; onChoose: (world: SubjectWorldId) => void;
}) {
  const index = PLANET_ORDER.indexOf(selectedWorld);
  return <>
    <FloatingAstronaut index={index} reducedMotion={reducedMotion} />
    {PLANET_ORDER.map((world, position) => <Planet key={world} world={world} offset={position - index} reducedMotion={reducedMotion} onSelect={onSelect} onChoose={onChoose} />)}
    <MoreAdventuresGhost offset={PLANET_ORDER.length - index} reducedMotion={reducedMotion} />
  </>;
}
