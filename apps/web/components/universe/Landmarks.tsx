"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Quaternion, Vector3 } from "three";
import { LANDMARKS, RADIUS, surfacePoint, type Destination, type LandmarkId, type PizzaPresentation } from "./world";

function SurfaceAnchor({ destination, children }: { destination: Destination; children: ReactNode }) {
  const transform = useMemo(() => { const normal = new Vector3(...surfacePoint(destination, 1)); return { position: normal.clone().multiplyScalar(RADIUS + .03), rotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal) }; }, [destination]);
  return <group position={transform.position} quaternion={transform.rotation}>{children}</group>;
}

export function Landmarks({ selected, onSelect, reducedMotion, mission, pizza }: { selected: LandmarkId; onSelect: (id: LandmarkId) => void; reducedMotion: boolean; mission: boolean; pizza?: PizzaPresentation }) {
  return <group>{LANDMARKS.map(item => <SurfaceAnchor key={item.id} destination={item.destination}>
    <group name={item.name} onClick={event => { if (event.delta > 7) return; event.stopPropagation(); onSelect(item.id); }}>
      <mesh position={[0, .045, 0]}><cylinderGeometry args={[item.id === "fraction-forest" ? .34 : .22, .27, .09, 8]} /><meshStandardMaterial color={item.id === "fraction-forest" ? "#ecddb2" : "#789990"} roughness={1} flatShading /></mesh>
      {item.id === "fraction-forest" ? <MissionPedestal active={mission} pizza={pizza} /> : item.id === "lexi" ? <LexiBeacon reducedMotion={reducedMotion} /> : <group>
        <mesh position={[0, .3, 0]}><cylinderGeometry args={[.022, .034, .5, 5]} /><meshStandardMaterial color="#ddd4af" /></mesh>
        <mesh position={[.135, .5, 0]}><boxGeometry args={[.26, .18, .035]} /><meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={mission ? 0 : .07} /></mesh>
        <mesh position={[.125, .5, .029]}>{item.id === "geometry-ridge" ? <coneGeometry args={[.06, .1, 3]} /> : item.id === "crystal-crater" ? <octahedronGeometry args={[.06, 0]} /> : <boxGeometry args={[.035, .08, .015]} />}<meshStandardMaterial color="#294957" /></mesh>
      </group>}
      {selected === item.id ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, 0]}><ringGeometry args={[.35, .365, 40]} /><meshBasicMaterial color={item.color} transparent opacity={.9} depthWrite={false} /></mesh> : null}
    </group>
  </SurfaceAnchor>)}</group>;
}

function MissionPedestal({ active, pizza }: { active: boolean; pizza?: PizzaPresentation }) {
  return <group>
    <mesh position={[0, .15, 0]}><cylinderGeometry args={[.17, .21, .19, 8]} /><meshStandardMaterial color="#b3ccbc" roughness={.85} /></mesh>
    <mesh position={[0, .28, 0]}><cylinderGeometry args={[.33, .24, .09, 8]} /><meshStandardMaterial color="#eee5c6" roughness={.75} /></mesh>
    <mesh position={[0, .335, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.24, .27, 32]} /><meshBasicMaterial color="#f9e6a0" /></mesh>
    {pizza?.visible ? <PizzaModel presentation={pizza} /> : <group position={[0, .57, 0]}>
      <mesh rotation={[0, Math.PI / 4, 0]}><octahedronGeometry args={[.16, 0]} /><meshStandardMaterial color="#fff0a8" emissive="#efd182" emissiveIntensity={active ? .8 : .35} roughness={.4} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.23, .013, 4, 24]} /><meshStandardMaterial color="#d3e1b7" /></mesh>
    </group>}
  </group>;
}

export function LexiBeacon({ reducedMotion }: { reducedMotion: boolean }) {
  const light = useRef<Group>(null);
  useFrame(({ clock }) => { if (light.current) light.current.position.y = .48 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.25) * .035); });
  return <group><mesh position={[0, .18, 0]}><cylinderGeometry args={[.07, .12, .26, 6]} /><meshStandardMaterial color="#d8dcbc" roughness={.8} /></mesh><group ref={light} position={[0, .48, 0]}><mesh><octahedronGeometry args={[.16, 0]} /><meshStandardMaterial color="#fff4b8" emissive="#ffdf85" emissiveIntensity={.9} roughness={.3} /></mesh><mesh rotation={[0, 0, .6]}><torusGeometry args={[.235, .012, 4, 24]} /><meshBasicMaterial color="#f9e6b3" /></mesh><mesh><sphereGeometry args={[.22, 10, 8]} /><meshBasicMaterial color="#ffe5a2" transparent opacity={.065} depthWrite={false} /></mesh></group></group>;
}

export function PizzaModel({ presentation }: { presentation: PizzaPresentation }) {
  return <group position={[0, .41, 0]} scale={1.35} name="Four equal pizza slices">{[0, 1, 2, 3].map(index => {
    const start = index * Math.PI / 2 + .025; const selected = presentation.selectedSlices.includes(index); const center = start + Math.PI / 4;
    return <group key={index} position={[Math.sin(center) * .018, selected ? .07 : 0, Math.cos(center) * .018]} onClick={event => { if (event.delta > 7) return; event.stopPropagation(); presentation.onSliceSelect?.(index); }}>
      <mesh><cylinderGeometry args={[.29, .29, .045, 10, 1, false, start, Math.PI / 2 - .05]} /><meshStandardMaterial color={selected ? "#f9d988" : "#c68d57"} roughness={.9} /></mesh>
      <mesh position={[0, .028, 0]}><cylinderGeometry args={[.256, .256, .019, 10, 1, false, start, Math.PI / 2 - .05]} /><meshStandardMaterial color={selected ? "#ffeab1" : "#f0ca71"} emissive="#edc976" emissiveIntensity={selected ? .25 : 0} roughness={1} /></mesh>
      {[.11, .2].map((radius, topping) => <mesh key={topping} position={[Math.sin(center + topping * .15) * radius, .044, Math.cos(center + topping * .15) * radius]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.025, 7]} /><meshStandardMaterial color="#c16855" /></mesh>)}
    </group>;
  })}</group>;
}
