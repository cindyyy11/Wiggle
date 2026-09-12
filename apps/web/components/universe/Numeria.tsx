"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, InstancedMesh, Object3D, Quaternion, Vector3, Float32BufferAttribute } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { LANDMARKS, RADIUS, surfacePoint, destinationFromPoint, type Destination } from "./world";
import { ScienceLandScenery } from "../science/ScienceLandScenery";
import { SCIENCE_LANDS } from "../science/scienceLands";

const UP = new Vector3(0, 1, 0);
const REGION_COLORS = ["#9dc99a", "#f4c95d", "#a9d9ee", "#ef8b78"];

function createTerrain(detail: number, science = false) {
  const geometry = new IcosahedronGeometry(RADIUS, detail);
  const points = geometry.getAttribute("position");
  const colors = new Float32Array(points.count * 3);
  const normal = new Vector3();
  const color = new Color();
  const centers = (science ? SCIENCE_LANDS : LANDMARKS.slice(0, 4)).map(item => new Vector3(...surfacePoint(item.destination, 1)));
  for (let index = 0; index < points.count; index += 3) {
    normal.fromBufferAttribute(points, index).normalize();
    let nearest = 0; let maximum = -Infinity;
    centers.forEach((center, region) => { const alignment = normal.dot(center); if (alignment > maximum) { maximum = alignment; nearest = region; } });
    color.set(science ? SCIENCE_LANDS[nearest].color : maximum > .54 ? REGION_COLORS[nearest] : "#78ad91");
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

export function Numeria({ quality, dimmed, onDestination, theme = "math", preview = false }: { quality: "high" | "low"; dimmed: boolean; onDestination: (destination: Destination) => void; theme?: "math" | "science"; preview?: boolean }) {
  const geometry = useMemo(() => createTerrain(quality === "high" ? 4 : 3, theme === "science"), [quality, theme]);
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
    {theme === "science" ? <ScienceLandScenery quality={quality} /> : <><Forest count={quality === "high" ? 68 : 36} /><TerrainObjects dimmed={dimmed} /></>}
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
  return <group><instancedMesh ref={trunks} args={[undefined, undefined, count]}><cylinderGeometry args={[.035, .05, .3, 5]} /><meshStandardMaterial color="#5e8b67" roughness={1} /></instancedMesh><instancedMesh ref={crowns} args={[undefined, undefined, count]}><coneGeometry args={[.18, .52, 5]} /><meshStandardMaterial roughness={1} flatShading /></instancedMesh></group>;
}

function TerrainObjects({ dimmed }: { dimmed: boolean }) {
  const peaks = useMemo(() => Array.from({ length: 13 }, (_, index) => {
    const angle = index * 2.39996; const distance = .12 + Math.sqrt(index / 13) * .4;
    const normal = new Vector3(...surfacePoint({ latitude: .71 + Math.sin(angle) * distance, longitude: .72 + Math.cos(angle) * distance }, 1));
    return { position: normal.clone().multiplyScalar(RADIUS), quaternion: new Quaternion().setFromUnitVectors(UP, normal), height: .35 + ((index * 7) % 5) * .11 };
  }), []);
  const crystals = useMemo(() => Array.from({ length: 19 }, (_, index) => {
    const angle = index * 2.4; const distance = .16 + Math.sqrt(index / 19) * .34;
    const normal = new Vector3(...surfacePoint({ latitude: -.25 + Math.sin(angle) * distance, longitude: -.73 + Math.cos(angle) * distance }, 1));
    return { position: normal.clone().multiplyScalar(RADIUS + .04), quaternion: new Quaternion().setFromUnitVectors(UP, normal), scale: .8 + (index % 4) * .25 };
  }), []);
  return <group>
    {peaks.map((peak, index) => <group key={index} position={peak.position} quaternion={peak.quaternion}><mesh position={[0, peak.height * .35, 0]}><coneGeometry args={[.24, peak.height, index % 2 ? 4 : 5]} /><meshStandardMaterial color={index % 2 ? "#cceaf2" : "#a9d9ee"} roughness={1} flatShading /></mesh><mesh position={[0, peak.height * .66, 0]}><coneGeometry args={[.11, peak.height * .4, index % 2 ? 4 : 5]} /><meshStandardMaterial color="#fff7e7" flatShading /></mesh></group>)}
    {crystals.map((crystal, index) => <group key={index} position={crystal.position} quaternion={crystal.quaternion} scale={crystal.scale}><mesh position={[0, .13, 0]} rotation={[.12, index, .15]}><octahedronGeometry args={[.18, 0]} /><meshStandardMaterial color={index % 3 === 0 ? "#ef8b78" : "#f4c95d"} emissive="#ef8b78" emissiveIntensity={dimmed ? .02 : .1} roughness={.68} flatShading /></mesh></group>)}
    <NumberGarden />
  </group>;
}

function NumberGarden() {
  return <group>{Array.from({ length: 16 }, (_, index) => {
    const angle = index * 2.4; const distance = .16 + Math.sqrt(index / 16) * .32;
    const normal = new Vector3(...surfacePoint({ latitude: -.16 + Math.sin(angle) * distance, longitude: .43 + Math.cos(angle) * distance }, 1));
    return <group key={index} position={normal.clone().multiplyScalar(RADIUS + .07)} quaternion={new Quaternion().setFromUnitVectors(UP, normal)}><mesh position={[0, .035 * (1 + index % 3), 0]} rotation={[0, angle, 0]}><boxGeometry args={[.2, .12 * (1 + index % 3), .2]} /><meshStandardMaterial color={index % 3 === 0 ? "#f4c95d" : "#e8ad67"} flatShading roughness={1} /></mesh></group>;
  })}</group>;
}
