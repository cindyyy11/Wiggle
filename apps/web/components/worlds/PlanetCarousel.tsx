"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, MathUtils } from "three";
import { Numeria } from "../universe/Numeria";
import { Landmarks } from "../universe/Landmarks";
import { SUBJECT_WORLDS, SUBJECT_WORLD_ORDER, type SubjectWorldId } from "./subjectRoute";

export const PLANET_ORDER: readonly SubjectWorldId[] = SUBJECT_WORLD_ORDER;
const noop = () => undefined;
const SELECTED_SPIN_SPEED = 0.12;
const SIDE_SPIN_SPEED = 0.075;
const MAX_FRAME_DELTA = 0.05;

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
    {mystery ? <group position={[0, 0, 0.72]} scale={offset === 0 ? 1.35 : 1}>
      <mesh><boxGeometry args={[1.05, .8, .2]} /><meshStandardMaterial color="#fff7e7" roughness={.8} /></mesh>
      <mesh position={[0, .48, 0]}><torusGeometry args={[.36, .1, 8, 24, Math.PI]} /><meshStandardMaterial color="#fff7e7" /></mesh>
      <mesh position={[0, 0, .12]}><sphereGeometry args={[.1, 10, 8]} /><meshBasicMaterial color="#27395b" /></mesh>
    </group> : null}
  </group>;
}

export function PlanetCarousel({ selectedWorld, reducedMotion, onSelect, onChoose }: {
  selectedWorld: SubjectWorldId; reducedMotion: boolean;
  onSelect: (world: SubjectWorldId) => void; onChoose: (world: SubjectWorldId) => void;
}) {
  const index = PLANET_ORDER.indexOf(selectedWorld);
  return <>{PLANET_ORDER.map((world, position) => <Planet key={world} world={world} offset={position - index} reducedMotion={reducedMotion} onSelect={onSelect} onChoose={onChoose} />)}</>;
}
