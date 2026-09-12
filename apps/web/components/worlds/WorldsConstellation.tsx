"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { resolveQuality, type QualityPreference, type SceneQuality } from "../universe/world";
import type { SubjectWorldId } from "./subjectRoute";
import styles from "./SubjectWorlds.module.css";

const Scene = dynamic(() => import("./WorldsConstellationScene"), {
  ssr: false,
  loading: () => <p className={styles.constellationLoading} role="status">Gathering the worlds…</p>,
});

export type WorldsConstellationProps = {
  selectedWorld: SubjectWorldId;
  quality?: QualityPreference;
  reducedMotion?: boolean;
  onSelect: (world: SubjectWorldId) => void;
};

export function worldDecorationCounts(quality: "high" | "low") {
  return quality === "high" ? { stars: 40, debris: 40 } : { stars: 18, debris: 18 };
}

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function WorldsConstellation({ selectedWorld, quality: preference = "auto", reducedMotion = false, onSelect }: WorldsConstellationProps) {
  const [quality, setQuality] = useState<SceneQuality>("fallback");

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
  return <section className={styles.constellation} aria-hidden="true" data-quality={quality}>
    {quality === "fallback" ? null : <GraphicsBoundary onFailure={() => setQuality("fallback")}><Scene
      selectedWorld={selectedWorld}
      reducedMotion={reducedMotion}
      onSelect={onSelect}
      quality={displayQuality}
      counts={worldDecorationCounts(displayQuality)}
      onQualityChange={() => setQuality("low")}
      onContextLost={() => setQuality("fallback")}
    /></GraphicsBoundary>}
  </section>;
}
