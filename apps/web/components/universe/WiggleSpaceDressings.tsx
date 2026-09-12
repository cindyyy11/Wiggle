"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { SPACE_PALETTE } from "./spacePalette";

export function decorationCounts(quality: "high" | "low") {
  return quality === "high" ? { clouds: 8, beacons: 5, rocks: 14 } : { clouds: 4, beacons: 3, rocks: 7 };
}

export function WiggleSpaceDressings({ quality, reducedMotion }: { quality: "high" | "low"; reducedMotion: boolean }) {
  const orbit = useRef<Group>(null);
  const counts = decorationCounts(quality);
  const clouds = useMemo(() => Array.from({ length: counts.clouds }, (_, index) => ({
    position: [Math.sin(index * 2.37) * 2.25, 1.25 + Math.cos(index * 1.41) * 1.65, Math.cos(index * 2.37) * 2.25] as [number, number, number],
    scale: .11 + (index % 3) * .035,
  })), [counts.clouds]);
  const rocks = useMemo(() => Array.from({ length: counts.rocks }, (_, index) => ({
    position: [Math.sin(index * 2.4) * (4.35 + (index % 3) * .22), Math.cos(index * 1.3) * 2.5, Math.cos(index * 2.4) * (4.15 + (index % 2) * .2)] as [number, number, number],
    scale: .06 + (index % 3) * .018,
    color: index % 3 === 0 ? SPACE_PALETTE.mustard : index % 3 === 1 ? SPACE_PALETTE.paleBlue : SPACE_PALETTE.coral,
  })), [counts.rocks]);
  useFrame((_, delta) => { if (orbit.current && !reducedMotion) orbit.current.rotation.y += Math.min(delta, .05) * .012; });

  return <group ref={orbit} name="Wiggle space dressings">
    <mesh scale={1.03} renderOrder={-1}><sphereGeometry args={[3.08, quality === "high" ? 32 : 20, quality === "high" ? 20 : 14]} /><meshBasicMaterial color={SPACE_PALETTE.paleBlue} transparent opacity={.13} depthWrite={false} /></mesh>
    <mesh rotation={[Math.PI / 2.8, .25, -.18]} position={[0, -.02, 0]} renderOrder={-1}><torusGeometry args={[3.62, .018, 5, 96]} /><meshBasicMaterial color={SPACE_PALETTE.mustard} transparent opacity={.28} /></mesh>
    {clouds.map((cloud, index) => <group key={`cloud-${index}`} position={cloud.position} scale={cloud.scale}><mesh><sphereGeometry args={[.85, 10, 7]} /><meshStandardMaterial color={index % 2 ? SPACE_PALETTE.cream : SPACE_PALETTE.paleBlue} transparent opacity={.7} roughness={1} /></mesh><mesh position={[.3, .04, .1]} scale={.72}><sphereGeometry args={[.65, 9, 7]} /><meshStandardMaterial color={SPACE_PALETTE.cream} transparent opacity={.64} roughness={1} /></mesh></group>)}
    {Array.from({ length: counts.beacons }, (_, index) => { const angle = index * 1.256; return <group key={`beacon-${index}`} position={[Math.sin(angle) * 3.72, .35 + Math.cos(angle * 1.7) * 1.1, Math.cos(angle) * 3.72]}><mesh><sphereGeometry args={[.075, 8, 6]} /><meshStandardMaterial color={index % 2 ? SPACE_PALETTE.coral : SPACE_PALETTE.mustard} emissive={index % 2 ? SPACE_PALETTE.coral : SPACE_PALETTE.mustard} emissiveIntensity={.18} /></mesh><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.14, .012, 4, 20]} /><meshBasicMaterial color={SPACE_PALETTE.cream} transparent opacity={.6} /></mesh></group>; })}
    {rocks.map((rock, index) => <mesh key={`rock-${index}`} position={rock.position} scale={rock.scale} rotation={[index * .6, index * .8, index * .3]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={rock.color} roughness={1} flatShading /></mesh>)}
    <mesh position={[0, -3.12, -1.1]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.38, .055, 6, 20]} /><meshStandardMaterial color={SPACE_PALETTE.sage} roughness={1} /></mesh>
    <mesh position={[0, -3.12, -1.1]}><sphereGeometry args={[.19, 10, 7]} /><meshStandardMaterial color={SPACE_PALETTE.paleBlue} roughness={.9} /></mesh>
  </group>;
}
