"use client";

import { useEffect, useRef, useState } from "react";
import type { CompletionInput, ConstellationStarId, LearningEventPayload, LearningMode, SimulationReport, StartSessionResponse, StrategyName, TwinVisualState } from "@wiggle/contracts";
import { newlyUnlockedStars } from "@wiggle/contracts";
import { UniverseCanvas } from "../universe/UniverseCanvas";
import { MISSION_DESTINATION, type CameraMode, type Destination, type LandmarkId, type QualityPreference } from "../universe/world";
import { EventQueue } from "../../features/events/eventQueue";
import { emitLearningEvent } from "../../features/events/emitLearningEvent";
import { ApiClient, ApiError } from "../../lib/api/client";
import { DEMO_CHILD_ID, DEMO_CORRECTNESS, DEMO_MISSION_ID, WIGGLE_REWARD, demoSession, demoSimulation, modeForStrategy } from "../../lib/demo/seed";
import { FractionMission, type MissionPhase } from "./FractionMission";
import type { LexiAction } from "../lexi/LexiPanel";
import { REALITY_PROMPT } from "./RealityMission";
import { useHandTracking } from "../../features/gestures/useHandTracking";
import type { GesturePhase } from "../../features/gestures/gestureStateMachine";
import type { GestureInteractionAction } from "../universe/gestureInteraction";
import { PIZZA_SLICE_IDS } from "../universe/Landmarks";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { speakIfUnmuted } from "../../features/voice/voicePreference";
import { publishWiggleLiveEvent } from "../../features/sync/wiggleLiveChannel";
import { seenConstellationStars, saveSeenConstellationStars } from "../wiggle/constellationMemory";
import styles from "./mission.module.css";

interface Run { session: StartSessionResponse; transport: "local" | "api"; startedAt: number; interacted: boolean; finished: boolean }
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
const SPLASH_EXIT_DELAY_MS = 320;
export function MissionAtlas({ quality = "auto", client: suppliedClient, childId = DEMO_CHILD_ID, allowLocalFallback = true, showSplash = true, onMissionOverlayChange, onWorldsRequest }: MissionAtlasProps) {
  const [client] = useState(() => suppliedClient ?? (allowLocalFallback ? new ApiClient() : new ApiClient("/api/backend")));
  const startKey = useRef<string | null>(null);
  const correctness = allowLocalFallback ? DEMO_CORRECTNESS : 1;
  const queue = useRef<EventQueue | null>(null);
  const controller = useRef<AbortController | null>(null);
  const run = useRef<Run | null>(null);
  const pending = useRef(false);
  const wakeQueue = useRef<(() => void) | null>(null);
  const supportReady = useRef(false);
  const selectionKey = useRef<{ strategy: StrategyName; key: string } | null>(null);
  const [phase, setPhase] = useState<MissionPhase | null>(null);
  const [mode, setMode] = useState<LearningMode>("standard");
  const [camera, setCamera] = useState<CameraMode>("follow");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [landmark, setLandmark] = useState<LandmarkId>("fraction-forest");
  const [slices, setSlices] = useState<number[]>([]);
  const sliceInputs = useRef(new Map<number, CompletionInput>());
  const [answer, setAnswer] = useState<number | null>(null);
  const [report, setReport] = useState<SimulationReport>(demoSimulation);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [gesturePhase, setGesturePhase] = useState<GesturePhase | null>(null);
  const [focusedSlice, setFocusedSlice] = useState<number | null>(null);
  const [heldSlice, setHeldSlice] = useState<number | null>(null);
  const heldSliceRef = useRef<number | null>(null);
  const lastGesturePlacement = useRef<{ gesture: "pinch" | "fist"; objectId: (typeof PIZZA_SLICE_IDS)[number] } | null>(null);
  const [splashState, setSplashState] = useState<SplashState>(showSplash ? "ready" : "complete");
  const splashStarting = useRef(false);
  const splashTimeout = useRef<number | null>(null);
  const splashStartButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => {
    if (splashTimeout.current !== null) window.clearTimeout(splashTimeout.current);
  }, []);

  useEffect(() => {
    if (splashState === "ready") splashStartButton.current?.focus();
  }, [splashState]);

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
  const [support, setSupport] = useState<"lexi" | "reset" | "reality" | null>(null);
  const [supportText, setSupportText] = useState("");
  const realityStarted = useRef(false);
  const [realityCompleted, setRealityCompleted] = useState(false);
  const [newStar, setNewStar] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const greetingTimer = useRef<number | null>(null);
  const sound = useWiggleSound();
  const greetChild = (line: string) => {
    if (greetingTimer.current !== null) window.clearTimeout(greetingTimer.current);
    setGreeting(line);
    speakIfUnmuted(line);
    greetingTimer.current = window.setTimeout(() => setGreeting(""), 5000);
  };
  useEffect(() => () => { if (greetingTimer.current !== null) window.clearTimeout(greetingTimer.current); }, []);
  const supportStarted = useRef(0);
  const lexiKey = useRef<{ action: string; key: string } | null>(null);
  // A live, wellbeing-first read of the Twin's mood during this mission (Part 3 of the
  // spec). It never needs a numeric twin fetch mid-mission: a reset break or being
  // stuck are already explicit signals, and celebration follows a completed mission.
  const missionTwinState: TwinVisualState =
    support === "reset" ? "needs_reset"
    : phase === "stuck" ? "stuck"
    : phase === "complete" ? (correctness >= 0.85 ? "mastered" : "progressing")
    : "ready";
  const handTracking = useHandTracking({
    enabled: cameraEnabled,
    onGestureStart: phase => setGesturePhase(phase),
    onGestureEnd: phase => setGesturePhase(phase),
  });
  const missionOverlayOpen = phase !== null || busy;

  useEffect(() => {
    onMissionOverlayChange?.(missionOverlayOpen);
  }, [missionOverlayOpen, onMissionOverlayChange]);

  useEffect(() => {
    queue.current = new EventQueue();
    const delivery = new AbortController();
    let retry: number;
    const schedule = () => { window.clearTimeout(retry); if (!delivery.signal.aborted) retry = window.setTimeout(flush, queue.current?.nextRetryDelay() ?? 60000); };
    const flush = () => { void queue.current?.flush(client, delivery.signal).finally(schedule); };
    wakeQueue.current = schedule;
    window.addEventListener("online", flush); flush();
    return () => { wakeQueue.current = null; delivery.abort(); controller.current?.abort(); window.clearTimeout(retry); window.removeEventListener("online", flush); };
  }, [client]);

  const emit = (payload: LearningEventPayload) => {
    if (!run.current || !queue.current) return;
    emitLearningEvent(queue.current, run.current.session, payload, run.current.transport);
    wakeQueue.current?.();
  };
  const interact = () => {
    if (!run.current || run.current.interacted) return;
    run.current.interacted = true;
    emit({ kind: "first_interaction", mode });
    emit({ kind: "response_time_recorded", responseTimeMs: Math.min(86400000, Math.max(0, Date.now() - run.current.startedAt)), mode });
  };
  const operation = async (work: (signal: AbortSignal) => Promise<void>) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setFeedback("");
    const abort = new AbortController(); controller.current = abort;
    try { await work(abort.signal); }
    catch { if (!abort.signal.aborted) setFeedback("Let's try that again. Your puzzle is still here."); }
    finally { if (controller.current === abort) { pending.current = false; setBusy(false); } }
  };
  const start = () => {
    if (phase || pending.current) return;
    void operation(async signal => {
      const key = startKey.current ??= crypto.randomUUID();
      let session: StartSessionResponse; let transport: Run["transport"] = "api";
      try { session = await client.start({ childId, ...(allowLocalFallback ? { missionId: DEMO_MISSION_ID } : {}) }, key, signal); }
      catch (error) {
        if (signal.aborted) return;
        if (!allowLocalFallback || (error instanceof ApiError && [401, 403].includes(error.status))) throw error;
        session = demoSession(crypto.randomUUID()); transport = "local";
      }
      if (signal.aborted) return;
      startKey.current = null;
      run.current = { session, transport, startedAt: Date.now(), interacted: false, finished: false };
      sliceInputs.current.clear(); realityStarted.current = false; lastGesturePlacement.current = null; heldSliceRef.current = null; setHeldSlice(null); setFocusedSlice(null); setGesturePhase(null); setRealityCompleted(false);
      setSlices([]); setAnswer(null); setMode("standard"); setReport(demoSimulation); selectionKey.current = null; supportReady.current = false;
      setLandmark("fraction-forest"); setDestination(MISSION_DESTINATION); setCamera("mission"); setPhase("standard");
      setNewStar(null);
      sound.play("missionStart");
      greetChild("Ready for a fraction mission?");
      if (transport === "local") emit({ kind: "session_started" });
      emit({ kind: "task_started", mode: "standard" });
    });
  };
  const adapt = async (strategy: StrategyName, signal: AbortSignal, simplified = false) => {
    if (!run.current || !queue.current) return;
    interact();
    let nextMode = modeForStrategy(strategy);
    if (run.current.transport === "api") {
      await queue.current.flush(client, signal, run.current.session.sessionId);
      if (selectionKey.current?.strategy !== strategy) selectionKey.current = { strategy, key: crypto.randomUUID() };
      const response = await client.select({ sessionId: run.current.session.sessionId, strategy }, selectionKey.current.key, signal);
      nextMode = response.mode;
    }
    if (signal.aborted) return;
    selectionKey.current = null;
    setMode(nextMode);
    if (!simplified) { sliceInputs.current.clear(); setSlices([]); setAnswer(null); }
    setPhase(simplified ? "stuck" : nextMode === "standard" ? "standard" : "activity");
    if (simplified) supportReady.current = true;
    setCamera("mission"); setDestination(MISSION_DESTINATION);
    emit({ kind: "mode_changed", mode: nextMode });
  };
  const select = (strategy: StrategyName) => {
    if (pending.current) return;
    setCameraEnabled(strategy === "gesture" || strategy === "visual_gesture");
    void operation(signal => adapt(strategy, signal));
  };
  const simulate = () => { void operation(async signal => {
    if (!run.current || !queue.current) return;
    let next = demoSimulation;
    if (run.current.transport === "api") {
      await queue.current.flush(client, signal, run.current.session.sessionId);
      next = await client.simulate({ sessionId: run.current.session.sessionId }, signal);
    }
    if (!signal.aborted) { setReport(next); setPhase("simulation"); }
  }); };
  const finish = (resultMode: LearningMode) => {
    if (!run.current || run.current.finished) return;
    run.current.finished = true;
    const inputMethod = [...sliceInputs.current.values()].includes("gesture") ? "gesture" : "buttons";
    const observedMode = (resultMode === "gesture" || resultMode === "visual_gesture") && inputMethod === "buttons" ? "visual" : resultMode;
    if (inputMethod === "gesture" && lastGesturePlacement.current) {
      emit({ kind: "gesture_task_completed", ...lastGesturePlacement.current, success: true });
    }
    emit({ kind: "mission_completed", objective: run.current.session.objective, correctness, mode: observedMode, intendedMode: resultMode, inputMethod, ...(resultMode === "chunk" ? { strategy: "chunking" as const } : resultMode === "visual" || resultMode === "visual_gesture" ? { strategy: "visual_hint" as const } : {}) });
    heldSliceRef.current = null; setHeldSlice(null); setFocusedSlice(null); setGesturePhase(null); setCameraEnabled(false);
    setPhase("complete"); setFeedback(""); setCompleted(count => count + 1);
    sound.play(correctness >= 0.85 ? "celebrate" : "correct");
    if (queue.current) { const delivery = controller.current ?? new AbortController(); controller.current = delivery; void queue.current.flush(client, delivery.signal, run.current.session.sessionId).catch(() => {}).finally(() => wakeQueue.current?.()); }
    void checkForNewStars();
    publishWiggleLiveEvent({ type: "mission_completed", childId, missionTitle: "Fraction Forest Mission", occurredAt: new Date().toISOString() });
  };
  /**
   * Best-effort celebratory nuance only: re-reads the authoritative Twin after a
   * completion to see whether a new constellation star crossed its threshold. Never
   * blocks the completion screen and never itself decides mastery — getConstellationStars
   * (packages/contracts) is the single source of truth, run here against the real twin.
   */
  const checkForNewStars = async () => {
    try {
      const { twin } = await client.twin(childId, new AbortController().signal);
      const seen = seenConstellationStars(childId);
      const fresh = newlyUnlockedStars(twin, seen);
      if (fresh.length === 0) return;
      sound.play("constellationUnlock");
      setNewStar(fresh[0].title);
      saveSeenConstellationStars(childId, [...seen, ...fresh.map(star => star.id as ConstellationStarId)]);
    } catch { /* The completion moment still celebrates without a fresh star. */ }
  };
  const check = () => {
    if (pending.current || !run.current || run.current.finished) return;
    interact(); emit({ kind: "answer_submitted", mode });
    if ((phase === "standard" ? answer : slices.length) !== 3) {
      emit({ kind: "retry_recorded", mode }); setFeedback("Almost. We need three equal pieces out of four."); sound.play("tryAgain"); return;
    }
    if (phase === "stuck" && !supportReady.current) {
      void operation(async signal => { await adapt("visual_gesture", signal, true); if (!signal.aborted) finish("visual_gesture"); });
    } else finish(mode);
  };
  const close = () => {
    controller.current?.abort(); controller.current = null; pending.current = false; setBusy(false);
    if (phase !== "complete") emit({ kind: "mission_abandoned", mode });
    run.current = null; setPhase(null); setSlices([]); setCamera("follow"); setDestination(null); setFeedback("");
    heldSliceRef.current = null; lastGesturePlacement.current = null; setHeldSlice(null); setFocusedSlice(null); setGesturePhase(null); setCameraEnabled(false); setSupport(null); lexiKey.current = null;
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="Selected destination"] button')?.focus());
  };
  const closeSupport = () => {
    controller.current?.abort(); controller.current = null; pending.current = false; setBusy(false);
    setSupport(null); setFeedback("");
  };
  const requestLexi = (action: LexiAction) => { void operation(async signal => {
    if (!run.current || !queue.current) return;
    interact();
    const local = run.current.transport === "local";
    const serialized = JSON.stringify(action);
    if (lexiKey.current?.action !== serialized) lexiKey.current = { action: serialized, key: crypto.randomUUID() };
    let response;
    if (!local) {
      try {
        await queue.current.flush(client, signal, run.current.session.sessionId);
        response = await client.lexi({ sessionId: run.current.session.sessionId, ...action }, lexiKey.current.key, signal);
      }
      catch (error) {
        const readOnly = action.tool == null ? Boolean(action.message) : ["request_hint", "create_reality_mission"].includes(action.tool);
        if (signal.aborted || !readOnly) throw error;
      }
    }
    if (signal.aborted) return;
    // Only explicit child-selected tools drive behavior; generated suggestedTool is never executed.
    if (action.tool === "request_hint") {
      emit({ kind: "hint_requested", mode });
      setSupportText(response?.content.text || "Choose three equal slices. Leave one on the plate.");
    } else if (action.tool === "start_reset_station") {
      if (!local && !response?.resetStarted) throw new Error("Reset not acknowledged");
      if (local) emit({ kind: "reset_started", mode });
      supportStarted.current = Date.now(); setSupport("reset");
    } else if (action.tool === "create_reality_mission") {
      if (!realityStarted.current) {
        emit({ kind: "reality_mission_started", mode: "movement" });
        realityStarted.current = true;
        supportStarted.current = Date.now();
      }
      setSupportText(response?.realityMission || REALITY_PROMPT);
      setSupport("reality");
    } else if (action.tool === "switch_learning_mode") {
      if (!local && response?.mode !== "chunk") throw new Error("Mode not acknowledged");
      setCameraEnabled(false); setMode("chunk"); setPhase("activity"); setSupport(null);
      emit({ kind: "mode_changed", mode: "chunk" });
    } else if (action.tool === "record_self_report") {
      if (local) emit({ kind: "difficulty_self_reported", mode, difficulty: action.difficulty });
      setSupportText(response?.content.text || "Thanks for telling me. We can take one small step.");
    } else if (!action.tool && action.message) {
      // A free-text voice or typed message: Lexi may only chat back, never execute a tool
      // itself, and casual conversation is not recorded as a help-request signal.
      setSupportText(response?.content.text || "I'm here. Let's figure this out together.");
    }
    lexiKey.current = null;
  }); };
  const completeSupport = () => {
    if (support !== "reset" && support !== "reality") return;
    emit({ kind: support === "reset" ? "reset_completed" : "reality_mission_completed", mode: support === "reset" ? mode : "movement", responseTimeMs: Math.min(86400000, Math.max(0, Date.now() - supportStarted.current)) });
    if (support === "reality") { realityStarted.current = false; if (run.current?.finished) setRealityCompleted(true); }
    closeSupport();
  };
  const activityVisible = phase === "activity" || phase === "stuck";
  const changeSlice = (index: number, grab = false, input: CompletionInput = "buttons") => {
    if (!activityVisible || support || (pending.current && phase !== "stuck") || !Number.isInteger(index) || index < 0 || index > 3) return;
    interact(); setFeedback("");
    if (sliceInputs.current.has(index)) {
      if (grab) return;
      sliceInputs.current.delete(index);
    } else sliceInputs.current.set(index, input);
    setSlices([...sliceInputs.current.keys()]);
  };
  const setHeld = (index: number | null) => { heldSliceRef.current = index; setHeldSlice(index); };
  const focusSlice = (index: number, input: CompletionInput = "buttons") => {
    if (!activityVisible || support || !Number.isInteger(index) || index < 0 || index > 3) return;
    setFocusedSlice(index);
    if (input === "gesture") emit({ kind: "gesture_slice_focused", gesture: "point", objectId: PIZZA_SLICE_IDS[index] });
  };
  const placeSlice = (index: number, input: CompletionInput = "buttons", gesture?: "pinch" | "fist") => {
    if (!activityVisible || support || !Number.isInteger(index) || index < 0 || index > 3) return;
    interact(); setFeedback("");
    const next = new Map(sliceInputs.current);
    next.set(index, input);
    sliceInputs.current = next;
    setSlices([...next.keys()]);
    setHeld(null); setFocusedSlice(index);
    if (input === "gesture" && gesture) {
      const objectId = PIZZA_SLICE_IDS[index];
      lastGesturePlacement.current = { gesture, objectId };
      emit({ kind: "gesture_slice_placed", gesture, objectId, success: true });
      if (next.size === 3) finish(mode);
    }
  };
  const returnSlice = (index: number, input: CompletionInput = "buttons", gesture?: "pinch" | "fist") => {
    if (!activityVisible || support || !Number.isInteger(index) || index < 0 || index > 3) return;
    if (heldSliceRef.current !== index && input === "gesture") return;
    setHeld(null); setFocusedSlice(index);
    if (input === "gesture" && gesture) emit({ kind: "gesture_slice_returned", gesture, objectId: PIZZA_SLICE_IDS[index], success: false });
  };
  const openLexi = (input: CompletionInput = "buttons") => {
    if (input === "gesture") emit({ kind: "gesture_lexi_opened", gesture: "open_palm", objectId: "lexi-beacon" });
    if (pending.current || !run.current || run.current.finished) return;
    interact(); setCameraEnabled(false); setGesturePhase(null); setSupportText(""); setSupport("lexi");
  };
  const handleGestureAction = (action: GestureInteractionAction) => {
    const index = action.targetId ? PIZZA_SLICE_IDS.indexOf(action.targetId as (typeof PIZZA_SLICE_IDS)[number]) : -1;
    if (action.type === "focus" && index >= 0) focusSlice(index, "gesture");
    else if (action.type === "grab" && index >= 0 && (action.gesture === "pinch" || action.gesture === "fist")) { setHeld(index); setFocusedSlice(index); }
    else if (action.type === "drop" && index >= 0 && (action.gesture === "pinch" || action.gesture === "fist")) {
      if (action.success) placeSlice(index, "gesture", action.gesture);
      else returnSlice(index, "gesture", action.gesture);
    } else if (action.type === "lost-hand" && index >= 0 && (action.gesture === "pinch" || action.gesture === "fist")) returnSlice(index, "gesture", action.gesture);
    else if (action.type === "open-lexi") openLexi("gesture");
  };
  const commands = {
    focusSlice, placeSlice, returnSlice, openLexi,
    selectSlice: (index: number, input?: CompletionInput) => changeSlice(index, false, input), grabSlice: (index: number, input?: CompletionInput) => changeSlice(index, true, input),
    summonLexi: () => openLexi(),
  };
  const pizzaVisible = activityVisible && !support;
  const pizzaSlices = PIZZA_SLICE_IDS.map((id, index) => ({ id, state: slices.includes(index) ? "placed" as const : heldSlice === index ? "held" as const : "available" as const, focused: focusedSlice === index }));
  const splashVisible = splashState !== "complete";
  return <><div inert={splashVisible} aria-hidden={splashVisible}><UniverseCanvas quality={quality} className={`${styles.atlas} ${phase ? styles.active : ""} ${phase === "stuck" ? styles.simplified : ""}`} mode={camera} onModeChange={setCamera} destination={destination} onDestinationChange={setDestination} selectedLandmark={landmark} onLandmarkSelect={setLandmark} onMissionStart={start} onWorldsRequest={onWorldsRequest} worldsDisabled={missionOverlayOpen} worldsDisabledMessage="Finish or leave your Maths mission before changing worlds." childId={childId} pizza={{ visible: pizzaVisible, selectedSlices: slices, slices: pizzaSlices, plate: { accepting: heldSlice !== null, focused: false }, hand: cameraEnabled ? { enabled: true, latest: handTracking.latest, gesture: handTracking.gesture, phase: gesturePhase, status: handTracking.status } : undefined, onGestureAction: handleGestureAction, onSliceSelect: commands.selectSlice }}>
    <div className={styles.atlasHud} aria-label="Mission Atlas progress"><span>MISSION ATLAS</span><strong>{completed} discoveries</strong><small>✳ {completed * WIGGLE_REWARD} Wiggle Energy</small></div>
    {!phase && busy ? <p className={styles.starting} role="status">Your mission is coming into view…</p> : null}
    {!phase && feedback ? <p className={styles.starting} role="alert">{feedback}</p> : null}
    {phase ? <FractionMission phase={phase} mode={mode} selectedSlices={slices} report={report} answer={answer} feedback={feedback} busy={busy} correctness={correctness} realityCompleted={realityCompleted} onAnswer={value => { interact(); setAnswer(value); setFeedback(""); }} onStuck={() => { interact(); setCameraEnabled(false); emit({ kind: "stuck_requested", mode }); setFeedback(""); setPhase("stuck"); supportReady.current = false; void operation(signal => adapt("visual_gesture", signal, true)); }} onSimulate={simulate} onSelect={select} onCheck={check} onClose={close} onBack={() => setPhase(mode === "standard" ? "standard" : "activity")} commands={commands} cameraEnabled={cameraEnabled} onCameraEnable={() => setCameraEnabled(true)} onCameraDisable={() => { setCameraEnabled(false); setGesturePhase(null); setHeld(null); }} tracking={handTracking} support={support} supportText={supportText} twinState={missionTwinState} newStar={newStar} greeting={greeting} onLexiRequest={requestLexi} onSupportClose={closeSupport} onSupportComplete={completeSupport} /> : null}
  </UniverseCanvas></div>{splashVisible ? <section className={`${styles.splash} ${splashState === "leaving" ? styles.splashLeaving : ""}`} aria-label="Welcome to Wiggle"><img className={styles.splashBrand} src="/brand/wiggle-full.jpeg" alt="Wiggle. Wonder. Wow!" /><button ref={splashStartButton} type="button" className={styles.splashStart} onClick={startSplash} disabled={splashState === "leaving"}>Let's Wiggle</button></section> : null}</>;
}
