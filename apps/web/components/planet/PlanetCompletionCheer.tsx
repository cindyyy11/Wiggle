"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./PlanetCompletionCheer.module.css";

export type PlanetCompletionCheerProps = {
  title: string;
  body: string;
  onDismiss(): void;
  autoDismissMs?: number;
};

export function PlanetCompletionCheer({ title, body, onDismiss, autoDismissMs = 4000 }: PlanetCompletionCheerProps) {
  const titleId = useId();
  const bodyId = useId();
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const button = document.getElementById("planet-completion-cheer-dismiss") as HTMLButtonElement | null;
    button?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss.current(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const id = window.setTimeout(() => dismiss.current(), autoDismissMs);
    return () => window.clearTimeout(id);
  }, [autoDismissMs]);

  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
    <div className={styles.card}>
      <div className={styles.stars} aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <h2 id={titleId}>{title}</h2>
      <p id={bodyId}>{body}</p>
      <button id="planet-completion-cheer-dismiss" className={styles.dismiss} type="button" onClick={onDismiss}>Keep exploring</button>
    </div>
  </div>;
}
