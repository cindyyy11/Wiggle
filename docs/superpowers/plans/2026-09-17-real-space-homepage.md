# Real-Space Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the subject-world chooser into a believable deep-space homepage with constellation details and deliberate mission-control buttons while preserving all existing behavior.

**Architecture:** Keep routing, React state, Three.js planet rendering, and event handlers unchanged. Add one inert decorative constellation layer in `WorldSelector.tsx`, then replace the appended carousel CSS in `SubjectWorlds.module.css` with a cohesive dark-space visual system and responsive/reduced-motion rules.

**Tech Stack:** Next.js 15, React 19, CSS Modules, Vitest, Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-09-17-real-space-homepage-design.md`

## Global Constraints

- Work directly on the existing `main` branch.
- Add no runtime dependencies or remote image assets.
- Preserve the existing Wiggle wordmark, page copy, routes, sound hooks, swipe navigation, locked-world behavior, parent entry, Twin launcher, and planet rendering.
- Use one dark page theme, one pale-cyan interaction accent, warm off-white primary text, and muted blue-gray secondary text.
- Keep touch targets at least 44 by 44 pixels and CTA labels on one line.
- Stop ambient drift and eliminate large movement when `prefers-reduced-motion: reduce` is active.
- Do not add decorative emoji other than the user-requested `🔒` availability symbol; avoid glassmorphism, excessive bloom, serif display type, and fully rounded pill controls.

---

## File Map

- Modify `apps/web/components/worlds/WorldSelector.tsx`: add the decorative constellation chart hook and show the user-requested lock symbol with plain availability text.
- Modify `apps/web/components/worlds/SubjectWorlds.module.css`: implement the deep-space atmosphere, constellation chart, typography, controls, responsive rules, and reduced-motion behavior.
- Modify `apps/web/components/worlds/SubjectWorlds.test.tsx`: lock the visible text and accessibility contract while retaining existing navigation regression coverage.
- Inspect `apps/web/tests/browser/subject-worlds.spec.ts`: reuse existing browser coverage; only modify it if a selector depends on removed visible emoji text.

### Task 1: Lock the selector content and accessibility contract

**Files:**
- Modify: `apps/web/components/worlds/SubjectWorlds.test.tsx`
- Modify: `apps/web/components/worlds/WorldSelector.tsx`

**Interfaces:**
- Consumes: existing `WorldSelectorProps` and `SubjectWorldId` values.
- Produces: decorative `.starChart` element with `aria-hidden="true"`; unchanged accessible names such as `English (coming soon)` and `Show English`; visible locked labels with a decorative `🔒` symbol.

- [ ] **Step 1: Add a failing regression assertion**

In the locked-world test, after selecting English, assert the plain visible labels and absence of lock emoji:

```tsx
expect(screen.getByText("Coming soon", { selector: "span" })).toBeTruthy();
expect(document.body.textContent).not.toContain("🔒");
expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test --workspace @wiggle/web -- apps/web/components/worlds/SubjectWorlds.test.tsx
```

Expected: FAIL because the selector still renders the lock emoji and has no constellation decoration hook.

- [ ] **Step 3: Update selector markup without changing handlers**

Add the decoration as the first child of the selector and keep it non-interactive:

```tsx
<section className={`${styles.selector} ${styles.carouselSelector}`} aria-label="Choose a subject world">
  <div className={styles.starChart} aria-hidden="true" />
  {/* existing header, navigation, caption, and status */}
</section>
```

Replace the locked CTA and tab display strings while preserving their accessible names:

```tsx
<button
  className={styles.carouselEnter}
  aria-label={locked ? `${world.name} (coming soon)` : `Explore ${world.name}`}
  aria-describedby={locked ? "world-lock-status" : undefined}
  onClick={() => onSelect(selectedWorld)}
>
  <span>{locked ? "Coming soon" : `Explore ${selectedWorld === "math" ? "Numeria" : "Science Planet"}`}</span>
  <span aria-hidden="true">{locked ? "Locked" : "↗"}</span>
</button>
```

For subject tabs, use `BM · Soon` and `English · Soon` as visible strings while leaving the existing `aria-label` expressions unchanged.

- [ ] **Step 4: Run the focused test and verify it passes**

Run the Task 1 test command again. Expected: all `SubjectWorlds.test.tsx` tests PASS.

- [ ] **Step 5: Commit the markup contract**

```bash
git add apps/web/components/worlds/WorldSelector.tsx apps/web/components/worlds/SubjectWorlds.test.tsx
git commit -m "refactor: clarify world selector controls"
```

### Task 2: Build the real-space atmosphere and constellation chart

**Files:**
- Modify: `apps/web/components/worlds/SubjectWorlds.module.css`

**Interfaces:**
- Consumes: `.worldsView`, `.starChart`, `.constellationLayer`, `.carouselSelector`, and existing Three.js canvas stacking.
- Produces: three visual depth layers ordered as atmosphere, constellation chart, planet canvas, then controls.

- [ ] **Step 1: Record the expected layer contract in CSS**

Add a short comment directly above the homepage override block:

```css
/* Homepage depth: atmosphere < star chart < planet canvas < controls. */
```

This comment is the review anchor for checking stacking contexts during visual validation.

- [ ] **Step 2: Replace the current bright background override**

Implement a near-black base with offset dust fields:

```css
.worldsView {
  isolation: isolate;
  background:
    radial-gradient(ellipse at 16% 20%, rgb(54 82 129 / 18%) 0, transparent 38%),
    radial-gradient(ellipse at 78% 68%, rgb(38 92 116 / 13%) 0, transparent 34%),
    radial-gradient(ellipse at 52% 112%, rgb(72 54 112 / 14%) 0, transparent 42%),
    linear-gradient(164deg, #07101d 0%, #030711 52%, #010307 100%);
}
```

Rewrite `.worldsView::before` as the distant star field. Use at least six radial-gradient layers with different `background-size` values, sub-2-pixel points, and opacity below `.75`. Keep `pointer-events: none`, `z-index: -2`, and the existing slow drift animation.

- [ ] **Step 3: Implement the decorative chart**

Style `.starChart` as an absolute, inert layer below the canvas. Use a percent-encoded SVG background containing thin line segments and circle nodes:

```css
.starChart {
  position: absolute;
  inset: 12% 7% 24%;
  z-index: -1;
  pointer-events: none;
  opacity: .34;
  background: center / contain no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'%3E%3Cg fill='none' stroke='%238db5ce' stroke-opacity='.42' stroke-width='1'%3E%3Cpath d='M70 380 190 270 318 322 442 205 565 260M742 118 825 190 940 148 1068 232M780 430 900 355 1035 418 1140 330'/%3E%3C/g%3E%3Cg fill='%23d9edf7'%3E%3Ccircle cx='70' cy='380' r='3'/%3E%3Ccircle cx='190' cy='270' r='2'/%3E%3Ccircle cx='318' cy='322' r='3'/%3E%3Ccircle cx='442' cy='205' r='2'/%3E%3Ccircle cx='565' cy='260' r='4'/%3E%3Ccircle cx='742' cy='118' r='2'/%3E%3Ccircle cx='825' cy='190' r='3'/%3E%3Ccircle cx='940' cy='148' r='2'/%3E%3Ccircle cx='1068' cy='232' r='3'/%3E%3Ccircle cx='780' cy='430' r='2'/%3E%3Ccircle cx='900' cy='355' r='3'/%3E%3Ccircle cx='1035' cy='418' r='2'/%3E%3Ccircle cx='1140' cy='330' r='3'/%3E%3C/g%3E%3C/svg%3E");
}
```

- [ ] **Step 4: Verify CSS parses and component tests remain green**

Run:

```bash
npm run lint --workspace @wiggle/web
npm test --workspace @wiggle/web -- apps/web/components/worlds/SubjectWorlds.test.tsx
```

Expected: lint and tests PASS.

- [ ] **Step 5: Commit the space environment**

```bash
git add apps/web/components/worlds/SubjectWorlds.module.css
git commit -m "feat: deepen the homepage space environment"
```

### Task 3: Replace generic controls with mission-control styling

**Files:**
- Modify: `apps/web/components/worlds/SubjectWorlds.module.css`

**Interfaces:**
- Consumes: existing `.carouselArrow`, `.carouselEnter`, `.subjectTabs`, `.carouselCaption`, and state attributes.
- Produces: square navigation controls, rectangular primary action, segmented subject rail, and consistent focus states.

- [ ] **Step 1: Restyle the title and caption hierarchy**

Use the existing sans-serif stack for `.carouselCaption h1`, reduce decorative glow, and keep title scaling within `clamp(34px, 4.5vw, 58px)`. Keep eyebrow copy uppercase but lower letter spacing to `2.4px`; secondary copy uses `#aebfd0`.

- [ ] **Step 2: Implement physical carousel controls**

Replace the circular translucent style with:

```css
.carouselArrow {
  width: 48px;
  height: 48px;
  border: 1px solid #527087;
  border-radius: 10px;
  background: #091522;
  box-shadow: inset 0 1px rgb(255 255 255 / 8%), 0 8px 24px rgb(0 0 0 / 28%);
  color: #edf5f7;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}
.carouselArrow:not(:disabled):hover { transform: translateY(-2px); border-color: #8dd9e7; background: #0d1c2b; }
.carouselArrow:not(:disabled):active { transform: translateY(1px); }
.carouselArrow:disabled { opacity: .28; }
```

- [ ] **Step 3: Implement the primary action and subject rail**

Give `.carouselEnter` a 10-pixel radius, warm off-white surface, navy text, visible border, inline flex layout, and 160-millisecond press feedback. Style `.subjectTabs` as one dark rectangular rail with 12-pixel radius and 1-pixel border. Make its children rectangular, transparent controls; indicate `aria-pressed="true"` with pale-cyan text and an inset bottom edge instead of a filled pill.

- [ ] **Step 4: Add keyboard, mobile, and reduced-motion rules**

Use one focus ring for all controls:

```css
.carouselArrow:focus-visible,
.carouselEnter:focus-visible,
.subjectTabs button:focus-visible {
  outline: 3px solid #8dd9e7;
  outline-offset: 4px;
}
```

At `max-width: 680px`, keep arrows at 44 by 44 pixels, reduce `.starChart` opacity to `.22`, and ensure the CTA and tabs do not overlap the status region. In the existing reduced-motion query, set star animation to `none` and all carousel control transitions to `none`.

- [ ] **Step 5: Run static and component verification**

Run:

```bash
npm run typecheck --workspace @wiggle/web
npm run lint --workspace @wiggle/web
npm test --workspace @wiggle/web -- apps/web/components/worlds/SubjectWorlds.test.tsx apps/web/components/worlds/WorldsConstellation.test.tsx
```

Expected: all commands PASS.

- [ ] **Step 6: Commit the control redesign**

```bash
git add apps/web/components/worlds/SubjectWorlds.module.css
git commit -m "feat: redesign homepage mission controls"
```

### Task 4: Validate the finished homepage visually and behaviorally

**Files:**
- Inspect: `apps/web/tests/browser/subject-worlds.spec.ts`
- Modify only if required: `apps/web/tests/browser/subject-worlds.spec.ts`
- Inspect: `design-qa.md`

**Interfaces:**
- Consumes: finished homepage at `/` after the splash completes.
- Produces: verified desktop, mobile, keyboard, locked-world, swipe, and reduced-motion behavior.

- [ ] **Step 1: Run the existing browser test**

```bash
npm run test:e2e --workspace @wiggle/web -- apps/web/tests/browser/subject-worlds.spec.ts
```

Expected: all existing subject-world browser tests PASS without selector changes.

- [ ] **Step 2: Inspect desktop and mobile layouts**

Start the app with `npm run dev --workspace @wiggle/web`, then inspect `/` at 1440 by 900 and 390 by 844. Confirm:

- the background reads as near-black astronomical space rather than a purple gradient;
- stars vary in size and brightness without obvious repetition;
- constellation lines remain subtle and do not cross key copy;
- planet artwork remains the strongest visual element;
- arrows, CTA, subject rail, Parent entry, and Twin launcher do not overlap;
- all controls retain at least 44-pixel touch targets;
- the CTA stays on one line.

- [ ] **Step 3: Inspect interaction states**

Keyboard-tab through previous, next, primary action, and all subject tabs. Confirm the cyan focus ring is always visible. Select both available worlds, attempt both locked worlds, swipe between planets, and verify the route/status behavior is unchanged.

- [ ] **Step 4: Inspect reduced motion**

Emulate `prefers-reduced-motion: reduce`, reload `/`, and confirm star drift stops and controls do not translate while selection and focus feedback remain visible.

- [ ] **Step 5: Run the complete web verification**

```bash
npm run typecheck --workspace @wiggle/web
npm run lint --workspace @wiggle/web
npm test --workspace @wiggle/web
```

Expected: all commands PASS.

- [ ] **Step 6: Commit any browser-test adjustment**

If the existing browser selectors required an accessibility-preserving text update:

```bash
git add apps/web/tests/browser/subject-worlds.spec.ts
git commit -m "test: cover real-space homepage controls"
```

If no test file changed, do not create an empty commit.
