# Wiggle Subject-Planet Hub and Science Planet Design

## Status and Decision

This design updates the product entry direction from a direct-to-Numeria experience to a small, child-friendly **subject constellation**. It preserves the existing Numeria experience as the dedicated Maths planet and adds Science as the featured subject planet. English and Bahasa Melayu are visible as separate future planets, not subjects or sections inside Science.

The supplied Science Planet image is visual direction only. The implementation may adopt its sense of scale, playful scientific dioramas, warm cream navigation, cosmic depth, and clearly labelled destinations. It must use original Wiggle models, layout, copy, materials, and interaction design; it does not reuse the reference's logo, mascot, rendered art, source, or exact composition.

## Goal

Give children an immediately understandable way to choose a subject world, then make Science feel like a rich, tactile 3D place to explore. The first complete science experience is Magnet Lab. The existing Maths learning flow remains available through Numeria without losing its movement, mission, gesture, parent, accessibility, or fallback behavior.

## Product Boundary

The first delivery includes:

- A subject-world selection experience with four distinct planets: Science, Maths/Numeria, English, and Bahasa Melayu.
- Science as the visually featured, fully enterable world.
- Numeria as a separate, still playable Maths planet using the existing implementation.
- English and Bahasa Melayu as visibly separate locked planets with truthful coming-soon messaging.
- A Science Planet hub with six themed zones: Magnet Lab, Sink & Float Bay, pH Lab, Animal Arena, Colors Canyon, and Life Cycle Garden.
- A complete first activity for Magnet Lab, with the other five science zones represented as visible future destinations.

The first delivery does not add full learning activities for the five future Science zones, English, or Bahasa Melayu. It does not replace the existing fraction mission, change parent authentication/data, require a 3D-asset download pipeline, or duplicate the reference art.

## Information Architecture and Child Journey

1. A single top-level Wiggle splash remains the warm start point. It appears once for the app session, then opens the **Worlds** constellation rather than taking the child directly into one subject. It retains an ordinary, labelled Start Wiggle button/action and the current optional sound is still optional.
2. Worlds presents four distinct planet choices. Science is visually largest and selected by default; Numeria is the separate Maths choice; English and Bahasa Melayu use clear locked/coming-soon states.
3. Choosing Science enters the Science Planet. Choosing Numeria opens the current Maths experience. Locked future worlds never pretend to be playable; selecting one explains that it is still on its way and returns focus safely to the Worlds selector.
4. Science Planet provides a labelled **Back to Worlds** control, an accessible topic list, and clickable 3D landmarks. These two ways of choosing a topic invoke the same selection state.
5. Magnet Lab is active. The other Science zones can be inspected from the hub but disclose that their activities are coming soon.
6. Entering Magnet Lab starts a short, focused discovery mission. The child tests friendly objects against a large magnet, observes whether they move toward it, and sorts them into attracted/not-attracted results. Completion gives concise, honest progress feedback and returns the child to Science Planet.

World changes never unmount an active Maths mission. While a fraction mission overlay is open, the Worlds action is unavailable and explains that the child must use the existing mission close/exit action first. That existing action remains the only path that emits an abandoned-mission event before returning to Worlds. Magnet Lab has its own visible exit action, which returns to Science Planet without claiming a completion.

Subject and selected-zone navigation are URL-backed: `world=science|math` and, for Science, `zone=magnet-lab|sink-float|ph|animals|colors|life-cycle`. The existing `child` query parameter is retained on every internal link. Browser Back and direct links restore the selected world/zone, but never resurrect an in-progress mission after a refresh.

## Science Planet Art Direction

Science Planet should feel like an original miniature world, not a flat dashboard or a photorealistic simulation.

- The page composition uses a warm cream upper surface for identity and readable controls, flowing into a rich navy-to-violet cosmic stage.
- The planet is a chunky, asymmetrical floating diorama built from soft, rounded procedural geometry. A central observatory and winding paths connect six recognisable zone silhouettes.
- **Magnet Lab** is an active rocky/copper island with an oversized horseshoe magnet, floating magnetic fragments, rounded work benches, and playful field-line accents.
- **Sink & Float Bay** uses an icy-blue pool, rounded cliffs, shallow water, and buoyant toy-scale objects.
- **pH Lab** uses safe, colourful flasks, a friendly gauge, and a protected tabletop—never realistic hazardous imagery.
- **Animal Arena** uses a green habitat ledge and animal silhouettes/figures; **Colors Canyon** uses a soft rainbow mineral palette; **Life Cycle Garden** uses leaves, seeds, cocoons, and a sprouting plant.
- Tiny stars, distant planets, cloud puffs, and restrained orbiting props add depth. They must not hide landmarks, reduce legibility, or compete with the child's next action.
- Materials stay matte-clay/plush and softly lit, with sky blue, accessible navy, sage, coral, mustard, water blue, and violet accents derived from the existing Wiggle language.

The 3D scene remains procedural React Three Fiber geometry. Shared geometry/materials, instances for repeated foliage or rocks, and quality-aware decorative density keep the scene editable and performant. No copied GLB, downloaded texture pack, or baked reference image is required.

## Interaction and UI

- The compact header is inspired by the reference's light, rounded feel but only exposes real product controls: Wiggle home/Worlds, actual progress where available, and parent access. It does not introduce non-functional navigation.
- A concise Science Planet title and one-line invitation provide orientation without covering the 3D world.
- Topic callouts are ordinary DOM buttons near their related landmarks. They use the same calm cream surface, navy text, large hit areas, and visible focus treatment as the rest of Wiggle.
- The current active zone has one clear primary action. Magnet Lab's action starts the mission; future zones use a non-deceptive coming-soon state.
- A visible World selector is always available from an entered subject world. Back navigation preserves the expected selected subject and never silently resets the child to an unrelated place.
- Science mission controls use ordinary HTML buttons in addition to any 3D interaction. The primary task must never depend on dragging, hover, WebGL, a camera, or hand tracking.
- Desktop gives the diorama room to breathe. On mobile, the scene shows the chosen planet and one compact selector/card at a time rather than overlapping six labels over the planet.
- Magnet Lab completion is intentionally local presentation state for this first slice. It awards no real Wiggle Energy/tokens, sends no new API event, and does not appear in the parent dashboard. It is repeatable and resets when Science is exited or the page is refreshed.

## Accessibility, Motion, and Fallbacks

- Every selection, navigation item, mission action, and locked-world explanation is reachable by keyboard and has a visible focus state and at least a 44 by 44 pixel target.
- Cream panels use accessible dark-navy text; color never communicates attraction, lock status, or progress by itself.
- Meaningful 3D selections have semantic DOM equivalents. The Canvas remains decorative for assistive technology when a parallel control presents the action.
- Reduced motion freezes ornamental drift, camera flights, and magnet effects while retaining instant, understandable state changes.
- Existing WebGL detection, quality tiers, and the 2D fallback remain. The Science fallback is a complete visual map/topic list with the same Magnet Lab and world-selection actions, not a dead image.
- Low-quality mode reduces nonessential orbiting props, particles, foliage repetition, and visual effects before reducing landmark clarity or controls.

## Technical Shape

The new work is additive and isolated from the current dirty 3D/mission changes.

- A small `SubjectWorlds`/constellation shell owns the single splash, URL-backed selected subject/zone, and navigation between worlds. It accepts and forwards the exact existing Maths inputs—`childId`, `allowLocalFallback`, injected test client, and quality preference—to `MissionAtlas` so authenticated children never fall back to the local demo by accident.
- A typed subject configuration describes subject id, display name, status, destination, and available route. It makes Science, Numeria, English, and Bahasa Melayu consistent without a new global state library.
- The existing `MissionAtlas`/`UniverseCanvas` path remains the Maths/Numeria implementation. It is mounted as the Maths subject rather than rewritten; its embedded splash is extracted or suppressed with an explicit `showSplash={false}`-style boundary so it cannot reappear after a world change.
- A separate Science shell owns `SciencePlanetCanvas`, `SciencePlanetScene`, a DOM `ScienceHud`/topic selector, and the `MagnetLabMission` overlay. Its public actions are `onBackToWorlds`, `onZoneSelect`, `onStartMagnetLab`, `onExitMagnetLab`, and `onCompleteMagnetLab`, keeping the hub and activity independently testable.
- `ScienceFallback` receives the same selected zone and action callbacks as the Canvas path. It is a complete DOM map/topic-list and Magnet Lab flow, not an image-only replacement.
- Science zone geometry is split into small scene components so future zone activities can grow independently. Magnet Lab is the only zone whose activity state is live in this slice.
- First-slice Magnet Lab progress is local, repeatable presentation state. It resets on Science exit or browser refresh and must not alter the existing Maths event contract, real reward count, or parent data model. A later persistence design can add subject-specific event contracts deliberately.
- Existing code that is already dirty—especially Numeria, landmarks, astronaut, orbiting worlds, mission atlas, and universe CSS—is preserved. New isolated modules and CSS are preferred; wiring into existing files is kept small and reviewed.

## Failure Behaviour

- If WebGL is unsupported, lost, or downgraded, the child can still choose Science or Maths, navigate every Science topic, start and finish Magnet Lab, and return to Worlds through DOM controls.
- If a planet/zone is locked, the UI states why it is unavailable and leaves the child's current selection intact.
- If a mission action cannot initialise, the child sees a concise retry message and can safely return to Science Planet; no visual state claims an activity completed when it has not.
- Loading states reserve the planet/mission area to avoid layout shifts and never disable the World selector indefinitely.

## Verification

- Unit tests cover subject selection, locked-world messaging, active Science/Magnet Lab selection, topic-card/landmark parity, and 2D fallback parity.
- Magnet Lab tests cover attraction classification, incorrect attempts, success feedback, exit/return to Science Planet, and keyboard/button completion.
- Existing Maths mission, gesture, camera, parent, event, and fallback tests stay intact; the new hub must not change their event semantics.
- Browser coverage verifies the splash-to-Worlds path, Science entry, Maths/Numeria entry, English/Bahasa Melayu locked states, Magnet Lab desktop and 390 by 844 mobile paths, focus order, reduced motion, and a forced WebGL fallback.
- Manual visual QA confirms an original Wiggle look, uncluttered landmark read, readable controls on cream surfaces, and no important visual loss at low quality.

## Out of Scope

- Full activities for Sink & Float Bay, pH Lab, Animal Arena, Colors Canyon, Life Cycle Garden, English, or Bahasa Melayu.
- A fake completion/progress system for unfinished lessons.
- Replacing the fraction mission, existing parent flow, gesture/pizza flow, or Maths world behavior.
- Remote GLB/texture pipelines, photorealistic models, compulsory camera permission, auto-playing sound, or copied reference assets/layout.
