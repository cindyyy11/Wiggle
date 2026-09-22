import type { ReactNode } from "react";
import type { ItemModelProps, PadProps } from "../benchSet";
import { BENCH_SLAB_HEIGHT, BENCH_SLAB_WIDTH } from "../benchSpace";

/** Grows and lifts an item model when it is hovered or carried. */
export function Lift({ held, hovered, matched, reducedMotion, children }: ItemModelProps & { children: ReactNode }) {
  const scale = held ? 1.25 : hovered ? 1.12 : matched ? .92 : 1;
  return <group scale={scale} position={[0, held && !reducedMotion ? .04 : 0, 0]}>{children}</group>;
}

/** A target pad's outline: bright when the carried item is over it, green once it holds its item. */
export function PadFrame({ active, filled, radius = .25, children }: PadProps & { radius?: number; children: ReactNode }) {
  const color = active ? "#ffe17d" : filled ? "#9dffb8" : "#ffffff";
  return <group>
    {children}
    <mesh position={[0, 0, .02]}>
      <torusGeometry args={[radius, active ? .022 : .012, 10, 48]} />
      <meshBasicMaterial color={color} transparent opacity={active || filled ? 1 : .55} />
    </mesh>
  </group>;
}

/** The slab the lesson sits on. */
export function Bench({ color }: { color: string }) {
  return <mesh position={[0, 0, -.08]}>
    <boxGeometry args={[BENCH_SLAB_WIDTH, BENCH_SLAB_HEIGHT, .12]} />
    <meshStandardMaterial color={color} roughness={.75} transparent opacity={.92} />
  </mesh>;
}
