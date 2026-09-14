"use client";
import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";
import { surfacePoint, RADIUS } from "../universe/world";
import { BM_LANDS } from "./bmLands";

const UP = new Vector3(0, 1, 0);
const BATIK_BANDS = ["#d81159", "#f2a71b", "#0f9b8e", "#5b2a86"];

function placement(latitude: number, longitude: number) {
  const normal = new Vector3(...surfacePoint({ latitude, longitude }, 1));
  return { position: normal.clone().multiplyScalar(RADIUS + .03), quaternion: new Quaternion().setFromUnitVectors(UP, normal) };
}

function Hibiscus({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .14, 0]}><cylinderGeometry args={[.02, .03, .28, 5]} /><meshStandardMaterial color="#3f8f4f" /></mesh>
    <group position={[0, .3, 0]}>
      {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[Math.sin(i / 5 * Math.PI * 2) * .1, 0, Math.cos(i / 5 * Math.PI * 2) * .1]} rotation={[0, -i / 5 * Math.PI * 2, 0]} scale={[1, .55, 1]}>
        <sphereGeometry args={[.11, 8, 6]} /><meshStandardMaterial color={color} flatShading />
      </mesh>)}
      <mesh position={[0, .04, 0]}><cylinderGeometry args={[.012, .012, .16, 5]} /><meshStandardMaterial color="#f2a71b" emissive="#f2a71b" emissiveIntensity={.2} /></mesh>
    </group>
  </group>;
}

function PalmTree() {
  return <group>
    <mesh position={[0, .32, 0]} rotation={[0, 0, .06]}><cylinderGeometry args={[.045, .07, .64, 6]} /><meshStandardMaterial color="#8a6a3d" /></mesh>
    {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, .64, 0]} rotation={[.5, i / 6 * Math.PI * 2, 0]}>
      <coneGeometry args={[.07, .5, 4]} /><meshStandardMaterial color="#1f9d55" flatShading />
    </mesh>)}
  </group>;
}

function WauBulan({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .34, 0]}><cylinderGeometry args={[.015, .015, .68, 5]} /><meshStandardMaterial color="#a2785d" /></mesh>
    <mesh position={[0, .58, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]} scale={[1, 1, .05]}>
      <octahedronGeometry args={[.22, 0]} /><meshStandardMaterial color={color} flatShading />
    </mesh>
    <mesh position={[0, .58, .02]} rotation={[0, 0, Math.PI / 4]}><torusGeometry args={[.09, .025, 6, 12, Math.PI]} /><meshStandardMaterial color="#f2a71b" /></mesh>
  </group>;
}

function BatikTotem() {
  return <group>{BATIK_BANDS.map((color, i) => <mesh key={color} position={[0, .1 + i * .15, 0]}>
    <cylinderGeometry args={[.14 - i * .012, .14 - i * .012, .15, 8]} /><meshStandardMaterial color={color} flatShading />
  </mesh>)}</group>;
}

export function BmLandScenery({ quality = "high" }: { quality?: "high" | "low" }) {
  const decorations = useMemo(() => {
    const count = quality === "high" ? 5 : 3;
    return BM_LANDS.flatMap((land, region) => Array.from({ length: count }, (_, i) => {
      const angle = i * 2.4 + region;
      const distance = .1 + Math.sqrt((i + .5) / count) * .3;
      return {
        latitude: land.destination.latitude + Math.sin(angle) * distance,
        longitude: land.destination.longitude + Math.cos(angle) * distance,
        color: land.color,
        content: (region * count + i) % 4,
      };
    }));
  }, [quality]);
  return <group>{decorations.map((item, index) => {
    const { position, quaternion } = placement(item.latitude, item.longitude);
    return <group key={index} position={position} quaternion={quaternion} scale={.85 + (index % 3) * .1}>
      {item.content === 0 ? <Hibiscus color={item.color} /> : item.content === 1 ? <PalmTree /> : item.content === 2 ? <WauBulan color={item.color} /> : <BatikTotem />}
    </group>;
  })}</group>;
}
