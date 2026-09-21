import type { BenchSet, ItemModelProps, PadProps } from "../benchSet";
import { Bench, Lift, PadFrame } from "./setParts";

const Mat = ({ color }: { color: string }) => <meshStandardMaterial color={color} roughness={.6} />;
const Dark = () => <meshBasicMaterial color="#1b1b1b" />;

function Horse(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh position={[0, .02, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[.1, .26, 4, 12]} /><Mat color="#b9825d" /></mesh>
    <mesh position={[.19, .17, 0]} rotation={[0, 0, -.5]}><capsuleGeometry args={[.055, .17, 4, 10]} /><Mat color="#b9825d" /></mesh>
    <mesh position={[.28, .27, 0]} rotation={[0, 0, -1.1]}><capsuleGeometry args={[.05, .12, 4, 10]} /><Mat color="#a9744f" /></mesh>
    <mesh position={[.22, .3, 0]}><boxGeometry args={[.04, .1, .04]} /><Mat color="#4b3324" /></mesh>
    {[-.16, -.07, .09, .17].map((x) => <mesh key={x} position={[x, -.17, 0]}><cylinderGeometry args={[.03, .026, .2, 8]} /><Mat color="#8b5d3f" /></mesh>)}
    <mesh position={[-.27, .07, 0]} rotation={[0, 0, .6]}><capsuleGeometry args={[.025, .14, 4, 8]} /><Mat color="#4b3324" /></mesh>
    <mesh position={[.3, .3, .05]}><sphereGeometry args={[.014, 8, 6]} /><Dark /></mesh>
  </Lift>;
}

function Frog(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh scale={[1.25, .85, .9]}><sphereGeometry args={[.16, 20, 14]} /><Mat color="#78d56b" /></mesh>
    <mesh position={[0, -.03, .11]} scale={[1, .7, .5]}><sphereGeometry args={[.13, 16, 10]} /><Mat color="#b5ee9c" /></mesh>
    {[-.09, .09].map((x) => <group key={x} position={[x, .13, .06]}>
      <mesh><sphereGeometry args={[.055, 12, 10]} /><Mat color="#78d56b" /></mesh>
      <mesh position={[0, .01, .045]}><sphereGeometry args={[.035, 10, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[0, .01, .075]}><sphereGeometry args={[.017, 8, 6]} /><Dark /></mesh>
    </group>)}
    {[-.2, .2].map((x) => <mesh key={x} position={[x, -.1, .03]} scale={[1, .5, 1]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#5fc257" /></mesh>)}
    <mesh position={[0, -.05, .19]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.05, .008, 6, 16, Math.PI]} /><meshBasicMaterial color="#2c6b32" /></mesh>
  </Lift>;
}

function Bird(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh scale={[1.15, 1, .95]}><sphereGeometry args={[.15, 20, 14]} /><Mat color="#6dccf3" /></mesh>
    <mesh position={[.15, .1, 0]}><sphereGeometry args={[.085, 14, 10]} /><Mat color="#6dccf3" /></mesh>
    <mesh position={[.24, .09, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[.035, .09, 10]} /><Mat color="#ffb04a" /></mesh>
    <mesh position={[.17, .13, .07]}><sphereGeometry args={[.016, 8, 6]} /><Dark /></mesh>
    <mesh position={[-.03, 0, .12]} rotation={[0, 0, .5]} scale={[1.3, .7, .4]}><sphereGeometry args={[.09, 12, 8]} /><Mat color="#3faee0" /></mesh>
    <mesh position={[-.22, -.03, 0]} rotation={[0, 0, Math.PI / 2 + .3]}><coneGeometry args={[.05, .16, 8]} /><Mat color="#3faee0" /></mesh>
    {[-.03, .05].map((x) => <mesh key={x} position={[x, -.16, 0]}><cylinderGeometry args={[.008, .008, .08, 5]} /><Mat color="#ffb04a" /></mesh>)}
  </Lift>;
}

function Fish(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh scale={[1.5, .85, .6]}><sphereGeometry args={[.14, 20, 14]} /><Mat color="#ffa86d" /></mesh>
    <mesh position={[-.24, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, .4]}><coneGeometry args={[.11, .16, 3]} /><Mat color="#ff8a4a" /></mesh>
    <mesh position={[0, .13, 0]} scale={[1.2, .5, .3]}><sphereGeometry args={[.07, 10, 8]} /><Mat color="#ff8a4a" /></mesh>
    <mesh position={[.14, .03, .07]}><sphereGeometry args={[.026, 10, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
    <mesh position={[.15, .03, .095]}><sphereGeometry args={[.012, 8, 6]} /><Dark /></mesh>
    <mesh position={[.05, -.04, .05]} rotation={[0, 0, .3]} scale={[1.2, .5, .3]}><sphereGeometry args={[.05, 10, 8]} /><Mat color="#ff8a4a" /></mesh>
  </Lift>;
}

function Meadow(props: PadProps) {
  return <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40]} /><meshStandardMaterial color="#8fd18a" roughness={.9} /></mesh>
    {([[-.1, .05], [.08, -.08], [.12, .1], [-.06, -.12]] as const).map(([x, y]) => <mesh key={`${x}${y}`} position={[x, y, .03]}><coneGeometry args={[.02, .07, 6]} /><meshStandardMaterial color="#4f9d4e" /></mesh>)}
  </PadFrame>;
}

function Shore(props: PadProps) {
  return <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40, 0, Math.PI]} /><meshStandardMaterial color="#e9d29a" roughness={.9} /></mesh>
    <mesh><circleGeometry args={[.25, 40, Math.PI, Math.PI]} /><meshStandardMaterial color="#5fb7e8" roughness={.5} /></mesh>
  </PadFrame>;
}

function Sky(props: PadProps) {
  return <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40]} /><meshStandardMaterial color="#a8dcf5" roughness={.9} /></mesh>
    {([[-.08, .06], [.02, .09], [.1, .04]] as const).map(([x, y]) => <mesh key={`${x}${y}`} position={[x, y, .04]}><sphereGeometry args={[.05, 12, 10]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
  </PadFrame>;
}

function Pool(props: PadProps) {
  return <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40]} /><meshStandardMaterial color="#4aa8e0" roughness={.4} /></mesh>
    {[.1, .16].map((radius) => <mesh key={radius} position={[0, 0, .03]}><torusGeometry args={[radius, .006, 6, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={.6} /></mesh>)}
  </PadFrame>;
}

const ITEM_Y = .28;
const TARGET_Y = .72;

export const ANIMAL_SET: BenchSet = {
  land: "animals",
  label: "Animal Types workbench",
  items: [
    { id: "horse", home: { x: .2, y: ITEM_Y }, radius: .09, Model: Horse },
    { id: "frog", home: { x: .4, y: ITEM_Y }, radius: .09, Model: Frog },
    { id: "bird", home: { x: .6, y: ITEM_Y }, radius: .09, Model: Bird },
    { id: "fish", home: { x: .8, y: ITEM_Y }, radius: .09, Model: Fish },
  ],
  targets: [
    { id: "land", at: { x: .15, y: TARGET_Y }, radius: .1, settle: { x: 0, y: 0 }, Pad: Meadow },
    { id: "both", at: { x: .38, y: TARGET_Y }, radius: .1, settle: { x: 0, y: 0 }, Pad: Shore },
    { id: "air-land", at: { x: .62, y: TARGET_Y }, radius: .1, settle: { x: 0, y: 0 }, Pad: Sky },
    { id: "water", at: { x: .85, y: TARGET_Y }, radius: .1, settle: { x: 0, y: 0 }, Pad: Pool },
  ],
  Scenery: () => <Bench color="#c9a26b" />,
};
