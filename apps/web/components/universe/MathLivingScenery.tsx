"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Color, InstancedMesh, Object3D, Quaternion, Vector3 } from "three";
import { RADIUS, surfacePoint, type Destination } from "./world";
import { mathSceneryLayout } from "./mathSceneryLayout";
import { BerryProp, HILL_COLORS, HillProp, NUMERIA_REGION_COLORS, NumberBoxProp, TreeProp } from "./mathRegionProps";

const UP = new Vector3(0, 1, 0);
/**
 * Numeria's own starting counts, tuned for its lighter props: more heroes than Science's 110/64 because Numeria's are
 * simpler single meshes, and fewer ground dots than Science's 460/240 so the globe stays airy rather than speckled.
 */
const HERO_COUNTS = { high: 140, low: 70 } as const;
const DOT_COUNTS = { high: 380, low: 160 } as const;

function FillGroup({ destination, children }: { destination: Destination; children: ReactNode }) {
  const normal = new Vector3(...surfacePoint(destination, 1));
  return <group position={normal.clone().multiplyScalar(RADIUS + .03)} quaternion={new Quaternion().setFromUnitVectors(UP, normal)}>{children}</group>;
}

/** One small prop per surviving whole-globe point, chosen by the point's nearest land so an area still hints at whose territory it's in, far from the land itself. */
function HeroProp({ region, index, dimmed }: { region: number; index: number; dimmed: boolean }) {
  switch (region) {
    case 0: return <TreeProp tint={index} />;
    case 1: return <NumberBoxProp tier={index % 3} rotation={index} />;
    case 2: return <HillProp height={.35 + (index % 5) * .07} color={HILL_COLORS[index % HILL_COLORS.length]} />;
    default: return <BerryProp color={index % 3 === 0 ? "#ef8b78" : "#f4c95d"} dimmed={dimmed} />;
  }
}

/**
 * Fills the gaps between Numeria's four hand-placed clusters with small, sparse versions of their own props, plus a
 * light instanced dust of ground detail, so the whole globe reads as populated the way the Science planet's does.
 */
export function MathLivingScenery({ quality, dimmed }: { quality: "high" | "low"; dimmed: boolean }) {
  const heroes = useMemo(() => mathSceneryLayout(HERO_COUNTS[quality]), [quality]);
  const dots = useMemo(() => mathSceneryLayout(DOT_COUNTS[quality]), [quality]);
  const details = useRef<InstancedMesh>(null);

  useEffect(() => {
    if (!details.current) return;
    const object = new Object3D(); const normal = new Vector3(); const color = new Color();
    dots.forEach((item, index) => {
      normal.set(...item.point);
      object.position.copy(normal).multiplyScalar(RADIUS + .01);
      object.quaternion.setFromUnitVectors(UP, normal);
      const size = .05 + (item.index % 4) * .015;
      object.scale.set(size, size * .6, size);
      object.updateMatrix();
      details.current!.setMatrixAt(index, object.matrix);
      details.current!.setColorAt(index, color.set(NUMERIA_REGION_COLORS[item.region]));
    });
    details.current.instanceMatrix.needsUpdate = true;
    if (details.current.instanceColor) details.current.instanceColor.needsUpdate = true;
  }, [dots]);

  return <group>
    <instancedMesh ref={details} args={[undefined, undefined, dots.length]} raycast={() => {}}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} transparent opacity={dimmed ? .35 : .85} />
    </instancedMesh>
    {heroes.map(item => <FillGroup key={item.index} destination={item.destination}>
      <group scale={.55 + (item.index % 4) * .1} rotation={[0, item.index * 1.7, 0]}>
        <HeroProp region={item.region} index={item.index} dimmed={dimmed} />
      </group>
    </FillGroup>)}
  </group>;
}
