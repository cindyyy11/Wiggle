import type { BenchSet, ItemModelProps, PadProps } from "../benchSet";
import { Bench, Lift, PadFrame } from "./setParts";

const COLORS: Record<string, string> = { red: "#ee6f7c", yellow: "#ffda65", blue: "#74c7f7", purple: "#bd94ef" };
/** A regular polygon from a circle with few segments: circle, triangle (point up), square, diamond. */
const SHAPES: Record<string, { sides: number; turn: number }> = {
  red: { sides: 32, turn: 0 },
  yellow: { sides: 3, turn: Math.PI / 2 },
  blue: { sides: 4, turn: Math.PI / 4 },
  purple: { sides: 4, turn: 0 },
};

function Glyph({ id, radius, z }: { id: string; radius: number; z: number }) {
  const shape = SHAPES[id];
  return <mesh position={[0, 0, z]} rotation={[0, 0, shape.turn]}>
    <circleGeometry args={[radius, shape.sides]} />
    <meshBasicMaterial color="#ffffff" />
  </mesh>;
}

function gem(id: string) {
  const Model = (props: ItemModelProps) => <Lift {...props}>
    <mesh><octahedronGeometry args={[.17, 0]} /><meshStandardMaterial color={COLORS[id]} roughness={.25} metalness={.1} flatShading /></mesh>
    <Glyph id={id} radius={.07} z={.19} />
  </Lift>;
  Model.displayName = `${id}Gem`;
  return Model;
}

function pedestal(id: string) {
  const Pad = (props: PadProps) => <PadFrame {...props}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.22, .24, .06, 32]} /><meshStandardMaterial color={COLORS[id]} roughness={.5} transparent opacity={.6} /></mesh>
    <Glyph id={id} radius={.09} z={.05} />
  </PadFrame>;
  Pad.displayName = `${id}Pedestal`;
  return Pad;
}

const ITEM_Y = .28;
const TARGET_Y = .72;
const settle = { x: 0, y: 0 };

export const COLOR_SET: BenchSet = {
  land: "colors",
  label: "Colors Canyon workbench",
  items: [
    { id: "red", home: { x: .2, y: ITEM_Y }, radius: .09, Model: gem("red") },
    { id: "yellow", home: { x: .4, y: ITEM_Y }, radius: .09, Model: gem("yellow") },
    { id: "blue", home: { x: .6, y: ITEM_Y }, radius: .09, Model: gem("blue") },
    { id: "purple", home: { x: .8, y: ITEM_Y }, radius: .09, Model: gem("purple") },
  ],
  // Deliberately not in the crystals' order, so a child matches by colour and shape rather than by position.
  targets: [
    { id: "blue", at: { x: .15, y: TARGET_Y }, radius: .1, settle, Pad: pedestal("blue") },
    { id: "red", at: { x: .38, y: TARGET_Y }, radius: .1, settle, Pad: pedestal("red") },
    { id: "purple", at: { x: .62, y: TARGET_Y }, radius: .1, settle, Pad: pedestal("purple") },
    { id: "yellow", at: { x: .85, y: TARGET_Y }, radius: .1, settle, Pad: pedestal("yellow") },
  ],
  Scenery: () => <Bench color="#a5808f" />,
};
