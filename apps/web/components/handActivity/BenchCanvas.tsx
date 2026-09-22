"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { FIELD_OF_VIEW, benchCameraDistance } from "./benchSpace";

/** Keeps the whole bench in view on any canvas shape by moving the camera back. */
function FitBench() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.z = benchCameraDistance(size.width / Math.max(1, size.height));
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export type BenchCanvasProps = {
  /** Accessible name of the 3D view. */
  label: string;
  reducedMotion: boolean;
  /** Reported once, through `onFailure`, if WebGL is unavailable or the scene throws. */
  failureMessage: string;
  onFailure(message: string): void;
  children: ReactNode;
};

/** The shared 3D canvas for hand-played benches: checks WebGL first, then draws the lit, camera-fitted scene. */
export function BenchCanvas({ label, reducedMotion, failureMessage, onFailure, children }: BenchCanvasProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const reported = useRef(false);
  const report = useRef(onFailure);
  report.current = onFailure;
  const message = useRef(failureMessage);
  message.current = failureMessage;
  const reportFailure = useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    setWebglSupported(false);
    report.current(message.current);
  }, []);

  useEffect(() => {
    let supported = false;
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      if (context) { context.getExtension("WEBGL_lose_context")?.loseContext(); supported = true; }
    } catch { supported = false; }
    if (supported) setWebglSupported(true); else reportFailure();
  }, [reportFailure]);

  if (webglSupported !== true) return null;
  return <GraphicsBoundary onFailure={reportFailure}>
    <Canvas
      aria-label={label}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%", minHeight: 320, background: "transparent" }}
      camera={{ position: [0, 0, 5.3], fov: FIELD_OF_VIEW, near: .1, far: 30 }}
      dpr={reducedMotion ? 1 : [1, 1.5]}
      gl={{ antialias: !reducedMotion, alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
    >
      <ambientLight intensity={1.45} color="#f7e7c5" />
      <hemisphereLight args={["#fff0d4", "#3e4664", 1.1]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#ffd991" />
      <pointLight position={[1.4, 1.1, 2]} intensity={6} distance={6} color="#f39b83" />
      <FitBench />
      {children}
    </Canvas>
  </GraphicsBoundary>;
}
