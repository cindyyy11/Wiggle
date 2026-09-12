"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Group, MeshStandardMaterial } from "three";
import type { SubjectWorldId } from "./subjectRoute";

type DecorationCounts = { stars: number; debris: number };

type WorldsConstellationSceneProps = {
  selectedWorld: SubjectWorldId;
  quality: "high" | "low";
  reducedMotion: boolean;
  counts: DecorationCounts;
  onSelect: (world: SubjectWorldId) => void;
  onQualityChange: () => void;
  onContextLost: () => void;
};

const scienceMatte = new MeshStandardMaterial({ color: "#7fbd9a", roughness: 1, flatShading: true });
const numeriaMatte = new MeshStandardMaterial({ color: "#9eb9df", roughness: 1, flatShading: true });
const lockedMatte = new MeshStandardMaterial({ color: "#a7a6ad", roughness: 1, flatShading: true, transparent: true, opacity: .72 });
const ringMatte = new MeshStandardMaterial({ color: "#f0c86c", roughness: 1, transparent: true, opacity: .58 });
const debrisMatte = new MeshStandardMaterial({ color: "#d6c7a3", roughness: 1, flatShading: true, transparent: true, opacity: .58 });

function RendererHealth({ onContextLost, onQualityChange, quality }: Pick<WorldsConstellationSceneProps, "onContextLost" | "onQualityChange" | "quality">) {
  const { gl } = useThree();
  const sample = useRef({ elapsed: 0, frames: 0, started: false, reported: false });
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.setAttribute("aria-hidden", "true");
    const lost = (event: Event) => { event.preventDefault(); onContextLost(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);
  useFrame((_, delta) => {
    const state = sample.current;
    if (state.reported || quality === "low" || document.hidden) return;
    state.elapsed += Math.min(delta, .25); state.frames++;
    if (!state.started && state.elapsed > 2) { state.started = true; state.elapsed = 0; state.frames = 0; }
    if (state.started && state.elapsed >= 4) {
      state.reported = true;
      if (state.frames / state.elapsed < 34) onQualityChange();
    }
  });
  return null;
}

function ConstellationMotion({ children, reducedMotion }: { children: ReactNode; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const { camera } = useThree();
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const time = clock.getElapsedTime();
    if (group.current) group.current.rotation.y += Math.min(delta, .05) * .045;
    camera.position.y = .2 + Math.sin(time * .22) * .12;
    camera.lookAt(0, 0, 0);
  });
  return <group ref={group}>{children}</group>;
}

function Stars({ count }: { count: number }) {
  const points = useMemo(() => Array.from({ length: count }, (_, index) => ({
    position: [Math.sin(index * 2.39) * (3.1 + index % 4), Math.cos(index * 1.71) * 2.5, -2.6 - (index % 5)] as [number, number, number],
    size: .024 + (index % 3) * .012,
  })), [count]);
  return <group>{points.map((star, index) => <mesh key={index} position={star.position}>
    <sphereGeometry args={[star.size, 5, 4]} />
    <meshBasicMaterial color={index % 3 === 0 ? "#f6e6ad" : "#d5edf0"} transparent opacity={.72} />
  </mesh>)}</group>;
}

function Debris({ count }: { count: number }) {
  return <group>{Array.from({ length: count }, (_, index) => <mesh
    key={index}
    position={[Math.sin(index * 1.93) * (2.9 + index % 3 * .18), Math.cos(index * 2.71) * 1.85, -1.5 - index % 4]}
    rotation={[index * .27, index * .51, index * .19]}
    material={debrisMatte}
  >
    <icosahedronGeometry args={[.025 + index % 3 * .016, 0]} />
  </mesh>)}</group>;
}

function Planet({ world, position, scale, selected, material, onSelect, locked = false, detail = 1 }: {
  world: SubjectWorldId;
  position: [number, number, number];
  scale: number;
  selected: boolean;
  material: MeshStandardMaterial;
  onSelect: (world: SubjectWorldId) => void;
  locked?: boolean;
  detail?: number;
}) {
  return <group position={position} scale={selected ? scale * 1.06 : scale}>
    <mesh material={material} onClick={locked ? undefined : event => { event.stopPropagation(); onSelect(world); }}>
      <icosahedronGeometry args={[1, detail]} />
    </mesh>
    {world === "math" ? <mesh rotation={[1.22, .16, .34]} material={ringMatte}><torusGeometry args={[1.34, .036, 6, 24]} /></mesh> : null}
    {locked ? <mesh position={[0, 0, 1.02]}><boxGeometry args={[.26, .2, .08]} /><meshBasicMaterial color="#fff7e7" transparent opacity={.72} /></mesh> : null}
  </group>;
}

function Constellation(props: WorldsConstellationSceneProps) {
  const planetDetail = props.quality === "high" ? 2 : 1;
  return <>
    <ambientLight intensity={1.3} color="#dce9e2" />
    <directionalLight position={[-3, 5, 5]} intensity={2.2} color="#fff0ca" />
    <directionalLight position={[4, -2, 3]} intensity={1.1} color="#9fcfe3" />
    <ConstellationMotion reducedMotion={props.reducedMotion}><group rotation={[-.13, -.38, .02]}>
      <Planet world="science" position={[-1.5, .32, 0]} scale={1.16} selected={props.selectedWorld === "science"} material={scienceMatte} onSelect={props.onSelect} detail={planetDetail} />
      <Planet world="math" position={[1.24, -.55, -.55]} scale={.72} selected={props.selectedWorld === "math"} material={numeriaMatte} onSelect={props.onSelect} detail={planetDetail} />
      <Planet world="english" position={[2.54, 1.22, -1.22]} scale={.32} selected={false} material={lockedMatte} onSelect={props.onSelect} locked />
      <Planet world="bm" position={[-2.63, -1.23, -1.1]} scale={.28} selected={false} material={lockedMatte} onSelect={props.onSelect} locked />
      <Stars count={props.counts.stars} />
      <Debris count={props.counts.debris} />
    </group></ConstellationMotion>
    <RendererHealth onContextLost={props.onContextLost} onQualityChange={props.onQualityChange} quality={props.quality} />
  </>;
}

export default function WorldsConstellationScene(props: WorldsConstellationSceneProps) {
  return <Canvas
    className="worlds-constellation-canvas"
    dpr={props.quality === "low" ? 1 : [1, 1.5]}
    camera={{ position: [0, .2, 8.1], fov: 46, near: .1, far: 30 }}
    gl={{ antialias: props.quality === "high", alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
    fallback="Choose a subject world using the controls."
  >
    <Constellation {...props} />
  </Canvas>;
}
