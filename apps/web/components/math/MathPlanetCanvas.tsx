"use client";

import { useRef, useState } from "react";
import { ActivitySessionFrame } from "../planet/ActivitySessionFrame";
import { PlanetCompletionCheer } from "../planet/PlanetCompletionCheer";
import { shouldQueueCheer } from "../planet/planetCheerGate";
import { FractionMission } from "../mission/FractionMission";
import { useFractionMission } from "../mission/useFractionMission";
import missionStyles from "../mission/mission.module.css";
import { UniverseCanvas } from "../universe/UniverseCanvas";
import { ViewTools } from "../universe/ViewTools";
import { createExplorerInput, LANDMARKS, MISSION_DESTINATION, type CameraMode, type Destination, type LandmarkId } from "../universe/world";
import { answerSetFor, type MathHandRegion } from "../handActivity/answerSets";
import { MathHandSession } from "./MathHandSession";
import { MathHud } from "./MathHud";
import type { MathPlanetProps } from "./MathPlanet";
import { MATH_ACTIVITIES, type MathRegionId } from "./mathActivities";
import styles from "./mathPlanet.module.css";

const FRACTION_FOREST = LANDMARKS.find((landmark) => landmark.id === "fraction-forest")!;
const CHEER_TITLE = "You did it!";
const CHEER_BODY = "All four Numeria regions explored — you're a Numeria explorer!";

function focusFractionForestExplore() {
  Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.textContent === `Explore ${FRACTION_FOREST.name}`)?.focus();
}

export function MathPlanetCanvas({ quality, reducedMotion, childId, allowLocalFallback, client, onBackToWorlds, onSessionOpenChange }: MathPlanetProps) {
  const [selectedRegion, setSelectedRegion] = useState<MathRegionId>("fraction-forest");
  const [session, setSession] = useState<MathRegionId | null>(null);
  const [completedRegions, setCompletedRegions] = useState<ReadonlySet<MathRegionId>>(() => new Set());
  const [mode, setMode] = useState<CameraMode>("globe");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [completionMessage, setCompletionMessage] = useState("");
  const [showCheer, setShowCheer] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [sceneAvailable, setSceneAvailable] = useState(true);
  const input = useRef(createExplorerInput());
  const missionCompleted = useRef(false);
  const cheerShown = useRef(false);
  const pendingCheer = useRef(false);

  function revealCheerIfPending() {
    if (pendingCheer.current && !cheerShown.current) {
      pendingCheer.current = false;
      cheerShown.current = true;
      setShowCheer(true);
    }
  }

  function markRegionComplete(region: MathRegionId) {
    setCompletedRegions((previous) => {
      if (previous.has(region)) return previous;
      const next = new Set(previous).add(region);
      if (shouldQueueCheer(previous.size, next.size, cheerShown.current)) pendingCheer.current = true;
      return next;
    });
  }

  // Fraction Forest runs the real, API-backed fractions mission in this same world, so the
  // Twin and parent insights see it. The other regions keep their local field activities.
  const mission = useFractionMission({
    client,
    childId,
    allowLocalFallback,
    onMissionOverlayChange: onSessionOpenChange,
    host: {
      showMission() {
        setSelectedRegion("fraction-forest");
        walkTo(MISSION_DESTINATION);
        setMode("mission");
        setUnavailable(false);
        setCompletionMessage("");
      },
      hideMission() {
        input.current.destination = null;
        setDestination(null);
        setMode("follow");
        if (missionCompleted.current) {
          missionCompleted.current = false;
          setCompletionMessage(`Wonderful exploring! ${FRACTION_FOREST.name} complete.`);
        }
        revealCheerIfPending();
        requestAnimationFrame(focusFractionForestExplore);
      },
      missionCompleted() {
        missionCompleted.current = true;
        markRegionComplete("fraction-forest");
      },
    },
  });
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
    if (selectedRegion === "fraction-forest") {
      mission.start();
      return;
    }
    if (!MATH_ACTIVITIES[selectedRegion] || answerSetFor(selectedRegion) === undefined) {
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
    revealCheerIfPending();
    onSessionOpenChange?.(false);
  }

  function completeRegion(region: MathRegionId) {
    if (region === session) markRegionComplete(region);
  }

  return <ActivitySessionFrame open={session !== null} name={regionName} onClose={closeSession}>
    <div inert={session !== null} aria-hidden={session ? true : undefined}>
      <UniverseCanvas
        theme="math"
        className={`${styles.spaceWorld} ${missionStyles.atlas} ${mission.phase ? missionStyles.active : ""} ${mission.phase === "stuck" ? missionStyles.simplified : ""}`}
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
        pizza={mission.pizza}
        onSceneAvailability={setSceneAvailable}
        hud={<div className={styles.spaceHud}>
          {mission.missionOverlayOpen ? null : activitiesAvailable && !unavailable ? <MathHud
            selectedRegion={selectedRegion}
            completedRegions={completedRegions}
            onRegionSelect={selectRegion}
            onExplore={openSession}
            onBackToWorlds={onBackToWorlds}
          /> : <div className={styles.unavailable}>
            <p role="status" aria-live="polite">Numeria activities are unavailable right now. Please return to Worlds.</p>
            <button type="button" className={styles.backButton} onClick={onBackToWorlds}>Back to Worlds</button>
          </div>}
          {mission.missionOverlayOpen ? null : <ViewTools
            mode={mode}
            input={input}
            zoom={sceneAvailable}
            onToggleMode={() => setMode((current) => current === "globe" ? "follow" : "globe")}
            onReset={() => { setResetKey((key) => key + 1); setMode("globe"); }}
          />}
          <p className={styles.returnAnnouncement} role="status" aria-live="polite">{completionMessage}</p>
        </div>}
      >
        {!mission.phase && mission.busy ? <p className={missionStyles.starting} role="status">Your mission is coming into view…</p> : null}
        {!mission.phase && mission.feedback ? <p className={missionStyles.starting} role="alert">{mission.feedback}</p> : null}
        {mission.missionProps ? <FractionMission {...mission.missionProps} /> : null}
      </UniverseCanvas>
    </div>
    {session ? <div className={styles.handOverlay} data-session-controls>
      {/* Safe: openSession only sets `session` for a region confirmed by answerSetFor. */}
      <MathHandSession key={session} region={session as MathHandRegion} onComplete={completeRegion} onClose={closeSession} />
    </div> : null}
    {showCheer ? <PlanetCompletionCheer title={CHEER_TITLE} body={CHEER_BODY} onDismiss={() => setShowCheer(false)} /> : null}
  </ActivitySessionFrame>;
}
