"use client";

import { ANSWER_TOKEN_HOMES, ANSWER_TOKEN_RADIUS, type AnswerSet, type PuzzleProps, type TokenProps } from "../answerSet";
import { benchX, benchY } from "../benchSpace";
import { Bench } from "../sets/setParts";
import { GemToken } from "./GemToken";
import { NumberPlate } from "./NumberPlate";
import { crystalOffsets } from "./puzzleLayout";

function Scenery() {
  return <group>
    <Bench color="#3a2d5a" />
    <mesh position={[0, -.02, -.05]} scale={[2.4, .8, 1]}><circleGeometry args={[.6, 40]} /><meshStandardMaterial color="#251c40" roughness={.9} /></mesh>
  </group>;
}

function Crystal({ x, y, ghost }: { x: number; y: number; ghost: boolean }) {
  return <mesh position={[x, y, ghost ? -.05 : .1]} scale={ghost ? .001 : 1}>
    <octahedronGeometry args={[.09]} />
    <meshStandardMaterial color="#b48cff" emissive="#8a5cff" emissiveIntensity={.4} roughness={.25} metalness={.15} flatShading />
  </mesh>;
}

/** Two groups of crystals with a plus or minus between them. Subtraction ghosts the crystals that roll away once solved. */
function Puzzle({ challenge, answer }: PuzzleProps) {
  const visual = challenge.visual;
  if (visual.kind !== "crystals") return null;
  const leftAt = { x: .27, y: .7 };
  const rightAt = { x: .73, y: .7 };
  const solved = answer !== null;
  const rightGhostCount = visual.operator === "-" && solved ? visual.right : 0;
  return <group>
    {crystalOffsets(visual.left).map((offset, index) => <Crystal key={index} x={benchX(leftAt.x) + offset.x} y={benchY(leftAt.y) + offset.y} ghost={false} />)}
    {crystalOffsets(visual.right).map((offset, index) => <Crystal key={index} x={benchX(rightAt.x) + offset.x} y={benchY(rightAt.y) + offset.y} ghost={index < rightGhostCount} />)}
    <group position={[benchX(.5), benchY(.7), .12]}>
      <NumberPlate text={visual.operator === "+" ? "+" : "−"} size={.34} color="#ffe17d" />
    </group>
  </group>;
}

function Token(props: TokenProps) {
  return <GemToken {...props} tint="#b48cff" />;
}

export const CRYSTAL_CRATER_SET: AnswerSet = {
  region: "crystal-crater",
  label: "Crystal Crater workbench",
  visual: "crystals",
  tokens: ANSWER_TOKEN_HOMES,
  tokenRadius: ANSWER_TOKEN_RADIUS,
  Scenery,
  Puzzle,
  Token,
};
