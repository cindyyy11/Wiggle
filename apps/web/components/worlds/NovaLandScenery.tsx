"use client";
import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";
import { surfacePoint, RADIUS } from "../universe/world";
import { NOVA_LANDS } from "./novaLands";
import { fibonacciSphereRegions } from "./planetScatter";

const UP = new Vector3(0, 1, 0);

function placement(latitude: number, longitude: number, radius = RADIUS + .03) {
  const normal = new Vector3(...surfacePoint({ latitude, longitude }, 1));
  return { position: normal.clone().multiplyScalar(radius), quaternion: new Quaternion().setFromUnitVectors(UP, normal) };
}

function GlowOrb({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .3, 0]}><cylinderGeometry args={[.015, .02, .5, 5]} /><meshStandardMaterial color="#fff7e7" roughness={.6} /></mesh>
    <mesh position={[0, .58, 0]}><sphereGeometry args={[.14, 10, 8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.4} roughness={.4} /></mesh>
  </group>;
}

function CrystalSpire({ color }: { color: string }) {
  return <group>
    {[0, 1, 2].map(i => <mesh key={i} position={[(i - 1) * .07, .12 + i * .1, 0]} rotation={[0, i, .1]} scale={1 - i * .18}>
      <coneGeometry args={[.09, .32, 5]} /><meshStandardMaterial color={color} flatShading emissive={color} emissiveIntensity={.15} />
    </mesh>)}
  </group>;
}

function DriftRing({ color }: { color: string }) {
  return <mesh rotation={[Math.PI / 2, 0, 0]}>
    <torusGeometry args={[.16, .025, 6, 16]} /><meshStandardMaterial color={color} flatShading />
  </mesh>;
}

const CLUSTER_PROPS = [GlowOrb, CrystalSpire, DriftRing];

export function NovaLandScenery({ quality = "high" }: { quality?: "high" | "low" }) {
  const clusters = useMemo(() => {
    const count = quality === "high" ? 9 : 6;
    return NOVA_LANDS.flatMap((land, region) => Array.from({ length: count }, (_, i) => {
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
  const sparkles = useMemo(() => fibonacciSphereRegions(quality === "high" ? 46 : 28, NOVA_LANDS), [quality]);
  return <group>
    {clusters.map((item, index) => {
      const { position, quaternion } = placement(item.latitude, item.longitude);
      const Prop = CLUSTER_PROPS[item.content];
      return <group key={index} position={position} quaternion={quaternion} scale={.85 + (index % 3) * .1}>
        <Prop color={item.color} />
      </group>;
    })}
    {sparkles.map(item => {
      const { position, quaternion } = placement(item.destination.latitude, item.destination.longitude, RADIUS + .015);
      return <mesh key={item.index} position={position} quaternion={quaternion} scale={.4 + (item.index % 4) * .12}>
        <octahedronGeometry args={[.09, 0]} /><meshStandardMaterial color={item.color} flatShading emissive={item.color} emissiveIntensity={.3} />
      </mesh>;
    })}
  </group>;
}
