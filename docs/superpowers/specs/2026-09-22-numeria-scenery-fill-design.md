# Numeria Scenery Fill Design

## Goal

Make the Numeria (math) planet feel evenly populated across its whole surface, the way the Science planet already does, instead of having decoration only near its four lands and a thin sparkle layer everywhere else.

## Decisions

Chosen by the product owner.

- **Reuse existing props, spread wide.** The filler layer draws on shapes Numeria already has (hills, berries, number-boxes, trees) rather than designing new art.
- **Leave the four existing per-land clusters untouched.** `Forest`, `TerrainObjects` (hills, berries), and `NumberGarden` keep their current size and position; the new layer only fills the gaps around and between them.

## Scope

In scope: a new whole-globe filler layer for the `theme === "math"` branch of `Numeria.tsx`, reusing/extracting existing prop shapes, distributed and thinned out the same way Science's `LivingScenery` is; a pure layout/clearing function with unit tests; a visual check in the browser at both quality levels.

Out of scope: the four existing per-land clusters (unchanged); `ShapeSparkles` (unchanged); the `science`, `english` and `bm` themes; `MathRegionPlateaus`; any change to region gameplay, `MATH_ACTIVITIES`, or the hand-session workbenches.

## Current state

`apps/web/components/universe/Numeria.tsx` renders, for `theme === "math"`:
- `MathRegionPlateaus` — the four raised land platforms at the `LANDMARKS.slice(0, 4)` destinations (`RADIUS = 3`; destinations are `{ latitude, longitude }` in the `-1..1`-ish range `surfacePoint` and `destinationFromPoint` convert to/from 3D points).
- `Forest` — up to 104 trees, `InstancedMesh` trunks/crowns, positioned only in a spiral around Fraction Forest's destination (`.62, -.52`).
- `TerrainObjects` — 20 hills spiralled around Geometry Ridge's destination (`.71, .72`) and 28 berries spiralled around Crystal Crater's destination (`-.25, -.73`); also renders `NumberGarden`.
- `NumberGarden` — 24 number-boxes spiralled around Number Valley's destination (`-.16, .43`).
- `ShapeSparkles` — up to 46 small `Bubble`/`Bloom` shapes from `fibonacciSphereRegions(count, LANDMARKS.slice(0, 4))`, a Fibonacci-spiral scatter across the *whole* sphere tagged by nearest land, at `RADIUS + .02`.

`apps/web/components/science/scienceSceneryLayout.ts` and `ScienceLandScenery.tsx`'s `LivingScenery` are the model to follow: `sceneryLayout(count)` scatters points across the whole sphere the same way, tags each with the nearest land (`scienceRegion`), and drops any point that falls within `.32` (3D chord distance on the unit sphere) of a land, checkpoint or hiding place. `LivingScenery` then places one of several themed "hero" props per surviving point (chosen from `item.region` and `item.index`), plus a separate denser `InstancedMesh` layer of tiny ground-detail icosahedra for texture.

## Architecture

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `universe/mathSceneryLayout.ts` (new) | Pure. `mathSceneryLayout(count)`: a Fibonacci-sphere scatter over the whole unit sphere (same construction as `fibonacciSphereRegions`), tagged with the nearest of `LANDMARKS.slice(0, 4)`, filtered to drop any point within a clearing radius of a land center. Exports the clearing radius as a named constant. | `world.ts` (`surfacePoint`, `destinationFromPoint`, `LANDMARKS`) |
| `universe/MathLivingScenery.tsx` (new) | Renders the filler layer for the math theme: one small hero prop per surviving `mathSceneryLayout` point (tree, hill, berry or number-box, chosen from the point's tagged region so an area still hints at whose territory it's in), plus an `InstancedMesh` layer of small `Bubble`-shaped ground-detail dots from a second, denser `mathSceneryLayout` call. Takes `quality: "high" | "low"`. | `mathSceneryLayout`, prop pieces below |
| `universe/Numeria.tsx` (modified) | The four prop builders (`Tree`, `Hill`, `Berry`, `NumberBox`) are extracted from `Forest`/`TerrainObjects`/`NumberGarden` into small standalone components so `MathLivingScenery` can place them individually; the clustered generators keep calling them (or keep their own inline/instanced rendering where extraction isn't worth it — see Rendering strategy). Renders `<MathLivingScenery quality={quality} />` alongside the existing math-theme children. | `mathSceneryLayout`, `MathLivingScenery` |

## Rendering strategy

- **Hero props.** `MathLivingScenery` renders one non-instanced `<group>` per surviving point (mirroring Science's `LivingScenery`, which does the same for its hero layer), positioned and oriented with `surfacePoint`/`Quaternion.setFromUnitVectors` exactly like the existing clusters. Each point's tagged region picks the prop family (Fraction Forest region → a single small tree, Geometry Ridge region → a single small hill, Crystal Crater region → a single small berry, Number Valley region → a single number-box), and `item.index` varies scale/rotation/color the same way the existing clusters already vary theirs.
- **Extraction.** `TerrainObjects`' hill and berry bodies and `NumberGarden`'s box are small enough to lift directly into standalone components with no behaviour change to the existing clusters (they call the extracted component instead of inlining the JSX). `Forest`'s tree is currently instanced (trunk + crown `InstancedMesh`, chosen for its higher count); it gets a small non-instanced `Tree` component of the same shape for `MathLivingScenery` to use, and the existing `Forest` cluster is untouched.
- **Ground-detail dots.** A second `mathSceneryLayout` call at a higher count feeds one `InstancedMesh` of small rounded dots (reusing `Bubble`'s sphere, or a flattened icosahedron like Science's ground detail), colored by region, for texture between hero props — same two-tier structure as Science.
- **Clearings.** The clearing radius must keep new points clear of `MathRegionPlateaus` and the existing clusters' own extents (which reach roughly `.5`-`.58` in destination-space from each land, translating to a 3D chord distance comparable to Science's `.32`). The exact constant is picked and tuned visually during implementation, starting from Science's `.32` and adjusted if a hero prop is seen overlapping a plateau or an existing cluster item.
- **Budget.** Ballpark, scaled down from Science's own (`110`/`460` high, `64`/`240` low) to match Numeria's current lighter footprint: **~140 hero props / ~380 ground-detail dots at `quality: "high"`, ~70 / ~160 at `quality: "low"`.** Tuned visually during implementation; the only hard requirement is that it reads as full without a frame-rate regression on the low-quality path.
- **Equator ring.** The existing decorative torus ring (`Numeria.tsx` lines 75-77) is unaffected; hero props and dots are not filtered against it, matching how `ShapeSparkles` already ignores it today.

## Testing and verification

- `mathSceneryLayout.test.ts`: every returned point sits outside the clearing radius of every land (measured the same way the filter itself measures it); each point's `region` is the nearest land by dot product; the count returned scales with the requested count (minus whatever the clearing filter drops); a degenerate `count: 0` returns `[]`.
- No changes needed to `Numeria.test.tsx` — it only checks click routing, region colors/count, and top-level structure, not scenery internals or item counts.
- No unit test exists today for `ShapeSparkles`, `Forest`, `TerrainObjects`, `NumberGarden` or Science's `LivingScenery`/`sceneryLayout` placement output beyond the pure layout function itself (`scienceSceneryLayout.ts` has no test file); `MathLivingScenery`'s rendering follows the same untested-render, tested-layout split.
- Typecheck and lint as usual (`npx tsc --noEmit`, `npx eslint components/universe`).
- Visual check in the browser (Chrome tooling) with the Numeria globe at both `quality: "high"` and `quality: "low"`, confirming: no bare bands of terrain, no hero prop overlapping a land plateau or an existing cluster, and the four lands still read as visually distinct from a distance.

## Self-review

- **Placeholders:** none; every section states what is built and how.
- **Consistency:** the architecture table's three units match the Rendering strategy and Testing sections one-to-one; nothing in Current state is contradicted elsewhere.
- **Scope:** single, focused change (one new layout function, one new component, one extraction pass on an existing file); no unrelated refactor of the science/english/bm scenery or of `MathRegionPlateaus`.
- **Ambiguity:** the clearing radius and prop/dot counts are explicitly named as visually-tuned during implementation rather than fixed constants, since they depend on how the extracted props look in place — the implementation plan should treat "no visible overlap with a plateau or existing cluster" and "no bare bands" as the acceptance check, not a specific number.
