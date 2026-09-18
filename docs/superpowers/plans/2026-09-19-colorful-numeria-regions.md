# Colorful Numeria Regions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give playable Numeria four colorful, readable Maths regions while retaining centered locks only on unavailable English and Bahasa Melayu planets.

**Architecture:** Reuse Numeria’s four existing landmark destinations as region centers. Color each terrain vertex by its nearest landmark, add a restrained cream transition line between regions, and preserve every existing navigation and interaction path.

**Tech Stack:** React, React Three Fiber, Three.js, Vitest.

**Spec:** Approved conversation design: organic green, yellow, sky-blue, and coral regions for Fraction Forest, Number Valley, Geometry Ridge, and Crystal Crater; Numeria remains playable; locks remain limited to English and Bahasa Melayu.

## Global Constraints

- Numeria must remain enterable.
- English and Bahasa Melayu retain centered lock geometry and disabled actions.
- No new dependencies or textures.
- Region coloring must work at both high and low scene quality.

### Task 1: Define the four-region terrain

**Files:**
- Modify: `apps/web/components/universe/Numeria.tsx`
- Test: `apps/web/components/worlds/PlanetCarousel.test.ts`

- [x] Replace the mostly green Maths terrain rule with full nearest-landmark region coverage.
- [x] Use brighter green, yellow, blue, and coral colors with subtle per-face variation.
- [x] Add a narrow warm-cream transition where two region influences are nearly equal.
- [x] Confirm Numeria remains playable and locked planets keep their centered locks.

### Task 2: Verify

**Files:**
- Test: `apps/web/components/worlds/PlanetCarousel.test.ts`
- Test: `apps/web/components/worlds/SubjectWorlds.test.tsx`

- [x] Run focused carousel and worlds tests.
- [x] Run `git diff --check` and inspect for changes to Numeria availability.
