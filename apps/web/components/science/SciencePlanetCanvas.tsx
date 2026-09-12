"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ScienceFallback } from "./ScienceFallback";
import { ScienceHud } from "./ScienceHud";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import { resolveQuality, type QualityPreference, type SceneQuality } from "../universe/world";
import styles from "./sciencePlanet.module.css";

const Scene = dynamic(() => import("./SciencePlanetScene"), {
  ssr: false,
  loading: () => <p className={styles.loading} role="status">Building Science Planet…</p>,
});

export type SciencePlanetCanvasProps = {
  quality?: QualityPreference;
  reducedMotion?: boolean;
  selectedZone: ScienceZoneId;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
  onStartMagnetLab: () => void;
  completionMessage?: string;
};

export function scienceDecorationCounts(quality: "high" | "low"): { clouds: number; stars: number; magneticFragments: number } {
  return quality === "high"
    ? { clouds: 8, stars: 96, magneticFragments: 14 }
    : { clouds: 3, stars: 36, magneticFragments: 5 };
}

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function SciencePlanetCanvas({
  quality: preference = "auto",
  reducedMotion: reducedMotionOverride,
  selectedZone,
  onZoneSelect,
  onBackToWorlds,
  onStartMagnetLab,
  completionMessage,
}: SciencePlanetCanvasProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [quality, setQuality] = useState<SceneQuality>("fallback");
  const [failed, setFailed] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const probedWebgl = useRef(false);
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;

  // Probe once on mount. Quality changes reuse the recorded result rather than creating contexts.
  useEffect(() => {
    if (preference === "fallback" || probedWebgl.current) return;
    probedWebgl.current = true;
    const canvas = document.createElement("canvas");
    let supported = false;
    try {
      const context = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      supported = !!context;
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { supported = false; }
    setWebglSupported(supported);
  }, [preference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (failed || webglSupported === null) return;
    if (preference === "fallback" || !webglSupported) { setQuality("fallback"); return; }
    const device = navigator as Navigator & { deviceMemory?: number };
    setQuality(resolveQuality(preference, webglSupported, device.deviceMemory, device.hardwareConcurrency || 8));
  }, [failed, preference, webglSupported]);

  const graphicsFailed = useCallback(() => {
    setFailed(true);
    setAnnouncement("Science Planet map is ready. Every topic is still here.");
  }, []);
  const lowerQuality = useCallback(() => setQuality("low"), []);
  const fallback = failed || quality === "fallback";

  if (fallback) {
    return <>
      {failed ? <p className={styles.graphicsFallbackAnnouncement} role="status" aria-live="polite">{announcement}</p> : null}
      <ScienceFallback
        selectedZone={selectedZone}
        onZoneSelect={onZoneSelect}
        onBackToWorlds={onBackToWorlds}
        onStartMagnetLab={onStartMagnetLab}
        completionMessage={completionMessage}
      />
    </>;
  }

  const displayQuality = quality === "high" ? "high" : "low";
  return <section
    className={styles.planet}
    aria-label="Science Planet"
    data-quality={displayQuality}
    data-reduced-motion={String(reducedMotion)}
  >
    <div className={styles.canvasBackdrop}>
      <GraphicsBoundary onFailure={graphicsFailed}>
        <Scene
          quality={displayQuality}
          reducedMotion={reducedMotion}
          selectedZone={selectedZone}
          onZoneSelect={onZoneSelect}
          onContextLost={graphicsFailed}
          onQualityChange={lowerQuality}
          counts={scienceDecorationCounts(displayQuality)}
        />
      </GraphicsBoundary>
    </div>
    <ScienceHud
      selectedZone={selectedZone}
      onZoneSelect={onZoneSelect}
      onBackToWorlds={onBackToWorlds}
      onStartMagnetLab={onStartMagnetLab}
      completionMessage={completionMessage}
    />
    <p className={styles.canvasHint}>A soft, touchable-looking world is here to explore. Topic buttons stay ready whenever you need them.</p>
    <p className={styles.graphicsAnnouncement} role="status" aria-live="polite">{announcement}</p>
  </section>;
}
