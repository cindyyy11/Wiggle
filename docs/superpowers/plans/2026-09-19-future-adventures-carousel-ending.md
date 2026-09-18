# Simplified Planet Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Nova and the decorative orbit backdrop while keeping the multi-planet carousel and making all unavailable-world actions visibly disabled and non-clickable.

**Architecture:** Keep the existing multi-planet carousel and arrow navigation, but limit its data model to Maths, Science, Bahasa Melayu, and English. Express unavailable worlds with native disabled buttons and centered planet locks.

**Tech Stack:** Next.js, React, React Three Fiber, Three.js, CSS Modules, Vitest/Testing Library.

**Spec:** The user’s latest direction supersedes the earlier Nova ending: Nova is removed completely; neighboring planets remain visible; orbit rings, clouds, asteroids, and constellation lines are hidden; coming-soon actions cannot be clicked; locked-planet icons remain centered.

**Global Constraints**

- Preserve previous/next carousel navigation among the four remaining worlds.
- Preserve native button accessibility semantics.
- Do not change Maths or Science navigation.
- Respect reduced-motion behavior already present in the carousel.

### Task 1: Remove Nova from the world model

**Files:**
- Modify: `apps/web/components/worlds/subjectRoute.ts`
- Modify: `apps/web/components/worlds/worldOrbit.ts`
- Delete: `apps/web/components/worlds/NovaLandScenery.tsx`
- Delete: `apps/web/components/worlds/novaLands.ts`
- Test: `apps/web/components/worlds/subjectRoute.test.ts`
- Test: `apps/web/components/worlds/worldOrbit.test.ts`

- [x] Remove Nova from the subject ID union, world definitions, carousel order, and orbit metadata.
- [x] Delete the now-unused Nova scenery modules.
- [x] Update route and orbit tests for the four-world model.

### Task 2: Simplify the carousel presentation

**Files:**
- Modify: `apps/web/components/worlds/PlanetCarousel.tsx`
- Modify: `apps/web/components/worlds/WorldSelector.tsx`
- Modify: `apps/web/components/worlds/SubjectWorlds.module.css`

- [x] Preserve neighboring planets around the selected planet in the carousel.
- [x] Keep the lock geometry centered over selected mystery planets.
- [x] Apply native `disabled` behavior and a clear disabled visual state to coming-soon buttons.
- [x] Remove orbit rings, decorative clouds, the asteroid belt, and constellation guide lines from the rendered backdrop.

### Task 3: Verify behavior

**Files:**
- Test: `apps/web/components/worlds/SubjectWorlds.test.tsx`

- [x] Update tests so clicking disabled unavailable-world actions produces no navigation or status change.
- [x] Run focused world tests.
- [x] Run TypeScript verification and inspect the diff for stale Nova references. TypeScript reaches one unrelated existing matcher-type error in `ParentEntryLink.test.tsx`; the modified world files produce no errors.
