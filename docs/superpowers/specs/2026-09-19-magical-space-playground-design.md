# Magical Space Playground Design

## Goal

Make the Worlds hub feel like an impressive, dimensional space playground for children with ADHD while preserving a calm visual hierarchy and the existing planet-selection flow.

## Visual hierarchy

The selected planet remains the only dominant object. Neighboring planets stay smaller and quieter. Decorative depth is concentrated around the edges and behind the carousel so it supports orientation without competing with the current action.

## 3D environment

- Add two sparse star-depth layers with different sizes and very slow drift.
- Add a low-contrast nebula glow using translucent 3D forms behind the planets.
- Add one small friendly explorer satellite that floats near the upper edge and never overlaps controls.
- Add an occasional shooting star with a long resting interval rather than continuous motion.
- Add a soft halo behind the selected planet to make focus immediately obvious.
- Do not restore orbit rings, clouds, asteroid belts, or constellation guide lines.

## ADHD-friendly motion

Only the selected planet and one ambient object may visibly move at the same time. Ambient animation is slow, predictable, and non-interactive. Reduced-motion mode freezes drift, satellite bobbing, and shooting stars while preserving all visual depth.

## Interaction and accessibility

Existing arrows, swipe navigation, disabled coming-soon controls, centered locks, and planet click behavior remain unchanged. Decorative geometry is not interactive and is hidden from accessibility APIs through the existing canvas treatment.

## Performance

Use low-poly procedural geometry and instancing only. High quality uses more stars; low quality uses fewer. No textures, network assets, post-processing pipeline, or new package dependencies.

## Verification

Existing world-selection tests must continue to pass. Add focused tests for deterministic decoration counts and verify reduced-motion state continues to reach the 3D scene.
