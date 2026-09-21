"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, MathUtils, Vector3, type Mesh, type MeshBasicMaterial } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { RADIUS } from "../universe/world";
import { AstronautRig, type AstronautMotion } from "./AstronautRig";
import { useWiggleSound } from "../../features/audio/useWiggleSound";

export const ASTRONAUT_CENTER_Y = .18;
// The rig copies the in-world explorer's proportions, so it scales up from that size.
export const ASTRONAUT_RIG_HEIGHT = .83;
export const ASTRONAUT_SCALE = 3.7;
export const ASTRONAUT_FACING = .55;
export const ASTRONAUT_REST_Z = 1.1;
export const ROAM_X_SHARE = .72;
export const ROAM_Y_SHARE = .5;
// Front lane sits clear of the side planets so it never clips into them; it slips behind the centre planet instead of covering it.
export const ROAM_Z_MIN = 1.4;
export const ROAM_Z_MAX = 2.4;
export const BEHIND_Z = -3.2;
export const SOMERSAULT_EVERY = 15;
export const SOMERSAULT_SECONDS = 2.4;
export const TRICK_SECONDS = 1.1;
export const CHEER_SECONDS = 1.6;
// How long it keeps watching the pointer after the pointer last moved.
export const LOOK_HOLD_SECONDS = 2.5;
const TAP_KICK_X = 5;
const TAP_KICK_Y = 4.5;
const SLIDE_KICK = 9;
const WHEEL_KICK = .03;
const MAX_SPEED = 10;
const PUFF_COUNT = 16;
const PUFF_LIFE = 1.2;
const PUFF_INTERVAL = .05;

export function astronautDrift(time: number): { lift: number; tilt: number; turn: number } {
  return { lift: Math.sin(time * .62) * .22, tilt: Math.sin(time * .45) * .12, turn: Math.sin(time * .28) * .18 };
}

// Where the astronaut wanders to at a given moment. halfWidth/halfHeight are the visible half-extents at z=0;
// nearer depths see less of the scene, so the range shrinks with perspective and it never drifts off-screen.
export function astronautRoam(time: number, halfWidth: number, halfHeight: number, cameraZ: number): { x: number; y: number; z: number } {
  const z = (ROAM_Z_MIN + ROAM_Z_MAX) / 2 + Math.sin(time * .28 + 1) * (ROAM_Z_MAX - ROAM_Z_MIN) / 2;
  const perspective = (cameraZ - z) / cameraZ;
  const sweep = Math.sin(time * .34);
  // Hurries across the middle and lingers out at the sides, where the planets aren't.
  const x = Math.sign(sweep) * Math.abs(sweep) ** .7;
  return {
    x: x * halfWidth * perspective * ROAM_X_SHARE,
    y: ASTRONAUT_CENTER_Y + (Math.sin(time * .52 + .6) * .85 + Math.sin(time * 1.1) * .15) * halfHeight * perspective * ROAM_Y_SHARE,
    z,
  };
}

// In front out at the sides, behind the planet through the middle, so it can never sit on top of the planet you want to tap.
export function astronautDepth(x: number, band: number, front: number): number {
  const t = MathUtils.smoothstep((Math.abs(x) - band * .9) / (band * .55), 0, 1);
  return BEHIND_Z + (front - BEHIND_Z) * t;
}

export function springStep(position: number, velocity: number, target: number, delta: number, stiffness = 5.5, damping = 2.6): { position: number; velocity: number } {
  const dt = Math.min(delta, .05);
  const nextVelocity = velocity + (stiffness * (target - position) - damping * velocity) * dt;
  return { position: position + nextVelocity * dt, velocity: nextVelocity };
}

export function turnAngle(progress: number): number {
  const p = MathUtils.clamp(progress, 0, 1);
  const eased = p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
  return eased * Math.PI * 2;
}

// Every so often it tumbles a full somersault, just to show off.
export function somersaultAngle(time: number): number {
  const phase = time % SOMERSAULT_EVERY;
  const start = SOMERSAULT_EVERY - SOMERSAULT_SECONDS;
  return phase < start ? 0 : turnAngle((phase - start) / SOMERSAULT_SECONDS);
}

// A tapped astronaut tumbles one full turn, away from where it was tapped. Level again once it has landed.
export function trickAngle(elapsed: number, direction: number): number {
  if (elapsed < 0 || elapsed >= TRICK_SECONDS) return 0;
  return (direction < 0 ? -1 : 1) * turnAngle(elapsed / TRICK_SECONDS);
}

// Excitement after a tap: full at once, fading out over the cheer.
export function cheerLevel(elapsed: number): number {
  if (elapsed < 0 || elapsed >= CHEER_SECONDS) return 0;
  return 1 - MathUtils.smoothstep(elapsed / CHEER_SECONDS, 0, 1);
}

// Which way the pointer lies from the astronaut, each axis from -1 to 1. Pointer coordinates are the canvas's -1..1.
export function lookToward(pointer: { x: number; y: number }, position: { x: number; y: number }, halfWidth: number, halfHeight: number): { x: number; y: number } {
  return {
    x: MathUtils.clamp((pointer.x * halfWidth - position.x) / halfWidth, -1, 1),
    y: MathUtils.clamp((pointer.y * halfHeight - position.y) / halfHeight, -1, 1),
  };
}

type Nozzles = { left: RefObject<Group | null>; right: RefObject<Group | null> };
type Puff = { age: number; x: number; y: number; z: number; vx: number; vy: number; vz: number };

function hash(seed: number): number {
  const value = Math.sin(seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function AstronautTrail({ nozzles, motion, reducedMotion }: { nozzles: Nozzles; motion: RefObject<AstronautMotion>; reducedMotion: boolean }) {
  const root = useRef<Group>(null);
  const puffs = useRef<Puff[]>(Array.from({ length: PUFF_COUNT }, () => ({ age: PUFF_LIFE, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 })));
  const emitted = useRef(0);
  const since = useRef(0);
  const probe = useMemo(() => new Vector3(), []);
  useFrame((_, rawDelta) => {
    const group = root.current;
    if (!group) return;
    group.visible = !reducedMotion;
    if (reducedMotion) return;
    const delta = Math.min(rawDelta, .05);
    since.current += delta;
    if (since.current >= PUFF_INTERVAL) {
      since.current = 0;
      const nozzle = (emitted.current % 2 ? nozzles.right : nozzles.left).current;
      if (nozzle) {
        nozzle.getWorldPosition(probe);
        const puff = puffs.current[emitted.current % PUFF_COUNT];
        puff.age = 0; puff.x = probe.x; puff.y = probe.y; puff.z = probe.z;
        puff.vx = (hash(emitted.current) - .5) * .5; puff.vy = -.15 - hash(emitted.current + 9) * .3; puff.vz = (hash(emitted.current + 4) - .5) * .3;
      }
      emitted.current++;
    }
    const size = .6 + Math.min(motion.current.speed, 8) * .08;
    group.children.forEach((child, index) => {
      const puff = puffs.current[index];
      puff.age += delta;
      const life = puff.age / PUFF_LIFE;
      child.visible = life < 1;
      if (life >= 1) return;
      puff.x += puff.vx * delta; puff.y += puff.vy * delta; puff.z += puff.vz * delta;
      child.position.set(puff.x, puff.y, puff.z);
      child.scale.setScalar(Math.max(.01, (1 - life) * size));
      ((child as Mesh).material as MeshBasicMaterial).opacity = (1 - life) * .65;
    });
  });
  return <group ref={root}>
    {Array.from({ length: PUFF_COUNT }, (_, index) => <mesh key={index} visible={false}>
      <sphereGeometry args={[.09, 8, 6]} />
      <meshBasicMaterial color={index % 3 === 0 ? "#f4c95d" : "#bfe9ff"} transparent depthWrite={false} />
    </mesh>)}
  </group>;
}

export function FloatingAstronaut({ index, reducedMotion }: { index: number; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const nozzles: Nozzles = { left: useRef<Group>(null), right: useRef<Group>(null) };
  const motion = useRef<AstronautMotion>({ speed: 0, hover: 0, time: 0, lookX: 0, lookY: 0, cheer: 0 });
  const { viewport, gl, clock } = useThree();
  const sound = useWiggleSound();
  const radiusScale = Math.min(.9, viewport.width / 8.5);
  const spacing = Math.min(7.2, viewport.width * .86);
  const scale = radiusScale * ASTRONAUT_SCALE;
  const centreBand = RADIUS * radiusScale;
  const [initialPosition] = useState<[number, number, number]>(() => [(-1 - index) * spacing, ASTRONAUT_CENTER_Y, ASTRONAUT_REST_Z]);
  const hoveredRef = useRef(false);
  const hover = useRef(0);
  const velocity = useRef({ x: 0, y: 0 });
  const roamTime = useRef(0);
  const trick = useRef({ start: -Infinity, direction: 1 });
  const cheerStart = useRef(-Infinity);
  const look = useRef({ x: 0, y: 0 });
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastPointerMove = useRef(-Infinity);
  const previousIndex = useRef(index);

  useEffect(() => {
    const previous = previousIndex.current;
    previousIndex.current = index;
    if (previous === index || reducedMotion) return;
    velocity.current.x -= Math.sign(index - previous) * SLIDE_KICK;
    velocity.current.y += 2.2;
  }, [index, reducedMotion]);

  useEffect(() => () => { gl.domElement.style.cursor = ""; }, [gl]);

  useEffect(() => {
    if (reducedMotion) return;
    const onWheel = (event: WheelEvent) => {
      velocity.current.x += MathUtils.clamp(event.deltaX, -100, 100) * WHEEL_KICK;
      velocity.current.y -= MathUtils.clamp(event.deltaY, -100, 100) * WHEEL_KICK * .7;
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [reducedMotion]);

  // A tap is a high-five: it cheers, and unless motion is reduced it also blasts off into a somersault, away from the tap.
  const tap = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const time = clock.getElapsedTime();
    cheerStart.current = time;
    if (reducedMotion) return;
    const away = (group.current?.position.x ?? 0) >= event.point.x ? 1 : -1;
    trick.current = { start: time, direction: away };
    velocity.current.x += away * TAP_KICK_X;
    velocity.current.y += TAP_KICK_Y;
    sound.play("whoosh");
  };

  useFrame(({ clock, camera, pointer }, rawDelta) => {
    const outer = group.current;
    const inner = body.current;
    if (!outer || !inner) return;
    const delta = Math.min(rawDelta, .05);
    if (reducedMotion) {
      outer.position.set((-1 - index) * spacing, ASTRONAUT_CENTER_Y, ASTRONAUT_REST_Z);
      inner.rotation.set(.06, ASTRONAUT_FACING, 0);
      outer.scale.setScalar(scale);
      motion.current = { speed: 0, hover: 0, time: 0, lookX: 0, lookY: 0, cheer: cheerLevel(clock.getElapsedTime() - cheerStart.current) };
      return;
    }
    const time = clock.getElapsedTime();
    hover.current += ((hoveredRef.current ? 1 : 0) - hover.current) * (1 - Math.exp(-8 * delta));
    roamTime.current += delta;

    const halfWidth = viewport.width / 2;
    const halfHeight = viewport.height / 2;
    const roam = astronautRoam(roamTime.current, halfWidth, halfHeight, camera.position.z);
    const drift = astronautDrift(time);

    const moveX = springStep(outer.position.x, velocity.current.x, roam.x, delta);
    const moveY = springStep(outer.position.y, velocity.current.y, roam.y + drift.lift * .5, delta);
    velocity.current.x = MathUtils.clamp(moveX.velocity, -MAX_SPEED, MAX_SPEED);
    velocity.current.y = MathUtils.clamp(moveY.velocity, -MAX_SPEED, MAX_SPEED);
    outer.position.x = MathUtils.clamp(moveX.position, -halfWidth * .92, halfWidth * .92);
    outer.position.y = MathUtils.clamp(moveY.position, -halfHeight * .82, halfHeight * .82);
    // A narrow screen is mostly planet, so there it stays in the front lane rather than hiding.
    const targetZ = halfWidth > centreBand * 2.2 ? astronautDepth(outer.position.x, centreBand, roam.z) : roam.z;
    outer.position.z = MathUtils.lerp(outer.position.z, targetZ, 1 - Math.exp(-2.6 * delta));
    const cheer = cheerLevel(time - cheerStart.current);
    outer.scale.setScalar(scale * (1 + .06 * hover.current + Math.sin(time * 1.4) * .015 + .08 * cheer));

    // It keeps an eye on the pointer for a moment after it moves, then goes back to daydreaming.
    if (Math.abs(pointer.x - lastPointer.current.x) + Math.abs(pointer.y - lastPointer.current.y) > .001) {
      lastPointer.current = { x: pointer.x, y: pointer.y };
      lastPointerMove.current = time;
    }
    const watching = time - lastPointerMove.current < LOOK_HOLD_SECONDS;
    const gaze = watching ? lookToward(pointer, outer.position, halfWidth, halfHeight) : { x: 0, y: 0 };
    const ease = 1 - Math.exp(-6 * delta);
    look.current.x += (gaze.x - look.current.x) * ease;
    look.current.y += (gaze.y - look.current.y) * ease;

    const centreLean = -MathUtils.clamp(outer.position.x / halfWidth, -1, 1) * ASTRONAUT_FACING;
    inner.rotation.y = MathUtils.lerp(inner.rotation.y, centreLean + drift.turn + look.current.x * .4, 1 - Math.exp(-6 * delta));
    inner.rotation.z = drift.tilt - MathUtils.clamp(velocity.current.x * .05, -.5, .5) + Math.sin(time * .37 + 2) * .1;
    inner.rotation.x = .06 + MathUtils.clamp(velocity.current.y * .03, -.25, .25) + Math.sin(time * .5) * .06 + somersaultAngle(time) + trickAngle(time - trick.current.start, trick.current.direction);
    motion.current = { speed: Math.hypot(velocity.current.x, velocity.current.y), hover: hover.current, time, lookX: look.current.x, lookY: look.current.y, cheer };
  });

  return <>
    <group ref={group} position={initialPosition} scale={scale}
      onClick={tap}
      onPointerOver={() => { hoveredRef.current = true; gl.domElement.style.cursor = "pointer"; }}
      onPointerOut={() => { hoveredRef.current = false; gl.domElement.style.cursor = ""; }}>
      <mesh position={[0, -.04, 0]} visible={false}><capsuleGeometry args={[.42, .62, 2, 6]} /><meshBasicMaterial /></mesh>
      <group ref={body} rotation={[.06, ASTRONAUT_FACING, 0]} position={[0, -.42, 0]}>
        <AstronautRig motion={motion} nozzles={nozzles} />
      </group>
    </group>
    <AstronautTrail nozzles={nozzles} motion={motion} reducedMotion={reducedMotion} />
  </>;
}
