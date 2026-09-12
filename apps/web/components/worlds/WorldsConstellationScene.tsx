"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { SubjectWorldId } from "./subjectRoute";
import { ConstellationDressings } from "./ConstellationDressings";
import { WorldMiniatures } from "./WorldMiniatures";
import type { OrbitDecorationCounts } from "./worldOrbit";

export type WorldsConstellationSceneProps = {
  activeWorld: SubjectWorldId | null;
  quality: "high" | "low";
  reducedMotion: boolean;
  counts: OrbitDecorationCounts;
  onSelect: (world: SubjectWorldId) => void;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
  onQualityChange: () => void;
  onContextLost: () => void;
};

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

function OrbitCameraFloat({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    camera.position.y = .08 + Math.sin(clock.getElapsedTime() * .22) * .12;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Constellation(props: WorldsConstellationSceneProps) {
  return <>
    <ambientLight intensity={1.2} color="#e9f5e9" />
    <hemisphereLight args={["#fff5dc", "#2d315d", 1.15]} />
    <directionalLight position={[-4, 5, 6]} intensity={2.35} color="#fff0d0" />
    <directionalLight position={[4, -1, 3]} intensity={1.05} color="#9ccde1" />
    <OrbitCameraFloat reducedMotion={props.reducedMotion} />
    <WorldMiniatures {...props} />
    <ConstellationDressings counts={props.counts} reducedMotion={props.reducedMotion} />
    <RendererHealth onContextLost={props.onContextLost} onQualityChange={props.onQualityChange} quality={props.quality} />
  </>;
}

export default function WorldsConstellationScene(props: WorldsConstellationSceneProps) {
  return <Canvas
    className="worlds-constellation-canvas"
    aria-hidden="true"
    dpr={props.quality === "low" ? 1 : [1, 1.5]}
    camera={{ position: [0, .08, 9.4], fov: 46, near: .1, far: 30 }}
    gl={{ antialias: props.quality === "high", alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
  >
    <Constellation {...props} />
  </Canvas>;
}
