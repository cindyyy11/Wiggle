import type { LearningMode } from "@wiggle/contracts";
import { modeLabels } from "../../lib/demo/seed";
import styles from "./mission.module.css";

export function LessonMorph({ mode }: { mode: LearningMode }) {
  return <div className={styles.morph} role="status" data-lesson-morph={mode}><span aria-hidden="true">✧</span> Your pizza is ready.<small>{modeLabels[mode]} · same three quarters</small></div>;
}
