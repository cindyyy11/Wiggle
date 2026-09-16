// apps/web/components/wiggle/TwinLauncher.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { LearnerTwin, TwinVisualState } from "@wiggle/contracts";
import { getTwinVisualState, twinVisualCopy } from "@wiggle/contracts";
import { ApiClient } from "../../lib/api/client";
import { demoParent } from "../../lib/demo/parent";
import { isVoiceMuted, setVoiceMuted, speakIfUnmuted } from "../../features/voice/voicePreference";
import { getLastSeenTwin, saveSeenTwin } from "./twinMemory";
import { getNextStep, type NextStep } from "./nextStep";
import { getLastSuggestedMission, saveSuggestedMission } from "./nextStepMemory";
import { WiggleTwinAvatar } from "./WiggleTwinAvatar";
import styles from "./twinLauncher.module.css";

export type TwinLauncherContext = "science" | null;

export interface TwinLauncherProps {
  childId: string;
  client?: ApiClient;
  context?: TwinLauncherContext;
}

/**
 * The ambient, everywhere-reachable Twin presence (see
 * docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md). Shows
 * the child's current Twin mood, speaks the message aloud once as soon as the panel
 * opens, and lets them peek at their whole Twin, without ever needing an active
 * mission session. When a
 * mission session exists, Lexi's own beacon inside the mission already covers
 * this role, so the caller hides this launcher instead of rendering a second,
 * competing panel.
 */
export function TwinLauncher({ childId, client: suppliedClient, context = null }: TwinLauncherProps) {
  const [client] = useState(() => suppliedClient ?? new ApiClient());
  const [state, setState] = useState<TwinVisualState>("ready");
  const [message, setMessage] = useState<string>(twinVisualCopy.ready);
  const [nextStep, setNextStep] = useState<NextStep | null>(null);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(isVoiceMuted);
  const heading = useRef<HTMLHeadingElement>(null);
  const launcherButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const lastSpoken = useRef("");

  const applyTwin = (twin: LearnerTwin, persist: boolean) => {
    const previous = getLastSeenTwin(childId);
    const nextState = getTwinVisualState(twin, previous);
    setState(nextState);
    setMessage(twinVisualCopy[nextState]);
    // Only avoid repeating a suggestion the child actually saw last time they opened
    // the panel — the silent background fetch on mount never shows one.
    const step = getNextStep(twin, childId, persist ? getLastSuggestedMission(childId) : null);
    setNextStep(step);
    if (persist) {
      saveSeenTwin(childId, twin);
      if (step) saveSuggestedMission(childId, step.missionName);
    }
  };

  const loadTwin = async (signal: AbortSignal, persist: boolean) => {
    try {
      const { twin } = await client.twin(childId, signal);
      if (!signal.aborted) applyTwin(twin, persist);
    } catch {
      if (!signal.aborted) applyTwin(demoParent.twin, persist);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadTwin(controller.signal, false);
    return () => controller.abort();
  }, [client, childId]);

  useEffect(() => { if (open) heading.current?.focus(); }, [open]);

  const scienceLine = context === "science" ? " Science is full of surprises today!" : "";

  // Speak the Twin's message once as soon as it's ready, instead of behind a
  // "Read aloud" button — repeated clicks on that button were unreliable
  // because speechSynthesis.cancel()+speak() in quick succession often produces
  // no audio. Guarding on lastSpoken keeps re-renders from re-triggering it.
  useEffect(() => {
    if (!open) { lastSpoken.current = ""; return; }
    const fullMessage = `${message}${scienceLine}`;
    if (fullMessage !== lastSpoken.current) {
      lastSpoken.current = fullMessage;
      speakIfUnmuted(fullMessage);
    }
  }, [open, message, scienceLine]);

  // Clicking anywhere outside the open panel (and off the launcher button itself,
  // which already toggles it) dismisses it, same as Escape — but without stealing
  // focus back, since the child just clicked somewhere else on purpose.
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || launcherButton.current?.contains(target)) return;
      setOpen(false);
      window.speechSynthesis?.cancel();
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [open]);

  const close = () => {
    setOpen(false);
    window.speechSynthesis?.cancel();
    launcherButton.current?.focus();
  };

  const toggle = () => {
    if (open) { close(); return; }
    setOpen(true);
    const controller = new AbortController();
    void loadTwin(controller.signal, true);
  };

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    if (next) window.speechSynthesis?.cancel();
    setVoiceMuted(next);
  };

  return <div className={styles.launcher}>
    <button
      ref={launcherButton}
      type="button"
      className={styles.button}
      aria-label={open ? "Close my Wiggle Twin" : twinVisualCopy[state]}
      aria-expanded={open}
      onClick={toggle}
    >
      <span className={styles.sparkle} aria-hidden="true" />
      <span className={styles.twinPeek} aria-hidden="true"><WiggleTwinAvatar state={state} size={84} /></span>
    </button>
    {open ? <section
      ref={panel}
      className={styles.panel}
      aria-label="My Wiggle Twin"
      onKeyDown={event => { if (event.key === "Escape") close(); }}
    >
      <button type="button" className={styles.close} aria-label="Close" onClick={close}>×</button>
      <h2 ref={heading} tabIndex={-1}>My Wiggle Twin</h2>
      <p role="status">{message}{scienceLine}</p>
      {nextStep ? <p className={styles.suggestion}>What can I try? {nextStep.description}</p> : null}
      <div className={styles.actions}>
        <button type="button" aria-pressed={muted} onClick={toggleMuted}>{muted ? "🔇 Sound off" : "🔈 Sound on"}</button>
        {nextStep ? <a href={nextStep.href}>{nextStep.actionLabel}</a> : null}
        <a href={`/twin?child=${encodeURIComponent(childId)}`}>See my whole Twin</a>
      </div>
    </section> : null}
  </div>;
}
