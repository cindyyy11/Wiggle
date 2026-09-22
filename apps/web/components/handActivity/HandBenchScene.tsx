"use client";

import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import type { BenchSet } from "./benchSet";
import { benchX, benchY } from "./benchSpace";
import { BenchCanvas } from "./BenchCanvas";
import { MatchBurst } from "./MatchBurst";
import { HandBenchController } from "./handBenchController";
import { benchStatusForFrame, staleHoldToCancel, trackedBenchPoint } from "./handBenchFrame";
import { benchHit, type BenchAction, type BenchPoint, type BenchState, type BenchZone } from "./handBenchPlay";

export type HandBenchSceneProps = {
  set: BenchSet;
  state: BenchState;
  targetFor(itemId: string): string | undefined;
  latest: RefObject<HandTrackingLatest>;
  reducedMotion: boolean;
  onAction(action: BenchAction): void;
  onHandStatus(message: string): void;
  onHoldingChange?(holding: boolean): void;
};

const TARGET_Z = .1;
const REST_Z = .3;
const HELD_Z = .6;

function BenchInteraction({ set, state, targetFor, latest, reducedMotion, onAction, onHandStatus, onHoldingChange }: HandBenchSceneProps) {
  const controller = useRef(new HandBenchController());
  const groups = useRef(new Map<string, Group>());
  const cursor = useRef<Group>(null);
  const dot = useRef<Mesh>(null);
  const current = useRef({ state, onAction, onHandStatus, onHoldingChange });
  current.current = { state, onAction, onHandStatus, onHoldingChange };
  const hoverRef = useRef<string | null>(null);
  const overRef = useRef<string | null>(null);
  const statusRef = useRef("");
  const holdingRef = useRef(false);
  const heldAt = useRef<BenchPoint | null>(null);
  const wasHeld = useRef<string | null>(null);
  const lastDrop = useRef<string | null>(null);
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
    const { state: s, onAction: act, onHandStatus: report, onHoldingChange: reportHolding } = current.current;
    const frame = latest.current;
    const point = trackedBenchPoint(frame);

    const stale = staleHoldToCancel(s.held, controller.current.holding);
    if (stale) act({ type: "cancel", id: stale });

    const resting: BenchZone[] = set.items
      .filter((entry) => entry.id !== s.held && !s.matched.includes(entry.id))
      .map((entry) => ({ id: entry.id, at: entry.home, radius: entry.radius }));
    const item = point && s.phase !== "done" ? benchHit(point, resting) : null;
    const target = point && s.held ? benchHit(point, set.targets.map((t) => ({ id: t.id, at: t.at, radius: t.radius }))) : null;

    const action = controller.current.update({ phase: s.phase, gesture: frame.gesture, item, target, isTracking: point !== null, at: now * 1000 });
    if (action) {
      if (action.type === "drop") lastDrop.current = action.id;
      act(action);
    }

    const holding = s.held !== null;
    if (holding !== holdingRef.current) { holdingRef.current = holding; reportHolding?.(holding); }

    const nextHover = s.held ? null : item;
    if (nextHover !== hoverRef.current) { hoverRef.current = nextHover; setHovered(nextHover); }
    const nextOver = s.held ? target : null;
    if (nextOver !== overRef.current) { overRef.current = nextOver; setOver(nextOver); }

    if (s.held && point) heldAt.current = point;
    if (!s.held) heldAt.current = null;
    if (wasHeld.current && !s.held) {
      // Only a drop this scene emitted is a judged wrong answer; a cancel (hand lost, palm opened away) never wobbles.
      if (lastDrop.current === wasHeld.current && !s.matched.includes(wasHeld.current)) shakeUntil.current.set(wasHeld.current, now + .5);
      lastDrop.current = null;
    }
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

export function HandBenchScene(props: HandBenchSceneProps) {
  return <BenchCanvas
    label={props.set.label}
    reducedMotion={props.reducedMotion}
    failureMessage="The workbench needs a graphics-capable device."
    onFailure={props.onHandStatus}
  >
    <BenchInteraction {...props} />
  </BenchCanvas>;
}
