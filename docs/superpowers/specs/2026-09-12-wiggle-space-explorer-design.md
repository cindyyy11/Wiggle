# Wiggle Space Explorer Design

## Status and Decision

This design supersedes the **hub-first** direction in `2026-09-12-wiggle-solar-system-vertical-slice-design.md`. The product opens into the existing Numeria experience, not a solar-system hub or a sequence of preview worlds.

The selected direction is a world-first, Little-Planet-inspired interaction model: an intimate, playable miniature planet; a close explorer-follow camera by default; a visible Globe overview switch; and low-density controls that appear in context. The external reference informs interaction hierarchy only. None of its source, assets, wording, terrestrial art direction, layouts, or UI shapes are reused.

## Goal

Make the current direct-to-Numeria experience feel like an original, polished Wiggle space adventure. It should preserve the working 3D movement and learning mission while translating the supplied logo into rounded, tactile 3D forms and a warm cream-and-pastel cosmic visual system.

The child should feel that they have landed in a small friendly world to explore, rather than opened a dashboard or a world-selection product.

## Product Boundary

This is a presentation and interaction-hierarchy refinement of the existing direct exploration experience.

- Keep the existing optional Wiggle launch splash. Once the child activates it, enter Numeria directly in **Follow** mode; do not introduce a hub, planet selector, or travel phase.
- Keep all existing gameplay paths: terrain click/tap routing, landmark selection, WASD/arrows, Shift-to-run, Space-to-hop, drag-to-orbit, scroll/pinch zoom, Globe/Follow/Mission camera behavior, touch movement controls, the fraction mission, the hand-gesture option, the 2D fallback, and reduced-motion behavior.
- Keep the supplied logo and its friendly character language as the visual source of truth.
- Do not add a remote 3D asset pipeline, a new state library, a broad information architecture, more complete worlds, or a new backend data model.

## Experience Flow

1. The existing warm logo splash remains the intentional threshold. It is brief and unmistakably an entry action, not a replacement for the world.
2. Activation enters the existing Numeria globe immediately, with the astronaut framed closely in Follow mode. The child can see their character, the nearby landmark silhouette, and enough of the curved world to understand its scale.
3. A compact top-level HUD identifies Numeria and exposes two equal camera choices: **Follow** and **Globe**. Globe gives an overview; Follow returns to the close explorer framing. Mission mode remains available when the current fraction flow requests it.
4. The world stays visually primary. A small current-place chip replaces the persistent large destination card. It surfaces the selected landmark, its short purpose, and one relevant action such as starting the fraction mission or continuing to explore. A future physical-proximity prompt is deliberately deferred unless it can be added without frame-by-frame React state.
5. A single compact **Mission Constellation** affordance replaces the always-open destination stack. Opening it reveals the existing named destinations as an accessible navigation sheet; choosing one preserves the current selection/routing behavior and closes the sheet. No fake destination or future-world journey is introduced.
6. While automatic terrain travel is underway, a brief, cancelable travel chip explains where the explorer is heading. Arrival is announced through concise visible/live feedback rather than a persistent panel.
7. On mobile, the same order holds: compact top controls, one small place/action card above the bottom edge, movement pad lower-left, hop lower-right, and the constellation as a single focused sheet. It never becomes a dashboard overlay.

## Visual and 3D Direction

### Brand language

The visual system comes from the supplied Wiggle logo:

- Warm cream space rather than black voids: `#fff7e7` and pale blue form the atmospheric base.
- Sky blue and accessible navy establish the explorer, world structure, primary legible text, and focus states.
- Sage, coral, and mustard mark discovery, landmarks, play, and positive feedback.
- Rounded silhouettes, pill-like geometry, gentle asymmetry, expressive eyes, and matte clay/plush materials carry more of the brand than flat palette swaps alone.
- Type stays friendly, round, and highly legible. UI copy is short, warm, and plain.

Space is light, whimsical, and tactile. It must not drift into dark sci-fi, metallic realism, neon cyberpunk, generic glass panels, or a data-heavy control console.

### Modelling plan

Numeria remains a real R3F scene, but its procedural primitives become deliberately composed objects rather than isolated low-poly placeholders.

- **Planet body:** retain the spherical terrain and improve its read with layered pastel terrain masses, a soft atmospheric rim, sparse sculpted cloud puffs, and a subtle orbital path. Use depth, silhouette, lights, and material variation before adding texture downloads.
- **Landmarks:** build each existing learning landmark as a distinctive rounded miniature set: soft clustered Fraction Forest forms; plump number stones in Number Valley; friendly curved Geometry Ridge forms; and faceted-but-soft Crystal Crater objects. Each needs a recognisable silhouette from both Follow and Globe views.
- **Explorer:** evolve the astronaut into an original rounded Wiggle explorer: a sky-blue, soft-bodied suit/helmet form, expressive face treatment where scale permits, navy details, and a mustard accent. It remains readable without imitating the logo letters as a character model.
- **Space dressing:** add a restrained layer of friendly satellites, puffy asteroid fragments, tiny colored orbit beacons, soft stars, cloud puffs, and an atmospheric rim. These reinforce a miniature cosmos without obscuring ground targets or hurting frame rate.
- **Motion:** the world has quiet living cues—slow floating accents, a tiny astronaut idle bob, and landmark glints—but the explorer movement and camera remain physically clear. `prefers-reduced-motion` disables or simplifies nonessential loops.

Procedural R3F geometry, shared materials, instancing for repeated decorative objects, and the existing quality tiering are the chosen production approach. No copied assets or external GLTF dependency is required for this pass.

## HUD and Interaction Design

### Persistent chrome

- A small Wiggle/Numeria identity mark anchors the upper edge without competing with the scene.
- Follow and Globe are visible, labelled, keyboard-accessible toggle controls. Follow is selected on entry.
- A compact Mission Constellation button is the only persistent navigation surface. It communicates progress/navigation without invoking a Field Journal or copying the reference's terminology.
- Existing help remains available in a compact, dismissible form. It should describe controls once and never cover a necessary action on mobile.

### Contextual chrome

- The current-place chip appears for the selected landmark. It contains the landmark name, a one-line purpose, shortcut hint when helpful, and the relevant primary action.
- The existing mission start remains the primary contextual action only at Fraction Forest; it must not disappear behind visual-only interactions. Other landmarks truthfully offer exploration/course actions rather than silently switching the selected landmark to Fraction Forest.
- The travel chip is temporary, contains a clear cancel control, and announces arrival. It reflects existing destination state rather than inventing a route simulation.
- Decorative notifications are short and non-modal. Their information is also available in the Mission Constellation so no discovery relies on animation alone.

### Input parity and accessibility

- Every new visual affordance is an ordinary labelled HTML control with visible focus, at least a 44 × 44 px target, and dark-navy-on-light-surface contrast meeting AA.
- The destination list remains available in the constellation sheet, preserving keyboard, touch, screen-reader, and 2D-fallback equivalence.
- The visible Follow and Globe buttons are the canonical view controls. This pass does not add global keyboard shortcuts that could conflict with movement-pad or focused-control behavior; existing Space, Shift, arrows, WASD, and mouse/touch behaviors retain their meanings.
- Live announcements describe selected place, travel cancellation, arrival, and camera change without narrating continuous movement.
- No new gesture is required for a core action. Hand tracking stays optional and mission-scoped.

## Technical Shape

`MissionAtlas` remains the owner of session, adaptation, mission completion, event recording, and camera selection. It will initialise camera state to `follow` after the splash and restore `follow` when a mission closes; it does not gain a hub or a second world shell.

`UniverseCanvas` stays the render and input boundary. It continues to own the existing quality/fallback behavior and passes all current handlers through unchanged. The overlay is separated into an isolated `ExplorationHud` component and CSS module so its low-chrome presentation can evolve without appending more overrides to the already-dirty `universe.module.css`.

The intended code boundaries are:

- `apps/web/components/universe/UniverseCanvas.tsx`: compose the new HUD while retaining its current callbacks, ARIA labels, input ref, fallback, and pizza controls.
- New `apps/web/components/universe/ExplorationHud.tsx` and module CSS: present persistent and contextual chrome plus the collapsible constellation sheet; do not own frame-by-frame state.
- `apps/web/components/mission/MissionAtlas.tsx`: make only the controlled initial/return-camera change and pass any presentation-safe context required by the HUD. Its dirty splash/mission/gesture work is preserved exactly around that small change.
- `apps/web/components/universe/UniverseScene.tsx`: compose new isolated decorative/model components rather than rewriting existing scene control code.
- New small procedural scene components, including a `WiggleSpaceDressings` sibling and a shared space-palette module, keep layered dressing and model subparts separate from `Numeria`, `Astronaut`, and `Landmarks`, which are presently modified by concurrent visual work. Imports into dirty files must be minimal, reviewed, and never overwrite existing edits. Existing pizza, plate, and Lexi target mesh IDs/refs/parent structure remain untouched because hand interaction depends on them.

There is no new global client store. React state is limited to presentational panel/open/closed state and derives travel/selection from existing state. R3F animation remains inside `useFrame`; it must not trigger React state updates every frame.

## Performance and Failure Behaviour

- Preserve dynamic loading, device quality selection, context-loss recovery, and the existing complete 2D map fallback.
- Ensure an unsupported WebGL device can still select a destination, start/complete the mission, and access contextual actions.
- New decorative meshes use shared geometry/materials and instancing where repeated. Low-quality mode removes or reduces decorative density rather than core landmark readability.
- Avoid large texture downloads, model downloads, permanent blur filters, per-frame DOM updates, or high-frequency state changes.
- Camera changes and sheet opening work under reduced motion through immediate/small opacity changes instead of long flights or bouncing transitions.

## Verification

Focused automated coverage will preserve and extend the current universe behavior:

- `UniverseCanvas` tests cover Follow as the default controlled mode, visible Globe/Follower controls, constellation sheet selection, current-place contextual action, and 2D fallback equivalence.
- Camera motion tests remain unchanged except for intentional mode-default expectations outside the math unit.
- Mission, gesture, event-queue, and completion tests retain their existing behavioral assertions; the visual HUD must not change learning event semantics.
- Browser tests first activate the existing splash, then verify desktop and 390 × 844 mobile: initial close-follow composition, view switching, movement, terrain routing, destination sheet, mission entry, context-loss fallback, keyboard-only navigation, and reduced motion.
- Contrast checks verify the cream surfaces use accessible navy/appropriate dark text. Pale legacy text is not permitted over cream panels.
- Manual QA checks that the UI reads as a Wiggle space world at a glance, the selected landmark stays visually clear in both camera modes, and new space decoration does not mask walkable terrain or mission controls.

## Out of Scope

- A solar-system hub, selectable preview planets, fake interplanetary travel, or any restoration of the removed hub-first design.
- Copying the reference site's models, terrain, copy, icons, typography, source, layout, or assets.
- Five fully playable worlds, a backend discovery system, a new account flow, an auto-playing soundtrack, a compulsory camera/hand permission flow, or GLTF/photorealistic asset production.
- Changes to fraction pedagogical logic, the event contract, parent route, or core camera/movement physics beyond defaulting the current experience to Follow.
