'use client';
import { Canvas, useThree } from '@react-three/fiber';
import { Horse, Frog, Bird } from './ScienceLandScenery';
import type { ActivityItem, StarterLand } from './scienceActivities';
function Model({ id, color }: { id: string; color: string }) {
  if (id === 'horse') return <group position={[0, -.28, 0]} scale={1.5}><Horse /></group>;
  if (id === 'frog') return <group scale={2}><Frog /></group>;
  if (id === 'bird') return <group scale={2}><Bird /></group>;
  if (id === 'fish') return <group><mesh scale={[1.7, .85, .6]}><sphereGeometry args={[.23, 16, 12]} /><meshStandardMaterial color={color} /></mesh><mesh position={[-.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[.22, .28, 3]} /><meshStandardMaterial color={color} /></mesh><mesh position={[.2, .06, .14]}><sphereGeometry args={[.035, 8, 8]} /><meshStandardMaterial color="#183953" /></mesh></group>;
  if (id === 'seed') return <mesh scale={[.7, 1, .6]} rotation={[0, 0, -.4]}><sphereGeometry args={[.3, 16, 12]} /><meshStandardMaterial color={color} /></mesh>;
  if (id === 'sprout' || id === 'flower') return <group position={[0, -.4, 0]}><mesh position={[0, .33, 0]}><cylinderGeometry args={[.025, .035, .65, 8]} /><meshStandardMaterial color="#489761" /></mesh>{[-1, 1].map(side => <mesh key={side} position={[side * .16, .3 + side * .09, 0]} rotation={[0, 0, side * -.55]} scale={[1.5, .5, .5]}><sphereGeometry args={[.16, 12, 8]} /><meshStandardMaterial color="#83d998" /></mesh>)}{id === 'flower' ? <group position={[0, .68, 0]}>{Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * .16, Math.sin(i * Math.PI / 3) * .16, 0]} scale={[1, 1, .45]}><sphereGeometry args={[.13, 12, 8]} /><meshStandardMaterial color={color} /></mesh>)}<mesh position={[0, 0, .08]}><sphereGeometry args={[.1, 12, 8]} /><meshStandardMaterial color="#ffdf70" /></mesh></group> : null}</group>;
  return <mesh rotation={[.2, .4, .12]}><octahedronGeometry args={[.43, 0]} /><meshStandardMaterial color={color} roughness={.35} /></mesh>;
}
function Shelf({ items }: { items: ActivityItem[] }) {
  const { size, viewport } = useThree();
  const columns = size.width < 540 ? 2 : items.length;
  const rows = Math.ceil(items.length / columns);
  return <>{items.map((item, index) => <group key={item.id} position={[(index % columns + .5) * viewport.width / columns - viewport.width / 2, viewport.height / 2 - (Math.floor(index / columns) + .43) * viewport.height / rows, 0]}><Model id={item.id} color={item.color} /></group>)}</>;
}
export default function ScienceActivityModels({ items }: { items: ActivityItem[]; land: StarterLand }) {
  return <Canvas camera={{ position: [0, 0, 6], fov: 35 }} dpr={1} frameloop="demand" gl={{ alpha: true, antialias: true }}><ambientLight intensity={1.5} /><directionalLight position={[-3, 4, 5]} intensity={2} /><Shelf items={items} /></Canvas>;
}
