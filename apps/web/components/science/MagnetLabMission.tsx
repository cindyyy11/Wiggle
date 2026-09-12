"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useHandTracking } from "../../features/gestures/useHandTracking";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { speakIfUnmuted } from "../../features/voice/voicePreference";
import { MagnetHandLabScene } from "./MagnetHandLabScene";
import { initialMagnetPlay, magnetPlayReducer } from "./magnetHandPlay";
import { MAGNET_OBJECTS } from "./scienceWorld";
import styles from "./magnetLab.module.css";

export type MagnetLabMissionProps = { onExit(): void; onComplete(): void; manageFocus?: boolean };

const copy = {
  explore: "Move your open hand to guide the magnet!",
  sort: "Pinch an object, drop it on PULLS or NO PULL.",
  hidden: "Point around the campsite to find the hidden magnet.",
};
const titles = { explore: "What does a magnet pull?", sort: "Find each object's home", hidden: "A campsite mystery!" };

const coachLines = {
  starting: "Hi! I'm Wiggle. Let's get your camera ready for Magnet Lab.",
  help: "Ask an adult to turn on the camera so we can play together.",
  explore: "Move your hand to guide the magnet. What will it pull?",
  sort: "Sorting time! Metal goes on PULLS. Everything else goes on NO PULL.",
  hidden: "A magnet is hiding by the toolbox. Point to find it!",
  complete: "You did it! Magnet Lab complete — wonderful exploring!",
} as const;

type CoachKey = keyof typeof coachLines;

function coachKeyFor(ready: boolean, needsHelp: boolean, checkpoint: "explore" | "sort" | "hidden", complete: boolean): CoachKey {
  if (needsHelp) return "help";
  if (!ready) return "starting";
  if (complete) return "complete";
  return checkpoint;
}

export function MagnetLabMission({ onExit, onComplete, manageFocus = true }: MagnetLabMissionProps) {
  const tracking = useHandTracking({ enabled: true });
  const sound = useWiggleSound();
  const [state, dispatch] = useReducer(magnetPlayReducer, initialMagnetPlay);
  const [handStatus, setHandStatus] = useState("Show your hand to the camera.");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [bubble, setBubble] = useState(coachLines.starting);
  const [talking, setTalking] = useState(false);
  const [bubblePop, setBubblePop] = useState(0);
  const section = useRef<HTMLElement>(null);
  const notified = useRef(false);
  const wasReady = useRef(false);
  const spokenCoach = useRef<CoachKey | null>(null);
  const exit = useRef(onExit);
  const playSound = useRef(sound.play);
  const unlockSound = useRef(sound.unlock);
  exit.current = onExit;
  playSound.current = sound.play;
  unlockSound.current = sound.unlock;

  useEffect(() => {
    unlockSound.current();
  }, []);

  useEffect(() => {
    if (!manageFocus) return;
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
      window.speechSynthesis?.cancel();
      const restore = () => {
        if (previous?.isConnected && previous !== document.body) previous.focus();
        else Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(button => button.textContent?.trim() === "Start Magnet Lab")?.focus();
      };
      restore();
      // The parent remounts the planet's start control in the same commit.
      queueMicrotask(restore);
    };
  }, [manageFocus]);

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

  useEffect(() => {
    if (wasReady.current && !ready && state.held) dispatch({ type: "cancel", id: state.held });
    wasReady.current = ready;
  }, [ready, state.held]);

  const count = state.checkpoint === "explore" ? state.explored.length : state.checkpoint === "sort" ? state.sorted.length : Number(state.foundHiddenMagnet);
  const total = state.checkpoint === "hidden" ? 1 : MAGNET_OBJECTS.length;
  const coachKey = coachKeyFor(ready, needsHelp, state.checkpoint, state.foundHiddenMagnet);
  const liveTip = ready && !needsHelp && !state.foundHiddenMagnet ? handStatus : null;

  useEffect(() => {
    const line = coachLines[coachKey];
    setBubble(line);
    setBubblePop((value) => value + 1);
    if (spokenCoach.current === coachKey) return;
    spokenCoach.current = coachKey;
    setTalking(true);
    speakIfUnmuted(line);
    const done = window.setTimeout(() => setTalking(false), reducedMotion ? 400 : 2200);
    return () => window.clearTimeout(done);
  }, [coachKey, reducedMotion]);

  useEffect(() => {
    if (!liveTip) return;
    if (coachKey === "starting" || coachKey === "help" || coachKey === "complete") return;
    // Keep the phase greeting until the hand tip becomes specific.
    if (/^Show your hand/i.test(liveTip)) return;
    setBubble(liveTip);
  }, [liveTip, coachKey]);

  return <section
    ref={section}
    className={styles.mission}
    aria-label="Magnet Lab mission"
    onPointerDown={() => unlockSound.current()}
  >
    <div className={ready ? styles.cameraBackdropReady : styles.cameraBackdrop} aria-hidden="true">
      <video ref={tracking.video} muted playsInline className={styles.cameraBackdropVideo} />
    </div>
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
      <div className={styles.guideSpeaker} data-talking={talking || undefined}>
        <img className={styles.guideMark} src="/brand/wiggle-mark.png" alt="" />
      </div>
      <p
        key={bubblePop}
        className={styles.speechBubble}
        role="status"
        aria-live="polite"
        data-reduced-motion={reducedMotion || undefined}
      >
        {bubble}
      </p>
      {needsHelp && <button className={styles.retry} type="button" onClick={tracking.retry}>Try again</button>}
    </aside>
    <div className={styles.workbench}>
      {ready && <MagnetHandLabScene
        latest={tracking.latest}
        state={state}
        reducedMotion={reducedMotion}
        onAction={dispatch}
        onHandStatus={setHandStatus}
        onAttractionCue={(cue) => {
          unlockSound.current();
          playSound.current(cue === "pull" ? "magnetPull" : "magnetStay");
        }}
      />}
    </div>
    {ready && state.checkpoint !== "hidden" && <aside className={styles.objectKey} aria-label="Magnet Lab objects">
      <h2>Objects</h2>
      <ul>
        {MAGNET_OBJECTS.map((object) => {
          const learned = state.explored.includes(object.id) || state.sorted.includes(object.id) || state.checkpoint === "sort";
          return <li key={object.id} data-result={learned ? object.result : "mystery"}>
            <span>{object.name.replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
            <strong>{learned ? (object.result === "attracted" ? "Pulls" : "No pull") : "Try it"}</strong>
          </li>;
        })}
      </ul>
    </aside>}
    <aside className={styles.cameraCard}>
      <h2>Your Hand</h2>
      {!ready && <p className={styles.cameraStatus}>{needsHelp ? "Camera needed" : "Getting ready…"}</p>}
      <p>Your hand guides the magnet.</p>
    </aside>
  </section>;
}
