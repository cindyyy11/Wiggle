"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { CanvasTexture, Group, MeshStandardMaterial, Vector3 } from "three";
import type React from "react";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { GESTURE_CONFIG } from "../../features/gestures/config";
import {
  handPointerToTable,
  isWithinMagnetField,
  type MagnetPlayAction,
  type MagnetPlayState,
  type TablePoint,
} from "./magnetHandPlay";
import { MagnetHandGestureController, type MagnetGestureTarget } from "./magnetHandGesture";
import { MAGNET_OBJECTS, type MagnetObject, type MagnetObjectId } from "./scienceWorld";

export type MagnetHandLabSceneProps = {
  latest: React.RefObject<HandTrackingLatest>;
  state: MagnetPlayState;
  reducedMotion: boolean;
  onAction(action: MagnetPlayAction): void;
  onHandStatus(message: string): void;
};

type ObjectGroupMap = Partial<Record<MagnetObjectId, Group>>;
type ObjectMaterialMap = Partial<Record<MagnetObjectId, MeshStandardMaterial>>;

const TABLE_WIDTH = 2.8;
const TABLE_HEIGHT = 1.7;
const OBJECT_HIT_RADIUS = .125;
const TARGET_HIT_RADIUS = .18;
const TOOLBOX_HIT_RADIUS = .18;
const attractedTarget: TablePoint = { x: .25, y: .08 };
const notAttractedTarget: TablePoint = { x: .75, y: .08 };
const toolboxTarget: TablePoint = { x: .5, y: .54 };

function tableX(point: number) { return (point - .5) * TABLE_WIDTH; }
function tableY(point: number) { return (point - .5) * TABLE_HEIGHT; }

const homePositions = new Map<MagnetObjectId, readonly [number, number, number]>(
  MAGNET_OBJECTS.map((object) => [object.id, [tableX(object.scenePosition[0]), tableY(object.scenePosition[1]), .26] as const]),
);

const sortedPositions: Record<MagnetObjectId, readonly [number, number, number]> = {
  "paper-clip": [tableX(attractedTarget.x) - .18, tableY(attractedTarget.y) + .08, .3],
  "iron-nail": [tableX(attractedTarget.x) + .16, tableY(attractedTarget.y) + .08, .3],
  "wooden-block": [tableX(notAttractedTarget.x) - .16, tableY(notAttractedTarget.y) + .08, .3],
  "plastic-button": [tableX(notAttractedTarget.x) + .16, tableY(notAttractedTarget.y) + .08, .3],
};

const starPositions = new Float32Array([
  -2.7, 1.5, -1.5, -2.2, .9, -1.5, -1.8, 1.75, -1.5, -1.3, 1.26, -1.5,
  -.8, 1.66, -1.5, -.22, 1.22, -1.5, .35, 1.72, -1.5, .85, 1.4, -1.5,
  1.35, 1.72, -1.5, 1.85, 1.12, -1.5, 2.42, 1.63, -1.5, 2.72, .78, -1.5,
  -2.55, .32, -1.5, -1.98, .1, -1.5, -1.45, .54, -1.5, -1.05, .1, -1.5,
  -.55, .52, -1.5, .05, .18, -1.5, .57, .62, -1.5, 1.12, .12, -1.5,
  1.58, .48, -1.5, 2.12, .15, -1.5, 2.56, .45, -1.5,
]);

function isNear(point: TablePoint, target: TablePoint, radius: number) {
  return Math.hypot(point.x - target.x, point.y - target.y) <= radius;
}

/** The first unexplored object in the magnet field is the only observation this frame can earn. */
export function observationActionForTablePoint(state: MagnetPlayState, point: TablePoint): MagnetPlayAction | null {
  if (state.checkpoint !== "explore") return null;
  const object = MAGNET_OBJECTS.find((candidate) =>
    !state.explored.includes(candidate.id) && isWithinMagnetField(point, toTablePoint(candidate)));
  return object ? { type: "observe", id: object.id } : null;
}

function toTablePoint(object: MagnetObject): TablePoint {
  return { x: object.scenePosition[0], y: object.scenePosition[1] };
}

function targetForSort(point: TablePoint, state: MagnetPlayState): MagnetGestureTarget {
  const object = MAGNET_OBJECTS.find((candidate) =>
    !state.sorted.includes(candidate.id) && isNear(point, toTablePoint(candidate), OBJECT_HIT_RADIUS));
  if (object) return object.id;
  if (isNear(point, attractedTarget, TARGET_HIT_RADIUS)) return "attracted";
  if (isNear(point, notAttractedTarget, TARGET_HIT_RADIUS)) return "not-attracted";
  return null;
}

function targetForCheckpoint(point: TablePoint, state: MagnetPlayState): MagnetGestureTarget {
  if (state.checkpoint === "sort") return targetForSort(point, state);
  if (state.checkpoint === "hidden" && isNear(point, toolboxTarget, TOOLBOX_HIT_RADIUS)) return "toolbox";
  return null;
}

export function trackedTablePoint(frame: HandTrackingLatest): TablePoint | null {
  const pointer = frame.pointer;
  return frame.isTracking && frame.confidence >= GESTURE_CONFIG.minConfidence && pointer &&
    Number.isFinite(pointer.x) && Number.isFinite(pointer.y) ? handPointerToTable(pointer) : null;
}

/** Shared frame adapter keeps missing or unreliable hands from earning curriculum actions. */
export function actionForHandFrame(state: MagnetPlayState, frame: HandTrackingLatest, controller: MagnetHandGestureController, at: number): MagnetPlayAction | null {
  const point = trackedTablePoint(frame);
  if (state.checkpoint === "explore") return point ? observationActionForTablePoint(state, point) : null;
  return controller.update({ gesture: frame.gesture, target: point ? targetForCheckpoint(point, state) : null, isTracking: point !== null, at });
}

export function handStatusForFrame(checkpoint: MagnetPlayState["checkpoint"], frame: HandTrackingLatest) {
  if (!trackedTablePoint(frame)) return "Show your hand to the camera to use the Magnet Lab workbench.";
  if (checkpoint === "explore") return "Move the magnet near each object and watch what happens.";
  if (checkpoint === "sort") return "Pinch an object, then open your hand over the matching tray.";
  return "Point at the toolbox in the campsite to investigate it.";
}

class LabGraphicsBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  private reported = false;

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch() {
    if (this.reported) return;
    this.reported = true;
    this.props.onFailure();
  }

  render() { return this.state.failed ? null : this.props.children; }
}

function HandStatusReporter({ latest, checkpoint, onHandStatus }: Pick<MagnetHandLabSceneProps, "latest" | "onHandStatus"> & { checkpoint: MagnetPlayState["checkpoint"] }) {
  const previous = useRef("");
  const callback = useRef(onHandStatus);
  callback.current = onHandStatus;
  const report = (frame: HandTrackingLatest) => {
    const next = handStatusForFrame(checkpoint, frame);
    if (next === previous.current) return;
    previous.current = next;
    callback.current(next);
  };

  useEffect(() => { report(latest.current); }, [checkpoint]);
  useFrame(() => { report(latest.current); });
  return null;
}

function Starfield() {
  return <points>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[starPositions, 3]} /></bufferGeometry>
    <pointsMaterial color="#ffe9a8" size={.035} sizeAttenuation transparent opacity={.88} />
  </points>;
}

function HorseshoeMagnet() {
  return <group rotation={[0, 0, Math.PI]}>
    <mesh><torusGeometry args={[.21, .07, 6, 14, Math.PI]} /><meshStandardMaterial color="#ee7568" roughness={.72} flatShading /></mesh>
    <mesh position={[-.21, .01, .02]}><cylinderGeometry args={[.075, .075, .08, 6]} /><meshStandardMaterial color="#f8e5c8" roughness={1} flatShading /></mesh>
    <mesh position={[.21, .01, .02]}><cylinderGeometry args={[.075, .075, .08, 6]} /><meshStandardMaterial color="#6688be" roughness={1} flatShading /></mesh>
  </group>;
}

function Workbench() {
  return <group>
    <mesh position={[0, -.04, -.15]} rotation={[0, 0, Math.PI]}>
      <circleGeometry args={[2.22, 32, 0, Math.PI]} />
      <meshStandardMaterial color="#b86d5d" roughness={.9} flatShading />
    </mesh>
    <mesh position={[0, -.74, .02]} scale={[2.26, .18, .24]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8e4c48" roughness={1} flatShading />
    </mesh>
    <mesh position={[-1.65, -.92, -.04]} scale={[.22, .34, .18]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#613f4a" roughness={1} flatShading />
    </mesh>
    <mesh position={[1.65, -.92, -.04]} scale={[.22, .34, .18]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#613f4a" roughness={1} flatShading />
    </mesh>
    <mesh position={[0, 1.04, -.26]} scale={[2.18, .8, .12]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#46354f" roughness={1} flatShading />
    </mesh>
    <mesh position={[-1.62, 1.05, -.08]}><sphereGeometry args={[.12, 7, 5]} /><meshStandardMaterial color="#ffc96b" emissive="#c57939" emissiveIntensity={.45} flatShading /></mesh>
    <mesh position={[1.58, 1.05, -.08]}><sphereGeometry args={[.12, 7, 5]} /><meshStandardMaterial color="#ffc96b" emissive="#c57939" emissiveIntensity={.45} flatShading /></mesh>
  </group>;
}

function MagnetObjectModel({
  object,
  groupRef,
  materialRef,
}: {
  object: MagnetObject;
  groupRef: (value: Group | null) => void;
  materialRef: (value: MeshStandardMaterial | null) => void;
}) {
  const material = <meshStandardMaterial ref={materialRef} color={object.color} roughness={.78} metalness={object.result === "attracted" ? .35 : 0} flatShading />;
  return <group ref={groupRef}>
    {object.sceneKind === "clip" ? <mesh rotation={[0, 0, .35]}>{material}<torusGeometry args={[.11, .028, 5, 10]} /></mesh> : null}
    {object.sceneKind === "nail" ? <group rotation={[0, 0, -.75]}>
      <mesh>{material}<cylinderGeometry args={[.043, .043, .29, 6]} /></mesh>
      <mesh position={[0, .16, 0]}><coneGeometry args={[.05, .1, 6]} /><meshStandardMaterial color="#cad2d9" roughness={.7} flatShading /></mesh>
    </group> : null}
    {object.sceneKind === "block" ? <mesh rotation={[0, 0, .18]}>{material}<boxGeometry args={[.21, .17, .13]} /></mesh> : null}
    {object.sceneKind === "button" ? <group>
      <mesh>{material}<cylinderGeometry args={[.105, .105, .06, 12]} /></mesh>
      <mesh position={[0, 0, .035]}><torusGeometry args={[.06, .012, 5, 10]} /><meshStandardMaterial color="#d6ecf3" roughness={.8} flatShading /></mesh>
    </group> : null}
  </group>;
}

function LabelTexture({ text, color, position }: { text: string; color: string; position: readonly [number, number, number] }) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#fff3dc";
    context.lineWidth = 12;
    context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    context.fillStyle = "#342c43";
    context.font = "700 56px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    return new CanvasTexture(canvas);
  }, [color, text]);

  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return <sprite position={position} scale={[.82, .26, 1]}>
    <spriteMaterial map={texture} transparent depthWrite={false} />
  </sprite>;
}

function SortTargets() {
  return <group>
    <mesh position={[tableX(attractedTarget.x), tableY(attractedTarget.y) + .07, .12]} scale={[.63, .24, .08]}>
      <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#e9bb70" roughness={1} flatShading />
    </mesh>
    <mesh position={[tableX(notAttractedTarget.x), tableY(notAttractedTarget.y) + .07, .12]} scale={[.63, .24, .08]}>
      <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#8db2d1" roughness={1} flatShading />
    </mesh>
    <LabelTexture text="ATTRACTED" color="#f4c873" position={[tableX(attractedTarget.x), tableY(attractedTarget.y) - .17, .36]} />
    <LabelTexture text="STAYS PUT" color="#a9cae4" position={[tableX(notAttractedTarget.x), tableY(notAttractedTarget.y) - .17, .36]} />
  </group>;
}

function Campfire() {
  return <group position={[-.55, -.05, .2]}>
    <mesh rotation={[0, 0, .72]}><cylinderGeometry args={[.045, .045, .38, 6]} /><meshStandardMaterial color="#74494a" roughness={1} flatShading /></mesh>
    <mesh rotation={[0, 0, -.72]}><cylinderGeometry args={[.045, .045, .38, 6]} /><meshStandardMaterial color="#74494a" roughness={1} flatShading /></mesh>
    <mesh position={[0, .14, .04]} scale={[.13, .2, .08]}><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial color="#ffb35d" emissive="#e96b4d" emissiveIntensity={.7} flatShading /></mesh>
  </group>;
}

function Campsite({ found, reducedMotion }: { found: boolean; reducedMotion: boolean }) {
  const magnet = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!magnet.current || reducedMotion || !found) return;
    magnet.current.position.y = .2 + Math.sin(clock.elapsedTime * 2.2) * .035;
  });
  return <group>
    <mesh position={[0, 0, .02]} scale={[1.7, 1.16, 1]}><circleGeometry args={[1, 18]} /><meshStandardMaterial color="#697e60" roughness={1} flatShading /></mesh>
    <mesh position={[.38, .15, .18]} rotation={[0, 0, -.08]} scale={[.55, .4, .25]}><coneGeometry args={[1, 1, 4]} /><meshStandardMaterial color="#ef936d" roughness={.95} flatShading /></mesh>
    <mesh position={[.95, .42, .13]} scale={[.12, .52, .1]}><coneGeometry args={[1, 1, 5]} /><meshStandardMaterial color="#3f6a62" roughness={1} flatShading /></mesh>
    <mesh position={[-1.08, .38, .13]} scale={[.12, .57, .1]}><coneGeometry args={[1, 1, 5]} /><meshStandardMaterial color="#3f6a62" roughness={1} flatShading /></mesh>
    <Campfire />
    <group position={[tableX(toolboxTarget.x), tableY(toolboxTarget.y), .26]}>
      <mesh scale={[.31, .18, .14]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#d77763" roughness={.92} flatShading /></mesh>
      <mesh position={[0, .14, .02]} scale={[.17, .11, .08]}><torusGeometry args={[1, .16, 5, 8, Math.PI]} /><meshStandardMaterial color="#f7d4a4" roughness={.8} flatShading /></mesh>
    </group>
    {found ? <group ref={magnet} position={[tableX(toolboxTarget.x) + .37, .2, .34]} scale={.8}><HorseshoeMagnet /></group> : null}
  </group>;
}

function LabInteraction({ props }: { props: MagnetHandLabSceneProps }) {
  const magnet = useRef<Group>(null);
  const objectGroups = useRef<ObjectGroupMap>({});
  const objectMaterials = useRef<ObjectMaterialMap>({});
  const previousTarget = useRef<TablePoint>({ x: .5, y: .5 });
  const magnetTarget = useRef(new Vector3());
  const objectTarget = useRef(new Vector3());
  const scaleTarget = useRef(new Vector3(1, 1, 1));
  const controller = useRef(new MagnetHandGestureController());
  const observed = useRef(new Set<MagnetObjectId>());
  const priorCheckpoint = useRef(props.state.checkpoint);
  const action = useRef(props.onAction);
  action.current = props.onAction;

  useEffect(() => {
    if (priorCheckpoint.current === props.state.checkpoint) return;
    priorCheckpoint.current = props.state.checkpoint;
    controller.current.reset();
  }, [props.state.checkpoint]);

  useFrame(({ clock }) => {
    const point = trackedTablePoint(props.latest.current);
    const target = point ?? previousTarget.current;
    if (point) previousTarget.current = target;

    magnetTarget.current.set(tableX(target.x), tableY(target.y), .35);
    if (magnet.current) {
      if (props.reducedMotion) magnet.current.position.copy(magnetTarget.current);
      else magnet.current.position.lerp(magnetTarget.current, .16);
    }

    const frameAction = actionForHandFrame(props.state, props.latest.current, controller.current, clock.elapsedTime * 1000);
    if (props.state.checkpoint === "explore") {
      const observation = frameAction;
      if (observation?.type === "observe" && !observed.current.has(observation.id)) {
        observed.current.add(observation.id);
        action.current(observation);
      }
    }

    if (props.state.checkpoint === "sort" || props.state.checkpoint === "hidden") {
      if (frameAction) action.current(frameAction);
    }

    if (props.state.checkpoint === "hidden") return;
    for (const object of MAGNET_OBJECTS) {
      const model = objectGroups.current[object.id];
      if (!model) continue;
      const withinField = point !== null && props.state.checkpoint === "explore" && isWithinMagnetField(target, toTablePoint(object));
      const shouldFollow = props.state.checkpoint === "explore" && object.result === "attracted" && withinField;
      const sorted = props.state.sorted.includes(object.id);
      const held = props.state.held === object.id;
      if (shouldFollow || held) objectTarget.current.copy(magnetTarget.current).setZ(.29);
      else if (sorted) objectTarget.current.fromArray(sortedPositions[object.id]);
      else objectTarget.current.fromArray(homePositions.get(object.id)!);
      if (props.reducedMotion) model.position.copy(objectTarget.current);
      else model.position.lerp(objectTarget.current, shouldFollow || held ? .2 : .12);

      const nonMagneticFeedback = object.result === "not-attracted" && withinField;
      const scale = nonMagneticFeedback && !props.reducedMotion ? 1.1 : 1;
      if (props.reducedMotion) model.scale.setScalar(1);
      else model.scale.lerp(scaleTarget.current.setScalar(scale), .18);
      const material = objectMaterials.current[object.id];
      if (material) material.color.set(nonMagneticFeedback ? "#f3ca70" : object.color);
    }
  });

  return <>
    <Workbench />
    {props.state.checkpoint === "hidden" ? <Campsite found={props.state.foundHiddenMagnet} reducedMotion={props.reducedMotion} /> : <>
      <group ref={magnet}><HorseshoeMagnet /></group>
      {MAGNET_OBJECTS.map((object) => <MagnetObjectModel
        key={object.id}
        object={object}
        groupRef={(value) => { if (value) objectGroups.current[object.id] = value; else delete objectGroups.current[object.id]; }}
        materialRef={(value) => { if (value) objectMaterials.current[object.id] = value; else delete objectMaterials.current[object.id]; }}
      />)}
      {props.state.checkpoint === "sort" ? <SortTargets /> : null}
    </>}
  </>;
}

export function MagnetHandLabScene(props: MagnetHandLabSceneProps): React.JSX.Element {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const graphicsFailureReported = useRef(false);
  const probedWebgl = useRef(false);
  const statusCallback = useRef(props.onHandStatus);
  statusCallback.current = props.onHandStatus;
  const reportGraphicsFailure = useCallback(() => {
    if (graphicsFailureReported.current) return;
    graphicsFailureReported.current = true;
    setWebglSupported(false);
    statusCallback.current("The lab view needs a graphics-capable device.");
  }, []);

  useEffect(() => {
    if (probedWebgl.current) return;
    probedWebgl.current = true;
    let cancelled = false;
    let supported = false;
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      if (context) {
        context.getExtension("WEBGL_lose_context")?.loseContext();
        supported = true;
      }
    } catch { supported = false; }
    if (cancelled) return;
    if (supported) setWebglSupported(true);
    else reportGraphicsFailure();
    return () => { cancelled = true; };
  }, [reportGraphicsFailure]);

  if (webglSupported !== true) return <></>;

  return <LabGraphicsBoundary onFailure={reportGraphicsFailure}>
    <Canvas
      aria-label="Magnet Lab workbench"
      aria-hidden="true"
      style={{ display: "block", width: "100%", minHeight: 320, background: "transparent" }}
      camera={{ position: [0, 0, 5.3], fov: 42, near: .1, far: 20 }}
      dpr={props.reducedMotion ? 1 : [1, 1.5]}
      gl={{ antialias: !props.reducedMotion, alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
    >
      <ambientLight intensity={1.45} color="#f7e7c5" />
      <hemisphereLight args={["#fff0d4", "#3e4664", 1.1]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.35} color="#ffd991" />
      <pointLight position={[1.4, 1.1, 2]} intensity={7} distance={5} color="#f39b83" />
      <Starfield />
      <LabInteraction props={props} />
      <HandStatusReporter latest={props.latest} checkpoint={props.state.checkpoint} onHandStatus={props.onHandStatus} />
    </Canvas>
  </LabGraphicsBoundary>;
}
