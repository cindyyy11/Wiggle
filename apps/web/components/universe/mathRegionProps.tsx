"use client";

/** One color per Numeria land, used for terrain shading, the region plateaus and the filler layer's ground-detail tint. */
export const NUMERIA_REGION_COLORS = ["#67c96f", "#f8c83f", "#55bde8", "#f17463"] as const;
export const NUMERIA_REGION_COUNT = 4;
export const HILL_COLORS = ["#cceaf2", "#a9d9ee", "#d9c9f0"];

/**
 * Fraction Forest's tree: a trunk and a round crown, in local up-facing coordinates. Forest's own dense cluster stays
 * instanced and unchanged; this is for the whole-globe filler layer, which places props individually.
 */
export function TreeProp({ tint }: { tint: number }) {
  const crownColor = tint % 3 === 0 ? "#b8dcae" : tint % 3 === 1 ? "#9dc99a" : "#cfe6bf";
  return <group>
    <mesh position={[0, .15, 0]}><cylinderGeometry args={[.035, .05, .3, 5]} /><meshStandardMaterial color="#5e8b67" roughness={1} /></mesh>
    <mesh position={[0, .35, 0]}><sphereGeometry args={[.26, 8, 6]} /><meshStandardMaterial color={crownColor} roughness={1} flatShading /></mesh>
  </group>;
}

/** Geometry Ridge's candy hill: two stacked, rounded domes. No sharp peaks. */
export function HillProp({ height, color }: { height: number; color: string }) {
  return <group>
    <mesh position={[0, height * .32, 0]} scale={[1, .82, 1]}><sphereGeometry args={[height * .55, 10, 8]} /><meshStandardMaterial color={color} roughness={1} flatShading /></mesh>
    <mesh position={[0, height * .58, 0]} scale={[.5, .42, .5]}><sphereGeometry args={[height * .55, 8, 6]} /><meshStandardMaterial color="#fff7e7" flatShading /></mesh>
  </group>;
}

/** Crystal Crater's gem berry: plump and glossy instead of pointy. */
export function BerryProp({ color, dimmed }: { color: string; dimmed: boolean }) {
  return <group>
    <mesh position={[0, .13, 0]}><sphereGeometry args={[.15, 10, 8]} /><meshStandardMaterial color={color} emissive="#ef8b78" emissiveIntensity={dimmed ? .02 : .1} roughness={.5} flatShading /></mesh>
    <mesh position={[-.04, .18, .09]}><sphereGeometry args={[.04, 6, 6]} /><meshStandardMaterial color="#fff7e7" transparent opacity={.8} /></mesh>
  </group>;
}

/** Number Valley's garden box: a numbered block, taller and warmer-colored for higher tiers. */
export function NumberBoxProp({ tier, rotation }: { tier: number; rotation: number }) {
  return <mesh position={[0, .035 * (1 + tier), 0]} rotation={[0, rotation, 0]}>
    <boxGeometry args={[.2, .12 * (1 + tier), .2]} />
    <meshStandardMaterial color={tier % 3 === 0 ? "#f4c95d" : "#e8ad67"} flatShading roughness={1} />
  </mesh>;
}
