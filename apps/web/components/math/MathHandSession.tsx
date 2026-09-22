"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { answerReducer, initialAnswerState, type AnswerAction, type AnswerRules, type AnswerState } from "../handActivity/answerPlay";
import { AnswerBenchScene } from "../handActivity/AnswerBenchScene";
import { ANSWER_SETS, type MathHandRegion } from "../handActivity/answerSets";
import { HandActivityShell } from "../handActivity/HandActivityShell";
import { mathActivity, type MathRegionId } from "./mathActivities";

/** How long a right answer is celebrated before the next puzzle slides in. */
export const CELEBRATE_MS = 1500;
const RIGHT_LINE = "That's right! Great thinking.";
const DONE_LINE = "Wonderful exploring! You solved every puzzle.";

export type MathHandSessionProps = {
  region: MathHandRegion;
  onComplete(region: MathRegionId): void;
  onClose(): void;
};

/** A camera-first hand session for one Numeria region. The caller only opens it for regions that have an answer set. */
export function MathHandSession({ region, onComplete, onClose }: MathHandSessionProps) {
  const activity = mathActivity(region)!;
  const set = ANSWER_SETS[region]!;
  const rules = useMemo<AnswerRules>(() => ({ answers: activity.challenges.map((challenge) => challenge.answer) }), [activity]);
  const sound = useWiggleSound();
  const unlock = useRef(sound.unlock);
  unlock.current = sound.unlock;
  const play = useRef(sound.play);
  play.current = sound.play;
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const notified = useRef(false);
  const [state, dispatch] = useReducer(
    (current: AnswerState, action: AnswerAction) => answerReducer(rules, current, action),
    initialAnswerState,
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const [line, setLine] = useState(activity.challenges[0].prompt);

  // This session plays its own sounds, so unlock this instance for strict-autoplay browsers.
  useEffect(() => { unlock.current(); }, []);

  const handleSelect = (option: string) => {
    const before = stateRef.current;
    const after = answerReducer(rules, before, { type: "select", option });
    if (after === before) {
      // A wrong answer leaves the state untouched; anything else that is ignored (celebrating, done) says nothing.
      if (before.phase === "asking") {
        play.current("tryAgain");
        setLine(`Try again. ${activity.challenges[before.index].hint}`);
      }
      return;
    }
    dispatch({ type: "select", option });
    stateRef.current = after; // keep the ref authoritative until the next render, so same-tick selections see fresh state
    play.current("correct");
    setLine(RIGHT_LINE);
  };

  useEffect(() => {
    if (state.phase !== "celebrating") return;
    const timer = window.setTimeout(() => {
      const next = answerReducer(rules, stateRef.current, { type: "advance" });
      stateRef.current = next;
      dispatch({ type: "advance" });
      if (next.phase === "done") {
        play.current("celebrate");
        setLine(DONE_LINE);
        if (!notified.current) { notified.current = true; complete.current(region); }
      } else {
        setLine(activity.challenges[next.index].prompt);
      }
    }, CELEBRATE_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.index, rules, activity, region]);

  const total = activity.challenges.length;
  const challenge = activity.challenges[state.index];
  const done = state.phase === "done";
  return <HandActivityShell
    label={`${activity.name} activity`}
    title={activity.name}
    instruction={done ? "Wonderful exploring!" : challenge.prompt}
    progress={{ count: state.solved, total, label: "puzzles solved" }}
    step={done ? "All done!" : `Puzzle ${state.index + 1} of ${total} · Hold over an answer`}
    coach={line}
    exitLabel="Back to Numeria"
    onExit={onClose}
    manageFocus={false}
  >
    {(scene) => <AnswerBenchScene
      set={set}
      challenge={challenge}
      state={state}
      latest={scene.latest}
      reducedMotion={scene.reducedMotion}
      onSelect={handleSelect}
      onHandStatus={scene.onHandStatus}
    />}
  </HandActivityShell>;
}
