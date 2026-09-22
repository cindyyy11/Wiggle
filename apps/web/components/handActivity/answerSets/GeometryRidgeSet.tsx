"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { ANSWER_TOKEN_HOMES, ANSWER_TOKEN_RADIUS, type AnswerSet, type PuzzleProps, type TokenProps } from "../answerSet";
import { benchX, benchY } from "../benchSpace";
import { Bench } from "../sets/setParts";
import { GemToken } from "./GemToken";
import { polygonPoints } from "./puzzleLayout";

function Scenery() {
  return <group>
    <Bench color="#6b4a2e" />
    <mesh position={[-.85, -.05, -.05]} scale={[1.2, 1.5, 1]}><coneGeometry args={[.55, 1, 4]} /><meshStandardMaterial color="#7a5738" roughness={.9} /></mesh>
    <mesh position={[.85, -.1, -.06]} scale={[1.35, 1.7, 1]}><coneGeometry args={[.6, 1, 4]} /><meshStandardMaterial color="#6a4c30" roughness={.9} /></mesh>
  </group>;
}

/** One steady corner light. Beacons light up left to right, counting to the answer, once the puzzle is solved. */
function Beacon({ x, y, lit, delay, reducedMotion }: { x: number; y: number; lit: boolean; delay: number; reducedMotion: boolean }) {
  const glow = useRef<Mesh>(null);
  const age = useRef(0);
  useFrame((_, rawDelta) => {
    age.current += Math.min(rawDelta, .05);
    if (!glow.current) return;
    const on = lit && (reducedMotion || age.current >= delay);
    glow.current.scale.setScalar(on ? 1 : .001);
  });
  return <group position={[x, y, .12]}>
    <mesh><sphereGeometry args={[.055, 16, 12]} /><meshStandardMaterial color="#a68a5c" roughness={.6} /></mesh>
    <mesh ref={glow}><sphereGeometry args={[.09, 16, 12]} /><meshBasicMaterial color="#ffe17d" transparent opacity={.85} /></mesh>
  </group>;
}

/** A polygon mountain with a beacon at each corner. A correct answer lights the beacons one by one, counting to it. */
function Puzzle({ challenge, answer, reducedMotion }: PuzzleProps) {
  const visual = challenge.visual;
  if (visual.kind !== "shape") return null;
  const sides = { triangle: 3, square: 4, hexagon: 6 }[visual.shape];
  const points = polygonPoints(sides);
  const litCount = answer !== null ? Number(answer) : 0;
  return <group>
    <mesh position={[benchX(.5), benchY(.68), .08]}>
      <ringGeometry args={[.001, .3, sides]} />
      <meshStandardMaterial color="#8a6f45" roughness={.8} />
    </mesh>
    {points.map((point, index) => <Beacon
      key={index}
      x={benchX(point.x)}
      y={benchY(point.y)}
      lit={index < litCount}
      delay={index * .35}
      reducedMotion={reducedMotion}
    />)}
  </group>;
}

function Token(props: TokenProps) {
  return <GemToken {...props} tint="#caa15a" />;
}

export const GEOMETRY_RIDGE_SET: AnswerSet = {
  region: "geometry-ridge",
  label: "Geometry Ridge workbench",
  visual: "shape",
  tokens: ANSWER_TOKEN_HOMES,
  tokenRadius: ANSWER_TOKEN_RADIUS,
  Scenery,
  Puzzle,
  Token,
};
