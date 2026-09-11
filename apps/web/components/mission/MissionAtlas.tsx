"use client";

import { useEffect, useRef, useState } from "react";
import type { LearningEventPayload, LearningMode, SimulationReport, StartSessionResponse, StrategyName } from "@wiggle/contracts";
import { UniverseCanvas } from "../universe/UniverseCanvas";
import { MISSION_DESTINATION, type CameraMode, type Destination, type LandmarkId, type QualityPreference } from "../universe/world";
import { EventQueue } from "../../features/events/eventQueue";
import { emitLearningEvent } from "../../features/events/emitLearningEvent";
import { ApiClient } from "../../lib/api/client";
import { DEMO_CHILD_ID, DEMO_CORRECTNESS, DEMO_MISSION_ID, WIGGLE_REWARD, demoSession, demoSimulation, modeForStrategy } from "../../lib/demo/seed";
import { FractionMission, type MissionPhase } from "./FractionMission";
import type { LexiAction } from "../lexi/LexiPanel";
import { REALITY_PROMPT } from "./RealityMission";
import styles from "./mission.module.css";

interface Run { session: StartSessionResponse; transport: "local" | "api"; startedAt: number; interacted: boolean; finished: boolean }
export function MissionAtlas({ quality = "auto", client: suppliedClient }: { quality?: QualityPreference; client?: ApiClient }) {
  const [client] = useState(() => suppliedClient ?? new ApiClient());
  const queue = useRef<EventQueue | null>(null);
  const controller = useRef<AbortController | null>(null);
  const run = useRef<Run | null>(null);
  const pending = useRef(false);
  const wakeQueue = useRef<(() => void) | null>(null);
  const supportReady = useRef(false);
  const selectionKey = useRef<{ strategy: StrategyName; key: string } | null>(null);
  const [phase, setPhase] = useState<MissionPhase | null>(null);
  const [mode, setMode] = useState<LearningMode>("standard");
  const [camera, setCamera] = useState<CameraMode>("globe");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [landmark, setLandmark] = useState<LandmarkId>("fraction-forest");
  const [slices, setSlices] = useState<number[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const [report, setReport] = useState<SimulationReport>(demoSimulation);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [support, setSupport] = useState<"lexi" | "reset" | "reality" | null>(null);
  const [supportText, setSupportText] = useState("");
  const supportStarted = useRef(0);
  const lexiKey = useRef<{ action: string; key: string } | null>(null);

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
      const key = crypto.randomUUID();
      let session: StartSessionResponse; let transport: Run["transport"] = "api";
      try { session = await client.start({ childId: DEMO_CHILD_ID, missionId: DEMO_MISSION_ID }, key, signal); }
      catch { if (signal.aborted) return; session = demoSession(crypto.randomUUID()); transport = "local"; }
      if (signal.aborted) return;
      run.current = { session, transport, startedAt: Date.now(), interacted: false, finished: false };
      setSlices([]); setAnswer(null); setMode("standard"); setReport(demoSimulation); selectionKey.current = null; supportReady.current = false;
      setLandmark("fraction-forest"); setDestination(MISSION_DESTINATION); setCamera("mission"); setPhase("standard");
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
    if (!simplified) { setSlices([]); setAnswer(null); }
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
    emit({ kind: "mission_completed", objective: run.current.session.objective, correctness: DEMO_CORRECTNESS, mode: resultMode, ...(resultMode === "chunk" ? { strategy: "chunking" as const } : resultMode === "visual" || resultMode === "visual_gesture" ? { strategy: "visual_hint" as const } : {}) });
    setPhase("complete"); setFeedback(""); setCompleted(count => count + 1);
    if (queue.current) { const delivery = controller.current ?? new AbortController(); controller.current = delivery; void queue.current.flush(client, delivery.signal, run.current.session.sessionId).catch(() => {}).finally(() => wakeQueue.current?.()); }
  };
  const check = () => {
    if (pending.current || !run.current || run.current.finished) return;
    interact(); emit({ kind: "answer_submitted", mode });
    if ((phase === "standard" ? answer : slices.length) !== 3) {
      emit({ kind: "retry_recorded", mode }); setFeedback("Almost. We need three equal pieces out of four."); return;
    }
    if (phase === "stuck" && !supportReady.current) {
      void operation(async signal => { await adapt("visual_gesture", signal, true); if (!signal.aborted) finish("visual_gesture"); });
    } else finish(mode);
  };
  const close = () => {
    controller.current?.abort(); controller.current = null; pending.current = false; setBusy(false);
    if (phase !== "complete") emit({ kind: "mission_abandoned", mode });
    run.current = null; setPhase(null); setSlices([]); setCamera("globe"); setDestination(null); setFeedback("");
    setCameraEnabled(false); setSupport(null); lexiKey.current = null;
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
      await queue.current.flush(client, signal, run.current.session.sessionId);
      try { response = await client.lexi({ sessionId: run.current.session.sessionId, ...action }, lexiKey.current.key, signal); }
      catch (error) { if (signal.aborted || !["request_hint", "create_reality_mission"].includes(action.tool ?? "")) throw error; }
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
      emit({ kind: "reality_mission_started", mode: "movement" });
      setSupportText(response?.realityMission || REALITY_PROMPT);
      supportStarted.current = Date.now(); setSupport("reality");
    } else if (action.tool === "switch_learning_mode") {
      if (!local && response?.mode !== "chunk") throw new Error("Mode not acknowledged");
      setCameraEnabled(false); setMode("chunk"); setPhase("activity"); setSupport(null);
      emit({ kind: "mode_changed", mode: "chunk" });
    } else if (action.tool === "record_self_report") {
      if (local) emit({ kind: "difficulty_self_reported", mode, difficulty: action.difficulty });
      setSupportText(response?.content.text || "Thanks for telling me. We can take one small step.");
    }
    lexiKey.current = null;
  }); };
  const completeSupport = () => {
    if (support !== "reset" && support !== "reality") return;
    emit({ kind: support === "reset" ? "reset_completed" : "reality_mission_completed", mode: support === "reset" ? mode : "movement", responseTimeMs: Math.min(86400000, Math.max(0, Date.now() - supportStarted.current)) });
    closeSupport();
  };
  const activityVisible = phase === "activity" || phase === "stuck";
  const changeSlice = (index: number, grab = false) => {
    if (!activityVisible || support || (pending.current && phase !== "stuck") || !Number.isInteger(index) || index < 0 || index > 3) return;
    interact(); setFeedback("");
    setSlices(current => current.includes(index) ? grab ? current : current.filter(slice => slice !== index) : [...current, index]);
  };
  const commands = {
    selectSlice: (index: number) => changeSlice(index), grabSlice: (index: number) => changeSlice(index, true),
    summonLexi: () => { if (pending.current || !run.current || run.current.finished) return; interact(); setCameraEnabled(false); setSupportText(""); setSupport("lexi"); },
  };
  return <UniverseCanvas quality={quality} className={`${styles.atlas} ${phase ? styles.active : ""} ${phase === "stuck" ? styles.simplified : ""}`} mode={camera} onModeChange={setCamera} destination={destination} onDestinationChange={setDestination} selectedLandmark={landmark} onLandmarkSelect={setLandmark} onMissionStart={start} pizza={{ visible: activityVisible && !support, selectedSlices: slices, onSliceSelect: commands.selectSlice }}>
    <div className={styles.atlasHud} aria-label="Mission Atlas progress"><span>MISSION ATLAS</span><strong>{completed} discoveries</strong><small>✳ {completed * WIGGLE_REWARD} Wiggle Energy</small></div>
    {!phase && busy ? <p className={styles.starting} role="status">Your mission is coming into view…</p> : null}
    {phase ? <FractionMission phase={phase} mode={mode} selectedSlices={slices} report={report} answer={answer} feedback={feedback} busy={busy} correctness={DEMO_CORRECTNESS} onAnswer={value => { interact(); setAnswer(value); setFeedback(""); }} onStuck={() => { interact(); setCameraEnabled(false); emit({ kind: "stuck_requested", mode }); setFeedback(""); setPhase("stuck"); supportReady.current = false; void operation(signal => adapt("visual_gesture", signal, true)); }} onSimulate={simulate} onSelect={select} onCheck={check} onClose={close} onBack={() => setPhase(mode === "standard" ? "standard" : "activity")} commands={commands} cameraEnabled={cameraEnabled} onCameraEnable={() => setCameraEnabled(true)} onCameraDisable={() => setCameraEnabled(false)} support={support} supportText={supportText} onLexiRequest={requestLexi} onSupportClose={closeSupport} onSupportComplete={completeSupport} /> : null}
  </UniverseCanvas>;
}
