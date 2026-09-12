"use client";

import { motion } from "framer-motion";
import styles from "./wiggle.module.css";

type OpeningMomentProps = {
  onEnter: () => void;
  reducedMotion?: boolean;
};

/** The child-facing first impression before the world map is shown. */
export function OpeningMoment({ onEnter, reducedMotion = false }: OpeningMomentProps) {
  const transition = reducedMotion ? { duration: 0 } : { duration: 0.42, ease: "easeOut" as const };

  return (
    <main className={styles.opening} aria-labelledby="wiggle-welcome">
      <motion.section
        className={styles.openingCard}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition}
      >
        <img className={styles.mark} src="/brand/wiggle-mark.png" alt="Wiggle character mark" />
        <p className={styles.tagline}>Wiggle. Wonder. Wow!</p>
        <h1 id="wiggle-welcome">Hey Maya! Ready to explore?</h1>
        <p className={styles.intro}>Lexi has a whole learning universe waiting for you.</p>
        <button className={styles.primaryAction} type="button" onClick={onEnter}>
          Let&apos;s Wiggle
        </button>
      </motion.section>
    </main>
  );
}
