"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SubjectWorlds.module.css";

const SPLASH_DISPLAY_MS = 900;
const SPLASH_EXIT_DELAY_MS = 320;

export function WiggleSplash({ onEntered }: { onEntered: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const onEnteredRef = useRef(onEntered);
  onEnteredRef.current = onEntered;

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), SPLASH_DISPLAY_MS);
    const enterTimer = window.setTimeout(() => onEnteredRef.current(), SPLASH_DISPLAY_MS + SPLASH_EXIT_DELAY_MS);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(enterTimer);
    };
  }, []);

  return <section className={`${styles.splash} ${leaving ? styles.splashLeaving : ""}`} aria-label="Welcome to Wiggle">
    <img className={styles.splashBrand} src="/brand/wiggle-full.jpeg" alt="Wiggle. Wonder. Wow!" />
  </section>;
}
