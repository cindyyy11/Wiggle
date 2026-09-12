"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { travelProgress } from "./solarSystemMotion";
import { PLANETS, type PlanetId } from "./worlds";
import { useWorldStore } from "./worldStore";
import styles from "./wiggle.module.css";

const SolarSystemScene = dynamic(
  () => import("./solarSystemScene").then((module) => module.SolarSystemScene),
  { ssr: false, loading: () => <div className={styles.sceneLoading} aria-hidden="true" /> },
);

type SolarSystemHubProps = {
  onEnterNumeria: () => void;
};

type TravelState = {
  from: PlanetId;
  startedAt: number;
};

/** The small, configuration-driven map between Wiggle's opening and Numeria. */
export function SolarSystemHub({ onEnterNumeria }: SolarSystemHubProps) {
  const selectedPlanetId = useWorldStore((state) => state.selectedPlanetId);
  const reducedMotion = useWorldStore((state) => state.reducedMotion);
  const selectPlanet = useWorldStore((state) => state.selectPlanet);
  const toggleSpaceLog = useWorldStore((state) => state.toggleSpaceLog);
  const [travel, setTravel] = useState<TravelState | null>(null);
  const [progress, setProgress] = useState(0);
  const selected = selectedPlanetId ?? "numeria";
  const planet = PLANETS.find((item) => item.id === selected) ?? PLANETS[0];
  const travelling = travel !== null;

  useEffect(() => {
    if (!travel) return;
    let timer: number | undefined;
    const tick = () => {
      const next = travelProgress(travel.from, "numeria", Date.now() - travel.startedAt, false);
      setProgress(next);
      if (next >= 1) {
        onEnterNumeria();
        return;
      }
      timer = window.setTimeout(tick, 16);
    };
    tick();
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [onEnterNumeria, travel]);

  const enterNumeria = () => {
    if (reducedMotion) { onEnterNumeria(); return; }
    setProgress(0);
    setTravel({ from: selected, startedAt: Date.now() });
  };

  const choosePlanet = (id: PlanetId) => {
    if (!travelling) selectPlanet(id);
  };

  return (
    <main className={styles.solarHub} aria-labelledby="world-hub-title">
      <header className={styles.solarHeader}>
        <img className={styles.hubMark} src="/brand/wiggle-mark.png" alt="Wiggle character mark" />
        <div>
          <p className={styles.tagline}>Wiggle. Wonder. Wow!</p>
          <h1 id="world-hub-title">Pick a bright place to wonder.</h1>
        </div>
        <button className={styles.spaceLogButton} type="button" onClick={toggleSpaceLog} aria-label="My Space Log, shortcut J">
          My Space Log <kbd>J</kbd>
        </button>
      </header>

      <section className={styles.solarLayout} aria-label="Wiggle solar system destinations">
        <div className={styles.solarScene}>
          <SolarSystemScene selected={selected} reducedMotion={reducedMotion} onSelect={choosePlanet} />
          <p className={styles.lexiAnchor} aria-hidden="true">Lexi is keeping an eye on the stars.</p>
        </div>

        <nav className={styles.destinationControls} aria-label="Choose a learning world">
          <p>DESTINATIONS</p>
          {PLANETS.map((item) => (
            <button
              key={item.id}
              className={styles.destinationButton}
              type="button"
              aria-pressed={item.id === selected}
              data-planet={item.id}
              onClick={() => choosePlanet(item.id)}
            >
              <span className={styles.planetDot} style={{ backgroundColor: item.palette.primary }} aria-hidden="true" />
              <span><strong>{item.label}</strong><small>{item.subject}</small></span>
            </button>
          ))}
        </nav>

        <aside className={styles.previewCard} aria-live="polite">
          <p>{planet.subject}</p>
          <h2>{planet.label}</h2>
          <span className={styles.previewCopy}>{planet.previewCopy}</span>
          {planet.playable ? (
            <button className={styles.primaryAction} type="button" onClick={enterNumeria} disabled={travelling}>
              {travelling ? "Flying to Numeria…" : "Enter Numeria"}
            </button>
          ) : (
            <button className={styles.comingSoon} type="button" disabled>Growing soon</button>
          )}
        </aside>
      </section>

      <AnimatePresence>
        {travelling ? (
          <motion.div
            className={styles.travelOverlay}
            role="status"
            data-travel-progress={progress.toFixed(3)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: 1 + progress * 0.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{ backgroundPosition: `${50 + progress * 14}% ${50 - progress * 10}%` }}
          >
            <span>Following the starlight to Numeria…</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
