"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { UniverseCanvas } from "../universe/UniverseCanvas";
import { ViewTools } from "../universe/ViewTools";
import { createExplorerInput, destinationFromPoint, type CameraMode, type CameraPose, type Destination, type QualityPreference } from "../universe/world";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import { ScienceHud } from "./ScienceHud";
import { scienceLand } from "./scienceLands";
import { MagnetLabMission } from "./MagnetLabMission";
import { ScienceExplorerBridge } from './ScienceExplorerBridge';
import { ScienceSessionFrame } from './ScienceSessionFrame';
import { ScienceHandSession } from './ScienceHandSession';
import { isEntryKey, LAND_GUIDES } from './scienceInvitation';
import type { StarterLand, StarterProgress } from './scienceActivities';
import sessionStyles from './ScienceSession.module.css';
import styles from "./sciencePlanet.module.css";

export type SciencePlanetCanvasProps = {
  quality?: QualityPreference; reducedMotion?: boolean; selectedZone: ScienceZoneId;
  onZoneSelect: (zone: ScienceZoneId) => void; onBackToWorlds: () => void;
  onStartMagnetLab?: () => void; completionMessage?: string;
  onSessionOpenChange?: (open: boolean) => void;
};
export function SciencePlanetCanvas(props: SciencePlanetCanvasProps) {
  const [mode, setMode] = useState<CameraMode>("globe");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [session, setSession] = useState<ScienceZoneId | null>(null);
  const [nearby, setNearby] = useState<ScienceZoneId | null>(null);
  const [dismissed, setDismissed] = useState<ScienceZoneId | null>(null);
  const [invitation, setInvitation] = useState<ScienceZoneId | null>(null);
  const [selectedZone, setSelectedZone] = useState<ScienceZoneId>(scienceLand(props.selectedZone).id);
  const [completed, setCompleted] = useState(false);
  const [available, setAvailable] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [progress, setProgress] = useState<Record<StarterLand, StarterProgress>>({ animals: { observed: [], matched: [] }, colors: { observed: [], matched: [] }, 'life-cycle': { observed: [], matched: [] } });
  const input = useRef(createExplorerInput());
  const entry = useRef<{ position: Destination; mode: CameraMode; camera?: CameraPose } | null>(null);
  const active = session === 'magnet-lab';
  const paused = !!session;
  useEffect(() => { setSelectedZone(scienceLand(props.selectedZone).id); }, [props.selectedZone]);
  useEffect(() => { input.current.paused = paused; if (paused) { input.current.keys.clear(); input.current.destination = null; } }, [paused]);
  const onNearby = useCallback((land: ScienceZoneId | null) => { setNearby(land); setDismissed(null); setInvitation(land); }, []);
  const walk = (point: Destination) => { setDestination({ ...point }); input.current.destination = { ...point }; setMode("follow"); };
  const select = (zone: ScienceZoneId) => { setSelectedZone(zone); props.onZoneSelect(zone); setDismissed(null); setInvitation(available ? null : zone); walk(scienceLand(zone).destination); if (nearby === zone) setInvitation(zone); };
  const start = useCallback((zone: ScienceZoneId) => {
    entry.current = { position: destinationFromPoint(...input.current.position), mode, camera: input.current.cameraPose };
    input.current.keys.clear(); input.current.horizontal = 0; input.current.vertical = 0; input.current.destination = null; input.current.hop = false;
    input.current.paused = true; setSession(zone); setInvitation(null);
    if (zone === 'magnet-lab') props.onStartMagnetLab?.();
    props.onSessionOpenChange?.(true);
  }, [mode, props]);
  const close = useCallback(() => {
    setSession(null);
    input.current.paused = false; input.current.keys.clear(); input.current.horizontal = 0; input.current.vertical = 0; input.current.destination = null; input.current.hop = false;
    setDestination(null);
    if (entry.current) { input.current.teleport = entry.current.position; input.current.restoreCamera = entry.current.camera; setMode(entry.current.mode); }
    setDismissed(nearby); setInvitation(null); setResetKey(key => key + 1);
    props.onSessionOpenChange?.(false);
  }, [nearby, props]);
  const shownInvitation = !session && invitation !== dismissed ? invitation : null;
  useEffect(() => {
    if (!shownInvitation) return;
    const key = (event: KeyboardEvent) => { if (isEntryKey(event)) { event.preventDefault(); start(shownInvitation); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [shownInvitation, start]);
  const explore = () => { if (available && nearby !== selectedZone) select(selectedZone); else { setDismissed(null); setInvitation(selectedZone); } };
  const starter = session && session !== 'magnet-lab' ? session as StarterLand : null;
  return <ScienceSessionFrame open={!!session} name={scienceLand(session ?? selectedZone).name} onClose={close}>
    <div inert={!!session} aria-hidden={session ? true : undefined}>
    <UniverseCanvas explorerInput={input} controlsDisabled={paused} resetViewKey={resetKey} theme="science" className={styles.spaceWorld} quality={props.quality} reducedMotion={props.reducedMotion} mode={mode} destination={destination} onSceneAvailability={setAvailable}
      sceneContent={<ScienceExplorerBridge onNearby={onNearby} onVisit={select} paused={!!session} />}
      hud={<div className={styles.spaceHud}>
        <ScienceHud {...props} selectedZone={selectedZone} onExplore={explore} onStartMagnetLab={explore} onZoneSelect={select} completionMessage={completed ? "Wonderful exploring! Magnet Lab complete." : props.completionMessage} />
        <ViewTools mode={mode} input={input} zoom={available} onToggleMode={() => setMode(mode === "globe" ? "follow" : "globe")} onReset={() => { setResetKey(key => key + 1); setMode("globe"); }} />
        {shownInvitation ? <section className={sessionStyles.invitation} aria-label={scienceLand(shownInvitation).name + " invitation"}><div className={sessionStyles.guideFace} data-guide={shownInvitation} aria-hidden="true"><i /><i /></div><div><h2>{LAND_GUIDES[shownInvitation].name}</h2><p>{LAND_GUIDES[shownInvitation].message}</p><div className={sessionStyles.inviteActions}><button type="button" onClick={() => start(shownInvitation)}>Let’s explore <kbd>B</kbd></button><button type="button" onClick={() => { setDismissed(shownInvitation); setInvitation(null); }}>Not now</button></div></div></section> : null}
      </div>}
    />
    </div>
    {active ? <div className={sessionStyles.magnetOverlay} data-session-controls><MagnetLabMission manageFocus={false} onExit={close} onComplete={() => setCompleted(true)} /></div> : null}
    {starter ? <ScienceHandSession key={starter} land={starter} progress={progress[starter]} onProgress={value => setProgress(previous => ({ ...previous, [starter]: value }))} onClose={close} /> : null}
  </ScienceSessionFrame>;
}
