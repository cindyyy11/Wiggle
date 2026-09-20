"use client";

import React, { Component, useCallback, useEffect, useId, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent } from "react";
import dynamic from "next/dynamic";
import { Sparkle } from "lucide-react";
import { LANDMARKS, MISSION_DESTINATION, createExplorerInput, resolveQuality, type CameraMode, type Destination, type LandmarkId, type PizzaPresentation, type QualityPreference, type SceneQuality } from "./world";
import { ExplorationHud } from "./ExplorationHud";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import styles from "./universe.module.css";

const Scene = dynamic(() => import("./UniverseScene"), { ssr: false, loading: () => <div className={styles.loading} role="status">Gathering a little stardust…</div> });

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const MOVEMENT_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "shift"];

export interface UniverseCanvasProps {
  explorerInput?: import('./world').InputRef;
  controlsDisabled?: boolean;
  activityView?: import("./activityCamera").ActivityView;
  resetViewKey?: number;
  theme?: "math" | "science";
  sceneContent?: ReactNode;
  hud?: ReactNode;
  onSceneAvailability?: (available: boolean) => void;
  mode?: CameraMode;
  onModeChange?: (mode: CameraMode) => void;
  quality?: QualityPreference;
  reducedMotion?: boolean;
  destination?: Destination | null;
  onDestinationChange?: (destination: Destination) => void;
  selectedLandmark?: LandmarkId;
  onLandmarkSelect?: (id: LandmarkId) => void;
  onMissionStart?: () => void;
  onWorldsRequest?: () => void;
  worldsDisabled?: boolean;
  worldsDisabledMessage?: string;
  pizza?: PizzaPresentation;
  children?: ReactNode;
  className?: string;
}

export function UniverseCanvas({ explorerInput, controlsDisabled = false, resetViewKey, activityView, theme = "math", sceneContent, hud, onSceneAvailability, mode: controlledMode, onModeChange, quality: preference = "auto", reducedMotion: reducedMotionOverride, destination, onDestinationChange, selectedLandmark: controlledLandmark, onLandmarkSelect, onMissionStart, onWorldsRequest, worldsDisabled = false, worldsDisabledMessage = "Worlds are unavailable right now.", pizza, children, className = "" }: UniverseCanvasProps) {
  const [localMode, setLocalMode] = useState<CameraMode>("follow");
  const [localLandmark, setLocalLandmark] = useState<LandmarkId>("fraction-forest");
  const [quality, setQuality] = useState<SceneQuality>("fallback");
  const [userMap, setUserMap] = useState(false);
  const [failed, setFailed] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [help, setHelp] = useState(false);
  const [running, setRunning] = useState(false);
  const [announcement, setAnnouncement] = useState(theme === "science" ? "Welcome to Science Planet. Choose a discovery checkpoint or walk around." : "Welcome, explorer. Your next adventure is in Fraction Forest.");
  const localInput = useRef(createExplorerInput());
  const input = explorerInput ?? localInput;
  const activePointer = useRef<number | null>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const instructionsId = useId();
  const mode = controlledMode ?? localMode;
  const selectedLandmark = controlledLandmark ?? localLandmark;
  const landmark = LANDMARKS.find(item => item.id === selectedLandmark) ?? LANDMARKS[0];
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;
  const mapVisible = quality === "fallback" || userMap || failed;
  const hand = pizza?.hand;
  useEffect(() => { onSceneAvailability?.(!mapVisible); }, [mapVisible, onSceneAvailability]);
  const handFrame = hand?.latest.current;
  const handDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("handDebug") === "1";

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setSystemReducedMotion(media.matches);
    change(); media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    if (preference === "fallback") { setQuality("fallback"); return; }
    const canvas = document.createElement("canvas");
    let supported = false;
    try {
      const context = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      supported = !!context;
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { supported = false; }
    const device = navigator as Navigator & { deviceMemory?: number };
    setQuality(resolveQuality(preference, supported, device.deviceMemory, device.hardwareConcurrency || 8));
  }, [preference]);

  useEffect(() => { if (mode === "mission" && destination === undefined) input.current.destination = MISSION_DESTINATION; }, [mode, destination]);
  useEffect(() => { if (destination !== undefined) input.current.destination = destination; }, [destination]);
  useEffect(() => {
    const current = input.current;
    const clear = () => { current.keys.clear(); current.horizontal = 0; current.vertical = 0; current.running = false; current.hop = false; activePointer.current = null; setRunning(false); };
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => { clear(); window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", clear); };
  }, []);

  useEffect(() => {
    if (mapVisible || controlsDisabled) return;
    const current = input.current;
    const ignored = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      return event.ctrlKey || event.metaKey || event.altKey || !!padRef.current?.contains(target) || !!target?.closest?.("input, textarea, select, [contenteditable='true']");
    };
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!MOVEMENT_KEYS.includes(key) || ignored(event)) return;
      if (key === " " && (event.target as HTMLElement | null)?.closest?.("button, a, summary, [role='button']")) return;
      if (key !== "shift") event.preventDefault();
      current.keys.add(key);
      if (key === " " && !event.repeat) current.hop = true;
    };
    const up = (event: KeyboardEvent) => { current.keys.delete(event.key.toLowerCase()); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); current.keys.clear(); };
  }, [mapVisible, controlsDisabled, input]);

  const sound = useWiggleSound();
  const changeMode = (next: CameraMode) => { setLocalMode(next); onModeChange?.(next); };
  const selectLandmark = useCallback((id: LandmarkId) => {
    const next = LANDMARKS.find(item => item.id === id)!;
    setLocalLandmark(id);
    input.current.destination = next.destination;
    setAnnouncement(`On your way to ${next.name}. ${next.subtitle}`);
    onDestinationChange?.(next.destination);
    onLandmarkSelect?.(id);
    sound.play("whoosh");
  }, [onDestinationChange, onLandmarkSelect, sound.play]);
  const graphicsFailed = useCallback(() => { setFailed(true); setAnnouncement("Your map is ready. Every destination and mission is still here."); }, []);
  const lowerQuality = useCallback(() => setQuality("low"), []);
  const startMission = () => { selectLandmark("fraction-forest"); onMissionStart?.(); };
  const stopDirection = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId !== activePointer.current) return;
    activePointer.current = null; input.current.horizontal = 0; input.current.vertical = 0;
  };

  return <section className={`${styles.universe} ${className}`} aria-label={theme === "science" ? "Science Planet" : "Explore Numeria"} data-camera-mode={mode} data-guided-camera={String(!!activityView && mode !== "globe")} data-hud={hud ? "custom" : "default"} data-quality={mapVisible ? "fallback" : quality} data-reduced-motion={String(reducedMotion)}>
    <div className={styles.stars} aria-hidden="true" />
    <div className={styles.scene}>
      {mapVisible ? theme === "science" ? <p className={styles.loading} role="status">3D view unavailable. Your Science checkpoints are still ready below.</p> : <NumeriaMap /> : <GraphicsBoundary onFailure={graphicsFailed}><Scene resetViewKey={resetViewKey} activityView={activityView} theme={theme} sceneContent={sceneContent} mode={mode} quality={quality === "high" ? "high" : "low"} reducedMotion={reducedMotion} input={input} selectedLandmark={selectedLandmark} onLandmarkSelect={selectLandmark} onDestinationChange={onDestinationChange} onContextLost={graphicsFailed} onQualityChange={lowerQuality} pizza={pizza} /></GraphicsBoundary>}
    </div>
    {!mapVisible && hand?.enabled ? <div className={styles.handOverlay} aria-live="polite">
      {handFrame?.pointer && handFrame.isTracking ? <span className={styles.handCursor} data-testid="hand-cursor" style={{ "--hand-x": `${(handFrame.pointer.x + 1) * 50}%`, "--hand-y": `${(1 - handFrame.pointer.y) * 50}%` } as CSSProperties} aria-hidden="true"><Sparkle size={16} /></span> : null}
      <p className={styles.handStatus}>{hand.status === "starting" ? "Opening camera…" : hand.status === "unavailable" ? "Camera unavailable. You can still use the slice buttons." : handFrame?.isTracking ? "Hand ready" : "Show me your hand 👋"}</p>
      {handDebug ? <output className={styles.handDebug} aria-label="Hand tracking debug">gesture: {hand.gesture ?? "none"} · pointer: {handFrame?.pointer ? `${handFrame.pointer.x.toFixed(2)}, ${handFrame.pointer.y.toFixed(2)}` : "none"} · tracking: {String(handFrame?.isTracking ?? false)}</output> : null}
    </div> : null}
    {mapVisible && pizza?.visible ? <div className={styles.mapPizza} role="img" aria-label={`Pizza with ${pizza.selectedSlices.length} of four equal slices selected`}><div>{[0, 1, 2, 3].map(index => <span key={index} data-selected={pizza.selectedSlices.includes(index)} />)}</div></div> : null}
    {hud ?? <ExplorationHud mode={mode} mapVisible={mapVisible} selectedLandmark={selectedLandmark} landmark={landmark} help={help} onHelpChange={setHelp} onModeChange={changeMode} onToggleMap={() => { setUserMap(!mapVisible); if (mapVisible) { setFailed(false); setQuality("low"); } }} onSelectLandmark={selectLandmark} onMissionStart={onMissionStart ? startMission : undefined} instructionsId={instructionsId} missionVisible={mode === "mission" || !!pizza?.visible} onWorldsRequest={onWorldsRequest} worldsDisabled={worldsDisabled} worldsDisabledMessage={worldsDisabledMessage} />}
    {!mapVisible && !controlsDisabled ? <div className={styles.explorerControls}>
      <div ref={padRef} className={styles.movementPad} tabIndex={0} role="group" aria-label="Move explorer. Arrow keys or WASD to walk, Shift to run, Space to hop." onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) input.current.keys.clear(); }} onKeyDown={event => {
        const key = event.key.toLowerCase();
        if (MOVEMENT_KEYS.includes(key)) { event.preventDefault(); input.current.keys.add(key); if (key === " ") input.current.hop = true; }
      }} onKeyUp={event => input.current.keys.delete(event.key.toLowerCase())}>
        {([{ label: "Walk forward", text: "↑", x: 0, y: 1, area: "up" }, { label: "Walk left", text: "←", x: -1, y: 0, area: "left" }, { label: "Walk back", text: "↓", x: 0, y: -1, area: "down" }, { label: "Walk right", text: "→", x: 1, y: 0, area: "right" }]).map(direction => <button type="button" key={direction.area} style={{ gridArea: direction.area }} aria-label={direction.label} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); activePointer.current = event.pointerId; input.current.horizontal = direction.x; input.current.vertical = direction.y; input.current.destination = null; }} onPointerUp={stopDirection} onPointerCancel={stopDirection} onLostPointerCapture={stopDirection} onClick={event => { if (event.detail === 0) { const [x, y, z] = input.current.position; const latitude = Math.atan2(y, Math.hypot(x, z)); const longitude = Math.atan2(x, z); input.current.destination = { latitude: latitude + direction.y * .12, longitude: longitude + direction.x * .12 }; } }}>{direction.text}</button>)}
      </div>
      <button type="button" className={styles.run} aria-pressed={running} title="Run: walk faster" onClick={() => { input.current.running = !running; setRunning(!running); }}>Run</button>
      <button type="button" className={styles.hop} onClick={() => { input.current.hop = true; }}>Hop <span aria-hidden="true">↑</span></button>
      {hud ? null : <div className={styles.zoom} role="group" aria-label="Zoom"><button type="button" aria-label="Zoom in" onClick={() => { input.current.zoom -= 1; }}>+</button><button type="button" aria-label="Zoom out" onClick={() => { input.current.zoom += 1; }}>−</button></div>}
    </div> : mapVisible ? <p className={styles.mapNote}>A quieter view. The same little adventures.</p> : null}
    {pizza?.visible ? <div className={styles.sliceControls} role="group" aria-label="Pizza slices">{[0, 1, 2, 3].map(index => <button type="button" key={index} aria-pressed={pizza.selectedSlices.includes(index)} onClick={() => pizza.onSliceSelect?.(index)}>Slice {index + 1}</button>)}</div> : null}
    <div className={styles.live} role="status" aria-live="polite">{announcement}</div>
    {children}
  </section>;
}

function NumeriaMap() {
  return <div className={styles.map} role="img" aria-label="Numeria map: Fraction Forest, Number Valley, Geometry Ridge and Crystal Crater. Choose a destination using the buttons."><div className={styles.mapPlanet}><span className={styles.mapForest}>♧<small>FRACTION FOREST</small></span><span className={styles.mapRidge}>△<small>GEOMETRY RIDGE</small></span><span className={styles.mapCrater}>◇<small>CRYSTAL CRATER</small></span><span className={styles.mapValley}>123<small>NUMBER VALLEY</small></span><span className={styles.mapExplorer}>✦</span></div><div className={styles.mapOrbit} /></div>;
}

export default UniverseCanvas;
