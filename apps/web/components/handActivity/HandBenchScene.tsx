"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import type { BenchSet } from "./benchSet";
import { HandBenchController } from "./handBenchController";
import { benchStatusForFrame, trackedBenchPoint } from "./handBenchFrame";
import { benchHit, type BenchAction, type BenchPoint, type BenchState, type BenchZone } from "./handBenchPlay";

export type HandBenchSceneProps = {
  set: BenchSet;
  state: BenchState;
  targetFor(itemId: string): string | undefined;
  latest: RefObject<HandTrackingLatest>;
  reducedMotion: boolean;
  onAction(action: BenchAction): void;
  onHandStatus(message: string): void;
};

export const BENCH_WIDTH = 2.8;
export const BENCH_HEIGHT = 1.7;
export const benchX = (x: number) => (x - .5) * BENCH_WIDTH;
export const benchY = (y: number) => (y - .5) * BENCH_HEIGHT;

const TARGET_Z = .1;
const REST_Z = .3;
const HELD_Z = .6;
const FIELD_OF_VIEW = 42;

/** Keeps the whole bench in view on narrow screens by moving the camera back. */
function FitBench() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const halfFov = Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
    camera.position.z = Math.max(5.3, 1.75 / (halfFov * aspect), 1.1 / halfFov);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/** A short ring of sparkles where an item has just been matched. */
function MatchBurst({ x, y, onDone }: { x: number; y: number; onDone(): void }) {
  const group = useRef<Group>(null);
  const age = useRef(0);
  const finished = useRef(false);
  useFrame((_, rawDelta) => {
    age.current += Math.min(rawDelta, .05);
    const life = age.current / .8;
    if (life >= 1) {
      if (!finished.current) { finished.current = true; onDone(); }
      return;
    }
    group.current?.children.forEach((child, index) => {
      const angle = (index / 8) * Math.PI * 2;
      child.position.set(Math.cos(angle) * life * .35, Math.sin(angle) * life * .35, 0);
      child.scale.setScalar(Math.max(.01, 1 - life));
    });
  });
  return <group ref={group} position={[x, y, .7]}>
    {Array.from({ length: 8 }, (_, index) => <mesh key={index}>
      <sphereGeometry args={[.035, 8, 6]} />
      <meshBasicMaterial color={index % 2 ? "#ffe17d" : "#9dffb8"} />
    </mesh>)}
  </group>;
}

function BenchInteraction({ set, state, targetFor, latest, reducedMotion, onAction, onHandStatus }: HandBenchSceneProps) {
  const controller = useRef(new HandBenchController());
  const groups = useRef(new Map<string, Group>());
  const cursor = useRef<Group>(null);
  const dot = useRef<Mesh>(null);
  const current = useRef({ state, onAction, onHandStatus });
  current.current = { state, onAction, onHandStatus };
  const hoverRef = useRef<string | null>(null);
  const overRef = useRef<string | null>(null);
  const statusRef = useRef("");
  const heldAt = useRef<BenchPoint | null>(null);
  const wasHeld = useRef<string | null>(null);
  const seenMatched = useRef(state.matched.length);
  const shakeUntil = useRef(new Map<string, number>());
  const burstKey = useRef(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [bursts, setBursts] = useState<{ key: number; x: number; y: number }[]>([]);
  const Scenery = set.Scenery;

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, .05);
    const now = clock.elapsedTime;
    const { state: s, onAction: act, onHandStatus: report } = current.current;
    const frame = latest.current;
    const point = trackedBenchPoint(frame);

    const resting: BenchZone[] = set.items
      .filter((entry) => entry.id !== s.held && !s.matched.includes(entry.id))
      .map((entry) => ({ id: entry.id, at: entry.home, radius: entry.radius }));
    const item = point && s.phase !== "done" ? benchHit(point, resting) : null;
    const target = point && s.held ? benchHit(point, set.targets.map((t) => ({ id: t.id, at: t.at, radius: t.radius }))) : null;

    const action = controller.current.update({ phase: s.phase, gesture: frame.gesture, item, target, isTracking: point !== null, at: now * 1000 });
    if (action) act(action);

    const nextHover = s.held ? null : item;
    if (nextHover !== hoverRef.current) { hoverRef.current = nextHover; setHovered(nextHover); }
    const nextOver = s.held ? target : null;
    if (nextOver !== overRef.current) { overRef.current = nextOver; setOver(nextOver); }

    if (s.held && point) heldAt.current = point;
    if (!s.held) heldAt.current = null;
    if (wasHeld.current && !s.held && !s.matched.includes(wasHeld.current)) shakeUntil.current.set(wasHeld.current, now + .5);
    wasHeld.current = s.held;

    if (s.matched.length > seenMatched.current && !reducedMotion) {
      const id = s.matched[s.matched.length - 1];
      const pad = set.targets.find((t) => t.id === targetFor(id));
      if (pad) {
        burstKey.current += 1;
        const key = burstKey.current;
        setBursts((previous) => [...previous, { key, x: benchX(pad.at.x + pad.settle.x), y: benchY(pad.at.y + pad.settle.y) }]);
      }
    }
    seenMatched.current = s.matched.length;

    const ease = 1 - Math.exp(-(reducedMotion ? 60 : 14) * delta);
    for (const entry of set.items) {
      const group = groups.current.get(entry.id);
      if (!group) continue;
      let x = benchX(entry.home.x);
      let y = benchY(entry.home.y);
      let z = REST_Z;
      if (entry.id === s.held && heldAt.current) {
        x = benchX(heldAt.current.x); y = benchY(heldAt.current.y); z = HELD_Z;
      } else if (s.matched.includes(entry.id)) {
        const pad = set.targets.find((t) => t.id === targetFor(entry.id));
        if (pad) { x = benchX(pad.at.x + pad.settle.x); y = benchY(pad.at.y + pad.settle.y); z = TARGET_Z + .12; }
      }
      group.position.x += (x - group.position.x) * ease;
      group.position.y += (y - group.position.y) * ease;
      group.position.z += (z - group.position.z) * ease;
      const shake = shakeUntil.current.get(entry.id) ?? 0;
      group.rotation.z = !reducedMotion && shake > now ? Math.sin(now * 42) * .18 * Math.min(1, shake - now) : 0;
    }

    if (cursor.current) {
      cursor.current.visible = point !== null;
      if (point) cursor.current.position.set(benchX(point.x), benchY(point.y), HELD_Z + .15);
    }
    if (dot.current) dot.current.visible = s.held !== null;

    const message = benchStatusForFrame(s.phase, point !== null, s.held !== null);
    if (message !== statusRef.current) { statusRef.current = message; report(message); }
  });

  return <>
    <Scenery />
    {set.targets.map((t) => {
      const Pad = t.Pad;
      return <group key={t.id} position={[benchX(t.at.x), benchY(t.at.y), TARGET_Z]}>
        <Pad active={over === t.id} filled={state.matched.some((id) => targetFor(id) === t.id)} reducedMotion={reducedMotion} />
      </group>;
    })}
    {set.items.map((entry) => {
      const Model = entry.Model;
      return <group
        key={entry.id}
        ref={(node) => { if (node) groups.current.set(entry.id, node); else groups.current.delete(entry.id); }}
        position={[benchX(entry.home.x), benchY(entry.home.y), REST_Z]}
      >
        <Model held={state.held === entry.id} hovered={hovered === entry.id} matched={state.matched.includes(entry.id)} reducedMotion={reducedMotion} />
      </group>;
    })}
    {bursts.map((burst) => <MatchBurst key={burst.key} x={burst.x} y={burst.y} onDone={() => setBursts((previous) => previous.filter((b) => b.key !== burst.key))} />)}
    <group ref={cursor} visible={false}>
      <mesh><torusGeometry args={[.1, .016, 12, 40]} /><meshBasicMaterial color="#ffe17d" /></mesh>
      <mesh ref={dot} visible={false}><circleGeometry args={[.06, 24]} /><meshBasicMaterial color="#9dffb8" /></mesh>
    </group>
  </>;
}

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function HandBenchScene(props: HandBenchSceneProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const reported = useRef(false);
  const report = useRef(props.onHandStatus);
  report.current = props.onHandStatus;
  const reportFailure = useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    setWebglSupported(false);
    report.current("The workbench needs a graphics-capable device.");
  }, []);

  useEffect(() => {
    let supported = false;
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      if (context) { context.getExtension("WEBGL_lose_context")?.loseContext(); supported = true; }
    } catch { supported = false; }
    if (supported) setWebglSupported(true); else reportFailure();
  }, [reportFailure]);

  if (webglSupported !== true) return null;
  return <GraphicsBoundary onFailure={reportFailure}>
    <Canvas
      aria-label={props.set.label}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%", minHeight: 320, background: "transparent" }}
      camera={{ position: [0, 0, 5.3], fov: FIELD_OF_VIEW, near: .1, far: 30 }}
      dpr={props.reducedMotion ? 1 : [1, 1.5]}
      gl={{ antialias: !props.reducedMotion, alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
    >
      <ambientLight intensity={1.45} color="#f7e7c5" />
      <hemisphereLight args={["#fff0d4", "#3e4664", 1.1]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#ffd991" />
      <pointLight position={[1.4, 1.1, 2]} intensity={6} distance={6} color="#f39b83" />
      <FitBench />
      <BenchInteraction {...props} />
    </Canvas>
  </GraphicsBoundary>;
}
