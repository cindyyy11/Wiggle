"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Astronaut } from "./Astronaut";
import { CameraRig } from "./CameraRig";
import { GestureInteractionLayer } from "./GestureInteractionLayer";
import { Landmarks } from "./Landmarks";
import { Numeria } from "./Numeria";
import { OrbitingWorlds, SpaceStars } from "./OrbitingWorlds";
import { WiggleSpaceDressings } from "./WiggleSpaceDressings";
import type { SceneInteractionTargets, UniverseSceneProps } from "./world";

function RendererHealth({ onContextLost, onQualityChange, quality }: Pick<UniverseSceneProps, "onContextLost" | "onQualityChange" | "quality">) {
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
    // Allow shader compilation to settle, then sample once rather than update React each frame.
    state.elapsed += Math.min(delta, .25); state.frames++;
    if (!state.started && state.elapsed > 2) { state.started = true; state.elapsed = 0; state.frames = 0; }
    if (state.started && state.elapsed >= 4) { state.reported = true; if (state.frames / state.elapsed < 34) onQualityChange("low"); }
  });
  return null;
}

export default function UniverseScene(props: UniverseSceneProps) {
  const { mode, quality, reducedMotion, input, selectedLandmark, onLandmarkSelect, onDestinationChange, onContextLost, onQualityChange, pizza } = props;
  const interactionTargets = useRef<SceneInteractionTargets["current"]>([]);
  return <Canvas dpr={quality === "low" ? 1 : [1, 1.5]} camera={{ position: [.6, 1.45, 10.8], fov: 45, near: .1, far: 65 }} gl={{ antialias: quality === "high", alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }} fallback="Choose a destination using the map controls.">
    <ambientLight intensity={.9} color="#fff7e7" />
    <hemisphereLight args={["#fff7e7", "#79adc3", 1.2]} />
    <directionalLight position={[-4, 8, 6]} intensity={2.35} color="#fff7e7" />
    <directionalLight position={[5, 2, -3]} intensity={1.15} color="#a9d9ee" />
    <Numeria quality={quality} dimmed={mode === "mission"} onDestination={destination => { input.current.destination = destination; onDestinationChange?.(destination); }} />
    <Landmarks selected={selectedLandmark} onSelect={onLandmarkSelect} reducedMotion={reducedMotion} mission={mode === "mission"} pizza={pizza} interactionTargets={interactionTargets} />
    {pizza?.visible && pizza.hand ? <GestureInteractionLayer {...pizza.hand} targets={interactionTargets} onAction={pizza.onGestureAction} /> : null}
    <Astronaut input={input} reducedMotion={reducedMotion} />
    <WiggleSpaceDressings quality={quality} reducedMotion={reducedMotion} />
    <OrbitingWorlds reducedMotion={reducedMotion} lowQuality={quality === "low"} />
    <SpaceStars lowQuality={quality === "low"} />
    <CameraRig mode={mode} input={input} reducedMotion={reducedMotion} />
    <RendererHealth onContextLost={onContextLost} onQualityChange={onQualityChange} quality={quality} />
  </Canvas>;
}
