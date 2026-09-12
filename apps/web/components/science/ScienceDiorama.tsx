"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { ScienceZoneLandmarks } from "./ScienceZoneLandmarks";
import type { SciencePlanetSceneProps } from "./SciencePlanetScene";

const clay = new MeshStandardMaterial({ color: "#8dbf92", roughness: 1, flatShading: true });
const grass = new MeshStandardMaterial({ color: "#a8cf89", roughness: 1, flatShading: true });
const soil = new MeshStandardMaterial({ color: "#b68262", roughness: 1, flatShading: true });
const underside = new MeshStandardMaterial({ color: "#6b8f7e", roughness: 1, flatShading: true });
const cream = new MeshStandardMaterial({ color: "#fff3d9", roughness: 1, flatShading: true });
const observatory = new MeshStandardMaterial({ color: "#f0c87d", roughness: 1, flatShading: true });
const observatoryGlass = new MeshStandardMaterial({ color: "#80bfd0", roughness: .7, transparent: true, opacity: .85 });
const cloudMatte = new MeshStandardMaterial({ color: "#f8f0df", roughness: 1, flatShading: true, transparent: true, opacity: .88 });
const fragmentMatte = new MeshStandardMaterial({ color: "#d9a75f", roughness: 1, flatShading: true });

function DioramaDrift({ reducedMotion, children }: { reducedMotion: boolean; children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (reducedMotion || !group.current) return;
    const time = clock.getElapsedTime();
    group.current.rotation.y += Math.min(delta, .05) * .035;
    group.current.position.y = Math.sin(time * .65) * .065;
  });
  return <group ref={group} rotation={[-.1, -.18, 0]}>{children}</group>;
}

function CameraFloat({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    camera.position.y = .35 + Math.sin(clock.getElapsedTime() * .32) * .1;
    camera.lookAt(0, -.1, 0);
  });
  return null;
}

function Observatory() {
  return <group position={[.05, 1.55, .15]} rotation={[0, -.22, 0]}>
    <mesh material={observatory}><cylinderGeometry args={[.44, .52, .32, 8]} /></mesh>
    <mesh position={[0, .2, 0]} material={cream}><sphereGeometry args={[.39, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    <mesh position={[0, .4, .22]} rotation={[.16, 0, 0]} material={observatoryGlass}><cylinderGeometry args={[.085, .085, .62, 8]} /></mesh>
    <mesh position={[0, .68, .43]} rotation={[Math.PI / 2, 0, 0]} material={observatoryGlass}><cylinderGeometry args={[.14, .12, .45, 8]} /></mesh>
    <mesh position={[0, .72, .68]} rotation={[Math.PI / 2, 0, 0]} material={cream}><cylinderGeometry args={[.19, .19, .035, 10]} /></mesh>
  </group>;
}

function Clouds({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const cloudBank = useRef<Group>(null);
  const clouds = useMemo(() => Array.from({ length: count }, (_, index) => ({
    position: [Math.sin(index * 2.31) * (3.15 + index % 2 * .3), 1.2 + Math.cos(index * 1.77) * 1.55, -1.8 - index % 3 * .42] as [number, number, number],
    scale: .28 + index % 3 * .07,
  })), [count]);
  useFrame((_, delta) => {
    if (!reducedMotion && cloudBank.current) cloudBank.current.rotation.y += Math.min(delta, .05) * .012;
  });
  return <group ref={cloudBank}>{clouds.map((cloud, index) => <group key={index} position={cloud.position} scale={cloud.scale}>
    <mesh material={cloudMatte}><sphereGeometry args={[.58, 7, 5]} /></mesh>
    <mesh position={[.37, .04, .02]} material={cloudMatte}><sphereGeometry args={[.43, 7, 5]} /></mesh>
    <mesh position={[-.35, -.02, .04]} material={cloudMatte}><sphereGeometry args={[.36, 7, 5]} /></mesh>
  </group>)}</group>;
}

function Stars({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      const radius = 4.1 + index % 5 * .42;
      positions.set([Math.sin(index * 2.39996) * radius, Math.cos(index * 1.71) * (2.65 + index % 3 * .24), -3.2 - index % 4 * .35], index * 3);
    }
    return new BufferGeometry().setAttribute("position", new Float32BufferAttribute(positions, 3));
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry}><pointsMaterial color="#fff4c8" size={.035} transparent opacity={.78} sizeAttenuation /></points>;
}

function MagneticFragments({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const fragments = useRef<Group>(null);
  const instances = useRef<InstancedMesh>(null);
  const items = useMemo(() => Array.from({ length: count }, (_, index) => ({
    position: [-2.15 + Math.sin(index * 2.18) * .62, .62 + Math.cos(index * 1.41) * .5, .82 + index % 3 * .09] as [number, number, number],
    rotation: [index * .62, index * .39, index * .27] as [number, number, number],
    scale: .048 + index % 3 * .018,
  })), [count]);
  useEffect(() => {
    const fragment = new Object3D();
    items.forEach((item, index) => {
      fragment.position.set(...item.position);
      fragment.rotation.set(...item.rotation);
      fragment.scale.setScalar(item.scale);
      fragment.updateMatrix();
      instances.current?.setMatrixAt(index, fragment.matrix);
    });
    if (instances.current) instances.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  useFrame((_, delta) => {
    if (!reducedMotion && fragments.current) fragments.current.rotation.z += Math.min(delta, .05) * .45;
  });
  return <group ref={fragments}><instancedMesh ref={instances} args={[undefined, undefined, count]} material={fragmentMatte}>
    <icosahedronGeometry args={[1, 0]} />
  </instancedMesh></group>;
}

export function ScienceDiorama({ quality, reducedMotion, selectedZone, onZoneSelect, counts }: SciencePlanetSceneProps) {
  const detail = quality === "high" ? 2 : 1;
  return <>
    <CameraFloat reducedMotion={reducedMotion} />
    <DioramaDrift reducedMotion={reducedMotion}>
      <group position={[0, -.48, 0]}>
        <mesh scale={[1, .72, 1]} material={clay}><icosahedronGeometry args={[2.62, detail]} /></mesh>
        <mesh position={[.12, -1.58, -.05]} rotation={[Math.PI, 0, -.12]} material={underside}><coneGeometry args={[1.58, 1.76, 7, 1]} /></mesh>
        <mesh position={[-.16, .83, .12]} rotation={[0, .32, -.08]} scale={[1.55, .18, 1.24]} material={soil}><cylinderGeometry args={[1.36, 1.52, .3, 9]} /></mesh>
        <mesh position={[.22, 1.04, .16]} rotation={[0, -.18, .08]} scale={[1.36, .14, 1.08]} material={grass}><cylinderGeometry args={[1.24, 1.42, .24, 9]} /></mesh>
        <mesh position={[-1.18, 1.22, .1]} rotation={[0, .15, .15]} scale={[.75, .07, .46]} material={cream}><cylinderGeometry args={[1, 1, .14, 8]} /></mesh>
        <Observatory />
        <ScienceZoneLandmarks selectedZone={selectedZone} onSelect={onZoneSelect} quality={quality} reducedMotion={reducedMotion} />
        <MagneticFragments count={counts.magneticFragments} reducedMotion={reducedMotion} />
      </group>
      <Clouds count={counts.clouds} reducedMotion={reducedMotion} />
      <Stars count={counts.stars} />
    </DioramaDrift>
  </>;
}
