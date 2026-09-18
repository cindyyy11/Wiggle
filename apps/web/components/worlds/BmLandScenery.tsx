"use client";
import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";
import { surfacePoint, RADIUS } from "../universe/world";
import { BM_LANDS } from "./bmLands";
import { fibonacciSphereRegions } from "./planetScatter";

const UP = new Vector3(0, 1, 0);
const BATIK_BANDS = ["#9aa1ab", "#b3b9c2", "#7d8590", "#c7cdd4"];

function placement(latitude: number, longitude: number, radius = RADIUS + .03) {
  const normal = new Vector3(...surfacePoint({ latitude, longitude }, 1));
  return { position: normal.clone().multiplyScalar(radius), quaternion: new Quaternion().setFromUnitVectors(UP, normal) };
}

function Hibiscus({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .14, 0]}><cylinderGeometry args={[.02, .03, .28, 5]} /><meshStandardMaterial color="#8a8f97" /></mesh>
    <group position={[0, .3, 0]}>
      {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[Math.sin(i / 5 * Math.PI * 2) * .1, 0, Math.cos(i / 5 * Math.PI * 2) * .1]} rotation={[0, -i / 5 * Math.PI * 2, 0]} scale={[1, .55, 1]}>
        <sphereGeometry args={[.11, 8, 6]} /><meshStandardMaterial color={color} flatShading />
      </mesh>)}
      <mesh position={[0, .04, 0]}><cylinderGeometry args={[.012, .012, .16, 5]} /><meshStandardMaterial color="#b3b9c2" emissive="#b3b9c2" emissiveIntensity={.2} /></mesh>
    </group>
  </group>;
}

function PalmTree() {
  return <group>
    <mesh position={[0, .32, 0]} rotation={[0, 0, .06]}><cylinderGeometry args={[.045, .07, .64, 6]} /><meshStandardMaterial color="#8a8f97" /></mesh>
    {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, .64, 0]} rotation={[.5, i / 6 * Math.PI * 2, 0]}>
      <coneGeometry args={[.07, .5, 4]} /><meshStandardMaterial color="#9aa1ab" flatShading />
    </mesh>)}
  </group>;
}

function WauBulan({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .34, 0]}><cylinderGeometry args={[.015, .015, .68, 5]} /><meshStandardMaterial color="#8a8f97" /></mesh>
    <mesh position={[0, .58, 0]} rotation={[Math.PI / 2, 0, Math.PI / 4]} scale={[1, 1, .05]}>
      <octahedronGeometry args={[.22, 0]} /><meshStandardMaterial color={color} flatShading />
    </mesh>
    <mesh position={[0, .58, .02]} rotation={[0, 0, Math.PI / 4]}><torusGeometry args={[.09, .025, 6, 12, Math.PI]} /><meshStandardMaterial color="#b3b9c2" /></mesh>
  </group>;
}

function BatikTotem() {
  return <group>{BATIK_BANDS.map((color, i) => <mesh key={color} position={[0, .1 + i * .15, 0]}>
    <cylinderGeometry args={[.14 - i * .012, .14 - i * .012, .15, 8]} /><meshStandardMaterial color={color} flatShading />
  </mesh>)}</group>;
}

function Ketupat({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .18, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1.15, .7]}><octahedronGeometry args={[.16, 0]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[0, .34, 0]}><cylinderGeometry args={[.01, .01, .1, 4]} /><meshStandardMaterial color="#8a8f97" /></mesh>
  </group>;
}

function Pelita({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .07, 0]}><cylinderGeometry args={[.05, .1, .14, 8]} /><meshStandardMaterial color="#9aa1ab" flatShading /></mesh>
    <mesh position={[0, .155, 0]}><cylinderGeometry args={[.11, .09, .04, 8]} /><meshStandardMaterial color="#7d8590" /></mesh>
    <mesh position={[0, .23, 0]}><coneGeometry args={[.05, .12, 6]} /><meshStandardMaterial color="#c7cdd4" emissive={color} emissiveIntensity={.5} /></mesh>
  </group>;
}

const CLUSTER_PROPS = [Hibiscus, PalmTree, WauBulan, BatikTotem, Ketupat];

export function BmLandScenery({ quality = "high" }: { quality?: "high" | "low" }) {
  const clusters = useMemo(() => {
    const count = quality === "high" ? 9 : 6;
    return BM_LANDS.flatMap((land, region) => Array.from({ length: count }, (_, i) => {
      const angle = i * 2.4 + region;
      const distance = .1 + Math.sqrt((i + .5) / count) * .32;
      return {
        latitude: land.destination.latitude + Math.sin(angle) * distance,
        longitude: land.destination.longitude + Math.cos(angle) * distance,
        color: land.color,
        content: (region * count + i) % CLUSTER_PROPS.length,
      };
    }));
  }, [quality]);
  const lanterns = useMemo(() => fibonacciSphereRegions(quality === "high" ? 46 : 28, BM_LANDS), [quality]);
  return <group>
    {clusters.map((item, index) => {
      const { position, quaternion } = placement(item.latitude, item.longitude);
      const Prop = CLUSTER_PROPS[item.content];
      return <group key={index} position={position} quaternion={quaternion} scale={.85 + (index % 3) * .1}>
        <Prop color={item.color} />
      </group>;
    })}
    {lanterns.map(item => {
      const { position, quaternion } = placement(item.destination.latitude, item.destination.longitude, RADIUS + .015);
      return <group key={item.index} position={position} quaternion={quaternion} rotation={[0, 0, item.index]} scale={.6 + (item.index % 4) * .18}>
        <Pelita color={item.color} />
      </group>;
    })}
  </group>;
}
