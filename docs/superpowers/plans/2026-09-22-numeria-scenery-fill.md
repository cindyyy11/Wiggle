# Numeria Scenery Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Numeria (math) planet feel evenly populated across its whole surface, like the Science planet, by adding a whole-globe filler layer of small, sparse decoration in the gaps between its four existing land clusters.

**Architecture:** Add a pure Fibonacci-sphere scatter-and-clearing-filter (`mathSceneryLayout`), modeled on Science's `sceneryLayout`, and a new `MathLivingScenery` component, modeled on Science's `LivingScenery`, that places one of four extracted prop pieces (tree, hill, berry, number-box) per surviving point plus a denser instanced ground-detail dot layer. The four existing per-land clusters (`Forest`, `TerrainObjects`, `NumberGarden`) and `ShapeSparkles` are untouched; `MathLivingScenery` is wired in as a fifth sibling in `Numeria`'s math branch.

**Tech Stack:** Next.js 15 / React 19, TypeScript, React Three Fiber + three, Vitest (jsdom). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-22-numeria-scenery-fill-design.md`

## Global Constraints

- Reuse existing prop shapes (hills, berries, number-boxes, a tree built to match Forest's existing look). No new art or new prop types.
- The four existing per-land clusters (`Forest`, `TerrainObjects`'s hills and berries, `NumberGarden`) and `ShapeSparkles` keep their current size, position and behaviour — unchanged.
- The clearing radius and hero/dot prop counts given in this plan are starting values. If the visual check in Task 4 shows a hero prop overlapping a region plateau or an existing cluster, or shows a still-bare band of terrain, adjust the named constant as directed in that task's step and re-run the check — do not silently accept an overlap.
- Commit messages use conventional prefixes and carry **no** `Co-Authored-By` or Claude trailers.
- All commands run from `apps/web` unless stated. Unit tests: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/universe/mathSceneryLayout.ts` | Pure. `mathSceneryLayout(count)`: a Fibonacci-sphere scatter over the whole unit sphere, tagged by nearest Numeria land, filtered to drop points within `CLEARING_RADIUS` of a land's center. |
| `apps/web/components/universe/mathRegionProps.tsx` | The four small prop pieces (`TreeProp`, `HillProp`, `BerryProp`, `NumberBoxProp`) shared between the existing per-land clusters and the new filler layer, plus `NUMERIA_REGION_COLORS`/`NUMERIA_REGION_COUNT` (moved here so both `Numeria.tsx` and `MathLivingScenery.tsx` can import them without a circular import between the two). |
| `apps/web/components/universe/MathLivingScenery.tsx` | The filler layer: one small hero prop per surviving `mathSceneryLayout` point, plus an instanced layer of tiny ground-detail dots. |
| `apps/web/components/universe/Numeria.tsx` | Modified: imports the prop pieces and region constants from `mathRegionProps.tsx` instead of defining them locally; renders `MathLivingScenery` in the math branch. |
| `design-qa.md` | Modified: records what was and was not verified. |

---

### Task 1: The whole-globe scatter-and-clearing layout

**Files:**
- Create: `apps/web/components/universe/mathSceneryLayout.ts`
- Test: `apps/web/components/universe/mathSceneryLayout.test.ts`

**Interfaces:**
- Consumes: `LANDMARKS`, `surfacePoint`, `destinationFromPoint`, `type Destination` from `./world`.
- Produces: `CLEARING_RADIUS = .45`; `type MathSceneryPoint = { index: number; destination: Destination; region: number; point: readonly [number, number, number] }`; `mathSceneryLayout(count: number): MathSceneryPoint[]`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/universe/mathSceneryLayout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LANDMARKS, surfacePoint } from "./world";
import { CLEARING_RADIUS, mathSceneryLayout } from "./mathSceneryLayout";

const centers = LANDMARKS.slice(0, 4).map(land => surfacePoint(land.destination, 1));

function distance(a: readonly number[], b: readonly number[]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe("mathSceneryLayout", () => {
  it("returns nothing for a degenerate count", () => {
    expect(mathSceneryLayout(0)).toEqual([]);
  });

  it("keeps every point outside the clearing radius of every land", () => {
    for (const item of mathSceneryLayout(200)) {
      for (const center of centers) expect(distance(center, item.point)).toBeGreaterThanOrEqual(CLEARING_RADIUS);
    }
  });

  it("tags each point with its nearest land", () => {
    for (const item of mathSceneryLayout(200)) {
      const distances = centers.map(center => distance(center, item.point));
      expect(item.region).toBe(distances.indexOf(Math.min(...distances)));
    }
  });

  it("drops some points to keep clearings clear, but keeps most of what was requested", () => {
    const requested = 300;
    const kept = mathSceneryLayout(requested).length;
    expect(kept).toBeLessThan(requested);
    expect(kept).toBeGreaterThan(requested * .3);
  });

  it("gives each point a destination consistent with its 3D point", () => {
    const [item] = mathSceneryLayout(1);
    const recomputed = surfacePoint(item.destination, 1);
    expect(recomputed[0]).toBeCloseTo(item.point[0], 5);
    expect(recomputed[1]).toBeCloseTo(item.point[1], 5);
    expect(recomputed[2]).toBeCloseTo(item.point[2], 5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/universe/mathSceneryLayout.test.ts`
Expected: FAIL, `Failed to resolve import "./mathSceneryLayout"`.

- [ ] **Step 3: Write `mathSceneryLayout.ts`**

Create `apps/web/components/universe/mathSceneryLayout.ts`:

```ts
import { LANDMARKS, destinationFromPoint, surfacePoint, type Destination } from "./world";

const MATH_LANDS = LANDMARKS.slice(0, 4);
const CENTERS = MATH_LANDS.map(land => surfacePoint(land.destination, 1));

/**
 * How close (3D chord distance on the unit sphere) a filler point may get to a land's center before it is dropped, so
 * the whole-globe filler layer stays clear of the four hand-placed clusters and the region plateaus. Science's
 * equivalent radius is .32; Numeria's clusters (especially Fraction Forest's) reach further out, so this starts
 * larger and is tuned visually in Task 4 if a hero prop is still seen overlapping a cluster or a plateau.
 */
export const CLEARING_RADIUS = .45;

export type MathSceneryPoint = { index: number; destination: Destination; region: number; point: readonly [number, number, number] };

function nearestRegion(point: readonly [number, number, number]): number {
  let best = 0; let score = -Infinity;
  CENTERS.forEach((center, region) => {
    const dot = center[0] * point[0] + center[1] * point[1] + center[2] * point[2];
    if (dot > score) { score = dot; best = region; }
  });
  return best;
}

/**
 * Scatters `count` points across the whole unit sphere (Fibonacci spiral), tags each with its nearest of the four
 * Numeria lands, and drops any point that falls inside `CLEARING_RADIUS` of a land's center.
 */
export function mathSceneryLayout(count: number): MathSceneryPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - 2 * (index + .5) / count;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * 2.39996323;
    const point: [number, number, number] = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    return { index, destination: destinationFromPoint(...point), region: nearestRegion(point), point };
  }).filter(item => !CENTERS.some(center => Math.hypot(center[0] - item.point[0], center[1] - item.point[1], center[2] - item.point[2]) < CLEARING_RADIUS));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/universe/mathSceneryLayout.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck, lint and commit**

Run: `npx tsc --noEmit` and `npx eslint components/universe` (expected: no output).

```bash
git add apps/web/components/universe/mathSceneryLayout.ts apps/web/components/universe/mathSceneryLayout.test.ts
git commit -m "feat: add the whole-globe scatter-and-clearing layout for Numeria's filler scenery"
```

---

### Task 2: Extract the shared math prop pieces

**Files:**
- Create: `apps/web/components/universe/mathRegionProps.tsx`
- Modify: `apps/web/components/universe/Numeria.tsx`

**Interfaces:**
- Produces: `NUMERIA_REGION_COLORS`, `NUMERIA_REGION_COUNT`, `HILL_COLORS` (moved, unchanged values); `TreeProp(props: { tint: number })` (new — matches Forest's tree in shape and color choices, for use by the filler layer only); `HillProp(props: { height: number; color: string })`; `BerryProp(props: { color: string; dimmed: boolean })`; `NumberBoxProp(props: { tier: number; rotation: number })`.
- Consumes: nothing new. This is a behaviour-preserving refactor: `Forest`, `TerrainObjects` and `NumberGarden` must render and behave exactly as before.

- [ ] **Step 1: Create `mathRegionProps.tsx`**

Create `apps/web/components/universe/mathRegionProps.tsx`:

```tsx
"use client";

/** One color per Numeria land, used for terrain shading, the region plateaus and the filler layer's ground-detail tint. */
export const NUMERIA_REGION_COLORS = ["#67c96f", "#f8c83f", "#55bde8", "#f17463"] as const;
export const NUMERIA_REGION_COUNT = 4;
export const HILL_COLORS = ["#cceaf2", "#a9d9ee", "#d9c9f0"];

/**
 * Fraction Forest's tree: a trunk and a round crown, in local up-facing coordinates. Forest's own dense cluster stays
 * instanced and unchanged; this is for the whole-globe filler layer, which places props individually.
 */
export function TreeProp({ tint }: { tint: number }) {
  const crownColor = tint % 3 === 0 ? "#b8dcae" : tint % 3 === 1 ? "#9dc99a" : "#cfe6bf";
  return <group>
    <mesh position={[0, .15, 0]}><cylinderGeometry args={[.035, .05, .3, 5]} /><meshStandardMaterial color="#5e8b67" roughness={1} /></mesh>
    <mesh position={[0, .35, 0]}><sphereGeometry args={[.26, 8, 6]} /><meshStandardMaterial color={crownColor} roughness={1} flatShading /></mesh>
  </group>;
}

/** Geometry Ridge's candy hill: two stacked, rounded domes. No sharp peaks. */
export function HillProp({ height, color }: { height: number; color: string }) {
  return <group>
    <mesh position={[0, height * .32, 0]} scale={[1, .82, 1]}><sphereGeometry args={[height * .55, 10, 8]} /><meshStandardMaterial color={color} roughness={1} flatShading /></mesh>
    <mesh position={[0, height * .58, 0]} scale={[.5, .42, .5]}><sphereGeometry args={[height * .55, 8, 6]} /><meshStandardMaterial color="#fff7e7" flatShading /></mesh>
  </group>;
}

/** Crystal Crater's gem berry: plump and glossy instead of pointy. */
export function BerryProp({ color, dimmed }: { color: string; dimmed: boolean }) {
  return <group>
    <mesh position={[0, .13, 0]}><sphereGeometry args={[.15, 10, 8]} /><meshStandardMaterial color={color} emissive="#ef8b78" emissiveIntensity={dimmed ? .02 : .1} roughness={.5} flatShading /></mesh>
    <mesh position={[-.04, .18, .09]}><sphereGeometry args={[.04, 6, 6]} /><meshStandardMaterial color="#fff7e7" transparent opacity={.8} /></mesh>
  </group>;
}

/** Number Valley's garden box: a numbered block, taller and warmer-colored for higher tiers. */
export function NumberBoxProp({ tier, rotation }: { tier: number; rotation: number }) {
  return <mesh position={[0, .035 * (1 + tier), 0]} rotation={[0, rotation, 0]}>
    <boxGeometry args={[.2, .12 * (1 + tier), .2]} />
    <meshStandardMaterial color={tier % 3 === 0 ? "#f4c95d" : "#e8ad67"} flatShading roughness={1} />
  </mesh>;
}
```

- [ ] **Step 2: Point `Numeria.tsx` at the shared module**

In `apps/web/components/universe/Numeria.tsx`:

1. Add to the imports near the top of the file: `import { BerryProp, HILL_COLORS, HillProp, NUMERIA_REGION_COLORS, NUMERIA_REGION_COUNT, NumberBoxProp } from "./mathRegionProps";`
2. Replace:

```ts
export const NUMERIA_REGION_COLORS = ["#67c96f", "#f8c83f", "#55bde8", "#f17463"] as const;
export const NUMERIA_REGION_COUNT = 4;
```

with:

```ts
export { NUMERIA_REGION_COLORS, NUMERIA_REGION_COUNT };
```

3. Delete the now-duplicate local declaration `const HILL_COLORS = ["#cceaf2", "#a9d9ee", "#d9c9f0"];` just above `TerrainObjects` (it is now imported).

- [ ] **Step 3: Use the extracted props in `TerrainObjects` and `NumberGarden`**

In `apps/web/components/universe/Numeria.tsx`, replace:

```tsx
  return <group>
    {/* Soft, rounded candy hills — no sharp peaks. */}
    {hills.map((hill, index) => <group key={index} position={hill.position} quaternion={hill.quaternion}>
      <mesh position={[0, hill.height * .32, 0]} scale={[1, .82, 1]}><sphereGeometry args={[hill.height * .55, 10, 8]} /><meshStandardMaterial color={HILL_COLORS[index % HILL_COLORS.length]} roughness={1} flatShading /></mesh>
      <mesh position={[0, hill.height * .58, 0]} scale={[.5, .42, .5]}><sphereGeometry args={[hill.height * .55, 8, 6]} /><meshStandardMaterial color="#fff7e7" flatShading /></mesh>
    </group>)}
    {/* Round gem berries — plump and glossy instead of pointy crystals. */}
    {berries.map((berry, index) => <group key={index} position={berry.position} quaternion={berry.quaternion} scale={berry.scale}>
      <mesh position={[0, .13, 0]}><sphereGeometry args={[.15, 10, 8]} /><meshStandardMaterial color={index % 3 === 0 ? "#ef8b78" : "#f4c95d"} emissive="#ef8b78" emissiveIntensity={dimmed ? .02 : .1} roughness={.5} flatShading /></mesh>
      <mesh position={[-.04, .18, .09]}><sphereGeometry args={[.04, 6, 6]} /><meshStandardMaterial color="#fff7e7" transparent opacity={.8} /></mesh>
    </group>)}
    <NumberGarden />
  </group>;
```

with:

```tsx
  return <group>
    {/* Soft, rounded candy hills — no sharp peaks. */}
    {hills.map((hill, index) => <group key={index} position={hill.position} quaternion={hill.quaternion}>
      <HillProp height={hill.height} color={HILL_COLORS[index % HILL_COLORS.length]} />
    </group>)}
    {/* Round gem berries — plump and glossy instead of pointy crystals. */}
    {berries.map((berry, index) => <group key={index} position={berry.position} quaternion={berry.quaternion} scale={berry.scale}>
      <BerryProp color={index % 3 === 0 ? "#ef8b78" : "#f4c95d"} dimmed={dimmed} />
    </group>)}
    <NumberGarden />
  </group>;
```

Then replace:

```tsx
function NumberGarden() {
  return <group>{Array.from({ length: 24 }, (_, index) => {
    const angle = index * 2.4; const distance = .16 + Math.sqrt(index / 24) * .32;
    const normal = new Vector3(...surfacePoint({ latitude: -.16 + Math.sin(angle) * distance, longitude: .43 + Math.cos(angle) * distance }, 1));
    return <group key={index} position={normal.clone().multiplyScalar(RADIUS + .07)} quaternion={new Quaternion().setFromUnitVectors(UP, normal)}><mesh position={[0, .035 * (1 + index % 3), 0]} rotation={[0, angle, 0]}><boxGeometry args={[.2, .12 * (1 + index % 3), .2]} /><meshStandardMaterial color={index % 3 === 0 ? "#f4c95d" : "#e8ad67"} flatShading roughness={1} /></mesh></group>;
  })}</group>;
}
```

with:

```tsx
function NumberGarden() {
  return <group>{Array.from({ length: 24 }, (_, index) => {
    const angle = index * 2.4; const distance = .16 + Math.sqrt(index / 24) * .32;
    const normal = new Vector3(...surfacePoint({ latitude: -.16 + Math.sin(angle) * distance, longitude: .43 + Math.cos(angle) * distance }, 1));
    return <group key={index} position={normal.clone().multiplyScalar(RADIUS + .07)} quaternion={new Quaternion().setFromUnitVectors(UP, normal)}><NumberBoxProp tier={index % 3} rotation={angle} /></group>;
  })}</group>;
}
```

- [ ] **Step 4: Run the existing Numeria tests to confirm behaviour is unchanged**

Run: `npx vitest run components/universe/Numeria.test.tsx`
Expected: PASS (all 4 existing tests — this refactor changes no rendered output).

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit` and `npx eslint components/universe` (expected: no output).

- [ ] **Step 6: Visual check (controller)**

The controller rebuilds, opens Numeria (`/?world=math`) at 1440 x 900, and confirms Geometry Ridge's hills, Crystal Crater's berries and Number Valley's number-boxes look pixel-identical to before the refactor (same shapes, colors and positions, no page errors). The implementer does not run this step.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/universe/mathRegionProps.tsx apps/web/components/universe/Numeria.tsx
git commit -m "refactor: extract Numeria's hill, berry and number-box props so the filler layer can reuse them"
```

---

### Task 3: The filler layer component

**Files:**
- Create: `apps/web/components/universe/MathLivingScenery.tsx`

**Interfaces:**
- Consumes: `mathSceneryLayout`, `type MathSceneryPoint` (Task 1); `TreeProp`, `HillProp`, `BerryProp`, `NumberBoxProp`, `NUMERIA_REGION_COLORS` (Task 2); `RADIUS`, `surfacePoint`, `type Destination` from `./world`.
- Produces: `MathLivingScenery(props: { quality: "high" | "low"; dimmed: boolean })`.

There is no dedicated unit test for this component: like Science's `LivingScenery` (which also has none), its correctness is what it looks like once placed on the globe, which is checked visually in Task 4 after it is wired in. `mathSceneryLayout`, the part that can be wrong in a way a test can catch, already has one from Task 1.

- [ ] **Step 1: Write `MathLivingScenery.tsx`**

Create `apps/web/components/universe/MathLivingScenery.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Color, InstancedMesh, Object3D, Quaternion, Vector3 } from "three";
import { RADIUS, surfacePoint, type Destination } from "./world";
import { mathSceneryLayout } from "./mathSceneryLayout";
import { BerryProp, HillProp, NUMERIA_REGION_COLORS, NumberBoxProp, TreeProp } from "./mathRegionProps";

const UP = new Vector3(0, 1, 0);
/** Roughly a third of Science's own hero/dot counts, scaled down to Numeria's current, lighter footprint. */
const HERO_COUNTS = { high: 140, low: 70 } as const;
const DOT_COUNTS = { high: 380, low: 160 } as const;

function FillGroup({ destination, children }: { destination: Destination; children: ReactNode }) {
  const normal = new Vector3(...surfacePoint(destination, 1));
  return <group position={normal.clone().multiplyScalar(RADIUS + .03)} quaternion={new Quaternion().setFromUnitVectors(UP, normal)}>{children}</group>;
}

/** One small prop per surviving whole-globe point, chosen by the point's nearest land so an area still hints at whose territory it's in, far from the land itself. */
function HeroProp({ region, index, dimmed }: { region: number; index: number; dimmed: boolean }) {
  switch (region) {
    case 0: return <TreeProp tint={index} />;
    case 1: return <NumberBoxProp tier={index % 3} rotation={index} />;
    case 2: return <HillProp height={.35 + (index % 5) * .07} color={["#cceaf2", "#a9d9ee", "#d9c9f0"][index % 3]} />;
    default: return <BerryProp color={index % 3 === 0 ? "#ef8b78" : "#f4c95d"} dimmed={dimmed} />;
  }
}

/**
 * Fills the gaps between Numeria's four hand-placed clusters with small, sparse versions of their own props, plus a
 * light instanced dust of ground detail, so the whole globe reads as populated the way the Science planet's does.
 */
export function MathLivingScenery({ quality, dimmed }: { quality: "high" | "low"; dimmed: boolean }) {
  const heroes = useMemo(() => mathSceneryLayout(HERO_COUNTS[quality]), [quality]);
  const dots = useMemo(() => mathSceneryLayout(DOT_COUNTS[quality]), [quality]);
  const details = useRef<InstancedMesh>(null);

  useEffect(() => {
    if (!details.current) return;
    const object = new Object3D(); const normal = new Vector3(); const color = new Color();
    dots.forEach((item, index) => {
      normal.set(...item.point);
      object.position.copy(normal).multiplyScalar(RADIUS + .01);
      object.quaternion.setFromUnitVectors(UP, normal);
      const size = .05 + (item.index % 4) * .015;
      object.scale.set(size, size * .6, size);
      object.updateMatrix();
      details.current!.setMatrixAt(index, object.matrix);
      details.current!.setColorAt(index, color.set(NUMERIA_REGION_COLORS[item.region]));
    });
    details.current.instanceMatrix.needsUpdate = true;
    if (details.current.instanceColor) details.current.instanceColor.needsUpdate = true;
  }, [dots]);

  return <group>
    <instancedMesh ref={details} args={[undefined, undefined, dots.length]} raycast={() => {}}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} transparent opacity={dimmed ? .35 : .85} />
    </instancedMesh>
    {heroes.map(item => <FillGroup key={item.index} destination={item.destination}>
      <group scale={.55 + (item.index % 4) * .1} rotation={[0, item.index * 1.7, 0]}>
        <HeroProp region={item.region} index={item.index} dimmed={dimmed} />
      </group>
    </FillGroup>)}
  </group>;
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit` and `npx eslint components/universe` (expected: no output — this file is not yet imported anywhere, so nothing renders it until Task 4).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/universe/MathLivingScenery.tsx
git commit -m "feat: add the Numeria whole-globe filler scenery layer"
```

---

### Task 4: Wire it in and verify

**Files:**
- Modify: `apps/web/components/universe/Numeria.tsx`

**Interfaces:**
- Consumes: `MathLivingScenery` (Task 3).

- [ ] **Step 1: Render it in the math branch**

In `apps/web/components/universe/Numeria.tsx`, add to the imports: `import { MathLivingScenery } from "./MathLivingScenery";`

Then replace:

```tsx
    {theme === "math" ? <MathRegionPlateaus dimmed={dimmed} /> : null}
    {theme === "science" ? <ScienceLandScenery quality={quality} />
      : theme === "english" ? <EnglishLandScenery quality={quality} />
      : theme === "bm" ? <BmLandScenery quality={quality} />
      : <><Forest count={quality === "high" ? 104 : 58} /><TerrainObjects dimmed={dimmed} /><ShapeSparkles quality={quality} /></>}
```

with:

```tsx
    {theme === "math" ? <MathRegionPlateaus dimmed={dimmed} /> : null}
    {theme === "science" ? <ScienceLandScenery quality={quality} />
      : theme === "english" ? <EnglishLandScenery quality={quality} />
      : theme === "bm" ? <BmLandScenery quality={quality} />
      : <><Forest count={quality === "high" ? 104 : 58} /><TerrainObjects dimmed={dimmed} /><ShapeSparkles quality={quality} /><MathLivingScenery quality={quality} dimmed={dimmed} /></>}
```

- [ ] **Step 2: Run the existing Numeria tests**

Run: `npx vitest run components/universe/Numeria.test.tsx`
Expected: PASS (all 4 tests — none of them inspect scenery children beyond `ScienceLandScenery`'s presence under the `science` theme, so this addition does not affect them).

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit` and `npx eslint components/universe` (expected: no output).

- [ ] **Step 4: Visual check (controller)**

The controller rebuilds, opens Numeria (`/?world=math`) at 1440 x 900 and 390 x 844, rotates or zooms out to see the whole globe, and confirms:
- No wide bare band of plain terrain remains between the four lands.
- No hero prop (tree, hill, berry or number-box) visibly overlaps a region plateau or one of the four existing clusters.
- The four lands still read as visually distinct from a distance (their clusters and plateaus are not buried under filler props).
- No page errors, and frame rate is not visibly worse than before on a quick pan.

If a hero prop overlaps a plateau or a cluster, increase `CLEARING_RADIUS` in `apps/web/components/universe/mathSceneryLayout.ts` from `.45` to `.55`, re-run `npx vitest run components/universe/mathSceneryLayout.test.ts` (expected: still PASS, since the test measures against the live constant), and re-check. If a bare band still remains after that, increase `HERO_COUNTS` and `DOT_COUNTS` in `apps/web/components/universe/MathLivingScenery.tsx` by about 30% at both qualities and re-check. The implementer does not run this step.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/universe/Numeria.tsx
git commit -m "feat: fill Numeria's whole globe with sparse scenery, not just its four lands"
```

If Step 4 required adjusting `CLEARING_RADIUS`, `HERO_COUNTS` or `DOT_COUNTS`, include those files in this commit too.

---

### Task 5: Record what was verified

**Files:**
- Modify: `design-qa.md`

- [ ] **Step 1: Add the entry**

Add this section to `design-qa.md`, directly above the heading `## Camera-first Numeria regions — 22 September 2026`, filling in the test count from Task 1 and 2's runs and the outcome of Task 4's visual check:

```markdown
## Numeria whole-globe scenery fill — <date>

result: automated checks pass; visual check is <confirmed at 1440 x 900 and 390 x 844 | not yet checked>.

The Numeria (math) planet now has a whole-globe filler layer (`MathLivingScenery`) of small, sparse versions of its own props — trees, hills, berries and number-boxes, chosen by each filler point's nearest land — plus a light instanced dust of ground-detail dots, so the terrain between Fraction Forest, Number Valley, Geometry Ridge and Crystal Crater no longer reads as bare. The four existing per-land clusters, the region plateaus and `ShapeSparkles` are unchanged; the filler layer's points are scattered with the same Fibonacci-sphere method Science's `LivingScenery` uses, and dropped within `CLEARING_RADIUS` of a land's center to stay clear of the existing clusters and plateaus.

Checked: <N> web unit files / <M> tests pass, including `mathSceneryLayout`'s clearing-radius and region-tagging invariants and the unchanged `Numeria` test suite after the prop extraction and the new layer were wired in. Visual: the globe was inspected at 1440 x 900 and 390 x 844 for bare bands, prop overlap with plateaus or existing clusters, and that the four lands still read as visually distinct.

Not verifiable automatically: how "full" the globe looks is a judgment call, not a test; the counts and clearing radius in this change were tuned to that judgment during Task 4, not derived from a formula.
```

- [ ] **Step 2: Commit**

```bash
git add design-qa.md
git commit -m "docs: record the Numeria scenery fill verification"
```

Do not push unless the owner asks.

---

## Self-review

- **Spec coverage:** the pure scatter-and-clearing layout, modeled on `scienceSceneryLayout.ts` (Task 1); reuse of existing prop shapes via extraction, with the four existing clusters left unchanged (Task 2); the hero-prop-plus-ground-detail-dots two-tier structure modeled on `LivingScenery` (Task 3); wiring into `Numeria.tsx`'s math branch and the visual acceptance check, including the named tuning knobs (Task 4); the design-qa record (Task 5). Out-of-scope items (the four existing clusters' own size/position, `ShapeSparkles`, the science/english/bm themes, `MathRegionPlateaus`, gameplay, `MATH_ACTIVITIES`) are untouched by every task.
- **Type consistency:** `MathSceneryPoint` (Task 1) is consumed by `MathLivingScenery` (Task 3) with the same field names (`index`, `destination`, `region`, `point`). `TreeProp`, `HillProp`, `BerryProp`, `NumberBoxProp` (Task 2) are used with the same prop names and types by both `Numeria.tsx`'s existing clusters and `MathLivingScenery`'s `HeroProp` (Task 3). `NUMERIA_REGION_COLORS`/`NUMERIA_REGION_COUNT` keep the exact values and export name `Numeria.test.tsx` already imports from `"./Numeria"`, via the re-export added in Task 2.
- **Placeholders:** none in code steps; every step contains real code. The `<date>`, `<N>`, `<M>` and the confirmed/not-yet-checked markers in the `design-qa.md` template (Task 5) are filled in from real results at that step, as the step itself says.
