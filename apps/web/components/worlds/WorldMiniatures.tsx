"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Color, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import type { SubjectWorldId } from "./subjectRoute";
import { isOrbitPress, SUBJECT_ORBIT_LAYOUT, type OrbitDecorationCounts } from "./worldOrbit";

const numeriaGround = new MeshStandardMaterial({ color: "#d5e6a8", roughness: 1, flatShading: true, vertexColors: true });
const grassMatte = new MeshStandardMaterial({ color: "#8fc77d", roughness: 1, flatShading: true });
const treeTrunk = new MeshStandardMaterial({ color: "#7caa6d", roughness: 1, flatShading: true });
const treeCrown = new MeshStandardMaterial({ color: "#74aa7a", roughness: 1, flatShading: true });
const cloudMatte = new MeshStandardMaterial({ color: "#fff3db", roughness: 1, flatShading: true, transparent: true, opacity: .86 });
const crystalMatte = new MeshStandardMaterial({ color: "#f4c95d", roughness: 1, flatShading: true });
const stoneMatte = new MeshStandardMaterial({ color: "#ef8b78", roughness: 1, flatShading: true });
const orbitMatte = new MeshStandardMaterial({ color: "#f4c95d", roughness: 1, transparent: true, opacity: .72 });
const scienceClay = new MeshStandardMaterial({ color: "#9275bd", roughness: 1, flatShading: true });
const scienceGrass = new MeshStandardMaterial({ color: "#b792df", roughness: 1, flatShading: true });
const scienceSoil = new MeshStandardMaterial({ color: "#725998", roughness: 1, flatShading: true });
const creamMatte = new MeshStandardMaterial({ color: "#fff3d9", roughness: 1, flatShading: true });
const telescopeGlass = new MeshStandardMaterial({ color: "#8ed4e1", roughness: .8, transparent: true, opacity: .86 });
const magnetMatte = new MeshStandardMaterial({ color: "#ef8b78", roughness: 1, flatShading: true });
const scienceFragment = new MeshStandardMaterial({ color: "#f4c95d", roughness: 1, flatShading: true });
const englishMoon = new MeshStandardMaterial({ color: "#b9a9dc", roughness: 1, flatShading: true });
const bmMoon = new MeshStandardMaterial({ color: "#8fbda2", roughness: 1, flatShading: true });
const activeGlow = new MeshBasicMaterial({ color: "#fff3c9", transparent: true, opacity: .1 });
const lockKeyhole = new MeshBasicMaterial({ color: "#725998" });

export type WorldMiniaturesProps = {
  quality: "high" | "low";
  counts: OrbitDecorationCounts;
  activeWorld: SubjectWorldId | null;
  reducedMotion: boolean;
  onSelect: (world: SubjectWorldId) => void;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
};

function InteractiveMiniWorld({ world, active, position, scale, onSelect, onActiveWorldChange, children }: {
  world: SubjectWorldId;
  active: boolean;
  position: readonly [number, number, number];
  scale: number;
  onSelect: (world: SubjectWorldId) => void;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
  children: ReactNode;
}) {
  const pressStart = useRef<[number, number] | null>(null);
  return <group
    position={position}
    scale={scale * (active ? 1.06 : 1)}
    onPointerEnter={event => { event.stopPropagation(); onActiveWorldChange(world); }}
    onPointerLeave={() => onActiveWorldChange(null)}
    onPointerDown={event => { event.stopPropagation(); pressStart.current = [event.clientX, event.clientY]; }}
    onPointerUp={event => {
      event.stopPropagation();
      const start = pressStart.current;
      pressStart.current = null;
      if (start && isOrbitPress(start, [event.clientX, event.clientY])) onSelect(world);
    }}
    onPointerCancel={() => { pressStart.current = null; }}
  >
    {children}
    {active ? <mesh scale={1.18} material={activeGlow}><sphereGeometry args={[1, 12, 8]} /></mesh> : null}
  </group>;
}

function createNumeriaTerrain(detail: number) {
  const geometry = new IcosahedronGeometry(1, detail);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const color = new Color();
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const height = 1 + .028 * Math.sin(x * 6.7) * Math.cos(y * 5.2) + .016 * Math.sin(z * 8.1);
    positions.setXYZ(index, x * height, y * height, z * height);
    color.set(y > .3 ? "#cbe5a1" : y < -.38 ? "#6c9fc0" : index % 5 === 0 ? "#95c984" : "#a8d98d");
    color.multiplyScalar(.9 + (index % 4) * .03);
    color.toArray(colors, index * 3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function NumeriaTrees({ count }: { count: number }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  useEffect(() => {
    const item = new Object3D();
    for (let index = 0; index < count; index++) {
      const angle = index * 2.39996;
      const radius = .26 + (index % 6) * .075;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sqrt(Math.max(.1, 1 - x * x - z * z));
      const size = .07 + (index % 3) * .018;
      item.position.set(x, y + size * .35, z); item.scale.set(size, size * 2.5, size); item.rotation.set(0, -angle, 0); item.updateMatrix();
      trunks.current?.setMatrixAt(index, item.matrix);
      item.position.set(x, y + size * 1.65, z); item.scale.set(size * 2.6, size * 3.8, size * 2.6); item.updateMatrix();
      crowns.current?.setMatrixAt(index, item.matrix);
    }
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  return <group>
    <instancedMesh ref={trunks} args={[undefined, undefined, count]} material={treeTrunk}><cylinderGeometry args={[1, 1, 1, 5]} /></instancedMesh>
    <instancedMesh ref={crowns} args={[undefined, undefined, count]} material={treeCrown}><coneGeometry args={[1, 1, 5]} /></instancedMesh>
  </group>;
}

function NumeriaMiniature({ quality, treeCount }: { quality: "high" | "low"; treeCount: number }) {
  const terrain = useMemo(() => createNumeriaTerrain(quality === "high" ? 2 : 1), [quality]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  return <group rotation={[-.14, -.34, 0]}>
    <mesh geometry={terrain} material={numeriaGround} />
    <NumeriaTrees count={treeCount} />
    {[-.58, -.18, .25, .62].map((x, index) => <group key={x} position={[x, .82 - Math.abs(x) * .36, -.2 + index % 2 * .42]} rotation={[0, index * .7, .08]}>
      <mesh position={[0, .12, 0]} material={crystalMatte}><coneGeometry args={[.075, .28 + index * .035, 5]} /></mesh>
      <mesh position={[.1, .04, -.04]} material={stoneMatte}><dodecahedronGeometry args={[.09, 0]} /></mesh>
    </group>)}
    {[-.4, .12, .56].map((x, index) => <group key={x} position={[x, -.88 + index * .08, .45 - index * .16]} scale={.17 + index * .025}>
      <mesh material={cloudMatte}><sphereGeometry args={[1, 7, 5]} /></mesh><mesh position={[.56, .08, 0]} material={cloudMatte}><sphereGeometry args={[.65, 7, 5]} /></mesh>
    </group>)}
    <mesh rotation={[1.12, .14, .22]} material={orbitMatte}><torusGeometry args={[1.32, .025, 5, 48]} /></mesh>
  </group>;
}

function Observatory() {
  return <group position={[-.05, .65, .12]} rotation={[0, -.22, 0]}>
    <mesh material={creamMatte}><cylinderGeometry args={[.22, .27, .16, 8]} /></mesh>
    <mesh position={[0, .1, 0]} material={telescopeGlass}><sphereGeometry args={[.2, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    <mesh position={[0, .31, .18]} rotation={[Math.PI / 2, 0, 0]} material={creamMatte}><cylinderGeometry args={[.06, .06, .36, 7]} /></mesh>
  </group>;
}

function MagneticFragments({ count }: { count: number }) {
  const instances = useRef<InstancedMesh>(null);
  useEffect(() => {
    const item = new Object3D();
    for (let index = 0; index < count; index++) {
      item.position.set(.32 + Math.sin(index * 2.18) * .42, .42 + Math.cos(index * 1.41) * .22, .5 + index % 3 * .08);
      item.rotation.set(index * .62, index * .39, index * .27); item.scale.setScalar(.035 + index % 3 * .018); item.updateMatrix();
      instances.current?.setMatrixAt(index, item.matrix);
    }
    if (instances.current) instances.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  return <instancedMesh ref={instances} args={[undefined, undefined, count]} material={scienceFragment}><icosahedronGeometry args={[1, 0]} /></instancedMesh>;
}

function ScienceMiniature({ quality, fragmentCount }: { quality: "high" | "low"; fragmentCount: number }) {
  const detail = quality === "high" ? 2 : 1;
  return <group rotation={[-.1, .23, 0]}>
    <mesh scale={[1, .74, 1]} material={scienceClay}><icosahedronGeometry args={[.94, detail]} /></mesh>
    <mesh position={[0, -.79, 0]} rotation={[Math.PI, 0, .08]} material={scienceSoil}><coneGeometry args={[.58, .72, 7]} /></mesh>
    <mesh position={[0, .52, .02]} scale={[.76, .12, .64]} material={scienceGrass}><cylinderGeometry args={[1, 1.06, .24, 9]} /></mesh>
    <Observatory />
    <group position={[.36, .56, .18]} rotation={[0, -.42, 0]}>
      <mesh material={creamMatte}><boxGeometry args={[.42, .055, .22]} /></mesh>
      <mesh position={[0, .1, .02]} rotation={[Math.PI / 2, 0, 0]} material={magnetMatte}><torusGeometry args={[.13, .05, 6, 12, Math.PI]} /></mesh>
      <mesh position={[-.15, .1, .02]} material={creamMatte}><boxGeometry args={[.07, .1, .12]} /></mesh>
      <mesh position={[.15, .1, .02]} material={creamMatte}><boxGeometry args={[.07, .1, .12]} /></mesh>
    </group>
    <MagneticFragments count={fragmentCount} />
  </group>;
}

function LockBadge() {
  return <group position={[0, .08, 1.01]}>
    <mesh material={creamMatte}><boxGeometry args={[.32, .25, .09]} /></mesh>
    <mesh position={[0, .15, .01]} rotation={[0, 0, Math.PI]} material={creamMatte}><torusGeometry args={[.1, .035, 5, 10, Math.PI]} /></mesh>
    <mesh position={[0, -.015, .055]} material={lockKeyhole}><sphereGeometry args={[.025, 6, 5]} /></mesh>
  </group>;
}

function LockedStoryMoon() {
  return <group rotation={[-.13, -.2, 0]}>
    <mesh material={englishMoon}><icosahedronGeometry args={[1, 1]} /></mesh>
    <mesh position={[-.18, .32, .78]} rotation={[.15, -.35, .12]} material={creamMatte}><boxGeometry args={[.3, .11, .08]} /></mesh>
    <mesh position={[.14, .34, .8]} rotation={[.15, .35, -.12]} material={creamMatte}><boxGeometry args={[.3, .11, .08]} /></mesh>
    <LockBadge />
  </group>;
}

function LockedGardenMoon() {
  return <group rotation={[-.13, .18, 0]}>
    <mesh material={bmMoon}><icosahedronGeometry args={[1, 1]} /></mesh>
    <mesh position={[-.16, .35, .78]} rotation={[.3, .2, -.55]} material={grassMatte}><sphereGeometry args={[.13, 7, 5]} /></mesh>
    <mesh position={[.15, .27, .8]} rotation={[-.25, .4, .55]} material={grassMatte}><sphereGeometry args={[.12, 7, 5]} /></mesh>
    <mesh position={[0, .2, .78]} material={treeTrunk}><cylinderGeometry args={[.025, .025, .31, 5]} /></mesh>
    <LockBadge />
  </group>;
}

export function WorldMiniatures({ quality, counts, activeWorld, reducedMotion: _reducedMotion, onSelect, onActiveWorldChange }: WorldMiniaturesProps) {
  const layout = SUBJECT_ORBIT_LAYOUT;
  return <group rotation={[-.07, -.16, 0]}>
    <InteractiveMiniWorld world="math" active={activeWorld === "math"} position={layout.math.position} scale={layout.math.scale} onSelect={onSelect} onActiveWorldChange={onActiveWorldChange}>
      <NumeriaMiniature quality={quality} treeCount={counts.mathTrees} />
    </InteractiveMiniWorld>
    <InteractiveMiniWorld world="science" active={activeWorld === "science"} position={layout.science.position} scale={layout.science.scale} onSelect={onSelect} onActiveWorldChange={onActiveWorldChange}>
      <ScienceMiniature quality={quality} fragmentCount={counts.scienceFragments} />
    </InteractiveMiniWorld>
    <InteractiveMiniWorld world="english" active={activeWorld === "english"} position={layout.english.position} scale={layout.english.scale} onSelect={onSelect} onActiveWorldChange={onActiveWorldChange}>
      <LockedStoryMoon />
    </InteractiveMiniWorld>
    <InteractiveMiniWorld world="bm" active={activeWorld === "bm"} position={layout.bm.position} scale={layout.bm.scale} onSelect={onSelect} onActiveWorldChange={onActiveWorldChange}>
      <LockedGardenMoon />
    </InteractiveMiniWorld>
  </group>;
}
