"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SubjectWorlds.module.css";

const SPLASH_EXIT_DELAY_MS = 320;

export function WiggleSplash({ onEntered }: { onEntered: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);
  const timeout = useRef<number | null>(null);
  const startButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    startButton.current?.focus();
    return () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    };
  }, []);

  const enter = () => {
    if (started.current) return;
    started.current = true;
    setLeaving(true);
    timeout.current = window.setTimeout(onEntered, SPLASH_EXIT_DELAY_MS);
  };

  return <section className={`${styles.splash} ${leaving ? styles.splashLeaving : ""}`} aria-label="Welcome to Wiggle">
    <img className={styles.splashBrand} src="/brand/wiggle-full.jpeg" alt="Wiggle. Wonder. Wow!" />
    <button ref={startButton} type="button" className={styles.splashStart} onClick={enter} disabled={leaving}>Let's Wiggle</button>
  </section>;
}
