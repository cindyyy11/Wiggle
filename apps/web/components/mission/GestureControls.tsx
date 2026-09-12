import { useState } from "react";
import type { HandTrackingState } from "../../features/gestures/useHandTracking";
import type { MissionInputCommands } from "../../features/gestures/commands";
import styles from "./mission.module.css";

export function GestureControls({ enabled, onEnable, onDisable, commands, tracking }: { enabled: boolean; onEnable(): void; onDisable(): void; commands: MissionInputCommands; tracking: HandTrackingState }) {
  const [preview, setPreview] = useState(false);
  const [target, setTarget] = useState(0);
  const { video, status } = tracking;
  return <div className={styles.gestures} aria-label="Gesture controls">
    <p role="status">{status === "starting" ? "Opening camera… You can still use the slice buttons." : status === "ready" ? "Camera on · Point at a slice, pinch or make a fist to move it to the plate. Frames stay on this device." : status === "unavailable" ? "Camera unavailable. Keep playing with the slice buttons." : "Camera off. Every action works with buttons."}</p>
    <video ref={video} muted playsInline aria-label="Local camera preview" className={styles.preview} hidden={!preview || status !== "ready"} />
    {enabled ? <button onClick={onDisable}>Turn camera off</button> : <button onClick={onEnable}>Use camera gestures</button>}
    {status === "ready" ? <><button aria-pressed={preview} onClick={() => setPreview(value => !value)}>{preview ? "Hide" : "Show"} camera preview</button><p>Point to see which slice is ready. Pinch or make a fist to pick it up, then release over the plate. Open your palm at Lexi for help.</p></> : null}
    <label>Choose a slice <select aria-label="Slice to grab" value={target} onChange={event => setTarget(Number(event.target.value))}>{[0, 1, 2, 3].map(index => <option key={index} value={index}>Slice {index + 1}</option>)}</select></label>
    <button onClick={() => commands.placeSlice?.(target)}>Place slice {target + 1}</button>
    <button onClick={() => commands.returnSlice?.(target)}>Return slice {target + 1}</button>
  </div>;
}
