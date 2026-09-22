"use client";

import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { isCorrectMathAnswer, type MathChallenge } from "../math/mathActivities";
import type { AnswerState } from "./answerPlay";
import type { AnswerSet } from "./answerSet";
import { BenchCanvas } from "./BenchCanvas";
import { BENCH_WIDTH, benchX, benchY } from "./benchSpace";
import { DwellSelector } from "./dwellSelect";
import { answerStatusForFrame, trackedBenchPoint } from "./handBenchFrame";
import { benchHit } from "./handBenchPlay";
import { MatchBurst } from "./MatchBurst";

export type AnswerBenchSceneProps = {
  set: AnswerSet;
  challenge: MathChallenge;
  state: AnswerState;
  latest: RefObject<HandTrackingLatest>;
  reducedMotion: boolean;
  onSelect(option: string): void;
  onHandStatus(message: string): void;
};

const TOKEN_Z = .3;
const CURSOR_Z = .75;
const RING_DOTS = 32;
const RING_RADIUS = .27;
const SLIDE_FROM = 1.6;

function AnswerInteraction({ set, challenge, state, latest, reducedMotion, onSelect, onHandStatus }: AnswerBenchSceneProps) {
  const selector = useRef(new DwellSelector());
  const tokenGroups = useRef(new Map<string, Group>());
  const ringGroups = useRef(new Map<string, Group>());
  const stage = useRef<Group>(null);
  const cursor = useRef<Group>(null);
  const current = useRef({ challenge, state, onSelect, onHandStatus });
  current.current = { challenge, state, onSelect, onHandStatus };
  const hoverRef = useRef<string | null>(null);
  const statusRef = useRef("");
  const shakeUntil = useRef(new Map<string, number>());
  const shownChallenge = useRef(challenge.id);
  const burstKey = useRef(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [bursts, setBursts] = useState<{ key: number; x: number; y: number }[]>([]);
  const { Scenery, Puzzle, Token } = set;

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, .05);
    const now = clock.elapsedTime;
    const { challenge: c, state: s, onSelect: choose, onHandStatus: report } = current.current;
    const point = trackedBenchPoint(latest.current);
    const asking = s.phase === "asking";

    const zones = c.options.map((option, index) => ({ id: option, at: set.tokens[index], radius: set.tokenRadius }));
    const over = point && asking ? benchHit(point, zones) : null;
    const result = selector.current.update({ over, isTracking: point !== null, enabled: asking, at: now * 1000 });

    if (over !== hoverRef.current) { hoverRef.current = over; setHovered(over); }

    if (result.selected) {
      const index = c.options.indexOf(result.selected);
      if (isCorrectMathAnswer(c, result.selected)) {
        if (!reducedMotion && index >= 0) {
          burstKey.current += 1;
          const key = burstKey.current;
          setBursts((previous) => [...previous, { key, x: benchX(set.tokens[index].x), y: benchY(set.tokens[index].y) }]);
        }
      } else {
        shakeUntil.current.set(result.selected, now + .5);
      }
      choose(result.selected);
    }

    ringGroups.current.forEach((group, option) => {
      const fill = result.id === option ? result.progress : 0;
      group.children.forEach((dot, index) => { dot.visible = (index + 1) / RING_DOTS <= fill + 1e-6; });
    });

    const ease = 1 - Math.exp(-(reducedMotion ? 60 : 9) * delta);
    tokenGroups.current.forEach((group, option) => {
      const shake = shakeUntil.current.get(option) ?? 0;
      group.rotation.z = !reducedMotion && shake > now ? Math.sin(now * 42) * .18 * Math.min(1, shake - now) : 0;
    });
    if (stage.current) {
      if (shownChallenge.current !== c.id) {
        shownChallenge.current = c.id;
        if (!reducedMotion) stage.current.position.x = SLIDE_FROM;
      }
      stage.current.position.x += (0 - stage.current.position.x) * ease;
    }

    if (cursor.current) {
      cursor.current.visible = point !== null;
      if (point) cursor.current.position.set(benchX(point.x), benchY(point.y), CURSOR_Z);
    }

    const message = answerStatusForFrame(s.phase, point !== null);
    if (message !== statusRef.current) { statusRef.current = message; report(message); }
  });

  const solved = state.phase !== "asking";
  return <>
    <Scenery />
    <mesh position={[0, benchY(set.tokens[0].y), .02]}>
      <boxGeometry args={[BENCH_WIDTH * .98, .62, .04]} />
      <meshStandardMaterial color="#173e55" transparent opacity={.55} />
    </mesh>
    <group ref={stage}>
      <Puzzle challenge={challenge} answer={solved ? challenge.answer : null} reducedMotion={reducedMotion} />
    </group>
    {challenge.options.map((option, index) => <group key={`${challenge.id}:${option}`} position={[benchX(set.tokens[index].x), benchY(set.tokens[index].y), TOKEN_Z]}>
      <group ref={(node) => { if (node) tokenGroups.current.set(option, node); else tokenGroups.current.delete(option); }}>
        <Token label={option} hovered={hovered === option} solved={solved && option === challenge.answer} reducedMotion={reducedMotion} />
      </group>
      <mesh><torusGeometry args={[RING_RADIUS, .008, 8, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={.35} /></mesh>
      <group ref={(node) => { if (node) ringGroups.current.set(option, node); else ringGroups.current.delete(option); }}>
        {Array.from({ length: RING_DOTS }, (_, dot) => {
          const angle = Math.PI / 2 - (dot / RING_DOTS) * Math.PI * 2;
          return <mesh key={dot} visible={false} position={[Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS, .05]}>
            <circleGeometry args={[.028, 10]} />
            <meshBasicMaterial color="#ffe17d" />
          </mesh>;
        })}
      </group>
    </group>)}
    {bursts.map((burst) => <MatchBurst key={burst.key} x={burst.x} y={burst.y} onDone={() => setBursts((previous) => previous.filter((b) => b.key !== burst.key))} />)}
    <group ref={cursor} visible={false}>
      <mesh><torusGeometry args={[.1, .016, 12, 40]} /><meshBasicMaterial color="#ffe17d" /></mesh>
    </group>
  </>;
}

/** The answer bench: the puzzle, three answer gems with hold rings, and a cursor that follows the hand. */
export function AnswerBenchScene(props: AnswerBenchSceneProps) {
  return <BenchCanvas
    label={props.set.label}
    reducedMotion={props.reducedMotion}
    failureMessage="The workbench needs a graphics-capable device."
    onFailure={props.onHandStatus}
  >
    <AnswerInteraction {...props} />
  </BenchCanvas>;
}
