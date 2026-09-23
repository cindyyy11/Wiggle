"use client";

import { useEffect, useMemo, useReducer, useRef, type Dispatch } from "react";
import type { RefObject } from "react";
import { HandActivityShell } from "../handActivity/HandActivityShell";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { MagnetHandLabScene } from "./MagnetHandLabScene";
import { initialMagnetPlay, magnetPlayReducer, type MagnetPlayAction, type MagnetPlayState } from "./magnetHandPlay";
import { MAGNET_OBJECTS, type MagnetObjectId } from "./scienceWorld";
import styles from "./magnetLab.module.css";

export type MagnetLabMissionProps = { onExit(): void; onComplete(): void; manageFocus?: boolean };

const copy = {
  explore: "Move your open hand to guide the magnet!",
  sort: "Pinch an object, drop it on PULLS or NO PULL.",
  hidden: "Point around the campsite to find the hidden magnet.",
};
const titles = { explore: "What does a magnet pull?", sort: "Find each object's home", hidden: "A campsite mystery!" };

const coachLines = {
  explore: "Move your hand to guide the magnet. What will it pull?",
  sort: "Sorting time! Metal goes on PULLS. Everything else goes on NO PULL.",
  hidden: "A magnet is hiding by the toolbox. Point to find it!",
  complete: "You did it! Magnet Lab complete — wonderful exploring!",
} as const;

/** Cancels a held sort item when the shell unmounts the workbench (camera not ready). */
function MagnetWorkbench({
  held,
  dispatch,
  latest,
  state,
  reducedMotion,
  onHandStatus,
  onAttractionCue,
}: {
  held: MagnetObjectId | null;
  dispatch: Dispatch<MagnetPlayAction>;
  latest: RefObject<HandTrackingLatest>;
  state: MagnetPlayState;
  reducedMotion: boolean;
  onHandStatus(message: string): void;
  onAttractionCue(cue: "pull" | "stay"): void;
}) {
  useEffect(() => () => {
    if (held) dispatch({ type: "cancel", id: held });
  }, [held, dispatch]);
  return <MagnetHandLabScene
    latest={latest}
    state={state}
    reducedMotion={reducedMotion}
    onAction={dispatch}
    onHandStatus={onHandStatus}
    onAttractionCue={onAttractionCue}
  />;
}

export function MagnetLabMission({ onExit, onComplete, manageFocus = true }: MagnetLabMissionProps) {
  const sound = useWiggleSound();
  const [state, dispatch] = useReducer(magnetPlayReducer, initialMagnetPlay);
  const notified = useRef(false);
  const playSound = useRef(sound.play);
  const unlockSound = useRef(sound.unlock);
  playSound.current = sound.play;
  unlockSound.current = sound.unlock;

  useEffect(() => { unlockSound.current(); }, []);

  useEffect(() => {
    if (!state.foundHiddenMagnet || notified.current) return;
    notified.current = true;
    onComplete();
  }, [state.foundHiddenMagnet, onComplete]);

  const count = state.checkpoint === "explore" ? state.explored.length
    : state.checkpoint === "sort" ? state.sorted.length
    : Number(state.foundHiddenMagnet);
  const total = state.checkpoint === "hidden" ? 1 : MAGNET_OBJECTS.length;
  const coachMode = useMemo(
    () => ({ kind: "magnet" as const, checkpoint: state.checkpoint, holding: !!state.held }),
    [state.checkpoint, state.held],
  );
  const coach = state.foundHiddenMagnet ? coachLines.complete : coachLines[state.checkpoint];
  const step = `Mission ${state.checkpoint === "explore" ? 1 : state.checkpoint === "sort" ? 2 : 3} of 3`;

  const objects = !state.foundHiddenMagnet && state.checkpoint !== "hidden" ? (
    <aside className={styles.objectKey} aria-label="Magnet Lab objects">
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
    </aside>
  ) : null;

  return <div className={styles.magnetShellWrap}>
    <HandActivityShell
      label="Magnet Lab mission"
      title={titles[state.checkpoint]}
      instruction={copy[state.checkpoint]}
      progress={{ count, total, label: "discoveries" }}
      step={step}
      coach={coach}
      coachMode={coachMode}
      exitLabel="Back to Science Planet"
      onExit={onExit}
      manageFocus={manageFocus}
    >
      {(scene) => <MagnetWorkbench
        latest={scene.latest}
        reducedMotion={scene.reducedMotion}
        onHandStatus={scene.onHandStatus}
        state={state}
        held={state.held}
        dispatch={dispatch}
        onAttractionCue={(cue) => {
          unlockSound.current();
          playSound.current(cue === "pull" ? "magnetPull" : "magnetStay");
        }}
      />}
    </HandActivityShell>
    {objects}
  </div>;
}
