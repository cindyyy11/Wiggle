"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, Quaternion, Vector3 } from "three";
import { LANDMARKS, RADIUS, surfacePoint, type Destination, type LandmarkId, type PizzaPresentation, type PizzaSlicePresentation, type SceneInteractionTargets } from "./world";
import type { InteractiveRole } from "./gestureInteraction";

export const PIZZA_SLICE_IDS = ["pizza-slice-1", "pizza-slice-2", "pizza-slice-3", "pizza-slice-4"] as const;
export const PIZZA_PLATE_ID = "pizza-plate";
export const LEXI_BEACON_ID = "lexi-beacon";

export function slicePresentation(pizza: PizzaPresentation, index: number): PizzaSlicePresentation {
  return pizza.slices?.find(slice => slice.id === PIZZA_SLICE_IDS[index])
    ?? { id: PIZZA_SLICE_IDS[index], state: pizza.selectedSlices.includes(index) ? "placed" : "available" };
}

export function plateIsAccepting(pizza: PizzaPresentation) {
  return Boolean(pizza.plate?.accepting || pizza.plate?.focused || pizza.slices?.some(slice => slice.state === "held"));
}

function registerInteractiveMesh(targets: SceneInteractionTargets | undefined, mesh: Mesh | null, id: string, role: InteractiveRole, dragObject?: Group | null) {
  if (!targets || !mesh) return;
  mesh.userData.interactive = true;
  mesh.userData.objectId = id;
  mesh.userData.role = role;
  if (dragObject ?? (role === "pizza-slice" ? mesh.parent : null)) mesh.userData.dragObject = dragObject ?? mesh.parent;
  const prior = targets.current.findIndex(target => target.id === id);
  const target = { id, role, object: mesh };
  if (prior === -1) targets.current.push(target);
  else targets.current[prior] = target;
}

function SurfaceAnchor({ destination, children }: { destination: Destination; children: ReactNode }) {
  const transform = useMemo(() => { const normal = new Vector3(...surfacePoint(destination, 1)); return { position: normal.clone().multiplyScalar(RADIUS + .03), rotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal) }; }, [destination]);
  return <group position={transform.position} quaternion={transform.rotation}>{children}</group>;
}

export function Landmarks({ selected, onSelect, reducedMotion, mission, pizza, interactionTargets }: { selected: LandmarkId; onSelect: (id: LandmarkId) => void; reducedMotion: boolean; mission: boolean; pizza?: PizzaPresentation; interactionTargets?: SceneInteractionTargets }) {
  return <group>{LANDMARKS.map(item => <SurfaceAnchor key={item.id} destination={item.destination}>
    <group name={item.name} onClick={event => { if (event.delta > 7) return; event.stopPropagation(); onSelect(item.id); }}>
      <mesh position={[0, .045, 0]}><cylinderGeometry args={[item.id === "fraction-forest" ? .34 : .22, .27, .09, 8]} /><meshStandardMaterial color={item.id === "fraction-forest" ? "#ecddb2" : "#789990"} roughness={1} flatShading /></mesh>
      {item.id === "fraction-forest" ? <MissionPedestal active={mission} pizza={pizza} interactionTargets={interactionTargets} /> : item.id === "lexi" ? <LexiBeacon reducedMotion={reducedMotion} interactionTargets={interactionTargets} /> : <group>
        <mesh position={[0, .3, 0]}><cylinderGeometry args={[.022, .034, .5, 5]} /><meshStandardMaterial color="#ddd4af" /></mesh>
        <mesh position={[.135, .5, 0]}><boxGeometry args={[.26, .18, .035]} /><meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={mission ? 0 : .07} /></mesh>
        <mesh position={[.125, .5, .029]}>{item.id === "geometry-ridge" ? <coneGeometry args={[.06, .1, 3]} /> : item.id === "crystal-crater" ? <octahedronGeometry args={[.06, 0]} /> : <boxGeometry args={[.035, .08, .015]} />}<meshStandardMaterial color="#294957" /></mesh>
      </group>}
      {selected === item.id ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, 0]}><ringGeometry args={[.35, .365, 40]} /><meshBasicMaterial color={item.color} transparent opacity={.9} depthWrite={false} /></mesh> : null}
    </group>
  </SurfaceAnchor>)}</group>;
}

function MissionPedestal({ active, pizza, interactionTargets }: { active: boolean; pizza?: PizzaPresentation; interactionTargets?: SceneInteractionTargets }) {
  return <group>
    <mesh position={[0, .15, 0]}><cylinderGeometry args={[.17, .21, .19, 8]} /><meshStandardMaterial color="#b3ccbc" roughness={.85} /></mesh>
    <mesh position={[0, .28, 0]}><cylinderGeometry args={[.33, .24, .09, 8]} /><meshStandardMaterial color="#eee5c6" roughness={.75} /></mesh>
    <mesh position={[0, .335, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.24, .27, 32]} /><meshBasicMaterial color="#f9e6a0" /></mesh>
    {pizza?.visible ? <><PlateTarget presentation={pizza} interactionTargets={interactionTargets} /><PizzaModel presentation={pizza} interactionTargets={interactionTargets} /></> : <group position={[0, .57, 0]}>
      <mesh rotation={[0, Math.PI / 4, 0]}><octahedronGeometry args={[.16, 0]} /><meshStandardMaterial color="#fff0a8" emissive="#efd182" emissiveIntensity={active ? .8 : .35} roughness={.4} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.23, .013, 4, 24]} /><meshStandardMaterial color="#d3e1b7" /></mesh>
    </group>}
  </group>;
}

function PlateTarget({ presentation, interactionTargets }: { presentation: PizzaPresentation; interactionTargets?: SceneInteractionTargets }) {
  const accepting = plateIsAccepting(presentation);
  return <group position={[.27, .37, 0]} name="Pizza plate target">
    <mesh ref={mesh => registerInteractiveMesh(interactionTargets, mesh, presentation.plate?.id ?? PIZZA_PLATE_ID, "plate")} rotation={[-Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[.32, .32, .035, 32]} /><meshStandardMaterial color={accepting ? "#fff7e7" : "#d9edc8"} emissive="#f4c95d" emissiveIntensity={accepting ? .32 : .04} roughness={.84} />
    </mesh>
    <mesh position={[0, .022, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.255, .295, 32]} /><meshBasicMaterial color="#f4c95d" transparent opacity={accepting ? .95 : .46} /></mesh>
  </group>;
}

export function LexiBeacon({ reducedMotion, interactionTargets }: { reducedMotion: boolean; interactionTargets?: SceneInteractionTargets }) {
  const light = useRef<Group>(null);
  useFrame(({ clock }) => { if (light.current) light.current.position.y = .48 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.25) * .035); });
  return <group><mesh position={[0, .18, 0]}><cylinderGeometry args={[.07, .12, .26, 6]} /><meshStandardMaterial color="#d8dcbc" roughness={.8} /></mesh><group ref={light} position={[0, .48, 0]}><mesh ref={mesh => registerInteractiveMesh(interactionTargets, mesh, LEXI_BEACON_ID, "lexi-beacon")}><octahedronGeometry args={[.16, 0]} /><meshStandardMaterial color="#fff4b8" emissive="#ffdf85" emissiveIntensity={.9} roughness={.3} /></mesh><mesh rotation={[0, 0, .6]}><torusGeometry args={[.235, .012, 4, 24]} /><meshBasicMaterial color="#f9e6b3" /></mesh><mesh><sphereGeometry args={[.22, 10, 8]} /><meshBasicMaterial color="#ffe5a2" transparent opacity={.065} depthWrite={false} /></mesh></group></group>;
}

export function PizzaModel({ presentation, interactionTargets }: { presentation: PizzaPresentation; interactionTargets?: SceneInteractionTargets }) {
  return <group position={[0, .41, 0]} scale={1.2} name="Four equal pizza slices">{[0, 1, 2, 3].map(index => {
    const start = index * Math.PI / 2 + .025; const slice = slicePresentation(presentation, index); const center = start + Math.PI / 4;
    const placed = slice.state === "placed"; const lifted = slice.state === "held" || slice.focused;
    const position: [number, number, number] = placed
      ? [.225 + Math.sin(center) * .018, .002 + (lifted ? .055 : 0), Math.cos(center) * .018]
      : [-.2 + Math.sin(center) * .018, lifted ? .065 : 0, Math.cos(center) * .018];
    return <group key={slice.id} position={position} name={slice.id} onClick={event => { if (event.delta > 7) return; event.stopPropagation(); presentation.onSliceSelect?.(index); }}>
      <mesh ref={mesh => registerInteractiveMesh(interactionTargets, mesh, slice.id, "pizza-slice")}><cylinderGeometry args={[.29, .29, .045, 10, 1, false, start, Math.PI / 2 - .05]} /><meshStandardMaterial color={placed ? "#f9d988" : "#c68d57"} emissive="#edc976" emissiveIntensity={slice.focused || slice.state === "held" ? .25 : 0} roughness={.9} /></mesh>
      <mesh position={[0, .028, 0]}><cylinderGeometry args={[.256, .256, .019, 10, 1, false, start, Math.PI / 2 - .05]} /><meshStandardMaterial color={placed ? "#ffeab1" : "#f0ca71"} emissive="#edc976" emissiveIntensity={placed ? .25 : 0} roughness={1} /></mesh>
      {[.11, .2].map((radius, topping) => <mesh key={topping} position={[Math.sin(center + topping * .15) * radius, .044, Math.cos(center + topping * .15) * radius]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.025, 7]} /><meshStandardMaterial color="#c16855" /></mesh>)}
    </group>;
  })}</group>;
}
