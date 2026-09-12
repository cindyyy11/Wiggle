# 3D Subject-Orbit Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Wiggle splash, then replace the card-grid landing screen with an original, modeled React Three Fiber subject orbit that enters the existing Numeria and Science experiences without changing their gameplay.

**Architecture:** The subject shell continues to own splash state and URL navigation. A new data-only orbit layout and small procedural scene components make the constellation a real 3D miniature cosmos; `WorldsConstellationScene` remains the Canvas/light/health boundary. A transparent DOM HUD supplies the canonical accessible planet controls over the interactive Canvas, so visual selection, keyboard use, and WebGL fallback all share `SubjectWorlds.selectWorld`.

**Tech Stack:** Next.js 15, React 19, TypeScript, React Three Fiber 9, Three.js 0.180, CSS Modules, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-12-3d-subject-orbit-landing-design.md`

## Global Constraints

- Preserve `WiggleSplash.tsx` and its labelled “Let's Wiggle” action; the 3D orbit appears after that action, not before it.
- Build every visible planet from original procedural R3F/Three.js geometry. Do not use CSS circles, bitmap thumbnails, copied reference art, GLB/GLTF downloads, or texture packs as planet stand-ins.
- Keep the exact `world=math`, `world=science&zone=...`, and `child` route contract. `world=math` must still mount `MissionAtlas` with `showSplash={false}`.
- Do not modify Numeria/avatar/camera/checkpoint/mission/gesture behavior or Science route/activity semantics.
- Canvas click/tap and the matching DOM button must call the same `onSelect(world)` callback for all four worlds, including locked English and Bahasa Melayu.
- Keep native, labelled, 44px-or-larger controls for every world; Canvas remains hidden from assistive technology and WebGL fallback must keep every action usable.
- High/low quality, context-loss recovery, dynamic loading, and `prefers-reduced-motion` behavior remain intact. Decoration density drops before planet identity or controls.
- Avoid a course grid, dashboard chrome, fake progress, fake tokens, profile menus, and generic LMS copy. The only persistent UI is compact orientation and real world-selection controls.
- Use R3F `useFrame` for ornamental movement; never set React state every animation frame.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/worlds/worldOrbit.ts` | Typed orbit positions, decoration budgets, and reusable press-distance guard; pure and unit-testable. |
| `apps/web/components/worlds/WorldMiniatures.tsx` | Original modeled Numeria, Science, English, and Bahasa Melayu miniatures plus shared interactive-world behavior. |
| `apps/web/components/worlds/ConstellationDressings.tsx` | Shared procedural orbit arcs, star field, cloud puffs, and instanced asteroid belt. |
| `apps/web/components/worlds/WorldsConstellationScene.tsx` | Thin R3F Canvas, lights, health monitor, camera/drift, and scene composition. |
| `apps/web/components/worlds/WorldsConstellation.tsx` | Dynamic loading, WebGL quality selection, context-loss downgrade, reduced-motion wiring, and scene props. |
| `apps/web/components/worlds/WorldSelector.tsx` | Compact accessible spatial HUD with the canonical native world controls; no card grid. |
| `apps/web/components/worlds/SubjectWorlds.tsx` | Owns transient active-world highlighting while preserving current route/navigation and splash behavior. |
| `apps/web/components/worlds/SubjectWorlds.module.css` | Full-viewport dreamy-space composition, interactive Canvas/HUD layering, desktop anchors, and mobile control dock. |
| `apps/web/components/worlds/worldOrbit.test.ts` | Pure model-layout, quality-budget, and press-guard coverage. |
| `apps/web/components/worlds/WorldsConstellation.test.tsx` | Scene/DOM callback parity, context-loss fallback, reduced-motion, and all-control fallback coverage. |
| `apps/web/components/worlds/SubjectWorlds.test.tsx` | Splash-to-orbit, model/DOM Numeria routing, return behavior, child props, and locked-world route protection. |
| `apps/web/tests/accessibility/subject-worlds.test.tsx` | Semantic control/fallback/focus/live-status parity. |
| `apps/web/tests/browser/subject-worlds.spec.ts` | Browser-level splash, orbit, Numeria, Science, mobile, keyboard, reduced-motion, and fallback regression coverage. |

---

### Task 1: Create the typed orbit layout and interaction primitives

**Files:**
- Create: `apps/web/components/worlds/worldOrbit.ts`
- Create: `apps/web/components/worlds/worldOrbit.test.ts`
- Modify: `apps/web/components/worlds/WorldsConstellation.tsx`
- Test: `apps/web/components/worlds/worldOrbit.test.ts`

**Interfaces:**
- Consumes: `SubjectWorldId` from `subjectRoute.ts`.
- Produces: `SUBJECT_ORBIT_LAYOUT`, `OrbitDecorationCounts`, `orbitDecorationCounts(quality)`, and `isOrbitPress(start, end)` for the scene components.
- Produces: a compatibility re-export named `worldDecorationCounts` from `WorldsConstellation.tsx` if tests or consumers still import that name.

- [ ] **Step 1: Write the failing pure-layout tests**

Create `worldOrbit.test.ts` with the following assertions. Keep the test free of Canvas/R3F so it can protect the scene contract on any machine.

```ts
import { expect, it } from "vitest";
import {
  SUBJECT_ORBIT_LAYOUT,
  isOrbitPress,
  orbitDecorationCounts,
} from "./worldOrbit";

it("describes four original miniature worlds with two playable hero worlds", () => {
  expect(Object.keys(SUBJECT_ORBIT_LAYOUT)).toEqual(["math", "science", "english", "bm"]);
  expect(SUBJECT_ORBIT_LAYOUT.math).toMatchObject({ playable: true, label: "Numeria" });
  expect(SUBJECT_ORBIT_LAYOUT.science).toMatchObject({ playable: true, label: "Science Planet" });
  expect(SUBJECT_ORBIT_LAYOUT.english.playable).toBe(false);
  expect(SUBJECT_ORBIT_LAYOUT.bm.playable).toBe(false);
});

it("reduces decoration density without removing any miniature world", () => {
  const high = orbitDecorationCounts("high");
  const low = orbitDecorationCounts("low");
  expect(low.stars).toBeLessThan(high.stars);
  expect(low.orbitalRocks).toBeLessThan(high.orbitalRocks);
  expect(low.cloudPuffs).toBeLessThan(high.cloudPuffs);
  expect(low.mathTrees).toBeLessThan(high.mathTrees);
  expect(low.scienceFragments).toBeLessThan(high.scienceFragments);
});

it("accepts a deliberate tap but rejects a drag as a world selection", () => {
  expect(isOrbitPress([20, 30], [28, 38])).toBe(true);
  expect(isOrbitPress([20, 30], [33, 43])).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test --workspace=@wiggle/web -- components/worlds/worldOrbit.test.ts
```

Expected: FAIL because `./worldOrbit` does not exist.

- [ ] **Step 3: Implement the data-only orbit contract**

Create `worldOrbit.ts`. Use these fixed scene anchors so DOM callouts can be placed spatially without a camera chase. Keep exact count fields here, not scattered through mesh components.

```ts
import type { SubjectWorldId } from "./subjectRoute";

export type OrbitDecorationCounts = {
  stars: number;
  orbitalRocks: number;
  cloudPuffs: number;
  mathTrees: number;
  scienceFragments: number;
};

export type SubjectOrbitLayout = {
  position: readonly [number, number, number];
  scale: number;
  label: string;
  playable: boolean;
};

export const SUBJECT_ORBIT_LAYOUT: Record<SubjectWorldId, SubjectOrbitLayout> = {
  math: { position: [-2.15, -0.35, 0.15], scale: 1.35, label: "Numeria", playable: true },
  science: { position: [2, 0.05, -0.2], scale: 1.28, label: "Science Planet", playable: true },
  english: { position: [-3, 1.45, -1.2], scale: 0.38, label: "English", playable: false },
  bm: { position: [3, 1.3, -1.3], scale: 0.36, label: "Bahasa Melayu", playable: false },
};

export function orbitDecorationCounts(quality: "high" | "low"): OrbitDecorationCounts {
  return quality === "high"
    ? { stars: 96, orbitalRocks: 24, cloudPuffs: 8, mathTrees: 24, scienceFragments: 12 }
    : { stars: 36, orbitalRocks: 8, cloudPuffs: 4, mathTrees: 10, scienceFragments: 5 };
}

export function isOrbitPress(start: readonly [number, number], end: readonly [number, number]): boolean {
  return Math.hypot(end[0] - start[0], end[1] - start[1]) <= 12;
}
```

In `WorldsConstellation.tsx`, replace the local `worldDecorationCounts` body with an import/re-export:

```ts
import { orbitDecorationCounts } from "./worldOrbit";
export const worldDecorationCounts = orbitDecorationCounts;
```

- [ ] **Step 4: Run the focused tests and typecheck**

Run:

```powershell
npm run test --workspace=@wiggle/web -- components/worlds/worldOrbit.test.ts components/worlds/WorldsConstellation.test.tsx
npm run typecheck --workspace=@wiggle/web
```

Expected: PASS. Existing constellation tests may need their exact high/low count expectation updated to the new five-field budget in the next task; do not weaken the new pure-layout assertions.

- [ ] **Step 5: Commit the isolated contract**

```powershell
git add apps/web/components/worlds/worldOrbit.ts apps/web/components/worlds/worldOrbit.test.ts apps/web/components/worlds/WorldsConstellation.tsx
git commit -m "feat: define subject orbit layout"
```

### Task 2: Model the four original miniature worlds and cosmic dressing

**Files:**
- Create: `apps/web/components/worlds/WorldMiniatures.tsx`
- Create: `apps/web/components/worlds/ConstellationDressings.tsx`
- Modify: `apps/web/components/worlds/WorldsConstellationScene.tsx`
- Modify: `apps/web/components/worlds/WorldsConstellation.tsx`
- Test: `apps/web/components/worlds/WorldsConstellation.test.tsx`

**Interfaces:**
- Consumes: `SUBJECT_ORBIT_LAYOUT`, `OrbitDecorationCounts`, and `isOrbitPress` from `worldOrbit.ts`.
- Consumes: `SubjectWorldId` from `subjectRoute.ts`.
- Produces: `WorldMiniatures({ quality, counts, activeWorld, reducedMotion, onSelect, onActiveWorldChange })`.
- Produces: `ConstellationDressings({ counts, reducedMotion })`.
- Produces: `WorldsConstellationScene` props with `activeWorld` and `onActiveWorldChange` in addition to the existing quality/fallback props.
- Produces: `WorldsConstellation({ activeWorld, quality?, reducedMotion?, onSelect, onActiveWorldChange })` with its existing dynamic-load and fallback behavior preserved.

- [ ] **Step 1: Expand the existing scene mock to expose modeled-world interactions**

In `WorldsConstellation.test.tsx`, change the dynamic-scene mock so it renders four test-only controls that call the scene props. The test does not pretend these buttons are production UI; it verifies the wrapper wires every modeled world—including locks—to the same callback.

```tsx
vi.mock("./WorldsConstellationScene", () => ({
  default: (props: {
    activeWorld: string | null;
    quality: "high" | "low";
    reducedMotion: boolean;
    counts: Record<string, number>;
    onSelect: (world: "science" | "math" | "english" | "bm") => void;
    onContextLost: () => void;
  }) => <div data-testid="worlds-constellation-scene" data-reduced-motion={String(props.reducedMotion)}>
    {(["math", "science", "english", "bm"] as const).map(world =>
      <button key={world} type="button" onClick={() => props.onSelect(world)}>
        Select modeled {world}
      </button>,
    )}
    <button type="button" onClick={props.onContextLost}>Lose constellation context</button>
  </div>,
}));
```

Add this failing assertion after the mock:

```tsx
it("forwards every modeled world selection, including locked worlds", async () => {
  const onSelect = vi.fn();
  render(<WorldsConstellation activeWorld={null} quality="low" onActiveWorldChange={vi.fn()} onSelect={onSelect} />);

  for (const world of ["math", "science", "english", "bm"] as const) {
    fireEvent.click(await screen.findByRole("button", { name: `Select modeled ${world}` }));
  }
  expect(onSelect.mock.calls.map(([world]) => world)).toEqual(["math", "science", "english", "bm"]);
});

it("changes to fallback after constellation context loss", async () => {
  render(<WorldsConstellation activeWorld={null} quality="low" onActiveWorldChange={vi.fn()} onSelect={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Lose constellation context" }));
  expect(screen.queryByTestId("worlds-constellation-scene")).toBeNull();
  expect(document.querySelector('[data-quality="fallback"]')).toBeTruthy();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test --workspace=@wiggle/web -- components/worlds/WorldsConstellation.test.tsx
```

Expected: FAIL because `WorldsConstellation` does not yet accept/pass `activeWorld` and `onActiveWorldChange`.

- [ ] **Step 3: Build reusable interaction and distinct procedural miniature models**

Create `WorldMiniatures.tsx`. Keep materials at module scope and use `InstancedMesh` for Numeria's repeated trees and science fragments. Use a shared pointer-down/up guard for every world so a drag cannot enter a planet.

```tsx
export type WorldMiniaturesProps = {
  quality: "high" | "low";
  counts: OrbitDecorationCounts;
  activeWorld: SubjectWorldId | null;
  reducedMotion: boolean;
  onSelect: (world: SubjectWorldId) => void;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
};

function InteractiveMiniWorld({ world, active, onSelect, onActiveWorldChange, children }: {
  world: SubjectWorldId;
  active: boolean;
  onSelect: (world: SubjectWorldId) => void;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
  children: ReactNode;
}) {
  const pressStart = useRef<[number, number] | null>(null);
  return <group
    scale={active ? 1.06 : 1}
    onPointerEnter={event => { event.stopPropagation(); onActiveWorldChange(world); }}
    onPointerLeave={() => onActiveWorldChange(null)}
    onPointerDown={event => { event.stopPropagation(); pressStart.current = [event.clientX, event.clientY]; }}
    onPointerUp={event => {
      event.stopPropagation();
      const start = pressStart.current;
      pressStart.current = null;
      if (start && isOrbitPress(start, [event.clientX, event.clientY])) onSelect(world);
    }}
    onPointerCancel={() => { pressStart.current = null; }}
  >
    {children}
    {active ? <mesh scale={1.18}><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#fff3c9" transparent opacity={0.1} /></mesh> : null}
  </group>;
}
```

Implement four distinct child components inside that module:

- `NumeriaMiniature`: a vertex-coloured `icosahedronGeometry`, low-amplitude terrain variation, small instanced trees, soft peaks/crystals/number stones, cloud puffs, and a thin mustard orbit ring.
- `ScienceMiniature`: a layered `icosahedronGeometry`/`cylinderGeometry`/`coneGeometry` floating island with a small dome observatory, a horseshoe-magnet workbench, and instanced magnetic fragments.
- `LockedStoryMoon`: a lilac low-poly moon with two rounded book/page forms and a procedural cream lock badge.
- `LockedGardenMoon`: a jade low-poly moon with seed/leaf forms and the same procedural lock badge.

All four must mount through `InteractiveMiniWorld`, including the locked moons. `WorldMiniatures` places each item using `SUBJECT_ORBIT_LAYOUT[world]` and passes active state from `activeWorld`.

Create `ConstellationDressings.tsx` with four private building blocks and one public composition component: `OrbitArcs` renders two thin torus arcs and rotates them only when motion is allowed; `StarField` builds a deterministic `BufferGeometry` in `useMemo` and disposes it in effect cleanup; `CloudPuffs` renders grouped matte spheres with an optional slow group rotation; and `AsteroidBelt` fills one `InstancedMesh` with deterministic icosahedron transforms. Export `ConstellationDressings({ counts, reducedMotion })`, which renders those four blocks using `counts.stars`, `counts.cloudPuffs`, and `counts.orbitalRocks`.

Never allocate a geometry, material, array of mesh nodes, or React state from `useFrame`. Geometry that is built in `useMemo` must be disposed in an effect cleanup exactly as `ScienceDiorama.Stars` does.

- [ ] **Step 4: Compose the actual R3F scene around the miniatures**

Refactor `WorldsConstellationScene.tsx` into a Canvas/lighting/health shell. Keep `RendererHealth`'s context-loss listener and FPS downgrade, add `CanvasFallback` as used by `SciencePlanetScene`, and do not reintroduce an opaque DOM surface inside the scene.

Use this prop boundary:

```ts
export type WorldsConstellationSceneProps = {
  activeWorld: SubjectWorldId | null;
  quality: "high" | "low";
  reducedMotion: boolean;
  counts: OrbitDecorationCounts;
  onSelect: (world: SubjectWorldId) => void;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
  onQualityChange: () => void;
  onContextLost: () => void;
};
```

Compose it as follows:

```tsx
function Constellation(props: WorldsConstellationSceneProps) {
  return <>
    <ambientLight intensity={1.2} color="#e9f5e9" />
    <hemisphereLight args={["#fff5dc", "#2d315d", 1.15]} />
    <directionalLight position={[-4, 5, 6]} intensity={2.35} color="#fff0d0" />
    <directionalLight position={[4, -1, 3]} intensity={1.05} color="#9ccde1" />
    <OrbitCameraFloat reducedMotion={props.reducedMotion} />
    <WorldMiniatures {...props} />
    <ConstellationDressings counts={props.counts} reducedMotion={props.reducedMotion} />
    <RendererHealth onContextLost={props.onContextLost} onQualityChange={props.onQualityChange} quality={props.quality} />
  </>;
}
```

Set the Canvas to retain the previous quality behavior while widening its view enough to keep outer moons visible on phones:

```tsx
<Canvas
  className="worlds-constellation-canvas"
  aria-hidden="true"
  dpr={props.quality === "low" ? 1 : [1, 1.5]}
  camera={{ position: [0, 0.08, 9.4], fov: 46, near: 0.1, far: 30 }}
  gl={{ antialias: props.quality === "high", alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
  fallback={<CanvasFallback onFailure={props.onContextLost} />}
>
  <Constellation {...props} />
</Canvas>
```

- [ ] **Step 5: Wire the scene wrapper to the new interactive model API**

In `WorldsConstellation.tsx`, retain `GraphicsBoundary`, the dynamic import, the existing WebGL probe, quality selection, context-loss downgrade, and the media-query cleanup. Replace the old `selectedWorld` prop with this public API:

```ts
export type WorldsConstellationProps = {
  activeWorld: SubjectWorldId | null;
  quality?: QualityPreference;
  reducedMotion?: boolean;
  onSelect: (world: SubjectWorldId) => void;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
};
```

In the non-fallback path, pass each callback and the new count budget directly into the scene:

```tsx
<GraphicsBoundary onFailure={() => setQuality("fallback")}>
  <Scene
    activeWorld={activeWorld}
    reducedMotion={reducedMotion}
    onSelect={onSelect}
    onActiveWorldChange={onActiveWorldChange}
    quality={displayQuality}
    counts={orbitDecorationCounts(displayQuality)}
    onQualityChange={() => setQuality("low")}
    onContextLost={() => setQuality("fallback")}
  />
</GraphicsBoundary>
```

Keep `data-quality={quality}` and `data-reduced-motion={String(reducedMotion)}` on the wrapper. The wrapper must not mount its own controls or make Canvas the only way to select a subject.

- [ ] **Step 6: Run the self-contained modeled-scene suite**

Run:

```powershell
npm run test --workspace=@wiggle/web -- components/worlds/worldOrbit.test.ts components/worlds/WorldsConstellation.test.tsx
npm run lint --workspace=@wiggle/web
npm run typecheck --workspace=@wiggle/web
```

Expected: PASS. The test suite must demonstrate callback parity for Math, Science, English, and Bahasa Melayu plus a clean context-loss downgrade; the old implementation silently dropped locked-world Canvas interaction.

- [ ] **Step 7: Commit the modeled scene and interactive wrapper**

```powershell
git add apps/web/components/worlds/WorldMiniatures.tsx apps/web/components/worlds/ConstellationDressings.tsx apps/web/components/worlds/WorldsConstellationScene.tsx apps/web/components/worlds/WorldsConstellation.tsx apps/web/components/worlds/WorldsConstellation.test.tsx
git commit -m "feat: model interactive subject orbit"
```

### Task 3: Replace the card grid with the compact spatial orbit HUD

**Files:**
- Modify: `apps/web/components/worlds/SubjectWorlds.tsx`
- Modify: `apps/web/components/worlds/WorldSelector.tsx`
- Modify: `apps/web/components/worlds/SubjectWorlds.module.css`
- Modify: `apps/web/components/worlds/SubjectWorlds.test.tsx`
- Test: `apps/web/components/worlds/SubjectWorlds.test.tsx`

**Interfaces:**
- Consumes: `SubjectWorldId`, `SUBJECT_WORLDS`, `WorldsConstellationProps`.
- Produces: a shared `activeWorld` value for Canvas glow/lift and DOM callout style; `null` is the resting state.
- Produces: four canonical native controls in focus order Math, Science, English, Bahasa Melayu, with the existing accessible names retained for current helpers.

- [ ] **Step 1: Change the subject-shell tests before markup**

Update the `WorldsConstellation` mock in `SubjectWorlds.test.tsx` to accept the new props and expose a model-selection route trigger:

```tsx
vi.mock("./WorldsConstellation", () => ({
  WorldsConstellation: (props: { onSelect: (world: "math" | "science" | "english" | "bm") => void; activeWorld: string | null }) => <>
    <div data-testid="mock-constellation" data-active-world={props.activeWorld ?? ""} />
    <button type="button" onClick={() => props.onSelect("math")}>Select modeled Numeria</button>
    <button type="button" onClick={() => props.onSelect("english")}>Select modeled English</button>
  </>,
}));
```

Replace the first test with a route-preservation test that proves splash → orbit → Numeria from both kinds of controls:

```tsx
it("keeps the splash, then routes Numeria from either orbit control to the existing MissionAtlas", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds childId="owned" allowLocalFallback={false} client={{} as never} quality="fallback" initialRoute={{ world: null, child: "owned" }} />);

  expect(screen.getByRole("region", { name: "Welcome to Wiggle" })).toBeTruthy();
  enterWorlds();
  expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  expect(window.location.search).toBe("?child=owned&world=math");
  expect(screen.getByTestId("maths-props").dataset.splash).toBe("false");
});
```

Add a separate render/click sequence that activates `Select modeled Numeria` and repeats the `MissionAtlas` prop assertions (`childId`, `allowLocalFallback`, `client`, `quality`, and `showSplash=false`). Add a return assertion: after `Back to Worlds`, the subject-orbit region is visible and `Let's Wiggle` is absent.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test --workspace=@wiggle/web -- components/worlds/SubjectWorlds.test.tsx
```

Expected: FAIL because `SubjectWorlds`, `WorldSelector`, and `WorldsConstellation` do not share `activeWorld` yet.

- [ ] **Step 3: Add transient active-world state to the existing routing owner**

In `SubjectWorlds.tsx`, keep route state and all Maths mission protection exactly as written. Change the existing status-message initializer to an empty string (the new HUD needs no default dashboard announcement), then add only transient visual interaction state:

```tsx
const [activeWorld, setActiveWorld] = useState<SubjectWorldId | null>(null);
const [statusMessage, setStatusMessage] = useState("");

const selectWorld = (world: SubjectWorldId) => {
  setActiveWorld(null);
  if (!isEnterableWorld(world)) {
    setStatusMessage(`${world === "english" ? "English" : "Bahasa Melayu"} is coming soon. Your current world is still here.`);
    return;
  }
  setStatusMessage("");
  if (world === "science") {
    navigate({ world: "science", zone: DEFAULT_SCIENCE_ZONE, child: currentChild });
    return;
  }
  navigate({ world: "math", child: currentChild });
};
```

Pass it into both visual layers at the root-route return:

```tsx
<WorldsConstellation
  activeWorld={activeWorld}
  quality={quality}
  onActiveWorldChange={setActiveWorld}
  onSelect={selectWorld}
/>
<WorldSelector
  activeWorld={activeWorld}
  onActiveWorldChange={setActiveWorld}
  onSelect={selectWorld}
  statusMessage={statusMessage}
/>
```

Do not modify the `if (!entered) return <WiggleSplash ...>` branch.

- [ ] **Step 4: Replace `WorldSelector` markup with a small accessible orbit HUD**

Keep the exported component name, but replace `selectedWorld` with `activeWorld` and add `onActiveWorldChange`:

```tsx
export type WorldSelectorProps = {
  activeWorld: SubjectWorldId | null;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
  onSelect: (world: SubjectWorldId) => void;
  statusMessage: string;
};
```

Render a small header and four spatial buttons. Preserve the exact `aria-label` values so existing mission/browser helpers continue to work. Do not use `aria-pressed`: entering a world is navigation, not a persistent toggle.

```tsx
<section className={styles.selector} aria-label="Choose a subject world">
  <header className={styles.orbitIntro}>
    <img src="/brand/wiggle-mark.png" alt="Wiggle" />
    <p>Your learning universe</p>
    <h1>Choose a world to explore</h1>
  </header>
  <div className={styles.worldHotspots} role="group" aria-label="World portals">
    {(["math", "science", "english", "bm"] as const).map(id => {
      const world = SUBJECT_WORLDS.find(item => item.id === id)!;
      const locked = world.status === "coming-soon";
      const name = locked ? `${world.name} (coming soon)` : `Explore ${world.name}`;
      return <button
        key={id}
        type="button"
        className={`${styles.planetControl} ${styles[`planetControl${id[0].toUpperCase()}${id.slice(1)}`]}`}
        data-active={String(activeWorld === id)}
        aria-label={name}
        aria-describedby={locked ? "world-lock-status" : undefined}
        onFocus={() => onActiveWorldChange(id)}
        onBlur={() => onActiveWorldChange(null)}
        onPointerEnter={() => onActiveWorldChange(id)}
        onPointerLeave={() => onActiveWorldChange(null)}
        onClick={() => onSelect(id)}
      >
        <span>{world.name}</span>
        <small>{locked ? "Coming soon" : id === "math" ? "Maths · enter" : "Discover and experiment"}</small>
      </button>;
    })}
  </div>
  <p id="world-lock-status" className={styles.status} role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
</section>
```

- [ ] **Step 5: Replace only landing-related CSS with the orbit composition**

Keep splash, Science staging, and route-status CSS intact. Delete the old `.worldGrid`, `.worldButton`, and opaque `.worldsView .selector` rules. Add the following structural behavior to `SubjectWorlds.module.css`:

```css
.worldsView {
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  color: #fff7e7;
  background:
    radial-gradient(circle at 50% -14%, #fff7e7 0 17%, #d8eff2 32%, transparent 48%),
    radial-gradient(circle at 18% 74%, #615093 0, transparent 36%),
    linear-gradient(155deg, #18355e 0%, #252d66 54%, #562d72 100%);
}
.constellationLayer { position: absolute; inset: 0; z-index: 0; pointer-events: auto; }
.constellation { position: absolute; inset: 0; min-height: 100%; pointer-events: auto; }
.constellation canvas { position: absolute !important; inset: 0; width: 100% !important; height: 100% !important; pointer-events: auto; touch-action: pan-y; }
.selector { position: relative; z-index: 1; min-height: 100svh; pointer-events: none; }
.orbitIntro, .planetControl { pointer-events: auto; }
```

Style controls as small cream signposts with dark-navy type, clear focus rings, and a restrained active lift. Use absolute desktop anchors matching the scene: Math lower-left, Science lower-right, English upper-left, Bahasa Melayu upper-right. Keep upper center clear for the concise header and lower centre clear for planet space. Do not add a top navigation, progress bar, token counter, profile card, or a large opaque cream panel.

For `max-width: 680px`, reserve the upper 58dvh for the Canvas, put Numeria/Science into a shallow two-control bottom dock, and put English/Bahasa Melayu in a compact second row. All buttons must remain at least 44px high, honour safe-area insets, and not overflow horizontally. Under `prefers-reduced-motion`, remove CSS transforms/transitions in addition to scene movement.

- [ ] **Step 6: Run subject-shell tests**

Run:

```powershell
npm run test --workspace=@wiggle/web -- components/worlds/SubjectWorlds.test.tsx components/worlds/WorldsConstellation.test.tsx
npm run typecheck --workspace=@wiggle/web
```

Expected: PASS. Verify existing direct Science-route tests and active-Maths-mission navigation protection stay intact; those are routing requirements, not merely styling behavior.

- [ ] **Step 7: Commit the HUD and integration**

```powershell
git add apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/worlds/WorldSelector.tsx apps/web/components/worlds/SubjectWorlds.module.css apps/web/components/worlds/SubjectWorlds.test.tsx
git commit -m "feat: replace world cards with orbit hud"
```

### Task 4: Lock down fallback, keyboard, focus, and route parity

**Files:**
- Modify: `apps/web/tests/accessibility/subject-worlds.test.tsx`
- Modify: `apps/web/components/worlds/WorldsConstellation.test.tsx`
- Test: `apps/web/tests/accessibility/subject-worlds.test.tsx`

**Interfaces:**
- Consumes: the final `WorldSelector` native-control names and `WorldsConstellation` data attributes.
- Verifies: the Canvas is supplementary visual interaction, never the only way to choose a world.

- [ ] **Step 1: Write failing accessibility regression tests**

Replace the first accessibility test with these assertions:

```tsx
it("keeps all subject-orbit actions available through native controls when WebGL falls back", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);
  enterWorlds();

  for (const name of ["Explore Numeria", "Explore Science Planet", "English (coming soon)", "Bahasa Melayu (coming soon)"]) {
    expect(screen.getByRole("button", { name })).toBeTruthy();
  }
  fireEvent.click(screen.getByRole("button", { name: "Explore Science Planet" }));
  fireEvent.click(screen.getByRole("button", { name: "Visit Magnet Lab" }));
  fireEvent.click(screen.getByRole("button", { name: "Start Magnet Lab" }));
  expect(screen.getByRole("region", { name: "Magnet Lab mission" })).toBeTruthy();
});
```

Extend the locked-world test so it asserts all of the following after each English/Bahasa Melayu click:

```tsx
expect(document.activeElement).toBe(locked);
expect(locked.getAttribute("aria-describedby")).toBe("world-lock-status");
expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
expect(window.location.search).toBe("");
expect(screen.getAllByRole("status").some(status => status.textContent?.includes(message))).toBe(true);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test --workspace=@wiggle/web -- tests/accessibility/subject-worlds.test.tsx
```

Expected: FAIL until the HUD uses the exact live-status association and four controls in fallback.

- [ ] **Step 3: Make focused fixes without altering mission or route logic**

Correct only selector attributes, CSS hit targets/focus styling, or active-world handlers required by the failing test. Do not workaround the test by making locked controls disabled: disabled buttons cannot retain focus or announce the coming-soon message. Do not put essential text solely in Canvas.

- [ ] **Step 4: Run focused accessibility and selector tests**

Run:

```powershell
npm run test --workspace=@wiggle/web -- tests/accessibility/subject-worlds.test.tsx components/worlds/SubjectWorlds.test.tsx components/worlds/WorldsConstellation.test.tsx
npm run lint --workspace=@wiggle/web
```

Expected: PASS.

- [ ] **Step 5: Commit the accessibility lock-in**

```powershell
git add apps/web/tests/accessibility/subject-worlds.test.tsx apps/web/components/worlds/WorldsConstellation.test.tsx apps/web/components/worlds/WorldSelector.tsx apps/web/components/worlds/SubjectWorlds.module.css
git commit -m "test: protect accessible subject orbit"
```

### Task 5: Verify the complete splash-to-planet journey in the browser and visually inspect it

**Files:**
- Modify: `apps/web/tests/browser/subject-worlds.spec.ts`
- Modify: `apps/web/tests/browser/helpers.ts` only if accessible labels intentionally changed; otherwise leave it unchanged.
- Test: `apps/web/tests/browser/subject-worlds.spec.ts`

**Interfaces:**
- Consumes: exact existing `launchWiggle`, `enterNumeria`, `enterScience`, and `keyboardActivate` helpers.
- Verifies: orbit composition loads after splash; Numeria remains the existing real playable world; visual quality does not disguise a broken fallback.

- [ ] **Step 1: Write failing browser regressions for the new landing screen**

At the start of the current native-control Science flow, assert the orbit exists before entering Science:

```ts
await page.goto("/");
await launchWiggle(page);
const orbit = page.locator("[data-quality][data-reduced-motion]").filter({ has: page.locator("canvas.worlds-constellation-canvas") });
await expect(orbit).toHaveAttribute("data-quality", /^(high|low)$/);
await expect(page.locator("canvas.worlds-constellation-canvas")).toBeVisible();
await expect(page.locator("canvas.worlds-constellation-canvas")).toHaveCSS("pointer-events", "auto");
for (const name of ["Explore Numeria", "Explore Science Planet", "English (coming soon)", "Bahasa Melayu (coming soon)"]) {
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
}
```

Add these browser tests:

1. **`forced WebGL fallback keeps the subject orbit and all destinations usable`**: override WebGL before `goto`, activate splash, assert constellation `data-quality="fallback"`, no constellation canvas, and all four DOM controls. Enter Science and retain the existing complete Magnet Lab fallback flow.
2. **`reduced motion keeps the subject orbit interactive`**: emulate reduced motion before load, assert orbit `data-reduced-motion="true"`, then enter Science and complete Magnet Lab as before.
3. **`orbit controls stay useful at desktop and mobile widths`**: on both Playwright projects assert Numeria/Science bounding boxes are at least 44px tall and in the viewport, assert no horizontal overflow, and capture a stable reduced-motion screenshot for human review.
4. **`keyboard navigation reaches splash, Numeria, and Science from the orbit`**: retain the existing Science keyboard journey and add a separate Numeria path that reaches `Explore Numeria` through normal tab focus before checking the existing `Start fractions mission` control.

Keep the existing active-Maths-mission safety test, direct Science child/zone test, and locked-world focus test unchanged except for the new orbit assertion after launch.

- [ ] **Step 2: Run the browser spec to verify it fails**

Run:

```powershell
npm run test:e2e --workspace=@wiggle/web -- tests/browser/subject-worlds.spec.ts
```

Expected: FAIL on the old flat-grid screen because the canvas is pointer-disabled/obscured and the new orbit-specific checks are absent.

- [ ] **Step 3: Make only evidence-backed browser-test adjustments**

If a selector in the test cannot reliably identify the wrapper, add a stable, semantic `data-testid="subject-orbit"` to the `WorldsConstellation` section and use it in the browser test. Do not add test IDs to individual decorative meshes or test hard-coded pixel click coordinates. The product behavior is verified through real controls plus visible Canvas/pointer policy.

- [ ] **Step 4: Run the full relevant test and quality suite**

Run:

```powershell
npm run test --workspace=@wiggle/web -- components/worlds/worldOrbit.test.ts components/worlds/WorldsConstellation.test.tsx components/worlds/SubjectWorlds.test.tsx tests/accessibility/subject-worlds.test.tsx
npm run test:e2e --workspace=@wiggle/web -- tests/browser/subject-worlds.spec.ts
npm run lint --workspace=@wiggle/web
npm run typecheck --workspace=@wiggle/web
```

Expected: PASS. If an existing Numeria/Science test fails, treat that as a regression in shell wiring and repair it without changing Numeria/Science domain code.

- [ ] **Step 5: Perform manual visual QA against the user’s stated outcome**

Start the web app and verify, at a desktop viewport and 390x844 viewport:

```powershell
npm run dev --workspace=@wiggle/web
```

Checklist:

- The existing splash is still first; “Let's Wiggle” transitions into the orbit.
- The first scene reads as two modeled, rounded floating worlds in a dreamy space environment—not a card grid or school dashboard.
- Numeria’s miniature shows real terrain/trees/landmarks and Science shows a real floating lab/observatory/magnet diorama; neither is a CSS or image substitute.
- Selecting either its 3D surface or matching DOM callout reaches the correct existing world.
- English and Bahasa Melayu read as small locked modeled moons, retain focus, and give a truthful status message.
- The mobile first view preserves a visible 3D scene and usable choice dock with no horizontal overflow.
- Reduced-motion and forced-WebGL-fallback modes remain legible, controllable, and free of old grid cards.

- [ ] **Step 6: Commit browser coverage and final implementation**

```powershell
git add apps/web/tests/browser/subject-worlds.spec.ts apps/web/tests/browser/helpers.ts apps/web/components/worlds
git commit -m "feat: ship 3d subject orbit landing"
```

Do not include unrelated files in this final commit. If `helpers.ts` was unchanged, omit it from `git add`.

## Plan Self-Review

- **Spec coverage:** Tasks 1–2 deliver real procedural R3F miniatures, Canvas interaction, quality tiers, and motion behavior. Task 3 replaces the flat selector while preserving splash and routes. Task 4 locks down keyboard/fallback/live-status behavior. Task 5 proves the full splash → orbit → existing Numeria/Science paths, visual composition, mobile behavior, and reduced-motion/fallback regression paths.
- **No placeholder scan:** This plan names concrete files, prop contracts, component names, labels, tests, command lines, visual elements, and source snippets; it contains no deferred implementation markers.
- **Type consistency:** `SubjectWorldId`, `activeWorld`, `onActiveWorldChange`, `onSelect`, `OrbitDecorationCounts`, `SUBJECT_ORBIT_LAYOUT`, and `worldDecorationCounts` use one consistent shape across every task.
