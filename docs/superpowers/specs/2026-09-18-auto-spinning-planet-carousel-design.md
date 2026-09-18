# Auto-Spinning Planet Carousel Design

## Goal

Make the subject planets rotate automatically so the homepage feels alive and spatial without distracting from labels, navigation, or selection.

## Motion Direction

Every rendered planet rotates continuously around its vertical axis. The selected center planet turns at approximately `0.12` radians per second, completing a revolution in about 52 seconds. Side planets turn at `0.075` radians per second, completing a revolution in about 84 seconds. The difference reinforces focus without making the side worlds appear frozen.

The rotation uses frame delta rather than elapsed clock time, so speed remains consistent across devices and frame rates. Delta is capped at `0.05` seconds to prevent a visible jump after background-tab or rendering pauses.

## Interaction

- Pressing a planet pauses its rotation immediately.
- Releasing or cancelling the pointer resumes rotation.
- Carousel position, scale interpolation, click behavior, swipe navigation, and locked-world behavior remain unchanged.
- Rotation affects the planet model only. Lock markers remain upright and readable.

## Accessibility and Comfort

- When `prefers-reduced-motion: reduce` is active, automatic rotation is disabled.
- The existing `reducedMotion` prop remains the single motion-control input from `WorldsConstellation` through `WorldsConstellationScene` to `PlanetCarousel`.
- No new toggle or setting is added.

## Architecture

`PlanetCarousel.tsx` receives no new external prop. Each `Planet` keeps its existing outer group for carousel position and scale. A new inner visual-group ref owns only the accumulated Y rotation. `useFrame` continues to interpolate position and scale, then advances the visual group when motion is allowed and the pointer is not pressed.

This separation prevents automatic spin from overwriting the planet’s authored tilt or affecting the front-facing lock marker.

## Performance

The feature adds one numeric rotation update per visible planet per rendered frame. It creates no React state updates during animation, introduces no dependency, and allocates no objects inside the frame loop.

## Validation

- Unit-test the spin helper or frame callback for selected speed, side speed, delta capping, pause state, and reduced-motion behavior.
- Confirm existing carousel selection and locked-world tests still pass.
- Verify in a browser that center and side planets rotate smoothly, pressing pauses rotation, carousel navigation remains stable, and reduced-motion stops rotation.

## Out of Scope

- Changing carousel slide timing or camera movement.
- Adding inertia, user-controlled planet dragging, or a motion settings panel.
- Rotating lock markers with locked planets.
