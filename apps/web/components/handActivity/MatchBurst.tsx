"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/** A short ring of sparkles where an item has just been matched or an answer chosen correctly. */
export function MatchBurst({ x, y, onDone }: { x: number; y: number; onDone(): void }) {
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
