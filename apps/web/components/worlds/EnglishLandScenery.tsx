"use client";
import { useMemo } from "react";
import { Quaternion, Vector3 } from "three";
import { surfacePoint, RADIUS } from "../universe/world";
import { ENGLISH_LANDS } from "./englishLands";
import { fibonacciSphereRegions } from "./planetScatter";

const UP = new Vector3(0, 1, 0);
const PAGE_COLORS = ["#fff7e7", "#ffe9d6"];
const BLOCK_COLORS = ["#ff6f61", "#4ea8de", "#ffd23f", "#b185db"];
const BUNTING_COLORS = ["#ff6f61", "#ffd23f", "#4ea8de", "#b185db", "#5cd6a9"];

function placement(latitude: number, longitude: number, radius = RADIUS + .03) {
  const normal = new Vector3(...surfacePoint({ latitude, longitude }, 1));
  return { position: normal.clone().multiplyScalar(radius), quaternion: new Quaternion().setFromUnitVectors(UP, normal) };
}

function OpenBook({ color }: { color: string }) {
  return <group>
    <mesh position={[-.16, .06, 0]} rotation={[0, 0, .32]}><boxGeometry args={[.32, .03, .42]} /><meshStandardMaterial color={PAGE_COLORS[0]} /></mesh>
    <mesh position={[.16, .06, 0]} rotation={[0, 0, -.32]}><boxGeometry args={[.32, .03, .42]} /><meshStandardMaterial color={PAGE_COLORS[1]} /></mesh>
    <mesh position={[0, .045, 0]}><boxGeometry args={[.04, .05, .42]} /><meshStandardMaterial color={color} flatShading /></mesh>
  </group>;
}

function PencilTotem({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .32, 0]}><cylinderGeometry args={[.09, .09, .6, 6]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[0, .68, 0]}><coneGeometry args={[.09, .16, 6]} /><meshStandardMaterial color="#f4d9a8" flatShading /></mesh>
    <mesh position={[0, .77, 0]}><coneGeometry args={[.035, .07, 6]} /><meshStandardMaterial color="#4a3428" flatShading /></mesh>
  </group>;
}

function AlphabetBlocks() {
  return <group>{BLOCK_COLORS.map((color, index) => <mesh key={color} position={[(index - 1.5) * .22, .1 + (index % 2) * .05, 0]} rotation={[0, index, 0]}>
    <boxGeometry args={[.19, .19, .19]} /><meshStandardMaterial color={color} flatShading />
  </mesh>)}</group>;
}

function Bunting() {
  return <group>
    <mesh position={[-.55, .32, 0]}><cylinderGeometry args={[.02, .02, .64, 5]} /><meshStandardMaterial color="#a2785d" /></mesh>
    <mesh position={[.55, .32, 0]}><cylinderGeometry args={[.02, .02, .64, 5]} /><meshStandardMaterial color="#a2785d" /></mesh>
    {BUNTING_COLORS.map((color, index) => <mesh key={color} position={[-.44 + index * .22, .48 - Math.abs(index - 2) * .025, 0]} rotation={[Math.PI, 0, 0]}>
      <coneGeometry args={[.08, .14, 3]} /><meshStandardMaterial color={color} flatShading />
    </mesh>)}
  </group>;
}

function QuillInkwell({ color }: { color: string }) {
  return <group>
    <mesh position={[0, .09, 0]}><cylinderGeometry args={[.11, .13, .18, 8]} /><meshStandardMaterial color="#2f3b52" flatShading /></mesh>
    <mesh position={[0, .19, 0]}><cylinderGeometry args={[.08, .09, .04, 8]} /><meshStandardMaterial color="#141d2e" /></mesh>
    <mesh position={[.05, .4, 0]} rotation={[0, 0, .55]}><coneGeometry args={[.03, .5, 5]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[.16, .6, 0]} rotation={[0, 0, .55]}><coneGeometry args={[.025, .1, 4]} /><meshStandardMaterial color="#f4d9a8" flatShading /></mesh>
  </group>;
}

function GoldStar({ color }: { color: string }) {
  return <group scale={.5}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><octahedronGeometry args={[.22, 0]} /><meshStandardMaterial color={color} flatShading emissive={color} emissiveIntensity={.25} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}><octahedronGeometry args={[.16, 0]} /><meshStandardMaterial color="#fff7e7" flatShading /></mesh>
  </group>;
}

const CLUSTER_PROPS = [OpenBook, PencilTotem, AlphabetBlocks, Bunting, QuillInkwell];

export function EnglishLandScenery({ quality = "high" }: { quality?: "high" | "low" }) {
  const clusters = useMemo(() => {
    const count = quality === "high" ? 9 : 6;
    return ENGLISH_LANDS.flatMap((land, region) => Array.from({ length: count }, (_, i) => {
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
  const sparkles = useMemo(() => fibonacciSphereRegions(quality === "high" ? 46 : 28, ENGLISH_LANDS), [quality]);
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
      return <group key={item.index} position={position} quaternion={quaternion} rotation={[0, 0, item.index]} scale={.6 + (item.index % 4) * .18}>
        <GoldStar color={item.color} />
      </group>;
    })}
  </group>;
}
