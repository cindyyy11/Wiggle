"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { CameraMode, Landmark, LandmarkId } from "./world";
import { LANDMARKS } from "./world";
import styles from "./explorationHud.module.css";

type ExplorationHudProps = {
  mode: CameraMode;
  mapVisible: boolean;
  selectedLandmark: LandmarkId;
  landmark: Landmark;
  help: boolean;
  onHelpChange: (value: boolean) => void;
  onModeChange: (mode: CameraMode) => void;
  onToggleMap: () => void;
  onSelectLandmark: (id: LandmarkId) => void;
  onMissionStart?: () => void;
  instructionsId: string;
  missionVisible: boolean;
};

export function ExplorationHud({ mode, mapVisible, selectedLandmark, landmark, help, onHelpChange, onModeChange, onToggleMap, onSelectLandmark, onMissionStart, instructionsId, missionVisible }: ExplorationHudProps) {
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const showNavigator = mapVisible || navigatorOpen;
  const canStartMission = selectedLandmark === "fraction-forest" && !!onMissionStart;

  useEffect(() => {
    if (!navigatorOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setNavigatorOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [navigatorOpen]);

  useEffect(() => { if (missionVisible) setNavigatorOpen(false); }, [missionVisible]);

  if (missionVisible && !mapVisible) return null;

  return <>
    <header className={styles.topbar}>
      <a className={styles.brand} href="/" aria-label="Wiggle home"><img src="/brand/wiggle-mark.png" alt="" /></a>
      <div className={styles.location} aria-label="Current world"><span>WIGGLE SPACE</span><strong>Numeria</strong></div>
      <div className={styles.actions}>
        <div className={styles.viewSwitch} role="group" aria-label="View controls">
          <button type="button" className={mode === "globe" ? styles.selected : ""} aria-label="Globe view" aria-pressed={mode === "globe"} onClick={() => onModeChange("globe")}>Globe</button>
          <button type="button" className={mode === "follow" ? styles.selected : ""} aria-label="Follow explorer" aria-pressed={mode === "follow"} onClick={() => onModeChange("follow")}>Follow</button>
        </div>
        <button type="button" className={styles.tool} onClick={() => setNavigatorOpen(value => !value)} aria-expanded={showNavigator} aria-controls="numeria-places">Places</button>
        <button type="button" className={styles.tool} onClick={onToggleMap} aria-label={mapVisible ? "Try 3D view" : "Use 2D map"}>{mapVisible ? "3D" : "2D"}</button>
        <button type="button" className={styles.tool} onClick={() => onHelpChange(!help)} aria-label="How to explore" aria-expanded={help}>Help</button>
        <a className={styles.parent} href="/parent" aria-label="Parent mission control">Parent</a>
      </div>
    </header>

    {!missionVisible ? <aside className={styles.context} style={{ "--region": landmark.color } as CSSProperties} aria-label="Selected destination">
      <span className={styles.contextLabel}>{selectedLandmark === "fraction-forest" ? "BEACON NEARBY" : "COURSE SET"}</span>
      <h2>{landmark.name}</h2>
      <p>{landmark.subtitle}</p>
      {canStartMission ? <button type="button" className={styles.primary} onClick={onMissionStart}>Start fractions mission <span aria-hidden="true">↗</span></button> : <button type="button" className={styles.primary} onClick={() => { onSelectLandmark(selectedLandmark); onModeChange("follow"); }}>Let's explore <span aria-hidden="true">↗</span></button>}
    </aside> : null}

    {showNavigator ? <nav id="numeria-places" className={styles.navigator} aria-label="Numeria destinations">
      <div className={styles.navigatorHead}><span>MISSION CONSTELLATION</span>{!mapVisible ? <button type="button" className={styles.close} onClick={() => setNavigatorOpen(false)} aria-label="Close places">Close</button> : null}</div>
      <div className={styles.placeList}>{LANDMARKS.map(item => <button type="button" key={item.id} className={item.id === selectedLandmark ? styles.placeSelected : ""} onClick={() => { onSelectLandmark(item.id); onModeChange("follow"); setNavigatorOpen(false); }} aria-label={`Visit ${item.name}`} aria-pressed={item.id === selectedLandmark}><span className={styles.placeDot} style={{ "--region": item.color } as CSSProperties} aria-hidden="true">{item.symbol}</span><span>{item.name}</span><span className={styles.arrow} aria-hidden="true">↗</span></button>)}</div>
    </nav> : null}

    {help ? <aside className={styles.help} aria-label="Exploration instructions"><h2>Make yourself at home.</h2><p id={instructionsId}>Drag to look around. Scroll or pinch to zoom. Tap the ground to walk. Focus the movement pad and use arrows or WASD. Hold Shift to run. Space to hop.</p><p>Choose a place from the constellation when you want a new course.</p><button type="button" onClick={() => onHelpChange(false)}>Got it</button></aside> : null}
  </>;
}
