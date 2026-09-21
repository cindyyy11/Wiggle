"use client";

import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { UniverseCanvas } from "../universe/UniverseCanvas";
import { MISSION_DESTINATION, type CameraMode, type Destination, type LandmarkId, type QualityPreference } from "../universe/world";
import type { ApiClient } from "../../lib/api/client";
import { WIGGLE_REWARD } from "../../lib/demo/seed";
import { FractionMission } from "./FractionMission";
import { useFractionMission } from "./useFractionMission";
import { MATHS_MISSION_BLOCKED_MESSAGE } from "../math/mathNavigation";
import styles from "./mission.module.css";

export interface MissionAtlasProps {
  quality?: QualityPreference;
  client?: ApiClient;
  childId?: string;
  allowLocalFallback?: boolean;
  showSplash?: boolean;
  onMissionOverlayChange?: (open: boolean) => void;
  onWorldsRequest?: () => void;
}
type SplashState = "ready" | "leaving" | "complete";
const SPLASH_DISPLAY_MS = 900;
const SPLASH_EXIT_DELAY_MS = 320;
export function MissionAtlas({ quality = "auto", client, childId, allowLocalFallback = true, showSplash = true, onMissionOverlayChange, onWorldsRequest }: MissionAtlasProps) {
  const [camera, setCamera] = useState<CameraMode>("follow");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [landmark, setLandmark] = useState<LandmarkId>("fraction-forest");
  const [splashState, setSplashState] = useState<SplashState>(showSplash ? "ready" : "complete");
  const splashStarting = useRef(false);
  const splashTimeout = useRef<number | null>(null);

  useEffect(() => () => {
    if (splashTimeout.current !== null) window.clearTimeout(splashTimeout.current);
  }, []);

  const startSplash = () => {
    if (splashStarting.current) return;
    splashStarting.current = true;
    setSplashState("leaving");
    try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.setValueAtTime(440, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660, audio.currentTime + 0.22);
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.3);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.31);
      window.setTimeout(() => void audio.close(), 500);
    } catch { /* Audio is optional. */ }
    splashTimeout.current = window.setTimeout(
      () => setSplashState("complete"),
      SPLASH_EXIT_DELAY_MS,
    );
  };

  useEffect(() => {
    if (splashState !== "ready") return;
    const autoStart = window.setTimeout(startSplash, SPLASH_DISPLAY_MS);
    return () => window.clearTimeout(autoStart);
  }, [splashState]);

  const [host] = useState(() => ({
    showMission: () => { setLandmark("fraction-forest"); setDestination(MISSION_DESTINATION); setCamera("mission"); },
    hideMission: () => {
      setCamera("follow"); setDestination(null);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="Selected destination"] button')?.focus());
    },
  }));
  const mission = useFractionMission({ client, childId, allowLocalFallback, onMissionOverlayChange, host });
  const splashVisible = splashState !== "complete";
  return <><div inert={splashVisible} aria-hidden={splashVisible}><UniverseCanvas quality={quality} className={`${styles.atlas} ${mission.phase ? styles.active : ""} ${mission.phase === "stuck" ? styles.simplified : ""}`} mode={camera} onModeChange={setCamera} destination={destination} onDestinationChange={setDestination} selectedLandmark={landmark} onLandmarkSelect={setLandmark} onMissionStart={mission.start} onWorldsRequest={onWorldsRequest} worldsDisabled={mission.missionOverlayOpen} worldsDisabledMessage={MATHS_MISSION_BLOCKED_MESSAGE} pizza={mission.pizza}>
    <div className={styles.atlasHud} aria-label="Mission Atlas progress"><span>MISSION ATLAS</span><strong>{mission.completed} discoveries</strong><small><Zap aria-hidden="true" size={12} /> {mission.completed * WIGGLE_REWARD} Wiggle Energy</small></div>
    {!mission.phase && mission.busy ? <p className={styles.starting} role="status">Your mission is coming into view…</p> : null}
    {!mission.phase && mission.feedback ? <p className={styles.starting} role="alert">{mission.feedback}</p> : null}
    {mission.missionProps ? <FractionMission {...mission.missionProps} /> : null}
  </UniverseCanvas></div>{splashVisible ? <section className={`${styles.splash} ${splashState === "leaving" ? styles.splashLeaving : ""}`} aria-label="Welcome to Wiggle"><img className={styles.splashBrand} src="/brand/wiggle-full.jpeg" alt="Wiggle. Wonder. Wow!" /></section> : null}</>;
}
