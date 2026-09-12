"use client";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Color, InstancedMesh, Object3D, Quaternion, Vector3 } from "three";
import { surfacePoint, type Destination } from "../universe/world";
import { SCIENCE_LANDS } from "./scienceLands";
import { CHECKPOINTS } from "./magnetAdventure";
import { sceneryLayout } from './scienceSceneryLayout';

export function SurfaceGroup({ destination, children, radius = 3.025 }: { destination: Destination; children: ReactNode; radius?: number }) {
  const normal = new Vector3(...surfacePoint(destination, 1));
  return <group position={normal.clone().multiplyScalar(radius)} quaternion={new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal)}>{children}</group>;
}
export function Tree({ small = false }: { small?: boolean }) {
  return <group scale={small ? .65 : 1}><mesh position={[0, .18, 0]}><cylinderGeometry args={[.055, .08, .36, 7]} /><meshStandardMaterial color="#a57553" /></mesh>
    <mesh position={[0, .46, 0]} scale={[1, 1.2, 1]}><icosahedronGeometry args={[.27, 1]} /><meshStandardMaterial color="#40ae7e" flatShading /></mesh>
    <mesh position={[.12, .62, 0]}><icosahedronGeometry args={[.2, 1]} /><meshStandardMaterial color="#98d96c" flatShading /></mesh></group>;
}
export function Hut() { return <group>
  <mesh position={[0, .23, 0]}><boxGeometry args={[.58, .46, .48]} /><meshStandardMaterial color="#d6a16d" /></mesh>
  <mesh position={[0, .61, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[.52, .42, 4]} /><meshStandardMaterial color="#ed8069" flatShading /></mesh>
  <mesh position={[0, .15, .245]}><boxGeometry args={[.17, .3, .02]} /><meshStandardMaterial color="#795748" /></mesh>
  <mesh position={[.19, .29, .25]}><boxGeometry args={[.12, .13, .02]} /><meshStandardMaterial color="#c8f9fa" /></mesh>
  </group>; }
function Campfire() { return <group>
  {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 4) * .22, .045, Math.sin(i * Math.PI / 4) * .22]} scale={[1, .65, 1]}><icosahedronGeometry args={[.065, 0]} /><meshStandardMaterial color="#a6adb1" /></mesh>)}
  {[0, 1].map(i => <mesh key={i} position={[0, .06, 0]} rotation={[Math.PI / 2, 0, i * Math.PI / 2]}><cylinderGeometry args={[.045, .045, .36, 7]} /><meshStandardMaterial color="#9d674d" /></mesh>)}
  <mesh position={[0, .19, 0]}><coneGeometry args={[.12, .31, 7]} /><meshStandardMaterial color="#ffb840" emissive="#ff7c34" emissiveIntensity={.4} /></mesh>
  <mesh position={[.02, .15, .03]}><coneGeometry args={[.07, .2, 6]} /><meshStandardMaterial color="#fff0a0" emissive="#ffcb52" emissiveIntensity={.5} /></mesh>
  </group>; }
function River() { return <group>{Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[Math.sin(i * .55) * .13, .018 - ((i - 7) ** 2) * .003, (i - 7) * .095]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.12, 12]} /><meshStandardMaterial color={i % 3 ? "#43c9ec" : "#a0f0ff"} roughness={.25} /></mesh>)}</group>; }
export function Horse() { return <group>
  <mesh position={[0, .28, 0]} scale={[.32, .16, .14]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#bb8159" /></mesh>
  <mesh position={[.23, .46, 0]} rotation={[0, 0, -.35]}><capsuleGeometry args={[.09, .25, 4, 8]} /><meshStandardMaterial color="#bb8159" /></mesh>
  <mesh position={[.31, .59, .02]} scale={[.16, .095, .095]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#d6a175" /></mesh>
  {[-1, 1].flatMap(x => [-1, 1].map(z => <mesh key={`${x}${z}`} position={[x * .18, .12, z * .085]}><capsuleGeometry args={[.032, .2, 3, 7]} /><meshStandardMaterial color="#925f4a" /></mesh>))}
  {[-1, 1].map(z => <mesh key={z} position={[.25, .71, z * .055]}><coneGeometry args={[.04, .13, 6]} /><meshStandardMaterial color="#986443" /></mesh>)}
  <mesh position={[-.32, .24, 0]} rotation={[0, 0, -.3]}><capsuleGeometry args={[.035, .23, 3, 6]} /><meshStandardMaterial color="#61453b" /></mesh>
  </group>; }
export function Frog() { return <group>
  <mesh position={[0, .08, 0]} scale={[1.3, .6, 1]}><sphereGeometry args={[.14, 12, 8]} /><meshStandardMaterial color="#71d956" /></mesh>
  {[-1, 1].map(x => <group key={x} position={[x * .095, .16, .04]}><mesh><sphereGeometry args={[.06, 10, 8]} /><meshStandardMaterial color="#b9ef86" /></mesh><mesh position={[0, 0, .048]}><sphereGeometry args={[.025, 8, 6]} /><meshStandardMaterial color="#243845" /></mesh></group>)}
  </group>; }
export function Bird() { return <group>
  <mesh scale={[1, .85, 1.5]}><sphereGeometry args={[.11, 12, 8]} /><meshStandardMaterial color="#ffbd48" /></mesh>
  <mesh position={[0, .08, .13]}><sphereGeometry args={[.08, 10, 8]} /><meshStandardMaterial color="#58bedc" /></mesh>
  <mesh position={[0, .07, .24]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.04, .09, 5]} /><meshStandardMaterial color="#ef8756" /></mesh>
  {[-1, 1].map(x => <mesh key={x} position={[x * .14, .02, 0]} rotation={[0, 0, x * .4]} scale={[2, .3, 1]}><sphereGeometry args={[.095, 10, 6]} /><meshStandardMaterial color="#56b7e1" /></mesh>)}
  </group>; }
function Pond() { return <group>
  <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 1, 1]}><circleGeometry args={[.46, 28]} /><meshStandardMaterial color="#55d8eb" roughness={.3} /></mesh>
  {[-1, 0, 1].map((x, i) => <group key={x} position={[x * .23, .025, (i % 2) * .18 - .08]} rotation={[0, i, 0]}>
    <mesh scale={[1.6, .4, .7]}><sphereGeometry args={[.07, 10, 6]} /><meshStandardMaterial color={i % 2 ? "#fff2a1" : "#ff916e"} /></mesh>
    <mesh position={[-.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[.055, .075, 3]} /><meshStandardMaterial color="#ffb05f" /></mesh>
  </group>)}
  </group>; }
const rainbow = ["#ff738f", "#ffb34f", "#ffe57d", "#79dfb1", "#68cbff", "#af8bfd"];
function Canyon() { return <group>
  {rainbow.map((color, i) => <group key={color} position={[(i % 3 - 1) * .36, 0, Math.floor(i / 3) * .4]}>
    <mesh position={[0, .28 + i % 2 * .12, 0]}><coneGeometry args={[.3, .7 + i % 2 * .25, 5]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[0, .5 + i % 2 * .18, 0]}><coneGeometry args={[.13, .27, 5]} /><meshStandardMaterial color="#fff3ed" /></mesh>
  </group>)}
  {rainbow.map((color, i) => <mesh key={color} position={[(i - 2.5) * .065, .29, -.22]} rotation={[-.25, 0, 0]}><boxGeometry args={[.065, .68, .045]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.13} roughness={.25} /></mesh>)}
  <mesh position={[0, .01, -.44]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.4, 1, 1]}><circleGeometry args={[.3, 24]} /><meshStandardMaterial color="#9deaf4" /></mesh>
  </group>; }
function Farm() { return <group>
  {[0, 1, 2].map(row => <group key={row} position={[(row - 1) * .3, .02, 0]}>
    <mesh><boxGeometry args={[.22, .065, .9]} /><meshStandardMaterial color="#aa7750" /></mesh>
    {[0, 1, 2, 3].map(i => <group key={i} position={[0, .045, (i - 1.5) * .22]}>
      <mesh position={[0, .06 + row * .045, 0]}><cylinderGeometry args={[.012, .018, .12 + row * .09, 5]} /><meshStandardMaterial color="#4e9d5e" /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * .038, .1 + row * .07, 0]} rotation={[0, 0, side * -.6]} scale={[1.6, .4, .8]}><sphereGeometry args={[.05 + row * .015, 8, 6]} /><meshStandardMaterial color="#7cd574" /></mesh>)}
      {row === 2 ? <mesh position={[0, .31, 0]}><sphereGeometry args={[.05, 10, 7]} /><meshStandardMaterial color="#ff8776" /></mesh> : null}
    </group>)}
  </group>)}
  {[-1, 1].map(side => <group key={side} position={[side * .59, .12, 0]}><mesh><boxGeometry args={[.045, .045, 1.15]} /><meshStandardMaterial color="#fff0cd" /></mesh>{[-.48, 0, .48].map(z => <mesh key={z} position={[0, 0, z]}><boxGeometry args={[.06, .28, .06]} /><meshStandardMaterial color="#fff0cd" /></mesh>)}</group>)}
  </group>; }

export function ScienceLandScenery({ quality = 'high' }: { quality?: 'high' | 'low' }) { return <group>
  <LivingScenery quality={quality} />
  <SurfaceGroup destination={SCIENCE_LANDS[0].destination}>
    <group position={[-.8, -.05, -.25]}><Hut /></group><group position={[-.48, 0, .45]}><Campfire /></group><group position={[.65, -.04, 0]}><River /></group>
  </SurfaceGroup>
  {Array.from({ length: 14 }, (_, i) => {
    const destination = { latitude: .62 + Math.sin(i * 2.4) * (.28 + i % 3 * .08), longitude: -.52 + Math.cos(i * 2.4) * (.35 + i % 3 * .07) };
    // Keep a real campsite clearing so the low activity camera can see the objects.
    if (CHECKPOINTS.slice(0, 2).some(point => Math.hypot(destination.latitude - point.destination.latitude, destination.longitude - point.destination.longitude) < .3)) return null;
    return <SurfaceGroup key={i} destination={destination}><Tree small={i % 3 === 0} /></SurfaceGroup>;
  })}
  <SurfaceGroup destination={SCIENCE_LANDS[1].destination}>
    <group position={[-.43, 0, 0]} scale={.9}><Horse /></group><group position={[.43, -.04, .28]}><Pond /></group><group position={[.67, .04, -.14]}><Frog /></group><group position={[.02, .65, -.3]}><Bird /></group><group position={[-.42, -.04, -.65]}><Tree /></group>
  </SurfaceGroup>
  <SurfaceGroup destination={SCIENCE_LANDS[2].destination}><Canyon /></SurfaceGroup>
  <SurfaceGroup destination={SCIENCE_LANDS[3].destination}><Farm /><group position={[.75, -.06, -.5]} scale={.65}><Hut /></group><group position={[-.65, -.04, -.6]}><Tree /></group></SurfaceGroup>
  </group>; }

function FlowerPatch({ color }: { color: string }) { return <group>
  <mesh position={[0, .12, 0]}><cylinderGeometry args={[.022, .035, .24, 5]} /><meshStandardMaterial color="#48a475" /></mesh>
  <mesh position={[0, .27, 0]} scale={[1, .45, 1]}><icosahedronGeometry args={[.15, 1]} /><meshStandardMaterial color={color} /></mesh>
  <mesh position={[0, .32, 0]}><sphereGeometry args={[.055, 8, 6]} /><meshStandardMaterial color="#fff09a" /></mesh>
</group>; }

function LivingScenery({ quality }: { quality: 'high' | 'low' }) {
  const layout = useMemo(() => sceneryLayout(quality === 'high' ? 110 : 64), [quality]);
  const ground = useMemo(() => sceneryLayout(quality === 'high' ? 460 : 240), [quality]);
  const details = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!details.current) return;
    const object = new Object3D(); const up = new Vector3(0, 1, 0); const normal = new Vector3(); const color = new Color();
    ground.forEach((item, index) => {
      normal.set(...item.point as [number, number, number]);
      object.position.copy(normal).multiplyScalar(3.04); object.quaternion.setFromUnitVectors(up, normal);
      const size = .06 + item.index % 4 * .017; object.scale.set(size, size * .65, size); object.updateMatrix();
      details.current!.setMatrixAt(index, object.matrix);
      details.current!.setColorAt(index, color.set(['#bcf1b3', '#dbf5ed', '#ffd8f2', '#faffac'][item.region]));
    });
    details.current.instanceMatrix.needsUpdate = true;
    if (details.current.instanceColor) details.current.instanceColor.needsUpdate = true;
  }, [ground]);
  return <group>
    <instancedMesh ref={details} args={[undefined, undefined, ground.length]} raycast={() => {}}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={1} /></instancedMesh>
    {layout.map(item => <SurfaceGroup key={item.index} destination={item.destination}><group scale={.6 + item.index % 4 * .12} rotation={[0, item.index * 1.7, 0]}>
      {item.region === 0 ? item.index % 9 === 0 ? <Hut /> : item.index % 7 === 0 ? <group><mesh rotation={[0, 0, Math.PI]} position={[0, .3, 0]}><torusGeometry args={[.2, .07, 8, 16, Math.PI]} /><meshStandardMaterial color="#f17c94" /></mesh><Tree small /></group> : <Tree /> :
        item.region === 1 ? item.index % 4 === 0 ? <Horse /> : item.index % 4 === 1 ? <group><Pond /><group position={[.35, .03, 0]}><Frog /></group></group> : item.index % 4 === 2 ? <group position={[0, .35, 0]}><Bird /></group> : <Tree small /> :
        item.region === 2 ? item.index % 5 === 0 ? <group scale={.7}><Canyon /></group> : <group><mesh position={[0, .3, 0]}><coneGeometry args={[.24, .65 + item.index % 3 * .14, 6]} /><meshStandardMaterial color={rainbow[item.index % rainbow.length]} flatShading /></mesh><mesh position={[.2, .12, .1]}><octahedronGeometry args={[.14, 0]} /><meshStandardMaterial color="#fff3b7" /></mesh></group> :
        item.index % 7 === 0 ? <group scale={.65}><Farm /></group> : <group><FlowerPatch color={rainbow[item.index % rainbow.length]} /><group position={[.2, 0, .12]} scale={.7}><FlowerPatch color="#fff5ae" /></group><group position={[-.17, 0, .1]} scale={.8}><FlowerPatch color="#f28fac" /></group></group>}
    </group></SurfaceGroup>)}
    {SCIENCE_LANDS.map((land, index) => <SurfaceGroup key={land.id} destination={{ latitude: land.destination.latitude + .16, longitude: land.destination.longitude - .15 }}><mesh position={[0, .22, 0]}><cylinderGeometry args={[.025, .035, .44, 6]} /><meshStandardMaterial color="#a2785d" /></mesh><mesh position={[0, .48, 0]}><boxGeometry args={[.4, .22, .06]} /><meshStandardMaterial color={['#f8a2a7', '#91e5e9', '#dab6fa', '#f9e890'][index]} /></mesh></SurfaceGroup>)}
    {SCIENCE_LANDS.flatMap((land, index) => {
      const end = SCIENCE_LANDS[(index + 1) % SCIENCE_LANDS.length].destination;
      return Array.from({ length: 12 }, (_, i) => { const t = (i + 1) / 13; return <SurfaceGroup key={`${land.id}-${i}`} destination={{ latitude: land.destination.latitude * (1 - t) + end.latitude * t, longitude: land.destination.longitude * (1 - t) + end.longitude * t }} radius={3.04}><mesh scale={[1, .18, 1]}><sphereGeometry args={[.045, 6, 4]} /><meshStandardMaterial color="#fff2c4" /></mesh></SurfaceGroup>; });
    })}
  </group>;
}
