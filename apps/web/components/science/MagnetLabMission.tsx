"use client";

import { useRef, useState } from "react";
import {
  MAGNET_OBJECTS,
  resultForMagnetObject,
  type MagnetObjectId,
  type MagnetResult,
} from "./scienceWorld";
import styles from "./magnetLab.module.css";

export type MagnetLabMissionProps = {
  onExit: () => void;
  onComplete: () => void;
};

type FeedbackKind = "status" | "alert";

export function MagnetLabMission({ onExit, onComplete }: MagnetLabMissionProps) {
  const [selectedId, setSelectedId] = useState<MagnetObjectId | null>(null);
  const [observed, setObserved] = useState(false);
  const [completedIds, setCompletedIds] = useState<MagnetObjectId[]>([]);
  const [feedback, setFeedback] = useState("Choose an object, then try the magnet.");
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>("status");
  const completedIdsRef = useRef<MagnetObjectId[]>([]);
  const completionNotifiedRef = useRef(false);

  const selectedObject = selectedId
    ? MAGNET_OBJECTS.find((object) => object.id === selectedId) ?? null
    : null;
  const complete = completedIds.length === MAGNET_OBJECTS.length;

  function selectObject(id: MagnetObjectId) {
    setSelectedId(id);
    setObserved(false);
    setFeedbackKind("status");
    setFeedback(`Ready to test the ${MAGNET_OBJECTS.find((object) => object.id === id)?.name}.`);
  }

  function observe() {
    if (!selectedObject) {
      setFeedbackKind("status");
      setFeedback("Choose an object before trying the magnet.");
      return;
    }

    setObserved(true);
    setFeedbackKind("status");
    setFeedback(
      resultForMagnetObject(selectedObject.id) === "attracted"
        ? `The ${selectedObject.name} moves toward the magnet.`
        : `The ${selectedObject.name} stays where it is.`,
    );
  }

  function classify(answer: MagnetResult) {
    if (!selectedId) {
      setFeedbackKind("status");
      setFeedback("Choose an object before classifying it.");
      return;
    }
    if (!observed) {
      setFeedbackKind("status");
      setFeedback("Try the magnet first to observe what happens.");
      return;
    }
    if (answer !== resultForMagnetObject(selectedId)) {
      setFeedbackKind("alert");
      setFeedback("Try that object with the magnet again.");
      return;
    }

    if (completedIdsRef.current.includes(selectedId)) {
      setObserved(false);
      setFeedbackKind("status");
      setFeedback("You already discovered that result. Choose another object.");
      return;
    }

    const next = [...completedIdsRef.current, selectedId];
    completedIdsRef.current = next;
    setCompletedIds(next);
    setObserved(false);
    setFeedbackKind("status");
    setFeedback(answer === "attracted" ? "It moves toward the magnet!" : "It stays where it is.");

    if (next.length === MAGNET_OBJECTS.length && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      onComplete();
    }
  }

  return <section className={styles.mission} aria-label="Magnet Lab mission">
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>SCIENCE PLANET · MAGNET LAB</p>
        <h2>What does a magnet pull?</h2>
        <p>Test each safe object, watch what happens, then name the result.</p>
      </div>
      <button className={styles.exit} type="button" onClick={onExit}>Exit Magnet Lab</button>
    </header>

    <p className={styles.progress} aria-live="polite">{completedIds.length} of {MAGNET_OBJECTS.length} discoveries</p>

    <div className={styles.objectGrid} aria-label="Objects to test">
      {MAGNET_OBJECTS.map((object) => <button
        key={object.id}
        className={styles.objectButton}
        type="button"
        aria-pressed={selectedId === object.id}
        onClick={() => selectObject(object.id)}
      >
        <span className={styles.objectSwatch} style={{ backgroundColor: object.color }} aria-hidden="true" />
        Test {object.name}
        {completedIds.includes(object.id) ? <span className={styles.discovered} aria-hidden="true">Discovered</span> : null}
      </button>)}
    </div>

    <div className={styles.actionPanel}>
      <p className={styles.selection}>Selected: {selectedObject?.name ?? "nothing yet"}</p>
      <button className={styles.tryButton} type="button" onClick={observe}>Try the magnet</button>
      <p className={styles.observation}>
        {observed && selectedObject ? `Observation: ${feedback}` : "Observation: try the magnet to see what happens."}
      </p>
      <div className={styles.classify} aria-label="Classify the object">
        <button type="button" onClick={() => classify("attracted")}>Attracted</button>
        <button type="button" onClick={() => classify("not-attracted")}>Not attracted</button>
      </div>
      {feedbackKind === "alert"
        ? <p className={styles.feedback} role="alert">{feedback}</p>
        : <p className={styles.feedback} role="status" aria-live="polite">{feedback}</p>}
    </div>

    {complete ? <p className={styles.complete} role="status">Magnet Lab complete</p> : null}
  </section>;
}
