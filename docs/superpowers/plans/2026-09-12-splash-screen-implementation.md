# Splash Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Turn the incomplete Wiggle launch splash into an accessible, single-activation, full-screen entry point for Mission Atlas.

**Architecture:** Keep splash lifecycle state inside MissionAtlas, which already owns the initial experience for both demo and authenticated-child routes. A short leaving state keeps the native launch button visible but disabled while the best-effort audio cue plays; one cleanup-safe timer then reveals the unchanged UniverseCanvas. The CSS module owns visual layout and reduced-motion behavior, while tests explicitly enter through the new gate before exercising their existing mission assertions.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, Vitest, React Testing Library.

**Spec:** docs/superpowers/specs/2026-09-12-splash-screen-design.md

## Global Constraints

- Keep the explicit user-initiated **Let's Wiggle** action; do not auto-advance.
- Use the existing /brand/wiggle-full.jpeg asset and do not overwrite user-owned brand files.
- Do not restore WiggleExperience, alter page.tsx, change authentication, or alter mission/session/learning behavior.
- The optional start sound must never prevent entry when audio is unsupported or blocked.
- Use a semantic native button with a visible focus treatment and at least a 44px target.
- The splash must cover the viewport, be responsive, and disable motion transitions for prefers-reduced-motion.
- Preserve unrelated working-tree changes in MissionAtlas.tsx, mission.module.css, universe components, gesture code, and existing tests.

---

## File structure

- apps/web/components/mission/MissionAtlas.tsx — owns internal launch lifecycle, timer cleanup, optional audio cue, and semantic splash markup before rendering the existing universe.
- apps/web/components/mission/mission.module.css — adds isolated splash layout, button, leaving-state, responsive, focus, and reduced-motion styles.
- apps/web/tests/mission/splash.test.tsx — proves the launch control is semantic, keyboard-equivalent, single-flight, and reveals the current atlas entry point.
- apps/web/tests/mission/hero-loop.test.tsx — updates existing end-to-end-in-component mission flows to pass through the splash once per render.
- apps/web/tests/mission/completion.test.tsx — updates completion telemetry flows to pass through the splash.
- apps/web/tests/accessibility/input-equivalence.test.tsx — updates accessibility/gesture flows to pass through the same real entry action.
- apps/web/tests/browser/helpers.ts — provides a browser-only `launchWiggle(page)` helper that clicks the real launch button and waits for the universe.
- apps/web/tests/browser/mission.spec.ts, supports.spec.ts, and universe.spec.ts — call that helper after every direct root navigation.
- apps/web/e2e/helpers.ts — makes `startMission(page)` launch Wiggle before waiting for and clicking the unchanged mission CTA.
- apps/web/e2e/hero-loop.spec.ts — uses its existing real-tab keyboard helper to activate **Let's Wiggle** before the rest of the keyboard-only journey.

### Task 1: Characterize the splash gate in tests

**Files:**

- Create: apps/web/tests/mission/splash.test.tsx
- Modify: apps/web/tests/mission/hero-loop.test.tsx
- Modify: apps/web/tests/mission/completion.test.tsx
- Modify: apps/web/tests/accessibility/input-equivalence.test.tsx
- Create: apps/web/tests/browser/helpers.ts
- Modify: apps/web/tests/browser/mission.spec.ts
- Modify: apps/web/tests/browser/supports.spec.ts
- Modify: apps/web/tests/browser/universe.spec.ts
- Modify: apps/web/e2e/helpers.ts
- Modify: apps/web/e2e/hero-loop.spec.ts

**Interfaces:**

- Consumes: MissionAtlas with existing quality, client, childId, and allowLocalFallback props.
- Produces: a shared per-file enterAtlas() test helper that clicks the native **Let's Wiggle** button, waits for **Start fractions mission**, and leaves all existing mission assertions unchanged.
- Produces: a focused test that expects an initial native button named **Let's Wiggle**, sees it become disabled after click activation, advances the exit timer, and sees **Start fractions mission** exactly once.
- Produces: real-browser keyboard coverage that tabs to and activates **Let's Wiggle** before testing the existing keyboard-only mission journey.

- [ ] **Step 1: Write the failing focused splash test**

~~~tsx
// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MissionAtlas } from "../../components/mission/MissionAtlas";

vi.mock("next/dynamic", () => ({ default: () => () => null }));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("uses one native launch action and enters the atlas once", () => {
  render(<MissionAtlas quality="fallback" />);
  const launch = screen.getByRole("button", { name: "Let's Wiggle" });
  expect(launch.tagName).toBe("BUTTON");
  fireEvent.click(launch);
  expect((launch as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(launch);
  act(() => vi.advanceTimersByTime(320));
  expect(screen.getByRole("button", { name: "Start fractions mission" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Let's Wiggle" })).toBeNull();
});
~~~

- [ ] **Step 2: Run the focused test to verify it fails**

Run: npm exec vitest run tests/mission/splash.test.tsx --workspace=@wiggle/web

Expected: FAIL because the current element is a section named **Start Wiggle**, keyboard handling is manually emulated, and it never exposes a disabled single-flight launch state.

- [ ] **Step 3: Add test entry helpers before every existing Start fractions mission interaction**

~~~tsx
async function enterAtlas() {
  fireEvent.click(screen.getByRole("button", { name: "Let's Wiggle" }));
  await screen.findByRole("button", { name: "Start fractions mission" });
}

// After each render(<MissionAtlas ... />):
await enterAtlas();
fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
~~~

Apply this helper in all three named suites. Do not change existing user journeys, event assertions, API mocks, or fallback quality settings.

- [ ] **Step 4: Update browser and connected-test entry points**

~~~ts
// apps/web/tests/browser/helpers.ts
import { expect, type Page } from "@playwright/test";

export async function launchWiggle(page: Page) {
  await page.getByRole("button", { name: "Let's Wiggle", exact: true }).click();
  await expect(page.getByRole("region", { name: "Explore Numeria" })).toBeVisible();
}

// After every direct page.goto("/") in browser specs:
await launchWiggle(page);

// apps/web/e2e/helpers.ts, inside startMission after page.goto("/"):
await page.getByRole("button", { name: "Let's Wiggle", exact: true }).click();
await expect(page.getByRole("button", { name: "Start fractions mission", exact: true })).toBeVisible();

// apps/web/e2e/hero-loop.spec.ts keyboard-only test, after page.goto("/"):
await keyboardActivate(page, "Let's Wiggle");
await expect(page.getByRole("button", { name: "Start fractions mission", exact: true })).toBeVisible();
~~~

Update every direct root navigation in mission.spec.ts, supports.spec.ts, and universe.spec.ts. Do not add fixed browser waits; the helper waits for the real universe region.

- [ ] **Step 5: Run the updated suites and verify their remaining failure is implementation-only**

Run: npm exec vitest run tests/mission/splash.test.tsx tests/mission/hero-loop.test.tsx tests/mission/completion.test.tsx tests/accessibility/input-equivalence.test.tsx --workspace=@wiggle/web

Expected: FAIL at the new **Let's Wiggle** lookup until the component and stylesheet are implemented; no test should skip the splash gate.

Run: npm run test:e2e --workspace=@wiggle/web

Expected: FAIL only at the initial **Let's Wiggle** lookup until the component is implemented; every browser and connected route waits for the real post-splash UI rather than a fixed delay.

- [ ] **Step 6: Commit the test characterization**

~~~bash
git add apps/web/tests/mission/splash.test.tsx apps/web/tests/mission/hero-loop.test.tsx apps/web/tests/mission/completion.test.tsx apps/web/tests/accessibility/input-equivalence.test.tsx apps/web/tests/browser/helpers.ts apps/web/tests/browser/mission.spec.ts apps/web/tests/browser/supports.spec.ts apps/web/tests/browser/universe.spec.ts apps/web/e2e/helpers.ts apps/web/e2e/hero-loop.spec.ts
git commit -m "test: cover Wiggle splash entry"
~~~

### Task 2: Implement the accessible, full-screen splash lifecycle

**Files:**

- Modify: apps/web/components/mission/MissionAtlas.tsx (imports/state block and current splash return)
- Modify: apps/web/components/mission/mission.module.css (add isolated splash selectors)
- Test: apps/web/tests/mission/splash.test.tsx
- Test: apps/web/tests/mission/hero-loop.test.tsx
- Test: apps/web/tests/mission/completion.test.tsx
- Test: apps/web/tests/accessibility/input-equivalence.test.tsx
- Test: apps/web/tests/browser/mission.spec.ts
- Test: apps/web/tests/browser/supports.spec.ts
- Test: apps/web/tests/browser/universe.spec.ts
- Test: apps/web/e2e/hero-loop.spec.ts

**Interfaces:**

- Consumes: no new public props; the existing MissionAtlas public interface remains unchanged.
- Produces: internal SplashState = "ready" | "leaving" | "complete", a startSplash(): void action, and a cleanup-safe splashTimeout ref.
- Produces: CSS module class names splash, splashLeaving, splashBrand, and splashStart used only by MissionAtlas.

- [ ] **Step 1: Implement minimal single-flight splash state and cleanup**

~~~tsx
type SplashState = "ready" | "leaving" | "complete";
const SPLASH_EXIT_DELAY_MS = 320;

// Inside MissionAtlas:
const [splashState, setSplashState] = useState<SplashState>("ready");
const splashStarting = useRef(false);
const splashTimeout = useRef<number | null>(null);

useEffect(() => () => {
  if (splashTimeout.current !== null) window.clearTimeout(splashTimeout.current);
}, []);

const startSplash = () => {
  if (splashStarting.current) return;
  splashStarting.current = true;
  setSplashState("leaving");
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.setValueAtTime(440, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, audio.currentTime + 0.22);
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.3);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.31);
    window.setTimeout(() => void audio.close(), 500);
  } catch { /* Audio is optional. */ }
  splashTimeout.current = window.setTimeout(
    () => setSplashState("complete"),
    SPLASH_EXIT_DELAY_MS,
  );
};
~~~

Keep session, gesture, universe, and mission state initialization as it is. Do not move MissionAtlas into another component or change the initial camera mode.

- [ ] **Step 2: Replace pseudo-button markup with semantic splash markup**

~~~tsx
if (splashState !== "complete") {
  const splashClassName = splashState === "leaving"
    ? styles.splash + " " + styles.splashLeaving
    : styles.splash;

  return <section className={splashClassName} aria-label="Welcome to Wiggle">
    <img className={styles.splashBrand} src="/brand/wiggle-full.jpeg" alt="Wiggle. Wonder. Wow!" />
    <button
      className={styles.splashStart}
      type="button"
      onClick={startSplash}
      disabled={splashState === "leaving"}
    >
      Let's Wiggle
    </button>
  </section>;
}
~~~

Do not add redundant onKeyDown handling: native buttons already activate with keyboard input. The disabled state blocks repeated pointer and keyboard activation during the exit delay.

- [ ] **Step 3: Add isolated CSS-module styles**

~~~css
.splash{position:fixed;inset:0;z-index:20;display:grid;place-items:center;align-content:center;gap:clamp(22px,4vw,42px);min-height:100svh;padding:24px;background:#fff7e7;color:#173e5e;opacity:1;transition:opacity 320ms ease,transform 320ms ease}
.splashLeaving{opacity:0;transform:scale(1.01);pointer-events:none}
.splashBrand{display:block;width:min(78vw,560px);height:auto;object-fit:contain}
.splashStart{min-height:48px;padding:12px 24px;border:1px solid #173e5e;border-radius:999px;background:#9dc99a;color:#173e5e;font:700 16px/1 "Trebuchet MS",Arial,sans-serif;cursor:pointer}
.splashStart:focus-visible{outline:3px solid #173e5e;outline-offset:4px}
.splashStart:disabled{cursor:default;opacity:.72}
@media(max-width:600px){.splash{padding:20px}.splashBrand{width:min(90vw,440px)}}
@media(prefers-reduced-motion:reduce){.splash{transition:none}}
~~~

Keep selectors separate from .atlas and existing mission HUD styles so no active mission layout changes.

- [ ] **Step 4: Run focused tests and confirm expected behavior**

Run: npm exec vitest run tests/mission/splash.test.tsx tests/mission/hero-loop.test.tsx tests/mission/completion.test.tsx tests/accessibility/input-equivalence.test.tsx --workspace=@wiggle/web

Expected: PASS. The focused test confirms native-button semantics and disabled single-flight behavior; all existing flows reach their original **Start fractions mission** step after the splash.

Run: npm run test:e2e --workspace=@wiggle/web

Expected: PASS. Browser and connected flows use the real launch button, and the keyboard-only browser journey activates **Let's Wiggle** through actual tab navigation.

- [ ] **Step 5: Run static verification**

Run: npm run lint --workspace=@wiggle/web

Expected: PASS with no new lint errors in MissionAtlas.tsx, the CSS module, or edited tests.

Run: npm run typecheck --workspace=@wiggle/web

Expected: PASS with SplashState, timer refs, CSS class names, and native button props fully typed.

- [ ] **Step 6: Commit the implementation**

~~~bash
git add apps/web/components/mission/MissionAtlas.tsx apps/web/components/mission/mission.module.css apps/web/tests/mission/splash.test.tsx apps/web/tests/mission/hero-loop.test.tsx apps/web/tests/mission/completion.test.tsx apps/web/tests/accessibility/input-equivalence.test.tsx
git commit -m "fix: make Wiggle splash screen work"
~~~

## Self-review

- Spec coverage: Task 2 covers the required full-screen presentation, existing asset, semantic accessible action, one-time activation, optional audio fallback, responsive/reduced-motion styling, and unchanged universe behavior. Task 1 covers the entry gate and existing user journeys.
- Placeholder scan: no TBDs, generic test directions, or unspecified interfaces remain.
- Type consistency: SplashState, startSplash, splashTimeout, and the four CSS module names are defined once in Task 2 and are the names consumed by the test and markup steps.
