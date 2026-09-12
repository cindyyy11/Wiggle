"use client";

import React, { Component, useCallback, useEffect, useId, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent } from "react";
import dynamic from "next/dynamic";
import { LANDMARKS, MISSION_DESTINATION, createExplorerInput, resolveQuality, type CameraMode, type Destination, type LandmarkId, type PizzaPresentation, type QualityPreference, type SceneQuality } from "./world";
import styles from "./universe.module.css";

const Scene = dynamic(() => import("./UniverseScene"), { ssr: false, loading: () => <div className={styles.loading} role="status">Gathering a little stardust…</div> });

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export interface UniverseCanvasProps {
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

export function UniverseCanvas({ mode: controlledMode, onModeChange, quality: preference = "auto", reducedMotion: reducedMotionOverride, destination, onDestinationChange, selectedLandmark: controlledLandmark, onLandmarkSelect, onMissionStart, onWorldsRequest, worldsDisabled = false, worldsDisabledMessage = "Worlds are unavailable right now.", pizza, children, className = "" }: UniverseCanvasProps) {
  const [localMode, setLocalMode] = useState<CameraMode>("globe");
  const [localLandmark, setLocalLandmark] = useState<LandmarkId>("fraction-forest");
  const [quality, setQuality] = useState<SceneQuality>("fallback");
  const [userMap, setUserMap] = useState(false);
  const [failed, setFailed] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [help, setHelp] = useState(false);
  const [running, setRunning] = useState(false);
  const [announcement, setAnnouncement] = useState("Welcome, explorer. Your next adventure is in Fraction Forest.");
  const input = useRef(createExplorerInput());
  const activePointer = useRef<number | null>(null);
  const instructionsId = useId();
  const worldsMessageId = useId();
  const mode = controlledMode ?? localMode;
  const selectedLandmark = controlledLandmark ?? localLandmark;
  const landmark = LANDMARKS.find(item => item.id === selectedLandmark) ?? LANDMARKS[0];
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;
  const mapVisible = quality === "fallback" || userMap || failed;
  const shellNavigationDisabled = Boolean(onWorldsRequest && worldsDisabled);
  const hand = pizza?.hand;
  const handFrame = hand?.latest.current;
  const handDebug = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("handDebug") === "1";

  useEffect(() => {
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

  const changeMode = (next: CameraMode) => { setLocalMode(next); onModeChange?.(next); };
  const selectLandmark = useCallback((id: LandmarkId) => {
    const next = LANDMARKS.find(item => item.id === id)!;
    setLocalLandmark(id);
    input.current.destination = next.destination;
    setAnnouncement(`On your way to ${next.name}. ${next.subtitle}`);
    onDestinationChange?.(next.destination);
    onLandmarkSelect?.(id);
  }, [onDestinationChange, onLandmarkSelect]);
  const graphicsFailed = useCallback(() => { setFailed(true); setAnnouncement("Your map is ready. Every destination and mission is still here."); }, []);
  const lowerQuality = useCallback(() => setQuality("low"), []);
  const startMission = () => { selectLandmark("fraction-forest"); changeMode("mission"); onMissionStart?.(); };
  const stopDirection = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId !== activePointer.current) return;
    activePointer.current = null; input.current.horizontal = 0; input.current.vertical = 0;
  };

  return <section className={`${styles.universe} ${className}`} aria-label="Explore Numeria" data-camera-mode={mode} data-quality={mapVisible ? "fallback" : quality}>
    <div className={styles.stars} aria-hidden="true" />
    <header className={styles.heading}>{onWorldsRequest ? <><button type="button" className={styles.worldsButton} onClick={onWorldsRequest} disabled={worldsDisabled} aria-describedby={worldsDisabled ? worldsMessageId : undefined}>Back to Worlds</button>{worldsDisabled ? <p id={worldsMessageId} className={styles.worldsMessage} role="status">{worldsDisabledMessage}</p> : null}</> : <a className={styles.wordmark} href="/" aria-label="Wiggle home"><img className={styles.wordmarkImage} src="/brand/wiggle-mark.png" alt="" /></a>}<div className={styles.worldTitle}><span>YOUR LEARNING UNIVERSE</span><h1>Numeria</h1><p>A little curiosity goes a long way.</p></div></header>
    <div className={styles.scene}>
      {mapVisible ? <NumeriaMap /> : <GraphicsBoundary onFailure={graphicsFailed}><Scene mode={mode} quality={quality === "high" ? "high" : "low"} reducedMotion={reducedMotion} input={input} selectedLandmark={selectedLandmark} onLandmarkSelect={selectLandmark} onDestinationChange={onDestinationChange} onContextLost={graphicsFailed} onQualityChange={lowerQuality} pizza={pizza} /></GraphicsBoundary>}
    </div>
    {!mapVisible && hand?.enabled ? <div className={styles.handOverlay} aria-live="polite">
      {handFrame?.pointer && handFrame.isTracking ? <span className={styles.handCursor} data-testid="hand-cursor" style={{ "--hand-x": `${(handFrame.pointer.x + 1) * 50}%`, "--hand-y": `${(1 - handFrame.pointer.y) * 50}%` } as CSSProperties} aria-hidden="true">✦</span> : null}
      <p className={styles.handStatus}>{hand.status === "starting" ? "Opening camera…" : hand.status === "unavailable" ? "Camera unavailable. You can still use the slice buttons." : handFrame?.isTracking ? "Hand ready" : "Show me your hand 👋"}</p>
      {handDebug ? <output className={styles.handDebug} aria-label="Hand tracking debug">gesture: {hand.gesture ?? "none"} · pointer: {handFrame?.pointer ? `${handFrame.pointer.x.toFixed(2)}, ${handFrame.pointer.y.toFixed(2)}` : "none"} · tracking: {String(handFrame?.isTracking ?? false)}</output> : null}
    </div> : null}
    {mapVisible && pizza?.visible ? <div className={styles.mapPizza} role="img" aria-label={`Pizza with ${pizza.selectedSlices.length} of four equal slices selected`}><div>{[0, 1, 2, 3].map(index => <span key={index} data-selected={pizza.selectedSlices.includes(index)} />)}</div></div> : null}
    <div className={styles.cameraControls} role="group" aria-label="View controls">
      <button type="button" aria-label="Globe view" aria-pressed={mode === "globe"} onClick={() => changeMode("globe")} title="Globe view">◎<span>Globe view</span></button>
      <button type="button" aria-label="Follow explorer" aria-pressed={mode === "follow"} onClick={() => changeMode("follow")} title="Follow explorer">♙<span>Follow explorer</span></button>
      <button type="button" aria-pressed={help} onClick={() => setHelp(!help)} aria-label="How to explore">?</button>
      <button type="button" onClick={() => { setUserMap(!mapVisible); if (mapVisible) { setFailed(false); setQuality("low"); } }} aria-label={mapVisible ? "Try 3D view" : "Use 2D map"}>{mapVisible ? "3D" : "2D"}</button>
      {shellNavigationDisabled
        ? <button type="button" className={styles.parentLink} disabled aria-label="Parent mission control" aria-describedby={worldsMessageId}>Parent</button>
        : <a className={styles.parentLink} href="/parent" aria-label="Parent mission control">Parent</a>}
    </div>
    <div className={styles.orbitCaption} aria-label="Future worlds"><span>◉ &nbsp; WORDWELL <small>LOCKED</small></span><span>◌ &nbsp; NOVA <small>LOCKED</small></span></div>
    <nav className={styles.destinations} aria-label="Numeria destinations">
      <p>WHERE SHALL WE GO?</p>
      {LANDMARKS.map(item => <button type="button" key={item.id} onClick={() => selectLandmark(item.id)} aria-label={`Visit ${item.name}`} aria-pressed={item.id === selectedLandmark} style={{ "--region": item.color } as CSSProperties}><span className={styles.regionSymbol} aria-hidden="true">{item.symbol}</span><span>{item.name}</span><span className={styles.regionArrow} aria-hidden="true">↗</span></button>)}
    </nav>
    <aside className={styles.destinationCard} style={{ "--region": landmark.color } as CSSProperties} aria-label="Selected destination">
      <span className={styles.eyebrow}>{selectedLandmark === "fraction-forest" ? "YOUR NEXT DISCOVERY" : "FOLLOW YOUR CURIOSITY"}</span>
      <h2>{landmark.name}</h2><p>{landmark.subtitle}</p>
      {onMissionStart ? <button type="button" className={styles.missionButton} onClick={startMission}>Start fractions mission <span aria-hidden="true">↗</span></button> : <button type="button" className={styles.missionButton} onClick={() => { selectLandmark(selectedLandmark); changeMode("follow"); }}>Let's explore <span aria-hidden="true">↗</span></button>}
    </aside>
    {help ? <aside className={styles.help} aria-label="Exploration instructions"><h2>Make yourself at home.</h2><p id={instructionsId}>Drag to look around. Scroll or pinch to zoom. Tap the ground to walk. Focus the movement pad and use arrows or WASD. Hold Shift to run. Space to hop.</p><p>You can also choose any destination by name. The 2D map has the same mission controls.</p><button type="button" onClick={() => setHelp(false)}>Got it</button></aside> : null}
    {!mapVisible ? <div className={styles.explorerControls}>
      <div className={styles.movementPad} tabIndex={0} role="group" aria-label="Move explorer. Arrow keys or WASD to walk, Shift to run, Space to hop." onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) input.current.keys.clear(); }} onKeyDown={event => {
        const key = event.key.toLowerCase();
        if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "shift"].includes(key)) { event.preventDefault(); input.current.keys.add(key); if (key === " ") input.current.hop = true; }
      }} onKeyUp={event => input.current.keys.delete(event.key.toLowerCase())}>
        {([{ label: "Walk forward", text: "↑", x: 0, y: 1, area: "up" }, { label: "Walk left", text: "←", x: -1, y: 0, area: "left" }, { label: "Walk back", text: "↓", x: 0, y: -1, area: "down" }, { label: "Walk right", text: "→", x: 1, y: 0, area: "right" }]).map(direction => <button type="button" key={direction.area} style={{ gridArea: direction.area }} aria-label={direction.label} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); activePointer.current = event.pointerId; input.current.horizontal = direction.x; input.current.vertical = direction.y; input.current.destination = null; }} onPointerUp={stopDirection} onPointerCancel={stopDirection} onLostPointerCapture={stopDirection} onClick={event => { if (event.detail === 0) { const [x, y, z] = input.current.position; const latitude = Math.atan2(y, Math.hypot(x, z)); const longitude = Math.atan2(x, z); input.current.destination = { latitude: latitude + direction.y * .12, longitude: longitude + direction.x * .12 }; } }}>{direction.text}</button>)}
      </div>
      <button type="button" className={styles.run} aria-pressed={running} onClick={() => { input.current.running = !running; setRunning(!running); }}>Run</button>
      <button type="button" className={styles.hop} onClick={() => { input.current.hop = true; }}>Hop <span aria-hidden="true">↑</span></button>
      <div className={styles.zoom} role="group" aria-label="Zoom"><button type="button" aria-label="Zoom in" onClick={() => { input.current.zoom -= 1; }}>+</button><button type="button" aria-label="Zoom out" onClick={() => { input.current.zoom += 1; }}>−</button></div>
    </div> : <p className={styles.mapNote}>A quieter view. The same little adventures.</p>}
    {pizza?.visible ? <div className={styles.sliceControls} role="group" aria-label="Pizza slices">{[0, 1, 2, 3].map(index => <button type="button" key={index} aria-pressed={pizza.selectedSlices.includes(index)} onClick={() => pizza.onSliceSelect?.(index)}>Slice {index + 1}</button>)}</div> : null}
    <div className={styles.live} role="status" aria-live="polite">{announcement}</div>
    {children}
  </section>;
}

function NumeriaMap() {
  return <div className={styles.map} role="img" aria-label="Numeria map: Fraction Forest, Number Valley, Geometry Ridge and Crystal Crater. Choose a destination using the buttons."><div className={styles.mapPlanet}><span className={styles.mapForest}>♧<small>FRACTION FOREST</small></span><span className={styles.mapRidge}>△<small>GEOMETRY RIDGE</small></span><span className={styles.mapCrater}>◇<small>CRYSTAL CRATER</small></span><span className={styles.mapValley}>123<small>NUMBER VALLEY</small></span><span className={styles.mapExplorer}>✦</span></div><div className={styles.mapOrbit} /></div>;
}

export default UniverseCanvas;
