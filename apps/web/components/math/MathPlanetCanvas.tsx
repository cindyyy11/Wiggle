"use client";

import { useRef, useState } from "react";
import { ActivitySessionFrame } from "../planet/ActivitySessionFrame";
import { UniverseCanvas } from "../universe/UniverseCanvas";
import { ViewTools } from "../universe/ViewTools";
import { createExplorerInput, LANDMARKS, type CameraMode, type Destination, type LandmarkId } from "../universe/world";
import { MathActivitySession } from "./MathActivitySession";
import { MathHud } from "./MathHud";
import type { MathPlanetProps } from "./MathPlanet";
import { MATH_ACTIVITIES, type MathRegionId } from "./mathActivities";
import styles from "./mathPlanet.module.css";

export function MathPlanetCanvas({ quality, reducedMotion, onBackToWorlds, onSessionOpenChange }: MathPlanetProps) {
  const [selectedRegion, setSelectedRegion] = useState<MathRegionId>("fraction-forest");
  const [session, setSession] = useState<MathRegionId | null>(null);
  const [completedRegions, setCompletedRegions] = useState<ReadonlySet<MathRegionId>>(() => new Set());
  const [mode, setMode] = useState<CameraMode>("globe");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [completionMessage, setCompletionMessage] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [sceneAvailable, setSceneAvailable] = useState(true);
  const input = useRef(createExplorerInput());
  const regionName = LANDMARKS.find((landmark) => landmark.id === (session ?? selectedRegion))!.name;
  // The HUD reads all four mappings. Keep a broken registry recoverable before
  // rendering it, as well as validating the chosen activity when opening it.
  const activitiesAvailable = LANDMARKS.every((landmark) => landmark.id === "lexi" || !!MATH_ACTIVITIES[landmark.id]);

  function walkTo(next: Destination) {
    const destination = { ...next };
    input.current.destination = destination;
    setDestination(destination);
  }

  function selectRegion(id: LandmarkId) {
    if (session) return;
    if (id === "lexi") {
      // UniverseCanvas updates its walking destination before reporting which
      // landmark was selected. Keep Lexi outside the Maths controller and put
      // both controlled destination owners back on the active Maths region.
      const selectedLandmark = LANDMARKS.find((entry) => entry.id === selectedRegion);
      if (selectedLandmark) walkTo(selectedLandmark.destination);
      return;
    }
    const landmark = LANDMARKS.find((entry) => entry.id === id);
    if (!landmark) return;
    setSelectedRegion(id);
    walkTo(landmark.destination);
    setMode("follow");
    setUnavailable(false);
    setCompletionMessage("");
  }

  function openSession() {
    if (!MATH_ACTIVITIES[selectedRegion]) {
      setUnavailable(true);
      return;
    }
    input.current.paused = true;
    input.current.keys.clear();
    input.current.horizontal = 0;
    input.current.vertical = 0;
    input.current.hop = false;
    input.current.running = false;
    input.current.destination = null;
    setCompletionMessage("");
    setSession(selectedRegion);
    onSessionOpenChange?.(true);
  }

  function closeSession() {
    if (!session) return;
    if (completedRegions.has(session)) setCompletionMessage(`Wonderful exploring! ${regionName} complete.`);
    input.current.paused = false;
    setDestination(null);
    setSession(null);
    onSessionOpenChange?.(false);
  }

  function completeRegion(region: MathRegionId) {
    if (region === session) setCompletedRegions((previous) => new Set(previous).add(region));
  }

  return <ActivitySessionFrame open={session !== null} name={regionName} onClose={closeSession}>
    <div inert={session !== null} aria-hidden={session ? true : undefined}>
      <UniverseCanvas
        theme="math"
        className={styles.spaceWorld}
        quality={quality}
        reducedMotion={reducedMotion}
        mode={mode}
        onModeChange={setMode}
        destination={destination}
        onDestinationChange={setDestination}
        selectedLandmark={selectedRegion}
        onLandmarkSelect={selectRegion}
        explorerInput={input}
        controlsDisabled={session !== null}
        resetViewKey={resetKey}
        onSceneAvailability={setSceneAvailable}
        hud={<div className={styles.spaceHud}>
          {activitiesAvailable && !unavailable ? <MathHud
            selectedRegion={selectedRegion}
            completedRegions={completedRegions}
            onRegionSelect={selectRegion}
            onExplore={openSession}
            onBackToWorlds={onBackToWorlds}
          /> : <div className={styles.unavailable}>
            <p role="status" aria-live="polite">Numeria activities are unavailable right now. Please return to Worlds.</p>
            <button type="button" className={styles.backButton} onClick={onBackToWorlds}>Back to Worlds</button>
          </div>}
          <ViewTools
            mode={mode}
            input={input}
            zoom={sceneAvailable}
            onToggleMode={() => setMode((current) => current === "globe" ? "follow" : "globe")}
            onReset={() => { setResetKey((key) => key + 1); setMode("globe"); }}
          />
          <p className={styles.returnAnnouncement} role="status" aria-live="polite">{completionMessage}</p>
        </div>}
      />
    </div>
    {session ? <div className={styles.sessionOverlay} data-session-controls>
      <div className={styles.sessionToolbar}>
        <button type="button" className={styles.backButton} onClick={closeSession}>Close activity</button>
      </div>
      <MathActivitySession key={session} region={session} onComplete={completeRegion} onClose={closeSession} />
    </div> : null}
  </ActivitySessionFrame>;
}
