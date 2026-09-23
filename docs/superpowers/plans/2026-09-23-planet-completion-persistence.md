# Planet Completion Persistence + Constellation Stars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Science/Numeria land completions on this device, unlock `science-explorer` / `numeria-explorer` constellation stars when all four are done, and show the all-four cheer at most once per planet per browser session.

**Architecture:** `localStorage` memory hydrates and saves planet completion sets. `sessionStorage` tracks whether each planet has already cheered this tab. Contracts extend `getConstellationStars(twin, planetProgress?)` with two planet stars driven by completion counts. Twin screen and constellation UI pass local counts; canvases save on each new complete and queue cheer via the session gate.

**Tech Stack:** Next.js 15 / React 19, TypeScript, Vitest (jsdom for web; node for contracts). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-23-planet-completion-persistence-design.md`

## Global Constraints

- Completions: `localStorage` only. Cheer flags: `sessionStorage` only. No Twin API writes.
- One star per planet when count reaches 4 (`science-explorer`, `numeria-explorer`). No per-land stars.
- Cheer at most once per planet per browser tab session; show after any open session closes (same pending-cheer timing as Phase 2). Also queue on hydrate when already ≥ 4 and not yet cheered this session.
- Twin-signal stars still derive only from Twin numbers — never bump Twin fields to fake unlocks.
- Exact constellation copy from the spec. Cheer copy stays Phase 2 wording.
- Commit messages use conventional prefixes and carry **no** `Co-Authored-By` or Claude trailers.
- Web Vitest from `apps/web`: `npx vitest run <file>`. Contracts from `packages/contracts`: `npx vitest run src/constellation.test.ts`. Typecheck web: `npx tsc --noEmit` in `apps/web`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/planet/planetCompletionMemory.ts` | Load/save Science zones + Numeria regions per child. |
| `apps/web/components/planet/planetCompletionMemory.test.ts` | Memory round-trip, corrupt, child scope. |
| `apps/web/components/planet/planetCheerSession.ts` | Session cheer has/mark for `science` \| `numeria`. |
| `apps/web/components/planet/planetCheerSession.test.ts` | Session flag isolation. |
| `apps/web/components/planet/planetCheerGate.ts` | Keep cross-to-4 helper; add hydrate helper. |
| `apps/web/components/planet/planetCheerGate.test.ts` | Hydrate + cross tests. |
| `packages/contracts/src/constellation.ts` | New star ids + `PlanetStarProgress` + optional arg. |
| `packages/contracts/src/constellation.test.ts` | Planet star unlock/progress tests. |
| `apps/web/components/wiggle/starDestination.ts` | Destinations for new star ids. |
| `apps/web/components/wiggle/starDestination.test.ts` | (create or extend) destination coverage. |
| `apps/web/components/wiggle/nextConstellationSuggestion.ts` | Pass `planetProgress` through. |
| `apps/web/components/wiggle/nextStep.ts` | Load planet progress when suggesting. |
| `apps/web/components/wiggle/WiggleConstellation.tsx` | Accept optional `planetProgress`. |
| `apps/web/components/wiggle/MyWiggleTwinScreen.tsx` | Pass local planet progress into constellation / fresh stars. |
| `apps/web/components/science/SciencePlanetCanvas.tsx` | Hydrate/save/session cheer; optional `childId`. |
| `apps/web/components/science/SciencePlanet.tsx` | Pass `childId`. |
| `apps/web/components/worlds/SubjectWorlds.tsx` | Pass child id into SciencePlanet. |
| `apps/web/components/math/MathPlanetCanvas.tsx` | Hydrate/save/session cheer. |
| `apps/web/components/science/SciencePlanetCanvas.completion.test.tsx` | Persist + hydrate + session cheer cases. |
| `apps/web/components/math/MathPlanetCanvas.test.tsx` | Persist + session cheer (extend). |
| `design-qa.md` | Verification record. |

---

### Task 1: `planetCompletionMemory`

**Files:**
- Create: `apps/web/components/planet/planetCompletionMemory.ts`
- Test: `apps/web/components/planet/planetCompletionMemory.test.ts`

**Interfaces:**
- Produces:
  - `loadCompletedScienceZones(childId: string): ReadonlySet<ScienceZoneId>`
  - `saveCompletedScienceZones(childId: string, zones: ReadonlySet<ScienceZoneId>): void`
  - `loadCompletedNumeriaRegions(childId: string): ReadonlySet<MathRegionId>`
  - `saveCompletedNumeriaRegions(childId: string, regions: ReadonlySet<MathRegionId>): void`
  - `planetStarProgressFor(childId: string): PlanetStarProgress` (counts = set sizes, clamped conceptually by valid ids only)
- Keys: `wiggle:planet-complete:${childId}:science` and `wiggle:planet-complete:${childId}:numeria`
- Values: JSON string arrays of ids. Filter to known completable ids only:
  - Science: `magnet-lab`, `animals`, `colors`, `life-cycle` (same as `SCIENCE_ZONES`)
  - Numeria: `fraction-forest`, `number-valley`, `geometry-ridge`, `crystal-crater`
- Corrupt / missing / non-array → empty set. Never throw.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import {
  loadCompletedScienceZones,
  saveCompletedScienceZones,
  loadCompletedNumeriaRegions,
  saveCompletedNumeriaRegions,
  planetStarProgressFor,
} from "./planetCompletionMemory";

beforeEach(() => {
  window.localStorage.clear();
});

it("round-trips science zones per child", () => {
  saveCompletedScienceZones("child-1", new Set(["magnet-lab", "animals"]));
  expect([...loadCompletedScienceZones("child-1")].sort()).toEqual(["animals", "magnet-lab"]);
  expect(loadCompletedScienceZones("child-2").size).toBe(0);
});

it("round-trips numeria regions and builds planet progress counts", () => {
  saveCompletedNumeriaRegions("child-1", new Set(["fraction-forest", "number-valley", "geometry-ridge", "crystal-crater"]));
  expect(loadCompletedNumeriaRegions("child-1").size).toBe(4);
  expect(planetStarProgressFor("child-1")).toEqual({ scienceCompleted: 0, numeriaCompleted: 4 });
});

it("treats corrupt storage as empty", () => {
  window.localStorage.setItem("wiggle:planet-complete:child-1:science", "{not json");
  expect(loadCompletedScienceZones("child-1").size).toBe(0);
  window.localStorage.setItem("wiggle:planet-complete:child-1:science", JSON.stringify(["nope", "animals"]));
  expect([...loadCompletedScienceZones("child-1")]).toEqual(["animals"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/web`): `npx vitest run components/planet/planetCompletionMemory.test.ts`  
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement**

```ts
import type { PlanetStarProgress } from "@wiggle/contracts";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import type { MathRegionId } from "../math/mathActivities";

const SCIENCE_IDS = ["magnet-lab", "animals", "colors", "life-cycle"] as const satisfies readonly ScienceZoneId[];
const NUMERIA_IDS = ["fraction-forest", "number-valley", "geometry-ridge", "crystal-crater"] as const satisfies readonly MathRegionId[];

function key(childId: string, planet: "science" | "numeria"): string {
  return `wiggle:planet-complete:${childId}:${planet}`;
}

function loadSet<T extends string>(childId: string, planet: "science" | "numeria", allowed: readonly T[]): ReadonlySet<T> {
  try {
    const raw = window.localStorage.getItem(key(childId, planet));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is T => typeof id === "string" && (allowed as readonly string[]).includes(id)));
  } catch {
    return new Set();
  }
}

function saveSet(childId: string, planet: "science" | "numeria", ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(key(childId, planet), JSON.stringify([...ids]));
  } catch { /* best-effort */ }
}

export function loadCompletedScienceZones(childId: string): ReadonlySet<ScienceZoneId> {
  return loadSet(childId, "science", SCIENCE_IDS);
}
export function saveCompletedScienceZones(childId: string, zones: ReadonlySet<ScienceZoneId>): void {
  saveSet(childId, "science", zones);
}
export function loadCompletedNumeriaRegions(childId: string): ReadonlySet<MathRegionId> {
  return loadSet(childId, "numeria", NUMERIA_IDS);
}
export function saveCompletedNumeriaRegions(childId: string, regions: ReadonlySet<MathRegionId>): void {
  saveSet(childId, "numeria", regions);
}
export function planetStarProgressFor(childId: string): PlanetStarProgress {
  return {
    scienceCompleted: loadCompletedScienceZones(childId).size,
    numeriaCompleted: loadCompletedNumeriaRegions(childId).size,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run components/planet/planetCompletionMemory.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/planet/planetCompletionMemory.ts apps/web/components/planet/planetCompletionMemory.test.ts
git commit -m "feat: add local planet completion memory"
```

---

### Task 2: Session cheer memory + hydrate gate

**Files:**
- Create: `apps/web/components/planet/planetCheerSession.ts`
- Test: `apps/web/components/planet/planetCheerSession.test.ts`
- Modify: `apps/web/components/planet/planetCheerGate.ts`
- Modify: `apps/web/components/planet/planetCheerGate.test.ts`

**Interfaces:**
- Produces:
  - `export type CheerPlanet = "science" | "numeria"`
  - `hasCheeredPlanet(planet: CheerPlanet): boolean`
  - `markCheeredPlanet(planet: CheerPlanet): void`
  - `shouldQueueCheerOnHydrate(count: number, cheerShown: boolean): boolean` → `!cheerShown && count >= 4`
- Session keys: `wiggle:planet-cheer:${planet}` value `"1"`
- Keep existing `shouldQueueCheer(previousCount, nextCount, cheerShown)`.

- [ ] **Step 1: Write failing tests**

`planetCheerSession.test.ts`:

```ts
// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { hasCheeredPlanet, markCheeredPlanet } from "./planetCheerSession";

beforeEach(() => { window.sessionStorage.clear(); });

it("tracks cheer per planet for this session", () => {
  expect(hasCheeredPlanet("science")).toBe(false);
  markCheeredPlanet("science");
  expect(hasCheeredPlanet("science")).toBe(true);
  expect(hasCheeredPlanet("numeria")).toBe(false);
});
```

Extend `planetCheerGate.test.ts`:

```ts
import { shouldQueueCheer, shouldQueueCheerOnHydrate } from "./planetCheerGate";

it("queues on hydrate when already complete and not cheered", () => {
  expect(shouldQueueCheerOnHydrate(4, false)).toBe(true);
  expect(shouldQueueCheerOnHydrate(4, true)).toBe(false);
  expect(shouldQueueCheerOnHydrate(3, false)).toBe(false);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run components/planet/planetCheerSession.test.ts components/planet/planetCheerGate.test.ts`

- [ ] **Step 3: Implement**

`planetCheerSession.ts`:

```ts
export type CheerPlanet = "science" | "numeria";

function key(planet: CheerPlanet): string {
  return `wiggle:planet-cheer:${planet}`;
}

export function hasCheeredPlanet(planet: CheerPlanet): boolean {
  try {
    return window.sessionStorage.getItem(key(planet)) === "1";
  } catch {
    return false;
  }
}

export function markCheeredPlanet(planet: CheerPlanet): void {
  try {
    window.sessionStorage.setItem(key(planet), "1");
  } catch { /* best-effort */ }
}
```

Update `planetCheerGate.ts`:

```ts
/** Queue when crossing four and cheer has not shown this session. */
export function shouldQueueCheer(previousCount: number, nextCount: number, cheerShown: boolean): boolean {
  return !cheerShown && previousCount < 4 && nextCount >= 4;
}

/** Queue when hydrating an already-complete planet that has not cheered this session. */
export function shouldQueueCheerOnHydrate(count: number, cheerShown: boolean): boolean {
  return !cheerShown && count >= 4;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/planet/planetCheerSession.ts apps/web/components/planet/planetCheerSession.test.ts apps/web/components/planet/planetCheerGate.ts apps/web/components/planet/planetCheerGate.test.ts
git commit -m "feat: add session-scoped planet cheer flags"
```

---

### Task 3: Constellation contracts — planet stars

**Files:**
- Modify: `packages/contracts/src/constellation.ts`
- Modify: `packages/contracts/src/constellation.test.ts`

**Interfaces:**
- Produces:
  - `constellationStarIds` includes `"science-explorer"` and `"numeria-explorer"`
  - `export type PlanetStarProgress = { scienceCompleted: number; numeriaCompleted: number }`
  - `getConstellationStars(twin: LearnerTwin, planetProgress?: PlanetStarProgress | null): ConstellationStar[]`
  - `newlyUnlockedStars(twin, previouslyUnlocked, planetProgress?: PlanetStarProgress | null): ConstellationStar[]`
- Planet stars: unlock when count ≥ 4; progress = `clamp(count / 4, 0, 1)`. Missing `planetProgress` → counts treated as 0.
- Titles/descriptions exactly:
  - Science Explorer — `You explored all four Science lands.`
  - Numeria Explorer — `You explored all four Numeria regions.`

- [ ] **Step 1: Write failing tests** (append to `constellation.test.ts`)

```ts
import type { PlanetStarProgress } from "./constellation.js";

it("keeps planet stars locked without planet progress", () => {
  const science = getConstellationStars(base).find(s => s.id === "science-explorer")!;
  expect(science.unlocked).toBe(false);
  expect(science.progress).toBe(0);
});

it("unlocks Science Explorer at four science lands and reports progress", () => {
  const progress: PlanetStarProgress = { scienceCompleted: 2, numeriaCompleted: 0 };
  const partial = getConstellationStars(base, progress).find(s => s.id === "science-explorer")!;
  expect(partial.unlocked).toBe(false);
  expect(partial.progress).toBeCloseTo(0.5);

  const full = getConstellationStars(base, { scienceCompleted: 4, numeriaCompleted: 0 }).find(s => s.id === "science-explorer")!;
  expect(full.unlocked).toBe(true);
  expect(full.progress).toBe(1);
});

it("does not unlock Twin stars from planet progress alone", () => {
  const stars = getConstellationStars(base, { scienceCompleted: 4, numeriaCompleted: 4 });
  expect(stars.find(s => s.id === "visual-explorer")!.unlocked).toBe(false);
  expect(stars.find(s => s.id === "numeria-explorer")!.unlocked).toBe(true);
});
```

Also update the “returns every catalogued star” expectation — ids list grows by two (already uses `constellationStarIds`).

- [ ] **Step 2: Run — expect FAIL**

Run (from `packages/contracts`): `npx vitest run src/constellation.test.ts`

- [ ] **Step 3: Implement**

Extend `constellationStarIds` with the two new ids. Add:

```ts
export type PlanetStarProgress = {
  scienceCompleted: number;
  numeriaCompleted: number;
};

function planetProgressToward(count: number): number {
  return Math.max(0, Math.min(1, count / 4));
}
```

After mapping Twin `STAR_DEFINITIONS`, append (or include in a second definitions list) the two planet stars using `planetProgress?.scienceCompleted ?? 0` and `?.numeriaCompleted ?? 0`. Prefer one combined return array so catalog order is stable: existing six Twin stars, then `science-explorer`, then `numeria-explorer`.

Update `newlyUnlockedStars` to forward `planetProgress` into `getConstellationStars`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/constellation.ts packages/contracts/src/constellation.test.ts
git commit -m "feat: add science and numeria explorer constellation stars"
```

---

### Task 4: Star destinations + next-step plumbing

**Files:**
- Modify: `apps/web/components/wiggle/starDestination.ts`
- Modify or create: `apps/web/components/wiggle/starDestination.test.ts`
- Modify: `apps/web/components/wiggle/nextConstellationSuggestion.ts`
- Modify: `apps/web/components/wiggle/nextConstellationSuggestion.test.ts`
- Modify: `apps/web/components/wiggle/nextStep.ts`
- Modify: `apps/web/components/wiggle/nextStep.test.ts` (if assertions break)

**Interfaces:**
- `STAR_DESTINATIONS` must include every `ConstellationStarId` (TypeScript will enforce).
  - `science-explorer` → Animals (reachable, not Magnet): `science("animals", "Animal Types", "Pip the Bird")`
  - `numeria-explorer` → Number Valley (not Fraction Forest — that name is excluded from next-step offers):
    ```ts
    {
      missionName: "Number Valley",
      guideName: "Lexi",
      href: childId => buildWorldHref({ world: "math", child: childId }),
    }
    ```
- `rankedLockedStars(twin, planetProgress?)` and `nextConstellationSuggestion(twin, planetProgress?)` pass the optional arg into `getConstellationStars`.
- `getNextStep(twin, childId?, avoidMissionName?)` loads `planetStarProgressFor(childId ?? DEMO_CHILD_ID)` when `typeof window !== "undefined"`, else `{ scienceCompleted: 0, numeriaCompleted: 0 }`, and passes it to `rankedLockedStars`.

- [ ] **Step 1: Write / extend failing tests**

`starDestination.test.ts` (create if missing):

```ts
import { expect, it } from "vitest";
import { constellationStarIds } from "@wiggle/contracts";
import { starDestination } from "./starDestination";

it("maps every constellation star id including planet explorers", () => {
  for (const id of constellationStarIds) {
    expect(starDestination(id).missionName.length).toBeGreaterThan(0);
  }
  expect(starDestination("science-explorer").missionName).toBe("Animal Types");
  expect(starDestination("numeria-explorer").missionName).toBe("Number Valley");
});
```

Update `nextConstellationSuggestion` tests to pass planet progress when asserting all-unlocked null (include planet stars unlocked via progress).

- [ ] **Step 2: Run — expect FAIL** (missing keys / wrong signatures)

- [ ] **Step 3: Implement** destinations + optional `planetProgress` args through suggestion helpers and `getNextStep`.

- [ ] **Step 4: Run related tests — expect PASS**

```bash
npx vitest run components/wiggle/starDestination.test.ts components/wiggle/nextConstellationSuggestion.test.ts components/wiggle/nextStep.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/wiggle/starDestination.ts apps/web/components/wiggle/starDestination.test.ts apps/web/components/wiggle/nextConstellationSuggestion.ts apps/web/components/wiggle/nextConstellationSuggestion.test.ts apps/web/components/wiggle/nextStep.ts apps/web/components/wiggle/nextStep.test.ts
git commit -m "feat: route planet explorer stars in next-step suggestions"
```

---

### Task 5: Science planet hydrate, save, session cheer

**Files:**
- Modify: `apps/web/components/science/SciencePlanetCanvas.tsx`
- Modify: `apps/web/components/science/SciencePlanet.tsx`
- Modify: `apps/web/components/worlds/SubjectWorlds.tsx`
- Modify: `apps/web/components/science/SciencePlanetCanvas.completion.test.tsx`

**Interfaces:**
- `SciencePlanetProps` / canvas props gain optional `childId?: string`.
- Resolve id: `const child = childId ?? DEMO_CHILD_ID` (import from `../../lib/demo/seed`).
- Init: `useState(() => loadCompletedScienceZones(child))`.
- On `completeZone`: after building `next`, call `saveCompletedScienceZones(child, next)`; queue with `shouldQueueCheer(..., hasCheeredPlanet("science") || cheerShown.current)` — prefer syncing `cheerShown` from session at mount: `useRef(hasCheeredPlanet("science"))`.
- On mount (useEffect once): if `shouldQueueCheerOnHydrate(completedZones.size, cheerShown.current)` and no session, set pending and reveal (or show immediately when `session === null`).
- When actually showing cheer: `markCheeredPlanet("science")` then set `cheerShown.current = true`.
- `SubjectWorlds`: pass `childId={currentChild ?? DEMO_CHILD_ID}` into `SciencePlanet` (and keep Math using the same resolved id for consistency).

- [ ] **Step 1: Extend completion tests**

```tsx
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

Import `DEMO_CHILD_ID` from `../../lib/demo/seed` (value is `10000000-0000-0000-0000-000000000011`). Use that string in storage keys and `childId` props — never invent `"demo"`.

```tsx
it("hydrates completed zones from localStorage", () => {
  window.localStorage.setItem(
    `wiggle:planet-complete:${DEMO_CHILD_ID}:science`,
    JSON.stringify(["magnet-lab", "animals", "colors", "life-cycle"]),
  );
  render(<SciencePlanetCanvas {...defaults} quality="fallback" childId={DEMO_CHILD_ID} />);
  expect(screen.getByText("4 of 4 lands complete")).toBeTruthy();
});

it("persists a newly completed zone", async () => {
  render(<SciencePlanetCanvas {...defaults} quality="fallback" childId={DEMO_CHILD_ID} />);
  await finishMagnet();
  const raw = window.localStorage.getItem(`wiggle:planet-complete:${DEMO_CHILD_ID}:science`);
  expect(JSON.parse(raw!)).toContain("magnet-lab");
});

it("cheers once per session when opening an already-complete planet", () => {
  window.localStorage.setItem(
    `wiggle:planet-complete:${DEMO_CHILD_ID}:science`,
    JSON.stringify(["magnet-lab", "animals", "colors", "life-cycle"]),
  );
  render(<SciencePlanetCanvas {...defaults} quality="fallback" childId={DEMO_CHILD_ID} />);
  expect(screen.getByRole("dialog", { name: "You did it!" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep exploring" }));
  cleanup();
  render(<SciencePlanetCanvas {...defaults} quality="fallback" childId={DEMO_CHILD_ID} />);
  expect(screen.queryByRole("dialog", { name: "You did it!" })).toBeNull();
});
```


- [ ] **Step 2: Run — expect FAIL** (no hydrate/persist yet)

- [ ] **Step 3: Implement** canvas + `SciencePlanet` + `SubjectWorlds` wiring as above. Keep pending-cheer-on-session-close behavior for the 4th-land path.

- [ ] **Step 4: Run**

```bash
npx vitest run components/science/SciencePlanetCanvas.completion.test.tsx
```

Expected: PASS (including existing fourth-land cheer test).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/science/SciencePlanetCanvas.tsx apps/web/components/science/SciencePlanet.tsx apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/science/SciencePlanetCanvas.completion.test.tsx
git commit -m "feat: persist Science land completions and session cheer"
```

---

### Task 6: Numeria planet hydrate, save, session cheer

**Files:**
- Modify: `apps/web/components/math/MathPlanetCanvas.tsx`
- Modify: `apps/web/components/math/MathPlanetCanvas.test.tsx` (and any completion-specific math tests if separate)

**Interfaces:**
- Same pattern as Science with `loadCompletedNumeriaRegions` / `saveCompletedNumeriaRegions` / `hasCheeredPlanet("numeria")` / `markCheeredPlanet("numeria")`.
- `childId` prop already exists; resolve `const child = childId ?? DEMO_CHILD_ID`.
- `markRegionComplete` saves after each new id; hydrate on init; hydrate cheer when already 4.

- [ ] **Step 1: Write failing tests** mirroring Science persist/hydrate/session-cheer cases (mock sessions the same way existing Math canvas tests open regions, or seed storage and assert HUD “4 of 4 regions complete” + cheer dialog).

Minimal seed test:

```tsx
it("hydrates numeria completions and cheers once per session", () => {
  window.localStorage.setItem(
    `wiggle:planet-complete:${DEMO_CHILD_ID}:numeria`,
    JSON.stringify(["fraction-forest", "number-valley", "geometry-ridge", "crystal-crater"]),
  );
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} childId={DEMO_CHILD_ID} />);
  expect(screen.getByText("4 of 4 regions complete")).toBeTruthy();
  expect(screen.getByRole("dialog", { name: "You did it!" })).toBeTruthy();
});
```


- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** Math canvas changes parallel to Science.

- [ ] **Step 4: Run**

```bash
npx vitest run components/math/MathPlanetCanvas.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/math/MathPlanetCanvas.tsx apps/web/components/math/MathPlanetCanvas.test.tsx
git commit -m "feat: persist Numeria region completions and session cheer"
```

---

### Task 7: Twin screen + constellation UI

**Files:**
- Modify: `apps/web/components/wiggle/WiggleConstellation.tsx`
- Modify: `apps/web/components/wiggle/WiggleConstellation.test.tsx`
- Modify: `apps/web/components/wiggle/MyWiggleTwinScreen.tsx`
- Modify: `apps/web/components/wiggle/MyWiggleTwinScreen.test.tsx`
- Modify: `apps/web/components/wiggle/constellationMemory.ts` (comment only — unlock truth is Twin **or** planet progress)

**Interfaces:**
- `WiggleConstellationProps` adds optional `planetProgress?: PlanetStarProgress | null`.
- Stars: `getConstellationStars(twin, planetProgress)`.
- `MyWiggleTwinScreen`: `const planetProgress = planetStarProgressFor(childId)`; pass into constellation and into `newlyUnlockedStars(data.twin, seenStars, planetProgress)`; include unlocked planet star ids when saving seen stars.

- [ ] **Step 1: Failing tests**

`WiggleConstellation.test.tsx`: render with `planetProgress={{ scienceCompleted: 4, numeriaCompleted: 0 }}` and assert “Science Explorer” is unlocked (aria-label includes description).

`MyWiggleTwinScreen.test.tsx`: seed science completions in localStorage for the test childId; assert Science Explorer appears in unlocked list (or constellation) without requiring Twin signal bumps.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** props + screen wiring.

- [ ] **Step 4: Run**

```bash
npx vitest run components/wiggle/WiggleConstellation.test.tsx components/wiggle/MyWiggleTwinScreen.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/wiggle/WiggleConstellation.tsx apps/web/components/wiggle/WiggleConstellation.test.tsx apps/web/components/wiggle/MyWiggleTwinScreen.tsx apps/web/components/wiggle/MyWiggleTwinScreen.test.tsx apps/web/components/wiggle/constellationMemory.ts
git commit -m "feat: show planet explorer stars in My Learning Constellation"
```

---

### Task 8: Verification + design-qa

**Files:**
- Modify: `design-qa.md`

- [ ] **Step 1: Run focused suites**

From `apps/web`:

```bash
npx vitest run components/planet/planetCompletionMemory.test.ts components/planet/planetCheerSession.test.ts components/planet/planetCheerGate.test.ts components/science/SciencePlanetCanvas.completion.test.tsx components/math/MathPlanetCanvas.test.tsx components/wiggle/WiggleConstellation.test.tsx components/wiggle/MyWiggleTwinScreen.test.tsx components/wiggle/starDestination.test.ts components/wiggle/nextConstellationSuggestion.test.ts components/wiggle/nextStep.test.ts
```

From `packages/contracts`:

```bash
npx vitest run src/constellation.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Prepend design-qa section**

```markdown
## Planet completion persistence + constellation stars — 23 September 2026

result: automated checks pass; manual revisit of Science/Numeria with saved completions not yet camera-checked.

Science and Numeria land completions now survive reload on this device. Finishing all four unlocks Science Explorer / Numeria Explorer in My Learning Constellation. The all-four cheer plays at most once per planet per browser tab session (including when opening an already-complete planet).

Checked: planetCompletionMemory, planetCheerSession, planetCheerGate, constellation contracts, Science/Math canvas completion suites, constellation/Twin screen unit files. Twin API sync still out of scope.

Not verifiable automatically: kid clarity of planet stars next to Twin-signal stars — judgment after a Twin screen glance.
```

- [ ] **Step 3: Commit**

```bash
git add design-qa.md
git commit -m "docs: record planet completion persistence verification"
```

Do not push unless the owner asks.

---

## Self-review

- **Spec coverage:** local persist (Tasks 1, 5–6); planet stars in catalog (Tasks 3, 7); session cheer + hydrate (Tasks 2, 5–6); starDestination / next-step (Task 4); childId wiring (Task 5); tests + design-qa (Task 8). Twin API / per-land stars / parent dashboard out of scope.
- **Placeholders:** none — keys, copy, ids, and signatures are concrete.
- **Type consistency:** `PlanetStarProgress` with `scienceCompleted` / `numeriaCompleted`; cheer planets `"science" | "numeria"`; storage key shapes shared across tasks; `getConstellationStars(twin, planetProgress?)` threaded through suggestion + UI.
