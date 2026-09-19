"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group, Mesh, Points } from "three";
import type { SubjectWorldId } from "./subjectRoute";

export const SPACE_PLAYGROUND_COUNTS = {
  high: { nearStars: 72, farStars: 126 },
  low: { nearStars: 34, farStars: 62 },
} as const;

const WORLD_GLOW: Record<SubjectWorldId, string> = {
  math: "#ffd45f",
  science: "#a986e8",
  bm: "#88c6a5",
  english: "#aeb8c8",
};

function starGeometry(count: number, depth: number) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    const angle = index * 2.399963;
    const radius = 3.8 + ((index * 17) % 31) / 8;
    positions[index * 3] = Math.sin(angle) * radius;
    positions[index * 3 + 1] = Math.cos(angle * 1.37) * (2.8 + (index % 7) * .28);
    positions[index * 3 + 2] = depth - (index % 9) * .24;
  }
  return new BufferGeometry().setAttribute("position", new Float32BufferAttribute(positions, 3));
}

function DepthStars({ count, depth, size, color, reducedMotion, drift }: {
  count: number; depth: number; size: number; color: string; reducedMotion: boolean; drift: number;
}) {
  const points = useRef<Points>(null);
  const geometry = useMemo(() => starGeometry(count, depth), [count, depth]);
  useFrame(({ clock }) => {
    if (!reducedMotion && points.current) points.current.rotation.z = clock.getElapsedTime() * drift;
  });
  return <points ref={points} geometry={geometry}>
    <pointsMaterial color={color} size={size} transparent opacity={.76} sizeAttenuation depthWrite={false} />
  </points>;
}

function NebulaGlow() {
  return <group position={[0, 0, -5.6]}>
    <mesh position={[-4.6, 1.8, 0]} scale={[4.8, 2.5, .4]}>
      <sphereGeometry args={[1, 20, 12]} />
      <meshBasicMaterial color="#774fa3" transparent opacity={.055} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
    <mesh position={[4.8, -1.6, -.2]} scale={[4.2, 2.2, .4]}>
      <sphereGeometry args={[1, 20, 12]} />
      <meshBasicMaterial color="#3f9fbc" transparent opacity={.05} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  </group>;
}

function SelectedWorldHalo({ world }: { world: SubjectWorldId }) {
  return <group position={[0, -.25, -1.2]}>
    <mesh scale={3.1}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshBasicMaterial color={WORLD_GLOW[world]} transparent opacity={.055} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
    <mesh scale={2.35}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshBasicMaterial color={WORLD_GLOW[world]} transparent opacity={.045} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  </group>;
}

function ExplorerSatellite({ reducedMotion }: { reducedMotion: boolean }) {
  const satellite = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !satellite.current) return;
    const time = clock.getElapsedTime();
    satellite.current.position.y = 2.65 + Math.sin(time * .55) * .12;
    satellite.current.rotation.z = -.16 + Math.sin(time * .38) * .035;
  });
  return <group ref={satellite} position={[4.7, 2.65, -1.4]} rotation={[.12, -.35, -.16]} scale={.42}>
    <mesh><boxGeometry args={[1.15, .72, .68]} /><meshStandardMaterial color="#fff0c9" roughness={.72} /></mesh>
    <mesh position={[0, 0, .39]}><sphereGeometry args={[.22, 12, 8]} /><meshStandardMaterial color="#72c5e7" emissive="#3b9ac0" emissiveIntensity={.35} /></mesh>
    <mesh position={[-1.15, 0, 0]}><boxGeometry args={[1.05, .08, .62]} /><meshStandardMaterial color="#6e76bd" roughness={.8} /></mesh>
    <mesh position={[1.15, 0, 0]}><boxGeometry args={[1.05, .08, .62]} /><meshStandardMaterial color="#6e76bd" roughness={.8} /></mesh>
    <mesh position={[0, .58, 0]}><cylinderGeometry args={[.025, .025, .55, 6]} /><meshStandardMaterial color="#d8e4ee" /></mesh>
    <mesh position={[0, .9, 0]}><sphereGeometry args={[.1, 8, 6]} /><meshBasicMaterial color="#ff806f" /></mesh>
  </group>;
}

function ShootingStar({ reducedMotion }: { reducedMotion: boolean }) {
  const star = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!star.current) return;
    if (reducedMotion) { star.current.visible = false; return; }
    const cycle = clock.getElapsedTime() % 13;
    star.current.visible = cycle < 1.4;
    if (star.current.visible) {
      star.current.position.x = -6.8 + cycle * 8.6;
      star.current.position.y = 3.7 - cycle * 1.8;
    }
  });
  return <mesh ref={star} position={[-6.8, 3.7, -2.8]} rotation={[0, 0, -.78]}>
    <capsuleGeometry args={[.025, 1.15, 3, 8]} />
    <meshBasicMaterial color="#fff3c9" transparent opacity={.72} blending={AdditiveBlending} depthWrite={false} />
  </mesh>;
}

export function SpacePlaygroundDressings({ quality, reducedMotion, selectedWorld }: {
  quality: "high" | "low"; reducedMotion: boolean; selectedWorld: SubjectWorldId;
}) {
  const counts = SPACE_PLAYGROUND_COUNTS[quality];
  return <group>
    <NebulaGlow />
    <DepthStars count={counts.farStars} depth={-6.4} size={.035} color="#b9d7ff" reducedMotion={reducedMotion} drift={.0015} />
    <DepthStars count={counts.nearStars} depth={-3.6} size={.055} color="#fff1bd" reducedMotion={reducedMotion} drift={-.0028} />
    <SelectedWorldHalo world={selectedWorld} />
    <ExplorerSatellite reducedMotion={reducedMotion} />
    <ShootingStar reducedMotion={reducedMotion} />
  </group>;
}
