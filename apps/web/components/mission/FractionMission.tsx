import { useEffect, useRef } from "react";
import type { LearningMode, SimulationReport, StrategyName } from "@wiggle/contracts";
import { CompletionMoment } from "./CompletionMoment";
import { LessonMorph } from "./LessonMorph";
import { PizzaActivity } from "./PizzaActivity";
import { SimulationHologram } from "./SimulationHologram";
import { StuckMode } from "./StuckMode";
import { GestureControls } from "./GestureControls";
import { LexiBeacon } from "../lexi/LexiBeacon";
import { LexiPanel, type LexiAction } from "../lexi/LexiPanel";
import { ResetStation } from "./ResetStation";
import { RealityMission } from "./RealityMission";
import type { MissionInputCommands } from "../../features/gestures/commands";
import type { HandTrackingState } from "../../features/gestures/useHandTracking";
import styles from "./mission.module.css";

export type MissionPhase = "standard" | "stuck" | "simulation" | "activity" | "complete";
export interface FractionMissionProps {
  phase: MissionPhase; mode: LearningMode; selectedSlices: readonly number[]; report: SimulationReport;
  answer: number | null; feedback: string; busy: boolean; correctness: number;
  onAnswer: (answer: number) => void; onStuck: () => void; onSimulate: () => void;
  onSelect: (strategy: StrategyName) => void; onCheck: () => void; onClose: () => void; onBack: () => void;
  commands: MissionInputCommands; cameraEnabled: boolean; onCameraEnable(): void; onCameraDisable(): void;
  tracking: HandTrackingState;
  support: "lexi" | "reset" | "reality" | null; supportText: string;
  realityCompleted: boolean;
  onLexiRequest(action: LexiAction): void; onSupportClose(): void; onSupportComplete(): void;
}

export function FractionMission(props: FractionMissionProps) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { if (!props.support) panel.current?.focus({ preventScroll: true }); }, [props.phase, props.mode, props.support]);
  return <section ref={panel} tabIndex={-1} className={styles.panel} aria-label="Fraction mission" aria-busy={props.busy} data-mission-phase={props.phase}>
    {props.phase !== "complete" ? <button className={styles.close} onClick={props.onClose} aria-label="Leave mission">×</button> : null}
    {props.support === "lexi" ? <LexiPanel text={props.supportText} busy={props.busy} onRequest={props.onLexiRequest} onClose={props.onSupportClose} /> : props.support === "reset" ? <ResetStation onComplete={props.onSupportComplete} onCancel={props.onSupportClose} /> : props.support === "reality" ? <RealityMission prompt={props.supportText} onComplete={props.onSupportComplete} onCancel={props.onSupportClose} /> : <fieldset disabled={props.busy}>
      {props.phase === "stuck" ? <StuckMode onExplore={props.onSimulate} onCheck={props.onCheck} selectedSlices={props.selectedSlices} /> : null}
      {props.phase === "simulation" ? <SimulationHologram report={props.report} onSelect={props.onSelect} /> : null}
      {props.phase === "complete" ? <CompletionMoment correctness={props.correctness} onReturn={props.onClose} onReality={() => props.onLexiRequest({ tool: "create_reality_mission" })} realityCompleted={props.realityCompleted} /> : null}
      {props.phase === "standard" || props.phase === "activity" ? <>
        <span className={styles.kicker}>FRACTION FOREST · 01</span>
        {props.phase === "activity" ? <><LessonMorph mode={props.mode} /><PizzaActivity selectedSlices={props.selectedSlices} mode={props.mode} onCheck={props.onCheck} /></> : <><h2>Make three quarters</h2><p>Three quarters means how many of four equal pieces?</p><div className={styles.answers} role="group" aria-label="Choose an answer">{[1, 2, 3].map(answer => <button key={answer} aria-pressed={props.answer === answer} onClick={() => props.onAnswer(answer)}>{answer} of 4</button>)}</div><button className={styles.primary} onClick={props.onCheck}>Check my answer <span aria-hidden="true">↗</span></button></>}
        <div className={styles.modes} role="group" aria-label="Learning mode">{([{ label: "Standard", strategy: "standard", mode: "standard" }, { label: "Visual", strategy: "visual", mode: "visual" }, { label: "Gesture", strategy: "gesture", mode: "gesture" }, { label: "Tiny steps", strategy: "chunked", mode: "chunk" }] as const).map(item => <button key={item.strategy} aria-pressed={props.mode === item.mode} onClick={() => props.onSelect(item.strategy)}>{item.label}</button>)}</div>
        <button className={styles.quiet} onClick={props.onStuck}>I'm stuck</button>
      </> : null}
      {props.phase === "activity" && (props.mode === "gesture" || props.mode === "visual_gesture") ? <GestureControls enabled={props.cameraEnabled} onEnable={props.onCameraEnable} onDisable={props.onCameraDisable} commands={props.commands} tracking={props.tracking} /> : null}
      {props.phase !== "complete" ? <LexiBeacon onSummon={props.commands.summonLexi} /> : null}
    </fieldset>}
    <p className={styles.feedback} role="status">{props.busy ? "A little moment…" : props.feedback}</p>
  </section>;
}
