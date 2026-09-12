"use client";

import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { useFrame } from "@react-three/fiber";
import type { OrbitDecorationCounts } from "./worldOrbit";

const arcMatte = new MeshStandardMaterial({ color: "#f4c95d", roughness: 1, transparent: true, opacity: .32 });
const cloudMatte = new MeshStandardMaterial({ color: "#fff3db", roughness: 1, flatShading: true, transparent: true, opacity: .7 });
const asteroidMatte = new MeshStandardMaterial({ color: "#b99bcf", roughness: 1, flatShading: true, transparent: true, opacity: .68 });

function OrbitArcs({ reducedMotion }: { reducedMotion: boolean }) {
  const arcs = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!reducedMotion && arcs.current) arcs.current.rotation.z += Math.min(delta, .05) * .018;
  });
  return <group ref={arcs} rotation={[.48, -.08, -.12]}>
    <mesh material={arcMatte}><torusGeometry args={[3.3, .012, 4, 72, Math.PI * 1.24]} /></mesh>
    <mesh rotation={[.04, 0, Math.PI * .73]} material={arcMatte}><torusGeometry args={[2.6, .01, 4, 64, Math.PI * .96]} /></mesh>
  </group>;
}

function StarField({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      const radius = 3.4 + index % 6 * .58;
      positions.set([Math.sin(index * 2.39996) * radius, Math.cos(index * 1.71) * (2.1 + index % 4 * .28), -2.8 - index % 5 * .28], index * 3);
    }
    return new BufferGeometry().setAttribute("position", new Float32BufferAttribute(positions, 3));
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry}><pointsMaterial color="#fff4c8" size={.032} transparent opacity={.82} sizeAttenuation /></points>;
}

function CloudPuffs({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const bank = useRef<Group>(null);
  const clouds = useMemo(() => Array.from({ length: count }, (_, index) => ({
    position: [Math.sin(index * 2.31) * (3.6 + index % 2 * .28), -1.4 + Math.cos(index * 1.77) * 1.7, -1.7 - index % 3 * .33] as [number, number, number],
    scale: .16 + index % 3 * .055,
  })), [count]);
  useFrame((_, delta) => {
    if (!reducedMotion && bank.current) bank.current.rotation.y += Math.min(delta, .05) * .008;
  });
  return <group ref={bank}>{clouds.map((cloud, index) => <group key={index} position={cloud.position} scale={cloud.scale}>
    <mesh material={cloudMatte}><sphereGeometry args={[1, 7, 5]} /></mesh>
    <mesh position={[.58, .08, .02]} material={cloudMatte}><sphereGeometry args={[.66, 7, 5]} /></mesh>
    <mesh position={[-.48, -.04, .03]} material={cloudMatte}><sphereGeometry args={[.54, 7, 5]} /></mesh>
  </group>)}</group>;
}

function AsteroidBelt({ count }: { count: number }) {
  const instances = useRef<InstancedMesh>(null);
  useEffect(() => {
    const asteroid = new Object3D();
    for (let index = 0; index < count; index++) {
      const angle = index * 2.39996;
      asteroid.position.set(Math.cos(angle) * (3.05 + index % 3 * .17), Math.sin(angle) * 1.35, -.55 - index % 4 * .24);
      asteroid.rotation.set(index * .47, index * .29, index * .71); asteroid.scale.setScalar(.026 + index % 4 * .014); asteroid.updateMatrix();
      instances.current?.setMatrixAt(index, asteroid.matrix);
    }
    if (instances.current) instances.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  return <instancedMesh ref={instances} args={[undefined, undefined, count]} material={asteroidMatte}><icosahedronGeometry args={[1, 0]} /></instancedMesh>;
}

export function ConstellationDressings({ counts, reducedMotion }: { counts: OrbitDecorationCounts; reducedMotion: boolean }) {
  return <>
    <OrbitArcs reducedMotion={reducedMotion} />
    <StarField count={counts.stars} />
    <CloudPuffs count={counts.cloudPuffs} reducedMotion={reducedMotion} />
    <AsteroidBelt count={counts.orbitalRocks} />
  </>;
}
