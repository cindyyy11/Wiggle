"use client";

import { Globe, LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";
import type { CameraMode, InputRef } from "./world";
import styles from "./viewTools.module.css";

export type ViewToolsProps = {
  mode: CameraMode;
  input: InputRef;
  onToggleMode: () => void;
  onReset: () => void;
  zoom?: boolean;
};

export function ViewTools({ mode, input, onToggleMode, onReset, zoom = true }: ViewToolsProps) {
  const globe = mode === "globe";
  const ModeIcon = globe ? LocateFixed : Globe;

  return <div className={styles.tools}>
    <button type="button" className={styles.tool} onClick={onToggleMode}>
      <ModeIcon aria-hidden="true" size={18} />
      <span className={styles.label}>{globe ? "Follow explorer" : "View whole planet"}</span>
    </button>
    <button type="button" className={styles.tool} aria-label="Reset view" onClick={onReset}>
      <RotateCcw aria-hidden="true" size={18} />
      <span className={styles.label} aria-hidden="true">Reset view</span>
    </button>
    {zoom ? <div className={styles.zoom} role="group" aria-label="Zoom">
      <button type="button" className={styles.tool} aria-label="Zoom in" onClick={() => { input.current.zoom -= 1; }}><Plus aria-hidden="true" size={20} /></button>
      <button type="button" className={styles.tool} aria-label="Zoom out" onClick={() => { input.current.zoom += 1; }}><Minus aria-hidden="true" size={20} /></button>
    </div> : null}
  </div>;
}
