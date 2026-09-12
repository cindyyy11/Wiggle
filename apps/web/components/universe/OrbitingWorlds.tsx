"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Group } from "three";

export function OrbitingWorlds({ reducedMotion, lowQuality }: { reducedMotion: boolean; lowQuality: boolean }) {
  const worlds = useRef<Group>(null);
  useFrame((_, delta) => { if (worlds.current && !reducedMotion) worlds.current.rotation.y += Math.min(delta, .05) * .018; });
  return <group ref={worlds}>
    <group position={[4.65, 2.35, -1.8]} rotation={[.2, -.4, .1]}><mesh><icosahedronGeometry args={[.59, lowQuality ? 0 : 1]} /><meshStandardMaterial color="#ef8b78" roughness={1} flatShading /></mesh><mesh rotation={[1.1, .2, 0]}><torusGeometry args={[.88, .065, 3, 40]} /><meshStandardMaterial color="#f4c95d" roughness={1} /></mesh><Lock /></group>
    <group position={[-4.1, 1.7, -2.4]}><mesh><icosahedronGeometry args={[.4, 1]} /><meshStandardMaterial color="#9dc99a" roughness={1} flatShading /></mesh><mesh position={[-.12, .1, .31]}><icosahedronGeometry args={[.16, 0]} /><meshStandardMaterial color="#a9d9ee" roughness={1} /></mesh><Lock small /></group>
    {Array.from({ length: lowQuality ? 7 : 14 }, (_, index) => <mesh key={index} position={[Math.sin(index * 2.39) * (3.65 + (index % 3) * .16), Math.cos(index * 1.29) * 2.3, Math.cos(index * 2.39) * 3.9]} rotation={[index, index * .8, index * .3]}><icosahedronGeometry args={[.045 + (index % 3) * .023, 0]} /><meshStandardMaterial color={index % 2 ? "#a9d9ee" : "#f4c95d"} roughness={1} /></mesh>)}
  </group>;
}

function Lock({ small = false }: { small?: boolean }) {
  return <group position={[0, .04, small ? .43 : .61]} scale={small ? .75 : 1}><mesh position={[0, .035, 0]}><torusGeometry args={[.085, .022, 5, 10, Math.PI]} /><meshBasicMaterial color="#fff7e7" /></mesh><mesh position={[0, -.036, 0]}><boxGeometry args={[.2, .14, .035]} /><meshBasicMaterial color="#fff7e7" /></mesh><mesh position={[0, -.03, .023]}><sphereGeometry args={[.018, 5, 4]} /><meshBasicMaterial color="#285c85" /></mesh></group>;
}

export function SpaceStars({ lowQuality }: { lowQuality: boolean }) {
  const geometry = useMemo(() => {
    const count = lowQuality ? 90 : 180; const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      const latitude = Math.asin(2 * ((index * .61803398875) % 1) - 1); const longitude = index * 2.39996;
      positions.set([Math.cos(latitude) * Math.sin(longitude) * 25, Math.sin(latitude) * 25, Math.cos(latitude) * Math.cos(longitude) * 25], index * 3);
    }
    return new BufferGeometry().setAttribute("position", new Float32BufferAttribute(positions, 3));
  }, [lowQuality]);
  return <points geometry={geometry}><pointsMaterial size={.028} color="#fff7e7" transparent opacity={.48} sizeAttenuation /></points>;
}
