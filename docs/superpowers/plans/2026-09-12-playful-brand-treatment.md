# Playful Brand Treatment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-only product mark with the supplied compact character logo, add a matching favicon, and give the learning universe restrained, kid-friendly visual feedback.

**Architecture:** Keep the supplied JPEG as the canonical source in `public/brand`; derive web-optimised header and icon variants during the change. `UniverseCanvas` remains responsible for the header mark while its existing CSS module owns palette, interaction, reduced-motion, and selected-state styling. Next metadata declares the favicon at the application boundary.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, Vitest, Next metadata.

**Spec:** `docs/superpowers/specs/2026-09-12-playful-brand-design.md`

## Global Constraints

- Preserve 44 px touch targets, focus rings, semantic labels and the 2D fallback.
- Use the compact blue `w` character in the learning HUD; do not put the full lock-up or tagline in the HUD.
- Keep current layout, learning copy, navigation destinations and fallback-map behavior.
- Use only transform and opacity for positional/decorative motion; use explicit short transitions.
- Under `prefers-reduced-motion`, remove positional movement while preserving comprehensible state changes.
- Do not add a dependency for branding or motion.

---

### Task 1: Produce and register compact brand assets

**Files:**

- Create: `apps/web/public/brand/wiggle-mark.png`
- Create: `apps/web/app/icon.png`
- Modify: `apps/web/app/layout.tsx:4-8`

**Interfaces:**

- Consumes: supplied source image `C:/Users/User/Downloads/Wiggle Logo.jpeg`.
- Produces: `/brand/wiggle-mark.png`, a tightly-cropped compact mark for the header, and `app/icon.png`, a square browser icon.

- [ ] **Step 1: Inspect source dimensions and current public asset conventions**

Run: `Get-ChildItem apps/web/public -Force -Recurse; magick identify "C:/Users/User/Downloads/Wiggle Logo.jpeg"`

Expected: a source image is available and any existing icon convention is visible.

- [ ] **Step 2: Create the logo variants**

Use ImageMagick or the available image runtime to crop the blue-eyed `w` character from the supplied JPEG. Export a high-density header PNG to `apps/web/public/brand/wiggle-mark.png`, then create a square, readable `apps/web/app/icon.png` from that character with sufficient cream padding.

- [ ] **Step 3: Declare the brand-aware metadata**

Update `apps/web/app/layout.tsx` so `metadata` includes:

```ts
icons: { icon: "/icon.png" }
```

Keep the current title and description unchanged.

- [ ] **Step 4: Verify generated images and metadata**

Run: `npm run typecheck --workspace=@wiggle/web`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

Run: `git add apps/web/public/brand/wiggle-mark.png apps/web/app/icon.png apps/web/app/layout.tsx; git commit -m "feat: add Wiggle brand assets"`

### Task 2: Replace the HUD wordmark with the compact character mark

**Files:**

- Modify: `apps/web/components/universe/UniverseCanvas.tsx:95`
- Modify: `apps/web/components/universe/universe.module.css:6-7`
- Test: `apps/web/components/universe/UniverseCanvas.test.tsx`

**Interfaces:**

- Consumes: `/brand/wiggle-mark.png` from Task 1.
- Produces: a home link named `Wiggle home` containing a decorative image with empty `alt`, so the link alone supplies the accessible name.

- [ ] **Step 1: Write the failing component assertion**

Add this case to the existing `Numeria quality and accessible controls` suite:

```tsx
it("uses the compact Wiggle mark as the accessible home link", () => {
  render(<UniverseCanvas quality="fallback" />);
  const home = screen.getByRole("link", { name: "Wiggle home" });
  const mark = home.querySelector('img[src="/brand/wiggle-mark.png"]');
  expect(mark?.getAttribute("alt")).toBe("");
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm run test --workspace=@wiggle/web -- components/universe/UniverseCanvas.test.tsx`

Expected: FAIL because the header contains text rather than the image.

- [ ] **Step 3: Implement the compact mark**

Replace the text children of the existing `aria-label="Wiggle home"` link with:

```tsx
<img className={styles.wordmarkImage} src="/brand/wiggle-mark.png" alt="" />
```

Keep the link’s `href`, `aria-label`, and pointer behavior unchanged. Add `.wordmarkImage` sizing and `object-fit: contain` styles; do not make the image itself focusable.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test --workspace=@wiggle/web -- components/universe/UniverseCanvas.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add apps/web/components/universe/UniverseCanvas.tsx apps/web/components/universe/universe.module.css apps/web/components/universe/UniverseCanvas.test.tsx; git commit -m "feat: use compact logo in universe HUD"`

### Task 3: Add restrained kid-friendly interaction and palette feedback

**Files:**

- Modify: `apps/web/components/universe/universe.module.css:1-61`
- Test: `apps/web/components/universe/UniverseCanvas.test.tsx`

**Interfaces:**

- Consumes: current `aria-pressed` attributes for destination, camera, run and slice buttons.
- Produces: brand-color CSS custom properties, named short transitions, hover-gated tactile feedback, a low-frequency header-mark float, and a reduced-motion override.

- [ ] **Step 1: Write a regression assertion for the selected destination state**

Add this assertion after selecting Fraction Forest in the fallback navigation test:

```tsx
expect(screen.getByRole("button", { name: /Visit Fraction Forest/ }).getAttribute("aria-pressed")).toBe("true");
```

- [ ] **Step 2: Run the focused test to verify the state assertion passes before styling**

Run: `npm run test --workspace=@wiggle/web -- components/universe/UniverseCanvas.test.tsx`

Expected: PASS, confirming CSS can safely target the existing state contract.

- [ ] **Step 3: Implement the brand-led CSS refinement**

At `.universe`, introduce `--wiggle-blue`, `--wiggle-green`, `--wiggle-yellow`, `--wiggle-coral`, `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, and `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`. Apply them to region symbols, selected destination borders, mission actions, pizza selection, and reward-adjacent controls without changing text content.

Use these exact interaction boundaries:

```css
.universe button { transition: background 160ms var(--ease-out), border-color 160ms var(--ease-out), color 160ms var(--ease-out), transform 120ms var(--ease-out); }
.universe button:active { transform: scale(.97); }
@media (hover: hover) and (pointer: fine) { .universe button:hover { transform: translateY(-2px); } }
.wordmarkImage { animation: mark-float 3.6s var(--ease-in-out) infinite alternate; }
@keyframes mark-float { to { transform: translateY(-4px) rotate(-2deg); } }
@media (prefers-reduced-motion: reduce) { .wordmarkImage { animation: none; } .universe button:active { transform: none; } }
```

Do not use `transition: all`, animate layout-affecting properties, or move text content. Maintain the current focus-visible outline.

- [ ] **Step 4: Run component tests and lint**

Run: `npm run test --workspace=@wiggle/web -- components/universe/UniverseCanvas.test.tsx; npm run lint --workspace=@wiggle/web`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add apps/web/components/universe/universe.module.css apps/web/components/universe/UniverseCanvas.test.tsx; git commit -m "feat: add playful universe interaction feedback"`

### Task 4: Verify the complete branded experience

**Files:**

- Verify: `apps/web/app/layout.tsx`
- Verify: `apps/web/components/universe/UniverseCanvas.tsx`
- Verify: `apps/web/components/universe/universe.module.css`
- Verify: `apps/web/public/brand/wiggle-mark.png`
- Verify: `apps/web/app/icon.png`

**Interfaces:**

- Consumes: completed Tasks 1–3.
- Produces: a verified, mobile-safe branded learning interface.

- [ ] **Step 1: Run static verification**

Run: `npm run lint --workspace=@wiggle/web; npm run typecheck --workspace=@wiggle/web`

Expected: PASS.

- [ ] **Step 2: Run focused browser coverage**

Run: `npm run test:e2e --workspace=@wiggle/web -- tests/browser/universe.spec.ts`

Expected: PASS, confirming the 3D experience and fallback controls continue to work.

- [ ] **Step 3: Visually inspect desktop and mobile**

Run the existing local web server and capture the home screen at 1440x900 and 390x844. Confirm that the compact mark is crisp, does not overlap view controls, destination/card text remains readable, focus rings are visible, and reduced motion removes the mark’s positional movement.

- [ ] **Step 4: Commit verification-only changes if any were needed**

Run: `git status --short`, then stage only files altered to correct verification findings and commit them as `test: verify branded universe experience`.
