"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { ANSWER_TOKEN_HOMES, ANSWER_TOKEN_RADIUS, type AnswerSet, type PuzzleProps, type TokenProps } from "../answerSet";
import { benchX, benchY } from "../benchSpace";
import { Bench } from "../sets/setParts";
import { GemToken } from "./GemToken";
import { NumberPlate } from "./NumberPlate";
import { stoneTrail } from "./puzzleLayout";

function Scenery() {
  return <group>
    <Bench color="#2e6b62" />
    <mesh position={[-.75, -.28, -.02]} scale={[1.6, .5, 1]}><circleGeometry args={[.7, 40]} /><meshStandardMaterial color="#3f8a6f" /></mesh>
    <mesh position={[.7, -.32, -.02]} scale={[1.8, .45, 1]}><circleGeometry args={[.7, 40]} /><meshStandardMaterial color="#357a63" /></mesh>
    <mesh position={[0, .3, -.03]} scale={[2.55, .42, 1]}><circleGeometry args={[.7, 48]} /><meshStandardMaterial color="#79b58f" transparent opacity={.55} /></mesh>
  </group>;
}

function Stone({ x, y, gap, filled, text, reducedMotion }: { x: number; y: number; gap: boolean; filled: boolean; text: string; reducedMotion: boolean }) {
  const body = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const age = useRef(0);
  useFrame(({ clock }, rawDelta) => {
    if (glow.current) glow.current.scale.setScalar(gap && !filled && !reducedMotion ? 1 + Math.sin(clock.elapsedTime * 3.2) * .08 : 1);
    age.current = filled ? age.current + Math.min(rawDelta, .05) : 0;
    // The number drops onto its stone with a small pop.
    body.current?.scale.setScalar(1 + (filled && !reducedMotion ? Math.max(0, 1 - age.current / .35) * .5 : 0));
  });
  const stone = gap ? (filled ? "#8fe0a8" : "#2d4b5a") : "#cbb98f";
  return <group position={[x, y, .1]}>
    <group ref={body}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[.25, .28, .12, 28]} />
        <meshStandardMaterial color={stone} roughness={.85} />
      </mesh>
      {gap ? <mesh ref={glow} position={[0, 0, .07]}>
        <torusGeometry args={[.28, .025, 10, 40]} />
        <meshBasicMaterial color={filled ? "#9dffb8" : "#ffe17d"} />
      </mesh> : null}
      <group position={[0, 0, .08]}>
        <NumberPlate text={text} size={.4} color={gap && !filled ? "#ffe17d" : "#ffffff"} />
      </group>
    </group>
  </group>;
}

/** A curving trail of stepping stones. The empty glowing stone takes the answer once it is chosen. */
function Puzzle({ challenge, answer, reducedMotion }: PuzzleProps) {
  const visual = challenge.visual;
  if (visual.kind !== "sequence") return null;
  const spots = stoneTrail(visual.values.length);
  return <group>
    {visual.values.map((value, index) => {
      const gap = value === null;
      return <Stone
        key={index}
        x={benchX(spots[index].x)}
        y={benchY(spots[index].y)}
        gap={gap}
        filled={gap && answer !== null}
        text={gap ? (answer ?? "?") : String(value)}
        reducedMotion={reducedMotion}
      />;
    })}
  </group>;
}

function Token(props: TokenProps) {
  return <GemToken {...props} tint="#7fb6ff" />;
}

export const NUMBER_VALLEY_SET: AnswerSet = {
  region: "number-valley",
  label: "Number Valley workbench",
  visual: "sequence",
  tokens: ANSWER_TOKEN_HOMES,
  tokenRadius: ANSWER_TOKEN_RADIUS,
  Scenery,
  Puzzle,
  Token,
};
