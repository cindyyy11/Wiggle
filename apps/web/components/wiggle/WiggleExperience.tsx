"use client";

import type { ApiClient } from "../../lib/api/client";
import { MissionAtlas } from "../mission/MissionAtlas";
import type { QualityPreference } from "../universe/world";
import { OpeningMoment } from "./OpeningMoment";
import { useWorldStore } from "./worldStore";
import styles from "./wiggle.module.css";

type WiggleExperienceProps = {
  quality?: QualityPreference;
  client?: ApiClient;
  childId?: string;
  allowLocalFallback?: boolean;
};

/** Owns the lightweight world phases; MissionAtlas remains the learning-session boundary. */
export function WiggleExperience({ quality, client, childId, allowLocalFallback }: WiggleExperienceProps) {
  const phase = useWorldStore((state) => state.phase);
  const reducedMotion = useWorldStore((state) => state.reducedMotion);
  const enterNumeria = useWorldStore((state) => state.enterNumeria);

  if (phase === "numeria") {
    return <MissionAtlas quality={quality} client={client} childId={childId} allowLocalFallback={allowLocalFallback} />;
  }

  if (phase === "opening") {
    return <OpeningMoment reducedMotion={reducedMotion} onEnter={() => useWorldStore.setState({ phase: "hub" })} />;
  }

  return (
    <main className={styles.hub} aria-labelledby="world-hub-title">
      <section className={styles.hubCard}>
        <img className={styles.hubMark} src="/brand/wiggle-mark.png" alt="Wiggle character mark" />
        <p className={styles.tagline}>Wiggle. Wonder. Wow!</p>
        <h1 id="world-hub-title">Your learning universe is ready.</h1>
        <p>Numeria is shining bright today. Let&apos;s start there.</p>
        <button className={styles.primaryAction} type="button" onClick={enterNumeria}>Explore Numeria</button>
      </section>
    </main>
  );
}
