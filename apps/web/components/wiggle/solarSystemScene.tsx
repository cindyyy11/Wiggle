"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Group } from "three";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { PLANETS, type PlanetDefinition, type PlanetId } from "./worlds";

export type SolarSystemSceneProps = {
  selected: PlanetId;
  reducedMotion: boolean;
  onSelect: (id: PlanetId) => void;
};

export const SOLAR_STAR_COUNT = 88;
export const PLANET_VISUALS = {
  numeria: "ringed-sphere",
  lexicon: "page-facet",
  novalab: "ringed-icosahedron",
  "reset-moon": "cratered-moon",
  constellation: "star-cluster",
} as const satisfies Record<PlanetId, string>;

export function canAnimatePlanet(reducedMotion: boolean): boolean {
  return !reducedMotion;
}

const orbitScale = 4.65;

function orbitPoints(radius: number) {
  const points = new Float32Array(65 * 3);
  for (let index = 0; index <= 64; index += 1) {
    const angle = (index / 64) * Math.PI * 2;
    points.set([Math.cos(angle) * radius * orbitScale, 0, Math.sin(angle) * radius * orbitScale * 0.58], index * 3);
  }
  return points;
}

function Orbit({ radius }: { radius: number }) {
  const points = useMemo(() => orbitPoints(radius), [radius]);
  return (
    <lineLoop rotation={[0.21, 0, -0.08]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#8bbfaa" transparent opacity={0.28} />
    </lineLoop>
  );
}

function planetPosition(planet: PlanetDefinition): [number, number, number] {
  const angle = (planet.orbitalPosition.angle * Math.PI) / 180;
  const radius = planet.orbitalPosition.radius * orbitScale;
  return [Math.cos(angle) * radius, Math.sin(angle * 1.8) * 0.28, Math.sin(angle) * radius * 0.58];
}

function Planet({
  planet,
  active,
  reducedMotion,
  onSelect,
}: {
  planet: PlanetDefinition;
  active: boolean;
  reducedMotion: boolean;
  onSelect: (id: PlanetId) => void;
}) {
  const body = useRef<Group>(null);
  const size = planet.id === "numeria" ? 0.48 : 0.26 + planet.orbitalPosition.radius * 0.14;

  useFrame((_, delta) => {
    if (body.current && canAnimatePlanet(reducedMotion)) body.current.rotation.y += Math.min(delta, 0.05) * 0.18;
  });

  return (
    <group
      ref={body}
      position={planetPosition(planet)}
      scale={active ? 1.22 : 1}
      onClick={(event) => { event.stopPropagation(); onSelect(planet.id); }}
    >
      <PlanetSilhouette planet={planet} size={size} />
      <mesh scale={1.045}>
        <icosahedronGeometry args={[size, 1]} />
        <meshBasicMaterial color={planet.palette.glow} transparent opacity={active ? 0.13 : 0.04} />
      </mesh>
    </group>
  );
}

function PlanetSilhouette({ planet, size }: { planet: PlanetDefinition; size: number }) {
  const props = { size, color: planet.palette.primary, accent: planet.palette.accent };
  switch (PLANET_VISUALS[planet.id]) {
    case "ringed-sphere": return <NumeriaShape {...props} />;
    case "page-facet": return <LexiconShape {...props} />;
    case "ringed-icosahedron": return <NovaLabShape {...props} />;
    case "cratered-moon": return <ResetMoonShape {...props} />;
    case "star-cluster": return <ConstellationShape {...props} />;
  }
}

function ClayMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.9} metalness={0.01} flatShading />;
}

function NumeriaShape({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <>
      <mesh castShadow receiveShadow><sphereGeometry args={[size, 14, 10]} /><ClayMaterial color={color} /></mesh>
      <mesh rotation={[0.55, 0.15, 0]}><torusGeometry args={[size * 1.2, size * 0.055, 5, 22]} /><ClayMaterial color={accent} /></mesh>
    </>
  );
}

function LexiconShape({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <>
      <mesh castShadow receiveShadow><dodecahedronGeometry args={[size, 0]} /><ClayMaterial color={color} /></mesh>
      <mesh position={[size * 0.55, 0, size * 0.34]} rotation={[0.4, 0.3, 0.2]}><boxGeometry args={[size * 0.32, size * 0.46, size * 0.07]} /><ClayMaterial color={accent} /></mesh>
    </>
  );
}

function NovaLabShape({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <>
      <mesh castShadow receiveShadow><icosahedronGeometry args={[size, 1]} /><ClayMaterial color={color} /></mesh>
      <mesh rotation={[0.95, 0.3, 0]}><torusGeometry args={[size * 1.1, size * 0.035, 5, 20]} /><ClayMaterial color={accent} /></mesh>
    </>
  );
}

function ResetMoonShape({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <>
      <mesh castShadow receiveShadow><sphereGeometry args={[size, 10, 8]} /><ClayMaterial color={color} /></mesh>
      <mesh position={[size * 0.3, size * 0.24, size * 0.8]}><sphereGeometry args={[size * 0.19, 8, 6]} /><ClayMaterial color={accent} /></mesh>
      <mesh position={[-size * 0.26, -size * 0.15, size * 0.86]}><sphereGeometry args={[size * 0.09, 7, 5]} /><ClayMaterial color={accent} /></mesh>
    </>
  );
}

function ConstellationShape({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <>
      <mesh castShadow receiveShadow><icosahedronGeometry args={[size * 0.65, 1]} /><ClayMaterial color={color} /></mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * size * 0.72, size * 0.34, 0]}>
          <icosahedronGeometry args={[size * 0.22, 0]} /><ClayMaterial color={accent} />
        </mesh>
      ))}
    </>
  );
}

function StarField() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(SOLAR_STAR_COUNT * 3);
    for (let index = 0; index < SOLAR_STAR_COUNT; index += 1) {
      const longitude = index * 2.399963;
      const latitude = Math.asin(2 * ((index * 0.618034) % 1) - 1);
      const radius = 13 + (index % 5) * 0.8;
      positions.set([
        Math.cos(latitude) * Math.cos(longitude) * radius,
        Math.sin(latitude) * radius,
        Math.cos(latitude) * Math.sin(longitude) * radius,
      ], index * 3);
    }
    return { attributes: { position: positions } };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geometry.attributes.position, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fff4d7" size={0.055} transparent opacity={0.72} sizeAttenuation />
    </points>
  );
}

function LexiAnchor({ reducedMotion }: { reducedMotion: boolean }) {
  const lexi = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (lexi.current && !reducedMotion) lexi.current.position.y = 0.72 + Math.sin(clock.elapsedTime * 1.6) * 0.07;
  });
  return (
    <group ref={lexi} position={[-1.28, 0.72, 1.55]}>
      <mesh><sphereGeometry args={[0.18, 10, 8]} /><meshStandardMaterial color="#8fc7e8" roughness={0.85} /></mesh>
      <mesh position={[-0.06, 0.035, 0.16]}><sphereGeometry args={[0.032, 6, 5]} /><meshBasicMaterial color="#285c85" /></mesh>
      <mesh position={[0.06, 0.035, 0.16]}><sphereGeometry args={[0.032, 6, 5]} /><meshBasicMaterial color="#285c85" /></mesh>
      <mesh position={[0, 0.22, 0]} rotation={[0.2, 0, 0]}><coneGeometry args={[0.035, 0.18, 5]} /><meshStandardMaterial color="#f6b83e" roughness={0.9} /></mesh>
    </group>
  );
}

function SolarObjects({ selected, reducedMotion, onSelect }: SolarSystemSceneProps) {
  const system = useRef<Group>(null);
  useFrame((_, delta) => {
    if (system.current && !reducedMotion) system.current.rotation.y += Math.min(delta, 0.05) * 0.012;
  });
  return (
    <group ref={system} rotation={[-0.11, -0.2, 0]}>
      {PLANETS.map((planet) => <Orbit key={`${planet.id}-orbit`} radius={planet.orbitalPosition.radius} />)}
      <mesh><sphereGeometry args={[0.37, 12, 8]} /><meshStandardMaterial color="#f6b83e" roughness={0.92} /></mesh>
      <pointLight color="#ffcf70" intensity={2.5} distance={8} />
      {PLANETS.map((planet) => (
        <Planet
          key={planet.id}
          planet={planet}
          active={planet.id === selected}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
        />
      ))}
      <LexiAnchor reducedMotion={reducedMotion} />
      <StarField />
    </group>
  );
}

/** The visual primary navigation; adjacent DOM controls provide its keyboard contract. */
export function SolarSystemScene({ selected, reducedMotion, onSelect }: SolarSystemSceneProps) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.4]}
      camera={{ position: [0, 3.3, 8.8], fov: 45, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      fallback="Choose a destination using the controls below."
    >
      <ambientLight intensity={1.05} color="#fff7e1" />
      <directionalLight position={[4, 5, 5]} intensity={1.7} color="#ffffff" />
      <SolarObjects selected={selected} reducedMotion={reducedMotion} onSelect={onSelect} />
      <OrbitControls
        enablePan={false}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={6.8}
        maxDistance={11.5}
        minPolarAngle={0.45}
        maxPolarAngle={1.42}
      />
    </Canvas>
  );
}
