"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useHandTracking, type HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { speakIfUnmuted } from "../../features/voice/voicePreference";
import styles from "../science/magnetLab.module.css";
import { expectedHint, initialNudgeState, nextNudge, phaseKey, type CoachMode, type GestureHint } from "./gestureCoach";

export const STARTING_LINE = "Hi! I'm Wiggle. Let's get your camera ready.";
export const HELP_LINE = "Ask an adult to turn on the camera so we can play together.";

export type HandActivitySceneContext = {
  latest: RefObject<HandTrackingLatest>;
  ready: boolean;
  reducedMotion: boolean;
  onHandStatus(message: string): void;
};

export type HandActivityShellProps = {
  label: string;
  title: string;
  instruction: string;
  progress: { count: number; total: number; label: string };
  step?: string;
  coach: string;
  exitLabel: string;
  onExit(): void;
  manageFocus?: boolean;
  /** When set, shows a gesture hint and may nudge Wiggle's line on the wrong gesture. */
  coachMode?: CoachMode | null;
  children(scene: HandActivitySceneContext): ReactNode;
};

function GestureHintGlyph({ hint }: { hint: GestureHint }) {
  if (hint === "none") return null;
  const label = hint === "point" ? "Point" : hint === "pinch" ? "Pinch" : hint === "open_palm" ? "Open palm" : "Hold";
  return <p className={styles.gestureHint} data-hint={hint} aria-label={`Use this gesture: ${label}`}>
    <span className={styles.gestureHintGlyph} aria-hidden="true" data-hint={hint} />
    <span>{label}</span>
  </p>;
}

/** The camera-first frame shared by hand-played activities: camera backdrop, mission card, guide and adult-help screen. */
export function HandActivityShell({ label, title, instruction, progress, step, coach, exitLabel, onExit, manageFocus = true, coachMode = null, children }: HandActivityShellProps) {
  const tracking = useHandTracking({ enabled: true });
  const sound = useWiggleSound();
  const [handStatus, setHandStatus] = useState("Show your hand to the camera.");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [talking, setTalking] = useState(false);
  const [bubblePop, setBubblePop] = useState(0);
  const [nudge, setNudge] = useState<string | null>(null);
  const section = useRef<HTMLElement>(null);
  const exit = useRef(onExit);
  const unlock = useRef(sound.unlock);
  const reduced = useRef(false);
  const seenNonOff = useRef(false);
  const nudgeState = useRef(coachMode ? initialNudgeState(coachMode) : null);
  const coachModeRef = useRef(coachMode);
  exit.current = onExit;
  unlock.current = sound.unlock;
  reduced.current = reducedMotion;
  coachModeRef.current = coachMode;

  if (tracking.status !== "off") seenNonOff.current = true;
  const needsHelp = tracking.status === "denied" || tracking.status === "unavailable" || (tracking.status === "off" && seenNonOff.current);
  const ready = tracking.status === "ready";
  const spoken = needsHelp ? HELP_LINE : !ready ? STARTING_LINE : (nudge ?? coach);
  const coachKey = coachMode ? phaseKey(coachMode) : "";

  useEffect(() => { unlock.current(); }, []);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!manageFocus) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    section.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); exit.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(section.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]') ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !section.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !section.current?.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      if (previous?.isConnected && previous !== document.body) previous.focus();
    };
  }, [manageFocus]);

  useEffect(() => {
    setBubblePop((value) => value + 1);
    speakIfUnmuted(spoken);
    setTalking(true);
    const done = window.setTimeout(() => setTalking(false), reduced.current ? 400 : 2200);
    return () => window.clearTimeout(done);
  }, [spoken]);

  useEffect(() => {
    if (!ready || !coachMode) {
      setNudge(null);
      nudgeState.current = coachMode ? initialNudgeState(coachMode) : null;
      return;
    }
    const tick = () => {
      const mode = coachModeRef.current;
      if (!mode) return;
      const gesture = tracking.latest.current.gesture;
      const result = nextNudge(nudgeState.current ?? initialNudgeState(mode), mode, gesture);
      nudgeState.current = result.state;
      if (result.nudge) setNudge(result.nudge);
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [ready, coachKey, tracking.latest]);

  useEffect(() => {
    if (!nudge) return;
    const id = window.setTimeout(() => setNudge(null), 2800);
    return () => window.clearTimeout(id);
  }, [nudge]);

  return <section ref={section} className={styles.mission} aria-label={label} onPointerDown={() => unlock.current()}>
    <div className={ready ? styles.cameraBackdropReady : styles.cameraBackdrop} aria-hidden="true">
      <video ref={tracking.video} muted playsInline className={styles.cameraBackdropVideo} />
    </div>
    <button className={styles.exit} type="button" onClick={onExit}>{exitLabel}</button>
    <header className={styles.missionCard}>
      <h1>{needsHelp ? "Ask an adult to turn on the camera" : !ready ? "Let's get your hand ready" : title}</h1>
      {ready && <>
        <p>{instruction}</p>
        <div className={styles.progress} role="img" aria-label={`${progress.count} of ${progress.total} ${progress.label}`}>
          {Array.from({ length: progress.total }, (_, index) => <span key={index} data-complete={index < progress.count} />)}
        </div>
        {step ? <p className={styles.checkpoint}>{step}</p> : null}
      </>}
    </header>
    <aside className={styles.guide}>
      <div className={styles.guideSpeaker} data-talking={talking || undefined}>
        <img className={styles.guideMark} src="/brand/wiggle-mark.png" alt="" />
      </div>
      <p key={bubblePop} className={styles.speechBubble} role="status" aria-live="polite" data-reduced-motion={reducedMotion || undefined}>
        {spoken}
      </p>
      {needsHelp && <button className={styles.retry} type="button" onClick={() => {
        // This button unmounts once the camera restarts; keep focus inside the shell so Escape still reaches it.
        section.current?.querySelector<HTMLButtonElement>("button")?.focus();
        tracking.retry();
      }}>Try again</button>}
    </aside>
    <div className={styles.workbench}>
      {ready && children({ latest: tracking.latest, ready, reducedMotion, onHandStatus: setHandStatus })}
    </div>
    <aside className={styles.cameraCard}>
      <h2>Your Hand</h2>
      {!ready && <p className={styles.cameraStatus}>{needsHelp ? "Camera needed" : "Getting ready…"}</p>}
      {ready && coachMode ? <GestureHintGlyph hint={expectedHint(coachMode)} /> : null}
      <p>{ready ? handStatus : "Your hand plays the activity."}</p>
    </aside>
  </section>;
}
