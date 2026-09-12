# Wiggle 3D Subject-Orbit Landing Design

## Status and Decision

This design replaces the current flat, card-based subject selector with a genuine 3D subject-universe landing experience. It supersedes earlier direct-to-Numeria entry guidance wherever that guidance conflicts with the user's current decision: the Wiggle splash remains, and the screen after it is the subject-universe orbit.

The supplied screenshots are visual-direction references only. They establish the desired sense of a playful learning cosmos: rounded, miniature floating worlds; depth; soft material; orbital motion; and a child-led choice between Maths and Science. This implementation must create original Wiggle geometry, composition, copy, and interaction. It must not reuse the reference's art, character, logo, terrain, layout, or text.

## Goal

After activating the existing Wiggle splash, a child immediately sees a dreamy, navigable 3D constellation of subject planets instead of a grid of course cards. Numeria is the Maths gateway; selecting it opens the existing walkable Numeria world with its avatar movement and motion-activity checkpoints unchanged. Science remains its existing enterable planet. English and Bahasa Melayu remain visible but truthfully locked future worlds.

The landing scene must feel like a tiny explorable cosmos, not a school LMS, dashboard, or a flat illustration with buttons placed over it.

## Confirmed Journey

1. The warm Wiggle splash remains the first screen on every fresh app entry. Its existing labelled "Let's Wiggle" action and transition remain intact.
2. After the splash, the root route (`/` or `/?child=...`) opens the 3D subject-orbit landing screen.
3. The primary visual choices are two large, modeled miniature worlds: **Numeria — Maths** and **Science Planet**. Both are click/tap targets in the 3D scene and have matching native HTML controls.
4. Selecting Numeria continues to use the existing `SubjectWorlds -> MissionAtlas -> UniverseCanvas` route. It must preserve child context, the walkable avatar, terrain/camera controls, checkpoints, mission behavior, motion activity, fallback, and the protected active-mission return behavior.
5. Selecting Science continues to use the existing `SubjectWorlds -> SciencePlanet` route and zone behavior.
6. English and Bahasa Melayu orbit farther out as small, modeled locked worlds. Selecting either gives its existing concise coming-soon message and does not change the route.
7. Returning from Numeria or Science returns to the subject orbit without replaying the splash during the same mounted session.

## 3D Art Direction

### Space stage

The landing stage is a full-viewport, warm-and-dreamy space environment: an ink-navy/violet core with cream and pale-blue atmospheric edges, soft stars, subtle cloud puffs, a few rounded asteroid fragments, and graceful orbital arcs. It is spacious rather than busy. The first view prioritizes the two playable worlds and leaves visual breathing room around them.

The existing Wiggle palette anchors it: cream `#fff7e7`, accessible navy `#173e5e`, pale blue `#a9d9ee`, sage `#9dc99a`, coral `#ef8b78`, mustard `#f4c95d`, water blue, and restrained violet. Materials are matte clay/plush with soft directional and hemisphere lighting—never photorealistic, metallic sci-fi, neon cyberpunk, or generic glass UI.

### Real modeled planet miniatures

Every visible world is procedural React Three Fiber/Three.js geometry. No planet can be a CSS circle, a bitmap thumbnail, or a remote GLB/texture download.

- **Numeria (Maths):** a chunky floating blue-and-sage globe with layered terrain, a small orbital ring, cloud puffs, paths, and simplified original silhouettes that hint at its existing number/shape/fraction discovery areas. It is recognizably a miniature gateway to the real Numeria below, not a replacement for the playable world.
- **Science Planet:** a coral, violet, and sage floating rocky diorama with a small observatory, magnetic fragments, friendly laboratory landmarks, and its own orbit treatment. It may reuse and adapt the existing procedural science scene motifs instead of duplicating rendered artwork.
- **English:** a small lilac story-moon with rounded book/letter-like forms and a visible lock marker; it is not interactive beyond its coming-soon explanation.
- **Bahasa Melayu:** a small jade-and-mustard garden-moon with rounded language/garden silhouettes and a visible lock marker; it is not interactive beyond its coming-soon explanation.

The two playable worlds have the most geometric detail, strongest lighting, and largest scale. Locked worlds have lower detail and reduced contrast without being hidden. Repeated stars, rocks, and cloud elements use shared geometry/materials or instancing. Quality tiers reduce decoration before the planets' identities or controls.

### Motion and selection

At rest, planets float and orbit at a slow, calm pace. A selected or hovered playable planet lifts a little and gains a gentle atmosphere/ring response; it does not use a long camera flight or a disruptive full-screen transition. Selecting Numeria or Science routes promptly to the already-existing subject world.

`prefers-reduced-motion` freezes decorative drift/orbits and uses immediate selection feedback. No required action depends on hover, drag, animation, or a precise 3D click.

## Interface and Accessibility

The current large headline and 2x2 rectangular subject-card grid are removed. The landing overlay is deliberately light:

- A small Wiggle identity mark and one short orientation line, such as "Choose a world to explore," sit clear of the planet silhouettes.
- Each world has an adjacent, ordinary DOM control with its real subject name and state. The controls are spatial callouts, not a card grid or LMS navigation menu.
- The DOM controls remain the canonical keyboard and screen-reader path, with 44px minimum target size, visible focus treatment, accessible navy-on-cream contrast, and a live status message for locked-world selection.
- Canvas mesh clicks and taps invoke the same `onSelect` callback as the native controls. The Canvas may remain hidden from assistive technology because the adjacent DOM controls expose every action.
- A concise status message explains that English and Bahasa Melayu are coming soon without moving focus or routing the child away.
- The mobile layout keeps the 3D scene visible, positions two prominent playable-world controls outside their geometry, and groups the two locked worlds compactly. It never collapses into a dense course-card grid.

## Technical Shape

The existing route contract is preserved:

- `world=math` continues to mount `MissionAtlas` with `showSplash={false}`.
- `world=science&zone=...` continues to mount `SciencePlanet`.
- `child` remains on every internal route.
- Existing protection against leaving an active Maths mission remains unchanged.

The change is isolated to the subject-selection shell:

- `WorldsConstellationScene.tsx` becomes the modeled orbit scene, split into small planet/dressing components where that keeps geometry understandable.
- `WorldsConstellation.tsx` retains its dynamic import, WebGL probe, quality selection, context-loss handling, and reduced-motion behavior. It enables pointer interaction for its scene while the semantic controls stay in the DOM.
- `WorldSelector.tsx` becomes a compact orbit HUD and accessible world-control layer rather than a large introductory card grid.
- `SubjectWorlds.module.css` becomes the full-viewport dreamy-space composition and responsive orbit HUD styling.
- `SubjectWorlds.tsx`, `subjectRoute.ts`, `MissionAtlas.tsx`, and Numeria/Universe scene code retain their current routing and gameplay responsibilities except for minimal wiring required by the selector.

No new global store, backend contract, remote model pipeline, external texture pack, camera permission, auto-playing sound, or fabricated progress system is introduced. R3F motion stays inside `useFrame`; it must not set React state every frame.

## Fallback and Failure Behaviour

- If WebGL is unsupported, lost, or too slow, the child still sees an original DOM orbit map/control layout and can enter Numeria or Science, choose locked worlds, and receive the same messages.
- The fallback is an intentional subject-universe experience, not the discarded card grid or a dead background image.
- Low-quality mode reduces star/debris density, distant moons, and nonessential ornament first.
- If a Canvas interaction fails, DOM controls remain fully usable.

## Verification

- Update selector tests to assert that the splash still leads into the subject universe; it must no longer assert the old card-grid layout.
- Verify Math and Science DOM controls route to their existing worlds with child context and retained Maths props.
- Verify canvas selection and matching DOM control selection invoke the same subject callback.
- Verify English/Bahasa Melayu stay locked and preserve route/focus with truthful live feedback.
- Verify fallback parity, context-loss recovery, high/low quality budgets, and reduced-motion behavior.
- Preserve existing Numeria, mission, gesture, camera, parent, activity checkpoint, and Science tests without changed semantics.
- Add browser visual/interaction coverage for the splash -> orbit -> Numeria journey at desktop and 390x844 mobile sizes, plus keyboard-only and forced-WebGL-fallback paths.
- Manually verify that the landing immediately reads as a modeled miniature solar-system world choice rather than an LMS or dashboard.

## Out of Scope

- Rebuilding Numeria's playable world, avatar, movement, checkpoints, or learning logic.
- Full English or Bahasa Melayu experiences.
- New science activities beyond those already implemented.
- Copying any supplied reference image, art, text, asset, character, layout, or source.
- Downloaded GLB/GLTF models, photorealistic terrain, or generic course-management UI.
