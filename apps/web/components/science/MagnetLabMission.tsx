"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useHandTracking } from "../../features/gestures/useHandTracking";
import { MagnetHandLabScene } from "./MagnetHandLabScene";
import { initialMagnetPlay, magnetPlayReducer } from "./magnetHandPlay";
import { MAGNET_OBJECTS } from "./scienceWorld";
import styles from "./magnetLab.module.css";

export type MagnetLabMissionProps = { onExit(): void; onComplete(): void };

const copy = {
  explore: "Move your open hand to guide the magnet!",
  sort: "Pinch an object, move it to a tray, then open your hand.",
  hidden: "Point around the campsite to find the hidden magnet.",
};
const titles = { explore: "What does a magnet pull?", sort: "Find each object's home", hidden: "A campsite mystery!" };

export function MagnetLabMission({ onExit, onComplete }: MagnetLabMissionProps) {
  const tracking = useHandTracking({ enabled: true });
  const [state, dispatch] = useReducer(magnetPlayReducer, initialMagnetPlay);
  const [handStatus, setHandStatus] = useState("Show your hand to the camera.");
  const [reducedMotion, setReducedMotion] = useState(false);
  const section = useRef<HTMLElement>(null);
  const notified = useRef(false);
  const exit = useRef(onExit);
  exit.current = onExit;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    section.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); exit.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(section.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]') ?? []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !section.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !section.current?.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      const restore = () => {
        if (previous?.isConnected && previous !== document.body) previous.focus();
        else Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(button => button.textContent?.trim() === "Start Magnet Lab")?.focus();
      };
      restore();
      // The parent remounts the planet's start control in the same commit.
      queueMicrotask(restore);
    };
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!state.foundHiddenMagnet || notified.current) return;
    notified.current = true;
    onComplete();
  }, [state.foundHiddenMagnet, onComplete]);

  const needsHelp = tracking.status === "denied" || tracking.status === "unavailable" || tracking.status === "off";
  const ready = tracking.status === "ready";
  const count = state.checkpoint === "explore" ? state.explored.length : state.checkpoint === "sort" ? state.sorted.length : Number(state.foundHiddenMagnet);
  const total = state.checkpoint === "hidden" ? 1 : MAGNET_OBJECTS.length;
  const announcement = needsHelp ? "This magnet activity needs your camera so your hand can guide the magnet."
    : !ready ? "Starting your camera… Ask an adult to allow camera access."
    : state.foundHiddenMagnet ? "You found the hidden magnet! Magnet Lab complete."
    : handStatus + " " + count + " of " + total + " discoveries.";

  return <section ref={section} className={styles.mission} aria-label="Magnet Lab mission">
    <button className={styles.exit} type="button" onClick={onExit}>Back to Science Planet</button>
    <header className={styles.missionCard}>
      <h1>{needsHelp ? "Ask an adult to turn on the camera" : !ready ? "Let's get your hand ready" : titles[state.checkpoint]}</h1>
      {ready && <><p>{copy[state.checkpoint]}</p>
        <div className={styles.progress} aria-label={count + " of " + total + " discoveries"}>
          {Array.from({ length: total }, (_, index) => <span key={index} data-complete={index < count} />)}
        </div>
        <p className={styles.checkpoint}>Mission {state.checkpoint === "explore" ? 1 : state.checkpoint === "sort" ? 2 : 3} of 3</p>
      </>}
    </header>
    <aside className={styles.guide}>
      <img className={styles.guideMark} src="/brand/wiggle-mark.png" alt="" />
      <p role="status" aria-live="polite">{announcement}</p>
      {needsHelp && <button className={styles.retry} type="button" onClick={tracking.retry}>Try again</button>}
    </aside>
    <div className={styles.workbench}>
      {ready && <MagnetHandLabScene latest={tracking.latest} state={state} reducedMotion={reducedMotion} onAction={dispatch} onHandStatus={setHandStatus} />}
    </div>
    <aside className={styles.cameraCard}>
      <h2>Your Hand</h2>
      <div className={styles.videoFrame}>
        <video ref={tracking.video} muted playsInline className={ready ? styles.video : styles.videoStarting} aria-label="Your local camera preview" />
        {!ready && <p>{needsHelp ? "Camera needed" : "Getting ready…"}</p>}
      </div>
      <p>Your hand guides the magnet.</p>
    </aside>
  </section>;
}
