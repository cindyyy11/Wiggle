"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Group, MeshStandardMaterial } from "three";
import { SCIENCE_ZONES } from "./scienceWorld";
import type { ScienceZoneId } from "../worlds/subjectRoute";

const copper = new MeshStandardMaterial({ color: "#c77c52", roughness: 1, flatShading: true });
const copperLight = new MeshStandardMaterial({ color: "#efad69", roughness: 1, flatShading: true });
const steel = new MeshStandardMaterial({ color: "#8798a2", roughness: .82, metalness: .25, flatShading: true });
const water = new MeshStandardMaterial({ color: "#66bdd3", roughness: .7, transparent: true, opacity: .82 });
const ice = new MeshStandardMaterial({ color: "#d9f5f4", roughness: 1, flatShading: true });
const cream = new MeshStandardMaterial({ color: "#fff3d9", roughness: 1, flatShading: true });
const labTable = new MeshStandardMaterial({ color: "#e9be8d", roughness: 1, flatShading: true });
const lilac = new MeshStandardMaterial({ color: "#b792d2", roughness: .8, transparent: true, opacity: .88 });
const mint = new MeshStandardMaterial({ color: "#8fc9a1", roughness: 1, flatShading: true });
const animal = new MeshStandardMaterial({ color: "#c9ad80", roughness: 1, flatShading: true });
const canyonRed = new MeshStandardMaterial({ color: "#df8b70", roughness: 1, flatShading: true });
const canyonGold = new MeshStandardMaterial({ color: "#efc35d", roughness: 1, flatShading: true });
const canyonBlue = new MeshStandardMaterial({ color: "#8bbad3", roughness: 1, flatShading: true });
const garden = new MeshStandardMaterial({ color: "#76ae75", roughness: 1, flatShading: true });
const seed = new MeshStandardMaterial({ color: "#d5a06f", roughness: 1, flatShading: true });

export type ScienceZoneLandmarksProps = {
  selectedZone: ScienceZoneId;
  onSelect: (zone: ScienceZoneId) => void;
  quality: "high" | "low";
  reducedMotion: boolean;
};

type SelectableZoneProps = {
  zone: ScienceZoneId;
  selected: boolean;
  onSelect: (zone: ScienceZoneId) => void;
  children: ReactNode;
};

type LandmarkSelectProps = { selected: boolean; onSelect: (zone: ScienceZoneId) => void };

function SelectableZone({ zone, selected, onSelect, children }: SelectableZoneProps) {
  const pressStart = useRef<[number, number] | null>(null);
  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    pressStart.current = [event.clientX, event.clientY];
  };
  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const start = pressStart.current;
    pressStart.current = null;
    if (!start || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 12) return;
    onSelect(zone);
  };
  return <group
    scale={selected ? 1.13 : 1}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerCancel={() => { pressStart.current = null; }}
  >
    {children}
    {selected ? <mesh position={[0, -.08, -.06]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.46, .026, 6, 18]} />
      <meshBasicMaterial color="#fff3c9" transparent opacity={.9} />
    </mesh> : null}
  </group>;
}

function MagnetLab({ selected, onSelect, reducedMotion }: LandmarkSelectProps & { reducedMotion: boolean }) {
  const magnet = useRef<Group>(null);
  useFrame((_, delta) => { if (!reducedMotion && magnet.current) magnet.current.rotation.z += Math.min(delta, .05) * .2; });
  return <SelectableZone zone="magnet-lab" selected={selected} onSelect={onSelect}>
    <mesh position={[0, -.1, 0]} scale={[1.1, .23, .65]} material={copper}><icosahedronGeometry args={[.45, 1]} /></mesh>
    <mesh position={[.06, .13, .04]} scale={[.78, .09, .42]} material={labTable}><boxGeometry args={[1, 1, 1]} /></mesh>
    <group ref={magnet} position={[-.03, .46, .12]} rotation={[0, 0, .15]}>
      <mesh material={copperLight}><torusGeometry args={[.28, .075, 7, 18, Math.PI * 1.52]} /></mesh>
      <mesh position={[-.22, -.16, 0]} material={copper}><cylinderGeometry args={[.09, .09, .14, 7]} /></mesh>
      <mesh position={[.22, -.16, 0]} material={steel}><cylinderGeometry args={[.09, .09, .14, 7]} /></mesh>
    </group>
    {[[-.42, .23, .09], [.43, .24, .08], [.3, .42, .1]].map((position, index) => <mesh key={index} position={position as [number, number, number]} rotation={[0, 0, index * .7]} material={steel}>
      <torusGeometry args={[.07, .018, 5, 8]} />
    </mesh>)}
  </SelectableZone>;
}

function SinkFloatBay({ selected, onSelect }: LandmarkSelectProps) {
  return <SelectableZone zone="sink-float" selected={selected} onSelect={onSelect}>
    <mesh position={[0, -.06, 0]} scale={[1.05, .25, .72]} material={labTable}><cylinderGeometry args={[.55, .64, .32, 10]} /></mesh>
    <mesh position={[0, .12, 0]} scale={[1, .2, .65]} material={water}><cylinderGeometry args={[.51, .51, .08, 16]} /></mesh>
    <mesh position={[-.25, .27, .04]} rotation={[.2, .35, 0]} material={ice}><coneGeometry args={[.16, .28, 5]} /></mesh>
    <mesh position={[.22, .23, .1]} material={ice}><icosahedronGeometry args={[.17, 0]} /></mesh>
    <mesh position={[.03, .26, .2]} scale={[.11, .07, .11]} material={canyonGold}><sphereGeometry args={[1, 8, 6]} /></mesh>
  </SelectableZone>;
}

function PhLab({ selected, onSelect }: LandmarkSelectProps) {
  return <SelectableZone zone="ph-lab" selected={selected} onSelect={onSelect}>
    <mesh position={[0, -.08, 0]} scale={[1.08, .16, .56]} material={labTable}><boxGeometry args={[1, 1, 1]} /></mesh>
    {[[-.25, .15, .05], [.05, .18, .1], [.3, .14, .04]].map((position, index) => <group key={index} position={position as [number, number, number]}>
      <mesh material={index === 1 ? water : lilac}><sphereGeometry args={[.13, 8, 6]} /></mesh>
      <mesh position={[0, .14, 0]} material={cream}><cylinderGeometry args={[.038, .038, .16, 7]} /></mesh>
    </group>)}
    <mesh position={[.44, .14, .04]} rotation={[Math.PI / 2, 0, 0]} material={cream}><cylinderGeometry args={[.15, .15, .045, 12]} /></mesh>
    <mesh position={[.44, .14, .07]} material={lilac}><sphereGeometry args={[.055, 7, 5]} /></mesh>
  </SelectableZone>;
}

function AnimalArena({ selected, onSelect }: LandmarkSelectProps) {
  return <SelectableZone zone="animals" selected={selected} onSelect={onSelect}>
    <mesh position={[0, -.08, 0]} scale={[1.08, .22, .72]} material={mint}><cylinderGeometry args={[.55, .65, .28, 10]} /></mesh>
    {[[-.22, .16, .08], [.21, .14, .02]].map((position, index) => <group key={index} position={position as [number, number, number]} scale={index ? .8 : 1}>
      <mesh material={animal}><sphereGeometry args={[.16, 8, 6]} /></mesh>
      <mesh position={[.13, .08, .03]} material={animal}><sphereGeometry args={[.1, 8, 6]} /></mesh>
      <mesh position={[.09, .18, .03]} material={animal}><sphereGeometry args={[.045, 6, 5]} /></mesh>
      <mesh position={[.18, .18, .03]} material={animal}><sphereGeometry args={[.045, 6, 5]} /></mesh>
    </group>)}
    <mesh position={[0, .19, -.14]} scale={[.12, .25, .12]} material={garden}><coneGeometry args={[.3, 1, 5]} /></mesh>
  </SelectableZone>;
}

function ColorsCanyon({ selected, onSelect }: LandmarkSelectProps) {
  return <SelectableZone zone="colors" selected={selected} onSelect={onSelect}>
    <mesh position={[0, -.08, 0]} scale={[1.05, .18, .6]} material={copper}><boxGeometry args={[1, 1, 1]} /></mesh>
    {[[-.31, .18, .04, canyonRed], [0, .28, .07, canyonGold], [.31, .18, .03, canyonBlue]].map(([x, y, z, material], index) => <mesh key={index} position={[x as number, y as number, z as number]} scale={index === 1 ? .27 : .22} material={material as MeshStandardMaterial}>
      <icosahedronGeometry args={[1, 1]} />
    </mesh>)}
    {[[-.26, .13, .27, canyonRed], [0, .13, .28, canyonGold], [.26, .13, .27, canyonBlue]].map(([x, y, z, material], index) => <mesh key={index} position={[x as number, y as number, z as number]} rotation={[Math.PI / 2, 0, 0]} material={material as MeshStandardMaterial}>
      <cylinderGeometry args={[.08, .08, .045, 10]} />
    </mesh>)}
  </SelectableZone>;
}

function LifeCycleGarden({ selected, onSelect }: LandmarkSelectProps) {
  return <SelectableZone zone="life-cycle" selected={selected} onSelect={onSelect}>
    <mesh position={[0, -.08, 0]} scale={[1.03, .18, .62]} material={garden}><cylinderGeometry args={[.55, .64, .25, 10]} /></mesh>
    <mesh position={[-.31, .15, .08]} scale={[.12, .17, .12]} material={cream}><sphereGeometry args={[1, 8, 6]} /></mesh>
    <mesh position={[0, .18, .08]} scale={[.13, .22, .1]} material={seed}><sphereGeometry args={[1, 8, 6]} /></mesh>
    <mesh position={[.27, .26, .05]} material={garden}><cylinderGeometry args={[.04, .055, .42, 7]} /></mesh>
    <mesh position={[.16, .37, .06]} rotation={[0, 0, -.7]} scale={[.18, .055, .09]} material={garden}><sphereGeometry args={[1, 7, 5]} /></mesh>
    <mesh position={[.38, .43, .06]} rotation={[0, 0, .7]} scale={[.18, .055, .09]} material={garden}><sphereGeometry args={[1, 7, 5]} /></mesh>
  </SelectableZone>;
}

export function ScienceZoneLandmarks({ selectedZone, onSelect, quality, reducedMotion }: ScienceZoneLandmarksProps) {
  const positions = useMemo(() => new Map(SCIENCE_ZONES.map((zone) => [zone.id, [zone.scenePosition[0] * 1.18, zone.scenePosition[1] * .78 + .16, zone.scenePosition[2] + .44] as [number, number, number]])), []);
  const shared = { selectedZone, onSelect, reducedMotion };
  return <group>
    <group position={positions.get("magnet-lab")!} scale={quality === "high" ? .93 : .88}><MagnetLab {...shared} selected={selectedZone === "magnet-lab"} /></group>
    <group position={positions.get("sink-float")!} scale={.9}><SinkFloatBay selected={selectedZone === "sink-float"} onSelect={onSelect} /></group>
    <group position={positions.get("ph-lab")!} scale={.88}><PhLab selected={selectedZone === "ph-lab"} onSelect={onSelect} /></group>
    <group position={positions.get("animals")!} scale={.92}><AnimalArena selected={selectedZone === "animals"} onSelect={onSelect} /></group>
    <group position={positions.get("colors")!} scale={.9}><ColorsCanyon selected={selectedZone === "colors"} onSelect={onSelect} /></group>
    <group position={positions.get("life-cycle")!} scale={.9}><LifeCycleGarden selected={selectedZone === "life-cycle"} onSelect={onSelect} /></group>
  </group>;
}
