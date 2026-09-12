# Splash Wiggle Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ready-state Wiggle splash logo continuously wiggle without moving the call to action or changing the splash exit flow.

**Architecture:** Keep the feature entirely in the mission CSS module. A selector scoped to the ready splash applies a transform-only keyframe animation to the existing brand image; `.splashLeaving` naturally removes that selector during the current fade-and-scale exit. A focused browser test reads computed styles at the public splash boundary, where CSS Modules and reduced-motion media queries are both observable.

**Tech Stack:** Next.js 15, React 19, CSS Modules, Playwright, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-12-splash-wiggle-motion-design.md`

## Global Constraints

- Change only `apps/web/components/mission/mission.module.css` and `apps/web/tests/browser/mission.spec.ts`.
- Animate `.splashBrand` only while `.splash` is not `.splashLeaving`; the button and overlay must remain still.
- Use a 1.6-second infinite, transform-only horizontal-and-rotational wiggle that returns to neutral at the loop boundary.
- Preserve the existing 320 ms `.splashLeaving` fade-and-scale exit, all splash markup/state/audio behavior, routes, assets, and Universe behavior.
- Under `prefers-reduced-motion: reduce`, disable both the decorative brand animation and the splash transition.
- Add no dependencies, JavaScript timers, or application state.

---

### Task 1: Verify and implement ready-state splash logo motion

**Files:**
- Modify: `apps/web/tests/browser/mission.spec.ts:1-35`
- Modify: `apps/web/components/mission/mission.module.css:18-25`
- Test: `apps/web/tests/mission/splash.test.tsx`

**Interfaces:**
- Consumes: The existing splash image `img[alt="Wiggle. Wonder. Wow!"]`, the `Let's Wiggle` native button, `.splash`, `.splashBrand`, and `.splashLeaving` classes.
- Produces: A browser-observable, infinite logo animation during the ready state; static controls and reduced-motion-compatible styling.

- [ ] **Step 1: Write the failing browser regression test**

  Add these tests before the existing mission-completion loop in `apps/web/tests/browser/mission.spec.ts`:

  ```ts
  test("the splash keeps the Wiggle logo moving while its button stays still", async ({ page }) => {
    await page.goto("/");

    const brand = page.getByRole("img", { name: "Wiggle. Wonder. Wow!" });
    const launch = page.getByRole("button", { name: "Let's Wiggle", exact: true });
    await expect(brand).toBeVisible();
    await expect(launch).toBeVisible();

    expect(await brand.evaluate(element => getComputedStyle(element).animationName)).not.toBe("none");
    expect(await brand.evaluate(element => getComputedStyle(element).animationIterationCount)).toBe("infinite");
    expect(await brand.evaluate(element => getComputedStyle(element).animationPlayState)).toBe("running");
    expect(await launch.evaluate(element => getComputedStyle(element).animationName)).toBe("none");

    await launch.click();
    await expect.poll(() => brand.evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  });

  test("the splash disables its decorative logo motion for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const brand = page.getByRole("img", { name: "Wiggle. Wonder. Wow!" });
    await expect(brand).toBeVisible();
    expect(await brand.evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  });
  ```

- [ ] **Step 2: Run the new browser test to verify it fails before the CSS change**

  Run:

  ```powershell
  npm run build --workspace=@wiggle/web
  npm run test:e2e --workspace=@wiggle/web -- tests/browser/mission.spec.ts --project=desktop -g "splash"
  ```

  Expected: the normal-motion assertion fails because the current brand image has `animationName === "none"`; the reduced-motion assertion passes or remains static. The build is required because Playwright starts Next with `next start`.

- [ ] **Step 3: Add the scoped transform-only logo animation**

  In `apps/web/components/mission/mission.module.css`, keep the existing `.splash`, `.splashLeaving`, `.splashBrand`, and responsive sizing rules intact. Add this rule and keyframes adjacent to `.splashBrand`:

  ```css
  .splash:not(.splashLeaving) .splashBrand{animation:splash-wiggle 1.6s ease-in-out infinite}
  @keyframes splash-wiggle{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-2px) rotate(-1.2deg)}45%{transform:translateX(2px) rotate(1.2deg)}70%{transform:translateX(-1px) rotate(-.7deg)}}
  ```

  Replace the splash portion of the reduced-motion rule with:

  ```css
  @media(prefers-reduced-motion:reduce){.splash{transition:none}.splashBrand{animation:none}}
  ```

- [ ] **Step 4: Run focused checks and confirm the behavior passes**

  Run:

  ```powershell
  npm exec vitest run tests/mission/splash.test.tsx --workspace=@wiggle/web
  npm run lint --workspace=@wiggle/web
  npm run typecheck --workspace=@wiggle/web
  npm run test:e2e --workspace=@wiggle/web -- tests/browser/mission.spec.ts --project=desktop -g "splash"
  ```

  Expected: Vitest preserves the one-click 320 ms entry guard; lint and typecheck complete with no errors; the browser tests prove the brand has a running infinite animation in normal motion, the button has no animation, exit removes the brand animation, and reduced motion removes it at initial render.

- [ ] **Step 5: Commit the implementation and its regression coverage**

  ```powershell
  git add -- apps/web/components/mission/mission.module.css apps/web/tests/browser/mission.spec.ts
  git commit -m "feat: keep Wiggle splash logo moving"
  ```
