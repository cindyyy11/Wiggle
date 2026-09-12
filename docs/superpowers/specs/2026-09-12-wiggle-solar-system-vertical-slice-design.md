# Wiggle Solar-System Vertical Slice Design

## Goal

Turn the existing Numeria fraction prototype into a recognisably Wiggle learning universe: a calm, branded opening and miniature solar-system hub that leads into one polished Fraction Forest journey. The working adaptive learning loop, spherical movement, accessibility fallbacks, parent route, and API contracts remain in place.

## Product Boundary

This is an additive vertical slice, not a rewrite. The child can enter the universe, select and travel between five original subject destinations, enter Numeria, complete a tactile three-quarters pizza challenge, request support, discover a wonder, and open a lightweight Space Log. Numeria is the only fully explorable subject world in this slice.

- **Numeria** is playable and contains Number Valley, Fraction Forest, Geometry Garden, and Star Challenge landmarks. Fraction Forest is the active mission.
- **Lexicon**, **NovaLab**, **Reset Moon**, and **My Constellation** are original, clickable low-detail solar-system destinations. Selecting one runs the same short travel treatment and updates the destination card; its preview clearly says that its full adventure is still growing.
- The child-facing product never shows learner friction scores, simulation rankings, or Digital Twin terminology. Those behaviours remain behind the existing API and parent experience.
- The design does not recreate Little Planet's code, models, visual layout, copy, or assets. It takes only the high-level principles of one calm world, contextual proximity actions, a compact journal, and simple camera controls.

## Experience Flow

1. A warm cream opening screen introduces the supplied Wiggle logo, the line “Wiggle. Wonder. Wow!”, and Lexi's short greeting. A single “Let's Wiggle” action begins play.
2. A miniature storybook solar system appears on a cream-to-pale-blue cosmic backdrop. Planet selection and a 2–4 second curved travel transition make the destination feel nearby and understandable.
3. Entering Numeria mounts the existing spherical world and its supported controls: click/tap-to-walk, WASD/arrows, Shift, Space, touch movement controls, drag orbit, and zoom.
4. Near Fraction Forest, Lexi offers a short contextual invitation. Entering it presents a large 3D pizza and one prompt: “Can you make 3/4?”
5. The child drags three equal pizza slices to a plate. Pointer, touch, keyboard, and button controls remain equivalent.
6. Success produces a small star sparkle, Lexi bob/jump, a calm reward message, a Wiggle Wonder discovery, and a Space Log update. There is no confetti burst or noisy reward loop.
7. “I'm stuck” immediately activates Wiggle Shift: unrelated scenery softens, the camera moves closer unless reduced motion is active, Lexi approaches, the task is reduced to “Move one slice first,” and the next step appears only after success.

## Visual System

The supplied logo establishes the palette and shape language: warm cream, sky blue, mustard, sage, coral, and friendly navy. All new UI uses large pill controls, rounded geometry, matte clay-like materials, gentle shadows, and a legible rounded sans-serif. Space remains warm and sparse; it is never photorealistic, black-horror, neon, or dashboard-like.

Lexi is an original floating sky-blue companion with expressive eyes, a mustard antenna accent, gentle bobbing, captions, and concise speech bubbles. The logo source at `C:/Users/User/Downloads/Wiggle Logo.jpeg` is copied into the public brand assets; the crop is used as a home mark and favicon without modifying the source image.

## Architecture

`MissionAtlas` continues to own session, adaptation, event, and completion behaviour. New presentation components wrap rather than duplicate it:

- `WiggleExperience` owns opening, solar hub, Numeria, and preview destination phases.
- A small Zustand `worldStore` holds only declarative UI state: phase, selected planet, camera preference, discovered wonder IDs, Space Log visibility, sound preference, and reduced-motion override. It never receives frame-by-frame position updates.
- `SolarSystemScene`, `PlanetPreview`, and `LexiCompanion` are procedural R3F components with shared matte materials and low-detail distant geometry.
- `UniverseCanvas` and its 2D fallback remain the Numeria rendering boundary. The new shell must pass existing camera, quality, mission, and input paths through unchanged.
- Framer Motion animates DOM overlays and panel entrance/exit only. R3F `useFrame` continues to animate 3D motion without React render loops.
- Existing fraction mission components retain their public API where practical. The simulation chooser is replaced in the child path by an authored Wiggle Shift state that invokes the existing adaptation selection internally.

## Accessibility, Performance, and Error Behaviour

- Every core action has pointer, keyboard, and touch access. Dragging slices additionally has labelled selection buttons and standard focus order.
- `J` opens My Space Log; Escape closes noncritical panels. Lexi speech is exposed as visible text and live status updates.
- Reduced motion removes camera flights, decorative orbital movement, Lexi jumps, and nonessential sparkle motion while preserving feedback with opacity and copy.
- Audio is opt-in, muted by default, and controllable from the compact HUD. It must not block success or learning.
- The existing WebGL feature test, 2D map fallback, device-quality selection, and lowered-quality renderer behaviour remain working. Unsupported graphics still permit the complete mission.
- The solar system uses primitives, instancing for repeated decorations, a sparse capped star field, and only active Numeria receives high world detail. No additional model downloads are required for the vertical slice.

## Data and Persistence

Planet metadata, landmark labels, preview copy, and Wonder definitions are configuration-driven data rather than component literals. In this slice, completed wonders and Space Log state persist in browser storage under a versioned key and are safe to clear; mission completion and learning events continue through the existing backend/API queue. This separation avoids expanding the database schema for cosmetic prototype progress.

## Verification

Automated coverage must verify the opening-to-hub flow, planet selection, Numeria entry, Space Log keyboard opening, a persistent accessible “I'm stuck” path, slice interaction equivalence, reduced-motion treatment, and fallback completion. Existing `MissionAtlas`, universe camera/movement, gesture fallback, event queue, and browser suites must continue to pass. Manual visual QA covers desktop and 390 × 844 mobile at both WebGL and fallback states.

## Out of Scope

The vertical slice does not ship five complete learning worlds, server-synced cosmetic discovery collection, realistic physics, a general child chatbot, auto-playing music, new account flows, GLTF asset production, or MediaPipe as a required input. These can be expanded after the Numeria hub validates the experience.
