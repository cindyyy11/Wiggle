"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { resolveQuality, type QualityPreference, type SceneQuality } from "../universe/world";
import type { SubjectWorldId } from "./subjectRoute";
import { orbitDecorationCounts } from "./worldOrbit";
import styles from "./SubjectWorlds.module.css";

const Scene = dynamic(() => import("./WorldsConstellationScene"), {
  ssr: false,
  loading: () => <p className={styles.constellationLoading} role="status">Gathering the worlds…</p>,
});

export type WorldsConstellationProps = {
  activeWorld?: SubjectWorldId | null;
  /** Temporary source-compatibility bridge until the selector owns active-world state. */
  selectedWorld?: SubjectWorldId;
  onChoose?: (world: SubjectWorldId) => void;
  quality?: QualityPreference;
  reducedMotion?: boolean;
  onSelect: (world: SubjectWorldId) => void;
  onActiveWorldChange?: (world: SubjectWorldId | null) => void;
};

type LegacyWorldDecorationCounts = { stars: number; debris: number };

/** Compatibility adapter for the current scene's legacy `{ stars, debris }` prop. */
export function worldDecorationCounts(quality: "high" | "low"): LegacyWorldDecorationCounts {
  const counts = orbitDecorationCounts(quality);
  return { stars: counts.stars, debris: counts.orbitalRocks };
}

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function WorldsConstellation({ activeWorld: activeWorldProp, selectedWorld, onChoose, quality: preference = "auto", reducedMotion: reducedMotionOverride, onSelect, onActiveWorldChange }: WorldsConstellationProps) {
  const [quality, setQuality] = useState<SceneQuality>("fallback");
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;
  const activeWorld = activeWorldProp ?? selectedWorld ?? null;
  const changeActiveWorld = onActiveWorldChange ?? (() => undefined);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (preference === "fallback") { setQuality("fallback"); return; }
    const canvas = document.createElement("canvas");
    let supported = false;
    try {
      const context = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      supported = !!context;
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { supported = false; }
    const device = navigator as Navigator & { deviceMemory?: number };
    setQuality(resolveQuality(preference, supported, device.deviceMemory, device.hardwareConcurrency || 8));
  }, [preference]);

  const displayQuality = quality === "high" ? "high" : "low";
  return <section className={styles.constellation} data-testid="subject-orbit" data-quality={quality} data-reduced-motion={String(reducedMotion)}>
    {quality === "fallback" ? null : <GraphicsBoundary onFailure={() => setQuality("fallback")}><Scene
      activeWorld={activeWorld}
      selectedWorld={selectedWorld}
      onChoose={onChoose}
      reducedMotion={reducedMotion}
      onSelect={onSelect}
      onActiveWorldChange={changeActiveWorld}
      quality={displayQuality}
      counts={orbitDecorationCounts(displayQuality)}
      onQualityChange={() => setQuality("low")}
      onContextLost={() => setQuality("fallback")}
    /></GraphicsBoundary>}
  </section>;
}
