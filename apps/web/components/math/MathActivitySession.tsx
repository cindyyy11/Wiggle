"use client";

import { Gem } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./MathActivitySession.module.css";
import {
  isCorrectMathAnswer,
  mathActivity,
  type MathRegionId,
  type MathVisual,
} from "./mathActivities";

type MathActivitySessionProps = {
  region: MathRegionId;
  onComplete: (region: MathRegionId) => void;
  onClose: () => void;
};

type Feedback =
  | { kind: "error"; text: string }
  | { kind: "success"; text: string }
  | null;

function FractionVisual({ filled, total }: Extract<MathVisual, { kind: "fraction" }>) {
  return (
    <div className={styles.fractionVisual} role="img" aria-label={`${filled} of ${total} equal parts filled`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          className={`${styles.fractionSegment} ${index < filled ? styles.fractionSegmentFilled : ""}`}
          key={index}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function SequenceVisual({ values }: Extract<MathVisual, { kind: "sequence" }>) {
  const spokenValues = values.map((value) => value ?? "missing number").join(", ");

  return (
    <div className={styles.sequenceVisual} role="img" aria-label={`Number trail: ${spokenValues}`}>
      {values.map((value, index) => (
        <span className={value === null ? styles.missingTile : styles.numberTile} key={index} aria-hidden="true">
          {value ?? "?"}
        </span>
      ))}
    </div>
  );
}

function ShapeVisual({ shape }: Extract<MathVisual, { kind: "shape" }>) {
  const points = {
    triangle: "50,8 92,88 8,88",
    square: "14,14 86,14 86,86 14,86",
    hexagon: "27,10 73,10 94,50 73,90 27,90 6,50",
  }[shape];

  return (
    <svg className={styles.shapeVisual} viewBox="0 0 100 100" role="img" aria-label={shape}>
      <polygon points={points} />
    </svg>
  );
}

function CrystalGroup({ count }: { count: number }) {
  return (
    <span className={styles.crystalGroup} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Gem className={styles.crystal} key={index} strokeWidth={2.5} />
      ))}
    </span>
  );
}

function CrystalVisual({ left, operator, right }: Extract<MathVisual, { kind: "crystals" }>) {
  const operation = operator === "+" ? "plus" : "minus";

  return (
    <div className={styles.crystalVisual} role="img" aria-label={`${left} ${operation} ${right}`}>
      <CrystalGroup count={left} />
      <span className={styles.operator} aria-hidden="true">
        {operator}
      </span>
      <CrystalGroup count={right} />
    </div>
  );
}

function ChallengeVisual({ visual }: { visual: MathVisual }) {
  switch (visual.kind) {
    case "fraction":
      return <FractionVisual {...visual} />;
    case "sequence":
      return <SequenceVisual {...visual} />;
    case "shape":
      return <ShapeVisual {...visual} />;
    case "crystals":
      return <CrystalVisual {...visual} />;
  }
}

export function MathActivitySession({ region, onComplete, onClose }: MathActivitySessionProps) {
  const activity = mathActivity(region);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const completionNotified = useRef(false);
  const firstOptionRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const completionHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (finished) {
      completionHeadingRef.current?.focus();
      return;
    }

    if (feedback?.kind === "error") {
      firstOptionRef.current?.focus();
      return;
    }

    if (feedback?.kind === "success") {
      promptRef.current?.focus();
    }
  }, [challengeIndex, feedback, finished]);

  if (!activity) return null;

  const currentActivity = activity;
  const challenge = currentActivity.challenges[challengeIndex];

  function submitAnswer() {
    if (!selectedAnswer) return;

    if (!isCorrectMathAnswer(challenge, selectedAnswer)) {
      setFeedback({ kind: "error", text: `Try again. ${challenge.hint}` });
      setSelectedAnswer(null);
      return;
    }

    const nextCorrectCount = correctCount + 1;
    setCorrectCount(nextCorrectCount);

    if (challengeIndex === currentActivity.challenges.length - 1) {
      setFinished(true);
      if (!completionNotified.current) {
        completionNotified.current = true;
        onComplete(region);
      }
      return;
    }

    setChallengeIndex((index) => index + 1);
    setSelectedAnswer(null);
    setFeedback({ kind: "success", text: "Correct. Here is the next discovery." });
  }

  const activityStyle = { "--activity-color": currentActivity.color } as CSSProperties;

  if (finished) {
    return (
      <section className={styles.session} style={activityStyle} aria-labelledby="math-completion-title">
        <div className={styles.completionMark} aria-hidden="true">
          <Gem />
        </div>
        <p className={styles.eyebrow}>Activity complete</p>
        <h1 id="math-completion-title" ref={completionHeadingRef} tabIndex={-1}>
          Wonderful exploring!
        </h1>
        <p>
          You made all {correctCount} discoveries in {currentActivity.name}.
        </p>
        <button className={styles.primaryButton} type="button" onClick={onClose}>
          Back to Numeria
        </button>
      </section>
    );
  }

  return (
    <section className={styles.session} style={activityStyle} aria-labelledby="math-activity-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Numeria field activity</p>
          <h1 id="math-activity-title">{currentActivity.name}</h1>
        </div>
        <p className={styles.progress} aria-live="polite">
          Challenge {challengeIndex + 1} of {currentActivity.challenges.length}
        </p>
      </header>

      <p className={styles.instruction}>{currentActivity.instruction}</p>

      <div className={styles.visualStage}>
        <ChallengeVisual visual={challenge.visual} />
      </div>

      <h2 className={styles.prompt} ref={promptRef} tabIndex={-1}>
        {challenge.prompt}
      </h2>

      <div className={styles.options} role="radiogroup" aria-label="Answer choices">
        {challenge.options.map((option) => {
          const isSelected = selectedAnswer === option;
          return (
            <label className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`} key={option}>
              <input
                checked={isSelected}
                aria-checked={isSelected}
                name={`answer-${challenge.id}`}
                onChange={() => {
                  setSelectedAnswer(option);
                  setFeedback(null);
                }}
                ref={option === challenge.options[0] ? firstOptionRef : undefined}
                type="radio"
                value={option}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>

      {feedback ? (
        <p
          className={`${styles.feedback} ${feedback.kind === "error" ? styles.feedbackError : styles.feedbackSuccess}`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : (
        <div className={styles.feedbackPlaceholder} aria-hidden="true" />
      )}

      <button
        className={styles.primaryButton}
        disabled={!selectedAnswer}
        onClick={submitAnswer}
        type="button"
      >
        Check answer
      </button>
    </section>
  );
}
