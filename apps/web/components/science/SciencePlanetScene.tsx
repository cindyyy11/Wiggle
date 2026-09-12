"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import { ScienceDiorama } from "./ScienceDiorama";

export type ScienceDecorationCounts = {
  clouds: number;
  stars: number;
  magneticFragments: number;
};

export type SciencePlanetSceneProps = {
  quality: "high" | "low";
  reducedMotion: boolean;
  selectedZone: ScienceZoneId;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onContextLost: () => void;
  onQualityChange: () => void;
  counts: ScienceDecorationCounts;
};

function RendererHealth({ onContextLost, onQualityChange, quality }: Pick<SciencePlanetSceneProps, "onContextLost" | "onQualityChange" | "quality">) {
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
    state.elapsed += Math.min(delta, .25);
    state.frames++;
    if (!state.started && state.elapsed > 2) { state.started = true; state.elapsed = 0; state.frames = 0; }
    if (state.started && state.elapsed >= 4) {
      state.reported = true;
      if (state.frames / state.elapsed < 34) onQualityChange();
    }
  });
  return null;
}

function CanvasFallback({ onFailure }: { onFailure: () => void }) {
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    onFailure();
  }, [onFailure]);
  return null;
}

export default function SciencePlanetScene(props: SciencePlanetSceneProps) {
  return <Canvas
    className="science-planet-canvas"
    aria-hidden="true"
    dpr={props.quality === "low" ? 1 : [1, 1.5]}
    camera={{ position: [0, .35, 8.9], fov: 42, near: .1, far: 30 }}
    gl={{ antialias: props.quality === "high", alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
    fallback={<CanvasFallback onFailure={props.onContextLost} />}
  >
    <ambientLight intensity={1.45} color="#e9f5e9" />
    <hemisphereLight args={["#fff5dc", "#3f6f78", 1.25]} />
    <directionalLight position={[-4, 5, 6]} intensity={2.5} color="#fff0d0" />
    <directionalLight position={[4, -1, 3]} intensity={1.1} color="#a6dbe5" />
    <ScienceDiorama {...props} />
    <RendererHealth onContextLost={props.onContextLost} onQualityChange={props.onQualityChange} quality={props.quality} />
  </Canvas>;
}
