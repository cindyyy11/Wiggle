# Auto-Spinning Planet Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all subject planets rotate automatically, with a faster selected planet, press-to-pause interaction, and complete reduced-motion support.

**Architecture:** Keep the existing outer planet group responsible for carousel position and scale. Add a nested visual group whose Y rotation is advanced by `useFrame`, using a pure exported helper for deterministic speed, delta capping, pause, and reduced-motion tests; leave the lock marker outside that visual group so it remains upright.

**Tech Stack:** React 19, React Three Fiber, Three.js, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-09-18-auto-spinning-planet-carousel-design.md`

## Global Constraints

- Selected planet speed is `0.12` radians per second.
- Side planet speed is `0.075` radians per second.
- Frame delta is capped at `0.05` seconds.
- Pressing pauses rotation; pointer release or cancellation resumes it.
- `reducedMotion` disables automatic rotation completely.
- Carousel position, scale interpolation, click selection, swipe navigation, lock behavior, and authored planet tilt remain unchanged.
- The lock marker must remain outside the spinning group and stay upright.
- Do not add dependencies, React state updates inside `useFrame`, or per-frame object allocations.

---

## File Map

- Modify `apps/web/components/worlds/PlanetCarousel.tsx`: add the pure spin-step helper, visual-group ref, pointer pause ref, and frame update.
- Create `apps/web/components/worlds/PlanetCarousel.test.ts`: test speed, delta capping, pause, and reduced-motion behavior without WebGL.
- Inspect `apps/web/tests/browser/subject-worlds.spec.ts`: reuse existing selection, keyboard, reduced-motion, mobile, and locked-world coverage without changing selectors.

### Task 1: Implement deterministic planet spin

**Files:**
- Modify: `apps/web/components/worlds/PlanetCarousel.tsx`
- Create: `apps/web/components/worlds/PlanetCarousel.test.ts`

**Interfaces:**
- Consumes: existing `offset: number`, `reducedMotion: boolean`, frame `delta`, and R3F pointer events.
- Produces: `planetSpinStep(delta: number, offset: number, reducedMotion: boolean, pressed: boolean): number`, returning the radians to add during one frame.

- [ ] **Step 1: Write the failing helper tests**

Create `PlanetCarousel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { planetSpinStep } from "./PlanetCarousel";

describe("planetSpinStep", () => {
  it("turns the selected planet faster than side planets", () => {
    expect(planetSpinStep(1 / 60, 0, false, false)).toBeCloseTo(0.12 / 60);
    expect(planetSpinStep(1 / 60, 1, false, false)).toBeCloseTo(0.075 / 60);
  });

  it("caps long frame gaps", () => {
    expect(planetSpinStep(2, 0, false, false)).toBeCloseTo(0.05 * 0.12);
  });

  it("stops for a pressed planet or reduced motion", () => {
    expect(planetSpinStep(1 / 60, 0, false, true)).toBe(0);
    expect(planetSpinStep(1 / 60, 0, true, false)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run from `apps/web`:

```powershell
& 'C:\Users\User\AppData\Local\Author Software\nvm\installs\v24.21.0\node.exe' ..\..\node_modules\vitest\vitest.mjs run components/worlds/PlanetCarousel.test.ts --pool=threads --poolOptions.threads.singleThread=true
```

Expected: FAIL because `planetSpinStep` is not exported.

- [ ] **Step 3: Add the pure helper**

Add constants and the helper near `PLANET_ORDER`:

```ts
const SELECTED_SPIN_SPEED = 0.12;
const SIDE_SPIN_SPEED = 0.075;
const MAX_FRAME_DELTA = 0.05;

export function planetSpinStep(delta: number, offset: number, reducedMotion: boolean, pressed: boolean): number {
  if (reducedMotion || pressed) return 0;
  return Math.min(delta, MAX_FRAME_DELTA) * (offset === 0 ? SELECTED_SPIN_SPEED : SIDE_SPIN_SPEED);
}
```

- [ ] **Step 4: Add the isolated visual rotation group**

Inside `Planet`, add `visual` and `pressed` refs:

```ts
const visual = useRef<Group>(null);
const pressed = useRef(false);
```

Extend the existing frame callback without allocating objects:

```ts
if (visual.current) visual.current.rotation.y += planetSpinStep(delta, offset, reducedMotion, pressed.current);
```

Wrap only the authored tilted planet model in the spinning group. Keep the lock-marker group as a sibling:

```tsx
<group ref={visual}>
  <group rotation={[.2, -.45, -.12]}>
    <Numeria quality="low" dimmed={false} theme={world} preview onDestination={noop} />
    {world === "math" ? <group onClick={event => { event.stopPropagation(); if (event.delta <= 7) { if (offset === 0) onSelect(world); else onChoose(world); } }}>
      <Landmarks selected="fraction-forest" onSelect={() => { if (offset === 0) onSelect(world); else onChoose(world); }} reducedMotion={reducedMotion} mission={false} />
    </group> : null}
  </group>
</group>
{locked ? <group position={[0, 0, 3.9]}>
  <mesh><boxGeometry args={[1.05, .8, .2]} /><meshStandardMaterial color="#fff7e7" roughness={.8} /></mesh>
  <mesh position={[0, .48, 0]}><torusGeometry args={[.36, .1, 8, 24, Math.PI]} /><meshStandardMaterial color="#fff7e7" /></mesh>
  <mesh position={[0, 0, .12]}><sphereGeometry args={[.1, 10, 8]} /><meshBasicMaterial color="#27395b" /></mesh>
</group> : null}
```

- [ ] **Step 5: Add press-to-pause handlers**

On the existing outer interactive group, add:

```tsx
onPointerDown={() => { pressed.current = true; }}
onPointerUp={() => { pressed.current = false; }}
onPointerCancel={() => { pressed.current = false; }}
onPointerOut={() => { pressed.current = false; }}
```

Do not alter the existing click handler.

- [ ] **Step 6: Run focused and regression tests**

Run from `apps/web`:

```powershell
& 'C:\Users\User\AppData\Local\Author Software\nvm\installs\v24.21.0\node.exe' ..\..\node_modules\vitest\vitest.mjs run components/worlds/PlanetCarousel.test.ts components/worlds/WorldsConstellation.test.tsx components/worlds/SubjectWorlds.test.tsx --pool=threads --poolOptions.threads.singleThread=true
```

Expected: all files PASS.

- [ ] **Step 7: Run targeted lint and commit**

```powershell
& 'C:\Users\User\AppData\Local\Author Software\nvm\installs\v24.21.0\node.exe' ..\..\node_modules\eslint\bin\eslint.js components/worlds/PlanetCarousel.tsx components/worlds/PlanetCarousel.test.ts
git add apps/web/components/worlds/PlanetCarousel.tsx apps/web/components/worlds/PlanetCarousel.test.ts
git commit -m "feat: auto-spin subject planets"
```

### Task 2: Validate motion in the real homepage

**Files:**
- Inspect: `apps/web/components/worlds/PlanetCarousel.tsx`
- Inspect: `apps/web/tests/browser/subject-worlds.spec.ts`

**Interfaces:**
- Consumes: the completed visual-group spin and existing homepage controls.
- Produces: browser evidence that rotation is visible, navigation stays stable, press pauses, and reduced motion stops spin.

- [ ] **Step 1: Start the local homepage**

From `apps/web`, run:

```powershell
& 'C:\Users\User\AppData\Local\Author Software\nvm\installs\v24.21.0\node.exe' scripts/dev.mjs
```

- [ ] **Step 2: Validate normal motion**

At `/`, verify that the center planet rotates slowly and side planets rotate more slowly. Watch a fixed landmark for at least three seconds to distinguish rotation from camera float. Confirm the title, CTA, arrows, and subject rail remain stationary.

- [ ] **Step 3: Validate interaction and navigation**

Press and hold the center planet and verify its orientation stops changing, then release and verify rotation resumes. Use Next planet and confirm the carousel slides normally, the newly selected center planet rotates at the faster rate, and the lock marker remains upright.

- [ ] **Step 4: Validate reduced motion**

Emulate `prefers-reduced-motion: reduce`, reload `/`, and verify planet rotation is stopped while arrows, subject selection, and keyboard navigation remain functional.

- [ ] **Step 5: Run existing browser regression coverage**

Run the existing `subject-worlds.spec.ts` desktop and mobile orbit-control cases against the local server. Expected: existing orbit, keyboard, locked-world, and mobile-fit cases continue to pass.
