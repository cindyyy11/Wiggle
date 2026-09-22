"use client";

import type { TokenProps } from "../answerSet";
import { NumberPlate } from "./NumberPlate";

/** An answer: a number on a cut gem. It glows when the hand is over it and turns green when it is the right answer. */
export function GemToken({ label, hovered, solved, tint }: TokenProps & { tint: string }) {
  const body = solved ? "#7be3a2" : tint;
  return <group scale={solved ? 1.12 : hovered ? 1.14 : 1}>
    <mesh scale={[1.25, 1.1, .5]}>
      <octahedronGeometry args={[.24]} />
      <meshStandardMaterial color={body} emissive={body} emissiveIntensity={hovered || solved ? .55 : .2} roughness={.35} metalness={.1} flatShading />
    </mesh>
    <group position={[0, 0, .14]}>
      <NumberPlate text={label} size={.36} />
    </group>
  </group>;
}
