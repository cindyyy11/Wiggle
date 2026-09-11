import { useState } from "react";
import { useGestureControls } from "../../features/gestures/useGestureControls";
import { dispatchGesture, sliceAt, type MissionInputCommands } from "../../features/gestures/commands";
import styles from "./mission.module.css";

export function GestureControls({ enabled, onEnable, onDisable, commands }: { enabled: boolean; onEnable(): void; onDisable(): void; commands: MissionInputCommands }) {
  const [preview, setPreview] = useState(false);
  const [target, setTarget] = useState(0);
  const { video, status } = useGestureControls(enabled, event => { setTarget(sliceAt(event.x)); dispatchGesture(event, commands); });
  return <div className={styles.gestures} aria-label="Gesture controls">
    <p role="status">{status === "starting" ? "Opening camera… You can still use the slice buttons." : status === "ready" ? "Camera on · Processed only on this device. Frames are never sent." : status === "unavailable" ? "Camera unavailable. Keep playing with the slice buttons." : "Camera off. Every action works with buttons."}</p>
    <video ref={video} muted playsInline aria-label="Local camera preview" className={styles.preview} hidden={!preview || status !== "ready"} />
    {enabled ? <button onClick={onDisable}>Turn camera off</button> : <button onClick={onEnable}>Use camera gestures</button>}
    {status === "ready" ? <><button aria-pressed={preview} onClick={() => setPreview(value => !value)}>{preview ? "Hide" : "Show"} camera preview</button><p>Move across four equal zones, left to right: slices 1–4. Point or pinch to toggle; fist to grab; open palm for Lexi. Relax your hand between actions.</p><p aria-live="polite">Last gesture target: slice {target + 1}</p></> : null}
    <label>Grab a slice <select aria-label="Slice to grab" value={target} onChange={event => setTarget(Number(event.target.value))}>{[0, 1, 2, 3].map(index => <option key={index} value={index}>Slice {index + 1}</option>)}</select></label>
    <button onClick={() => commands.grabSlice(target)}>Grab slice {target + 1}</button>
  </div>;
}
