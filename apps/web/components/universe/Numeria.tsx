"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, InstancedMesh, Object3D, Quaternion, Vector3, Float32BufferAttribute } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { LANDMARKS, RADIUS, surfacePoint, destinationFromPoint, type Destination } from "./world";
import { ScienceLandScenery } from "../science/ScienceLandScenery";
import { SCIENCE_LANDS } from "../science/scienceLands";
import { EnglishLandScenery } from "../worlds/EnglishLandScenery";
import { ENGLISH_LANDS } from "../worlds/englishLands";
import { BmLandScenery } from "../worlds/BmLandScenery";
import { BM_LANDS } from "../worlds/bmLands";
import { fibonacciSphereRegions } from "../worlds/planetScatter";

const UP = new Vector3(0, 1, 0);
const REGION_COLORS = ["#9dc99a", "#f4c95d", "#a9d9ee", "#ef8b78"];
export type NumeriaTheme = "math" | "science" | "bm" | "english";
const THEMED_LANDS: Record<Exclude<NumeriaTheme, "math">, readonly { color: string; destination: Destination }[]> = {
  science: SCIENCE_LANDS,
  english: ENGLISH_LANDS,
  bm: BM_LANDS,
};

function createTerrain(detail: number, theme: NumeriaTheme) {
  const geometry = new IcosahedronGeometry(RADIUS, detail);
  const points = geometry.getAttribute("position");
  const colors = new Float32Array(points.count * 3);
  const normal = new Vector3();
  const color = new Color();
  const lands = theme === "math" ? null : THEMED_LANDS[theme];
  const centers = (lands ?? LANDMARKS.slice(0, 4)).map(item => new Vector3(...surfacePoint(item.destination, 1)));
  for (let index = 0; index < points.count; index += 3) {
    normal.fromBufferAttribute(points, index).normalize();
    let nearest = 0; let maximum = -Infinity;
    centers.forEach((center, region) => { const alignment = normal.dot(center); if (alignment > maximum) { maximum = alignment; nearest = region; } });
    color.set(lands ? lands[nearest].color : maximum > .54 ? REGION_COLORS[nearest] : "#78ad91");
    color.multiplyScalar(.9 + Math.sin(index * 4.79) * .08);
    for (let vertex = index; vertex < index + 3; vertex++) {
      const x = points.getX(vertex); const y = points.getY(vertex); const z = points.getZ(vertex);
      const height = 1 + .009 * Math.sin(x * 4) * Math.cos(y * 3) * Math.sin(z * 4);
      points.setXYZ(vertex, x * height, y * height, z * height);
      color.toArray(colors, vertex * 3);
    }
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function Numeria({ quality, dimmed, onDestination, theme = "math", preview = false }: { quality: "high" | "low"; dimmed: boolean; onDestination: (destination: Destination) => void; theme?: NumeriaTheme; preview?: boolean }) {
  const geometry = useMemo(() => createTerrain(quality === "high" ? 4 : 3, theme), [quality, theme]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const move = (event: ThreeEvent<MouseEvent>) => {
    if (preview) return;
    if (event.delta > 7) return;
    event.stopPropagation();
    onDestination(destinationFromPoint(event.point.x, event.point.y, event.point.z));
  };
  return <group>
    <mesh geometry={geometry} onClick={move}>
      <meshStandardMaterial vertexColors flatShading roughness={1} color={dimmed ? "#bdd5c4" : "#fff7e7"} />
    </mesh>
    {theme === "science" ? <ScienceLandScenery quality={quality} />
      : theme === "english" ? <EnglishLandScenery quality={quality} />
      : theme === "bm" ? <BmLandScenery quality={quality} />
      : <><Forest count={quality === "high" ? 104 : 58} /><TerrainObjects dimmed={dimmed} /><ShapeSparkles quality={quality} /></>}
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -3.65, 0]} scale={[1, 1, 1]}>
      <torusGeometry args={[4.08, .009, 3, 96]} /><meshBasicMaterial color="#6fa8c2" transparent opacity={.22} />
    </mesh>
  </group>;
}

function Forest({ count }: { count: number }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  useEffect(() => {
    const object = new Object3D(); const normal = new Vector3();
    for (let index = 0; index < count; index++) {
      const angle = index * 2.39996; const distance = .13 + .58 * Math.sqrt((index + .5) / count);
      const destination = { latitude: .62 + Math.sin(angle) * distance, longitude: -.52 + Math.cos(angle) * distance };
      if (Math.hypot(destination.latitude - .62, destination.longitude + .52) < .16) continue;
      const size = .72 + (Math.sin(index * 11) + 1) * .32;
      normal.set(...surfacePoint(destination, 1));
      object.quaternion.setFromUnitVectors(UP, normal); object.scale.setScalar(size);
      object.position.copy(normal).multiplyScalar(RADIUS + .06); object.updateMatrix(); trunks.current?.setMatrixAt(index, object.matrix);
      object.position.copy(normal).multiplyScalar(RADIUS + .29 * size); object.updateMatrix(); crowns.current?.setMatrixAt(index, object.matrix);
      crowns.current?.setColorAt(index, new Color(index % 3 === 0 ? "#b8dcae" : index % 3 === 1 ? "#9dc99a" : "#cfe6bf"));
    }
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) { crowns.current.instanceMatrix.needsUpdate = true; if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true; }
  }, [count]);
  return <group><instancedMesh ref={trunks} args={[undefined, undefined, count]}><cylinderGeometry args={[.035, .05, .3, 5]} /><meshStandardMaterial color="#5e8b67" roughness={1} /></instancedMesh><instancedMesh ref={crowns} args={[undefined, undefined, count]}><sphereGeometry args={[.26, 8, 6]} /><meshStandardMaterial roughness={1} flatShading /></instancedMesh></group>;
}

const HILL_COLORS = ["#cceaf2", "#a9d9ee", "#d9c9f0"];

function TerrainObjects({ dimmed }: { dimmed: boolean }) {
  const hills = useMemo(() => Array.from({ length: 20 }, (_, index) => {
    const angle = index * 2.39996; const distance = .12 + Math.sqrt(index / 20) * .4;
    const normal = new Vector3(...surfacePoint({ latitude: .71 + Math.sin(angle) * distance, longitude: .72 + Math.cos(angle) * distance }, 1));
    return { position: normal.clone().multiplyScalar(RADIUS), quaternion: new Quaternion().setFromUnitVectors(UP, normal), height: .35 + ((index * 7) % 5) * .11 };
  }), []);
  const berries = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const angle = index * 2.4; const distance = .16 + Math.sqrt(index / 28) * .34;
    const normal = new Vector3(...surfacePoint({ latitude: -.25 + Math.sin(angle) * distance, longitude: -.73 + Math.cos(angle) * distance }, 1));
    return { position: normal.clone().multiplyScalar(RADIUS + .04), quaternion: new Quaternion().setFromUnitVectors(UP, normal), scale: .8 + (index % 4) * .25 };
  }), []);
  return <group>
    {/* Soft, rounded candy hills — no sharp peaks. */}
    {hills.map((hill, index) => <group key={index} position={hill.position} quaternion={hill.quaternion}>
      <mesh position={[0, hill.height * .32, 0]} scale={[1, .82, 1]}><sphereGeometry args={[hill.height * .55, 10, 8]} /><meshStandardMaterial color={HILL_COLORS[index % HILL_COLORS.length]} roughness={1} flatShading /></mesh>
      <mesh position={[0, hill.height * .58, 0]} scale={[.5, .42, .5]}><sphereGeometry args={[hill.height * .55, 8, 6]} /><meshStandardMaterial color="#fff7e7" flatShading /></mesh>
    </group>)}
    {/* Round gem berries — plump and glossy instead of pointy crystals. */}
    {berries.map((berry, index) => <group key={index} position={berry.position} quaternion={berry.quaternion} scale={berry.scale}>
      <mesh position={[0, .13, 0]}><sphereGeometry args={[.15, 10, 8]} /><meshStandardMaterial color={index % 3 === 0 ? "#ef8b78" : "#f4c95d"} emissive="#ef8b78" emissiveIntensity={dimmed ? .02 : .1} roughness={.5} flatShading /></mesh>
      <mesh position={[-.04, .18, .09]}><sphereGeometry args={[.04, 6, 6]} /><meshStandardMaterial color="#fff7e7" transparent opacity={.8} /></mesh>
    </group>)}
    <NumberGarden />
  </group>;
}

function NumberGarden() {
  return <group>{Array.from({ length: 24 }, (_, index) => {
    const angle = index * 2.4; const distance = .16 + Math.sqrt(index / 24) * .32;
    const normal = new Vector3(...surfacePoint({ latitude: -.16 + Math.sin(angle) * distance, longitude: .43 + Math.cos(angle) * distance }, 1));
    return <group key={index} position={normal.clone().multiplyScalar(RADIUS + .07)} quaternion={new Quaternion().setFromUnitVectors(UP, normal)}><mesh position={[0, .035 * (1 + index % 3), 0]} rotation={[0, angle, 0]}><boxGeometry args={[.2, .12 * (1 + index % 3), .2]} /><meshStandardMaterial color={index % 3 === 0 ? "#f4c95d" : "#e8ad67"} flatShading roughness={1} /></mesh></group>;
  })}</group>;
}

function Bubble({ color }: { color: string }) {
  return <mesh><sphereGeometry args={[.12, 10, 8]} /><meshStandardMaterial color={color} flatShading emissive={color} emissiveIntensity={.15} /></mesh>;
}

function Bloom({ color }: { color: string }) {
  return <group>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[Math.sin(i / 5 * Math.PI * 2) * .09, 0, Math.cos(i / 5 * Math.PI * 2) * .09]} scale={[1, .55, 1]}>
      <sphereGeometry args={[.08, 8, 6]} /><meshStandardMaterial color={color} flatShading />
    </mesh>)}
    <mesh><sphereGeometry args={[.05, 8, 6]} /><meshStandardMaterial color="#fff7e7" flatShading /></mesh>
  </group>;
}

/** A scattered layer of small, fully-rounded confetti (bubbles and blooms — no sharp points) across the whole globe, matching the density added to the BM and English planets. */
function ShapeSparkles({ quality }: { quality: "high" | "low" }) {
  const sparkles = useMemo(() => fibonacciSphereRegions(quality === "high" ? 46 : 28, LANDMARKS.slice(0, 4)), [quality]);
  return <group>{sparkles.map(item => {
    const normal = new Vector3(...surfacePoint(item.destination, 1));
    const quaternion = new Quaternion().setFromUnitVectors(UP, normal);
    const scale = .5 + (item.index % 4) * .14;
    return <group key={item.index} position={normal.clone().multiplyScalar(RADIUS + .02)} quaternion={quaternion} rotation={[0, 0, item.index]} scale={scale}>
      {item.index % 2 === 0 ? <Bubble color={item.color} /> : <Bloom color={item.color} />}
    </group>;
  })}</group>;
}
