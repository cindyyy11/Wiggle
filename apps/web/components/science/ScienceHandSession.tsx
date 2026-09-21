"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { HandActivityShell } from "../handActivity/HandActivityShell";
import { HandBenchScene } from "../handActivity/HandBenchScene";
import { benchReducer, initialBenchState, type BenchAction, type BenchRules, type BenchState } from "../handActivity/handBenchPlay";
import { BENCH_SETS } from "../handActivity/sets";
import { SCIENCE_ACTIVITIES, type StarterLand, type StarterProgress } from "./scienceActivities";
import { scienceLand } from "./scienceLands";
import sessionStyles from "./ScienceSession.module.css";

const MATCH_LINE = "Now let's match! Pinch one, then open your palm over its home.";
const DONE_LINE = "You did it! Every discovery is in its place.";
const LAST_FACT_PAUSE_MS = 2200;

function rulesFor(land: StarterLand): BenchRules {
  const activity = SCIENCE_ACTIVITIES[land];
  return { itemIds: activity.items.map((item) => item.id), targetFor: (id) => activity.items.find((item) => item.id === id)?.target };
}

function initialState(rules: BenchRules, progress: StarterProgress): BenchState {
  const observed = progress.observed.filter((id) => rules.itemIds.includes(id));
  const matched = progress.matched.filter((id) => rules.itemIds.includes(id));
  const phase = matched.length === rules.itemIds.length ? "done" : observed.length === rules.itemIds.length ? "match" : "discover";
  return { ...initialBenchState, phase, observed, matched };
}

export type ScienceHandSessionProps = {
  land: StarterLand;
  progress: StarterProgress;
  onProgress(next: StarterProgress): void;
  onClose(): void;
};

/** A camera-first hand session for one Science land. The caller only opens it for lands that have a bench set. */
export function ScienceHandSession({ land, progress, onProgress, onClose }: ScienceHandSessionProps) {
  const activity = SCIENCE_ACTIVITIES[land];
  const set = BENCH_SETS[land]!;
  const rules = useMemo(() => rulesFor(land), [land]);
  const sound = useWiggleSound();
  const unlock = useRef(sound.unlock);
  unlock.current = sound.unlock;
  const [state, dispatch] = useReducer(
    (current: BenchState, action: BenchAction) => benchReducer(rules, current, action),
    undefined,
    () => initialState(rules, progress),
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  // This session plays its own sounds, so unlock this instance for strict-autoplay browsers.
  useEffect(() => { unlock.current(); }, []);
  const [line, setLine] = useState(() => state.phase === "done" ? DONE_LINE : state.phase === "match" ? MATCH_LINE : activity.instruction);

  const factFor = (id: string) => activity.items.find((item) => item.id === id)?.fact ?? "";
  const handleAction = (action: BenchAction) => {
    const before = stateRef.current;
    const after = benchReducer(rules, before, action);
    if (after === before) return;
    dispatch(action);
    stateRef.current = after; // keep the ref authoritative until the next render, so same-tick actions see fresh state
    if (action.type === "observe") setLine(factFor(action.id));
    else if (action.type === "grab") setLine("Carry it to where it belongs, then open your palm.");
    else if (action.type === "cancel") setLine("No problem! Pinch it again when you're ready.");
    else if (action.type === "drop") {
      if (after.matched.length > before.matched.length) {
        if (after.phase === "done") { sound.play("celebrate"); setLine(DONE_LINE); }
        else { sound.play("correct"); setLine("That's a match! Pick another one."); }
      } else { sound.play("tryAgain"); setLine(`Try again. ${factFor(action.id)}`); }
    }
  };

  useEffect(() => {
    if (state.phase !== "discover" || state.observed.length !== rules.itemIds.length) return;
    const timer = window.setTimeout(() => {
      stateRef.current = benchReducer(rules, stateRef.current, { type: "advance" });
      dispatch({ type: "advance" });
      setLine(MATCH_LINE);
    }, LAST_FACT_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.observed.length, rules]);

  useEffect(() => {
    if (state.observed.length === progress.observed.length && state.matched.length === progress.matched.length) return;
    onProgress({ observed: state.observed, matched: state.matched });
  }, [state.observed, state.matched, progress, onProgress]);

  const total = rules.itemIds.length;
  const discovering = state.phase === "discover";
  return <div className={sessionStyles.magnetOverlay} data-session-controls>
    <HandActivityShell
      label={`${scienceLand(land).name} activity`}
      title={activity.title}
      instruction={discovering ? "Point at each one to learn about it." : state.phase === "match" ? "Pinch to pick up. Open your palm over a target." : "Wonderful exploring!"}
      progress={{ count: discovering ? state.observed.length : state.matched.length, total, label: discovering ? "discoveries" : "matches" }}
      step={discovering ? "Step 1 of 2 · Discover" : state.phase === "match" ? "Step 2 of 2 · Match" : "All done!"}
      coach={line}
      exitLabel="Back to Science Planet"
      onExit={onClose}
      manageFocus={false}
    >
      {(scene) => <HandBenchScene
        set={set}
        state={state}
        targetFor={rules.targetFor}
        latest={scene.latest}
        reducedMotion={scene.reducedMotion}
        onAction={handleAction}
        onHandStatus={scene.onHandStatus}
      />}
    </HandActivityShell>
  </div>;
}
