import type { BenchSet, ItemModelProps, PadProps } from "../benchSet";
import { Bench, Lift, PadFrame } from "./setParts";

const Mat = ({ color }: { color: string }) => <meshStandardMaterial color={color} roughness={.65} />;

function Seed(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh scale={[1, 1.4, .8]}><sphereGeometry args={[.09, 14, 10]} /><Mat color="#dbb37d" /></mesh>
    <mesh position={[0, 0, .07]} scale={[.15, 1, .3]}><sphereGeometry args={[.07, 8, 6]} /><Mat color="#b68b56" /></mesh>
  </Lift>;
}

function Sprout(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh position={[0, -.03, 0]}><cylinderGeometry args={[.016, .022, .26, 8]} /><Mat color="#5fae5a" /></mesh>
    <mesh position={[-.09, .08, 0]} rotation={[0, 0, .7]} scale={[1.4, .6, .4]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#89d99d" /></mesh>
    <mesh position={[.09, .1, 0]} rotation={[0, 0, -.7]} scale={[1.4, .6, .4]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#89d99d" /></mesh>
    <mesh position={[0, -.17, 0]} scale={[1.2, .5, .8]}><sphereGeometry args={[.08, 12, 8]} /><Mat color="#7a5a3c" /></mesh>
  </Lift>;
}

function Flower(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh position={[0, -.06, 0]}><cylinderGeometry args={[.018, .024, .34, 8]} /><Mat color="#4f9d4e" /></mesh>
    <mesh position={[-.09, -.08, 0]} rotation={[0, 0, .8]} scale={[1.3, .55, .4]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#6bc26a" /></mesh>
    <mesh position={[.09, -.02, 0]} rotation={[0, 0, -.8]} scale={[1.3, .55, .4]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#6bc26a" /></mesh>
    {Array.from({ length: 6 }, (_, index) => {
      const angle = (index / 6) * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * .085, .14 + Math.sin(angle) * .085, 0]} scale={[1, 1, .6]}><sphereGeometry args={[.055, 12, 8]} /><Mat color="#f5a1b9" /></mesh>;
    })}
    <mesh position={[0, .14, .03]}><sphereGeometry args={[.05, 12, 10]} /><Mat color="#ffd45c" /></mesh>
  </Lift>;
}

function plot(pips: number) {
  const Pad = (props: PadProps) => <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40]} /><meshStandardMaterial color="#7a5a3c" roughness={.95} /></mesh>
    {Array.from({ length: pips }, (_, index) => <mesh key={index} position={[(index - (pips - 1) / 2) * .1, .14, .04]}>
      <sphereGeometry args={[.035, 10, 8]} /><meshStandardMaterial color="#ffe17d" />
    </mesh>)}
  </PadFrame>;
  Pad.displayName = `Plot${pips}`;
  return Pad;
}

const ITEM_Y = .28;
const TARGET_Y = .72;
const settle = { x: 0, y: 0 };

export const LIFE_CYCLE_SET: BenchSet = {
  land: "life-cycle",
  label: "Life Cycle Garden workbench",
  // The lesson lists the flower first, so the stages start out of order on the bench.
  items: [
    { id: "flower", home: { x: .25, y: ITEM_Y }, radius: .09, Model: Flower },
    { id: "seed", home: { x: .5, y: ITEM_Y }, radius: .09, Model: Seed },
    { id: "sprout", home: { x: .75, y: ITEM_Y }, radius: .09, Model: Sprout },
  ],
  targets: [
    { id: "first", at: { x: .25, y: TARGET_Y }, radius: .1, settle, Pad: plot(1) },
    { id: "second", at: { x: .5, y: TARGET_Y }, radius: .1, settle, Pad: plot(2) },
    { id: "third", at: { x: .75, y: TARGET_Y }, radius: .1, settle, Pad: plot(3) },
  ],
  Scenery: () => <Bench color="#b89a63" />,
};
