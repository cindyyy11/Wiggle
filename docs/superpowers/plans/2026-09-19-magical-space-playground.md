# Magical Space Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an ADHD-friendly, dimensional space-playground backdrop to the Worlds hub.

**Architecture:** Create a focused React Three Fiber dressing component containing instanced stars, nebula forms, a low-poly satellite, a restrained shooting star, and a selected-planet halo. Mount it behind the existing carousel and reuse current quality and reduced-motion inputs.

**Tech Stack:** React, React Three Fiber, Three.js, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-magical-space-playground-design.md`

## Global Constraints

- Do not restore orbit rings, clouds, asteroid belts, or constellation lines.
- Do not add dependencies or remote assets.
- Keep the selected planet as the dominant object.
- Freeze ambient animation when reduced motion is enabled.

### Task 1: Build the space-playground dressing

**Files:**
- Create: `apps/web/components/worlds/SpacePlaygroundDressings.tsx`
- Create: `apps/web/components/worlds/SpacePlaygroundDressings.test.ts`

- [x] Define deterministic high/low star counts.
- [x] Render sparse depth stars, nebula forms, selected-planet halo, explorer satellite, and shooting star.
- [x] Gate all ambient animation with `reducedMotion`.

### Task 2: Integrate with the carousel scene

**Files:**
- Modify: `apps/web/components/worlds/WorldsConstellationScene.tsx`
- Test: `apps/web/components/worlds/WorldsConstellationScene.test.tsx`

- [x] Mount the dressing behind `PlanetCarousel` using the selected world, quality, and reduced-motion values.
- [x] Preserve renderer health monitoring and carousel interactions.

### Task 3: Verify

**Files:**
- Test: `apps/web/components/worlds/SubjectWorlds.test.tsx`
- Test: `apps/web/components/worlds/SpacePlaygroundDressings.test.ts`

- [x] Run the focused Worlds tests.
- [x] Run `git diff --check` and inspect for forbidden backdrop elements.
