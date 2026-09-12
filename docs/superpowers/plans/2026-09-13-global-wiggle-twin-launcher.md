# Global Wiggle Twin Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every child-facing screen (World Selector, Science Planet, Magnet Lab, the Numeria fallback/2D view) a small floating "Wiggle Twin" launcher and a single "Parent" entry point, reusing the Twin model and Lexi that already exist instead of building a new chat system.

**Architecture:** One new component (`TwinLauncher`) mounts once in the `SubjectWorlds` shell and renders everywhere that shell renders. It always shows the no-session state (current Twin mood, read-aloud, a link to the full `/twin` page, and the nearest not-yet-unlocked constellation star) built entirely from existing pure functions in `@wiggle/contracts`. It hides itself while a Maths mission session is active, because `FractionMission`'s own Lexi beacon already covers that moment — no session-aware chat logic is duplicated. A second new component (`ParentEntryLink`) replaces the "Parent" link that today only exists inside the Numeria mission header, so it is reachable from every world, with the same "finish your mission first" guard the old link had.

**Tech Stack:** Next.js App Router, React (client components), TypeScript, Vitest + @testing-library/react (`@vitest-environment jsdom`), the `@wiggle/contracts` package.

**Spec:** `docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md`

## Global Constraints

- Child-facing copy never shows a raw number, percentage, or diagnostic label (spec: "Correcting the starting premise" / existing rule already enforced by `twinVisualCopy` and `getConstellationStars`).
- No new Lexi actions, no new session-bound backend calls, no cross-world "next mission" recommendation engine — reuse `getTwinVisualState`, `twinVisualCopy`, and `getConstellationStars` as they exist today (spec: "The panel — without a session").
- The launcher does not render on `/parent` (spec: "Mount point").
- The launcher hides while a Maths mission session is active; it never renders a second Lexi-style panel next to the mission's own (spec: "Consolidating existing nav" / "Architecture").
- Reuse `LexiPanel`'s existing accessibility pattern: heading focus on open, Escape closes, focus returns to the launcher button on close (spec: "Accessibility").

---

### Task 1: `nextConstellationSuggestion` helper

**Files:**
- Create: `apps/web/components/wiggle/nextConstellationSuggestion.ts`
- Test: `apps/web/components/wiggle/nextConstellationSuggestion.test.ts`

**Interfaces:**
- Consumes: `LearnerTwin`, `ConstellationStar`, `getConstellationStars` from `@wiggle/contracts` (all already exported).
- Produces: `nextConstellationSuggestion(twin: LearnerTwin): ConstellationStar | null` — used by Task 3 (`TwinLauncher`).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/components/wiggle/nextConstellationSuggestion.test.ts
import { describe, expect, it } from "vitest";
import type { LearnerTwin } from "@wiggle/contracts";
import { nextConstellationSuggestion } from "./nextConstellationSuggestion";

const base: LearnerTwin = {
  mastery: { fractions: 0.1 },
  initiationFriction: 0.5,
  persistenceFriction: 0.5,
  cognitiveLoad: 0.5,
  transitionFriction: 0.5,
  fatigueEstimate: 0.5,
  modalityEffectiveness: { visual: 0.65, voice: 0.2, gesture: 0.2, movement: 0.2, story: 0.2, text: 0.2 },
  strategyEffectiveness: { chunking: 0.1, movementBreak: 0.1, visualHint: 0.1, voiceHint: 0.1, choice: 0.1 },
};

describe("nextConstellationSuggestion", () => {
  it("picks the locked star with the highest progress", () => {
    const star = nextConstellationSuggestion(base);
    expect(star?.id).toBe("visual-explorer");
    expect(star?.unlocked).toBe(false);
  });

  it("returns null once every star is unlocked", () => {
    const mastered: LearnerTwin = {
      mastery: { fractions: 0.9 },
      initiationFriction: 0.2,
      persistenceFriction: 0.9,
      cognitiveLoad: 0.9,
      transitionFriction: 0.9,
      fatigueEstimate: 0.9,
      modalityEffectiveness: { visual: 0.9, voice: 0.9, gesture: 0.9, movement: 0.9, story: 0.9, text: 0.9 },
      strategyEffectiveness: { chunking: 0.9, movementBreak: 0.9, visualHint: 0.9, voiceHint: 0.9, choice: 0.9 },
    };
    expect(nextConstellationSuggestion(mastered)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/wiggle/nextConstellationSuggestion.test.ts`
Expected: FAIL — `Cannot find module './nextConstellationSuggestion'`

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/components/wiggle/nextConstellationSuggestion.ts
import type { ConstellationStar, LearnerTwin } from "@wiggle/contracts";
import { getConstellationStars } from "@wiggle/contracts";

/**
 * The not-yet-unlocked constellation star closest to unlocking — the "What can I
 * try?" line in the global Twin launcher (see
 * docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md).
 * Reuses getConstellationStars as the single source of truth and adds no new
 * signal of its own. Returns null once every star is unlocked.
 */
export function nextConstellationSuggestion(twin: LearnerTwin): ConstellationStar | null {
  const locked = getConstellationStars(twin).filter(star => !star.unlocked);
  if (locked.length === 0) return null;
  return locked.reduce((closest, star) => (star.progress > closest.progress ? star : closest));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run components/wiggle/nextConstellationSuggestion.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/wiggle/nextConstellationSuggestion.ts apps/web/components/wiggle/nextConstellationSuggestion.test.ts
git commit -m "feat: add nextConstellationSuggestion helper for the Twin launcher"
```

---

### Task 2: `ParentEntryLink` component

**Files:**
- Create: `apps/web/components/wiggle/ParentEntryLink.tsx`
- Create: `apps/web/components/wiggle/parentEntryLink.module.css`
- Test: `apps/web/components/wiggle/ParentEntryLink.test.tsx`

**Interfaces:**
- Produces: `ParentEntryLink({ disabled?: boolean; disabledMessage?: string })` — a React component. Used by Task 5 (`SubjectWorlds`).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/components/wiggle/ParentEntryLink.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ParentEntryLink } from "./ParentEntryLink";

afterEach(cleanup);

describe("ParentEntryLink", () => {
  it("links straight to Parent mission control by default", () => {
    render(<ParentEntryLink />);
    const link = screen.getByRole("link", { name: "Parent mission control" });
    expect(link.getAttribute("href")).toBe("/parent");
  });

  it("disables itself with an explanatory message when told to", () => {
    render(<ParentEntryLink disabled disabledMessage="Finish or leave your Maths mission before changing worlds." />);
    expect(screen.queryByRole("link")).toBeNull();
    const button = screen.getByRole("button", { name: "Parent mission control" });
    expect(button).toBeDisabled();
    expect(screen.getByText("Finish or leave your Maths mission before changing worlds.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/wiggle/ParentEntryLink.test.tsx`
Expected: FAIL — `Cannot find module './ParentEntryLink'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/components/wiggle/ParentEntryLink.tsx
"use client";

import { useId } from "react";
import styles from "./parentEntryLink.module.css";

export interface ParentEntryLinkProps {
  disabled?: boolean;
  disabledMessage?: string;
}

/**
 * The one entry point into the PIN-gated Parent Mission Control, reachable from
 * every world (see the "Consolidating existing nav" section of
 * docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md).
 * Mirrors the guard the old Numeria-only "Parent" link had: disabled with an
 * explanatory message while a mission session is in progress.
 */
export function ParentEntryLink({ disabled = false, disabledMessage = "Parent mission control is unavailable right now." }: ParentEntryLinkProps) {
  const messageId = useId();
  return <div className={styles.wrap}>
    {disabled
      ? <button type="button" className={styles.link} disabled aria-label="Parent mission control" aria-describedby={messageId}>Parent</button>
      : <a className={styles.link} href="/parent" aria-label="Parent mission control">Parent</a>}
    {disabled ? <p id={messageId} role="status" className={styles.message}>{disabledMessage}</p> : null}
  </div>;
}
```

```css
/* apps/web/components/wiggle/parentEntryLink.module.css */
.wrap{position:fixed;top:16px;right:16px;z-index:39;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.link{min-height:40px;border:1px solid #285c8540;border-radius:999px;padding:0 16px;background:#fff7e7;color:#285c85;font-size:11px;font-weight:800;text-decoration:none;display:grid;place-items:center}
.link:hover{background:#e4f4f6}
.link:disabled{opacity:.6;cursor:not-allowed}
.link:focus-visible{outline:3px solid #173e5e;outline-offset:3px}
.message{margin:0;max-width:220px;font-size:11px;color:#285c85;background:#fff7e7;border:1px solid #285c8540;border-radius:12px;padding:8px 10px;box-shadow:0 12px 24px #285c8520}
@media(prefers-reduced-motion:reduce){.link{transition:none}}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run components/wiggle/ParentEntryLink.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/wiggle/ParentEntryLink.tsx apps/web/components/wiggle/parentEntryLink.module.css apps/web/components/wiggle/ParentEntryLink.test.tsx
git commit -m "feat: add shell-level ParentEntryLink component"
```

---

### Task 3: `TwinLauncher` component

**Files:**
- Create: `apps/web/components/wiggle/TwinLauncher.tsx`
- Create: `apps/web/components/wiggle/twinLauncher.module.css`
- Test: `apps/web/components/wiggle/TwinLauncher.test.tsx`

**Interfaces:**
- Consumes: `nextConstellationSuggestion` (Task 1); `WiggleTwinAvatar` (`./WiggleTwinAvatar`, existing); `getLastSeenTwin`/`saveSeenTwin` (`./twinMemory`, existing); `getTwinVisualState`/`twinVisualCopy`/`TwinVisualState`/`LearnerTwin` (`@wiggle/contracts`, existing); `speakIfUnmuted` (`../../features/voice/voicePreference`, existing); `ApiClient` (`../../lib/api/client`, existing, has `.twin(childId, signal): Promise<{ twin: LearnerTwin }>`); `demoParent` (`../../lib/demo/parent`, existing, `demoParent.twin: LearnerTwin`).
- Produces: `TwinLauncher({ childId: string; client?: ApiClient; context?: "science" | null })` and the exported type `TwinLauncherContext = "science" | null` — used by Task 5 (`SubjectWorlds`).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/components/wiggle/TwinLauncher.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { LearnerTwin } from "@wiggle/contracts";
import { TwinLauncher } from "./TwinLauncher";
import type { ApiClient } from "../../lib/api/client";

afterEach(() => { cleanup(); window.localStorage.clear(); });

const twin: LearnerTwin = {
  mastery: { fractions: 0.1 },
  initiationFriction: 0.5, persistenceFriction: 0.5, cognitiveLoad: 0.5, transitionFriction: 0.5, fatigueEstimate: 0.5,
  modalityEffectiveness: { visual: 0.65, voice: 0.2, gesture: 0.2, movement: 0.2, story: 0.2, text: 0.2 },
  strategyEffectiveness: { chunking: 0.1, movementBreak: 0.1, visualHint: 0.1, voiceHint: 0.1, choice: 0.1 },
};

function fakeClient(response: LearnerTwin | (() => LearnerTwin)): ApiClient {
  return { twin: async () => ({ twin: typeof response === "function" ? response() : response }) } as unknown as ApiClient;
}

function openLauncher() {
  fireEvent.click(screen.getByRole("button", { name: "Ready for a mission whenever you are!" }));
}

describe("TwinLauncher", () => {
  it("opens to show the Twin's current mood, a suggestion, read-aloud, and a link to the full Twin page", async () => {
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} />);
    openLauncher();
    expect(screen.getByRole("heading", { name: "My Wiggle Twin" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Ready for a mission whenever you are!");
    await screen.findByText(/Pictures and diagrams help you learn fast\./);
    expect(screen.getByRole("button", { name: "Read aloud" })).toBeTruthy();
    const twinPage = screen.getByRole("link", { name: "See my whole Twin" });
    expect(twinPage.getAttribute("href")).toBe("/twin?child=child-1");
    expect(document.body.textContent).not.toMatch(/\d+%/);
  });

  it("adds a Science-specific line only when the context is science", async () => {
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} context="science" />);
    openLauncher();
    await screen.findByText(/Science is full of surprises today!/);
  });

  it("closes on Escape and returns focus to the launcher button", async () => {
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} />);
    openLauncher();
    const panel = await screen.findByRole("region", { name: "My Wiggle Twin" });
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "My Wiggle Twin" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ready for a mission whenever you are!" }));
  });

  it("reads the current message aloud", async () => {
    const speak = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak, cancel: vi.fn() };
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} />);
    openLauncher();
    fireEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("falls back gracefully when the backend is unavailable", async () => {
    const failingClient = { twin: async () => { throw new Error("offline"); } } as unknown as ApiClient;
    render(<TwinLauncher childId="child-1" client={failingClient} />);
    openLauncher();
    expect(await screen.findByRole("link", { name: "See my whole Twin" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/wiggle/TwinLauncher.test.tsx`
Expected: FAIL — `Cannot find module './TwinLauncher'`

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/components/wiggle/TwinLauncher.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { LearnerTwin, TwinVisualState } from "@wiggle/contracts";
import { getTwinVisualState, twinVisualCopy } from "@wiggle/contracts";
import { ApiClient } from "../../lib/api/client";
import { demoParent } from "../../lib/demo/parent";
import { speakIfUnmuted } from "../../features/voice/voicePreference";
import { getLastSeenTwin, saveSeenTwin } from "./twinMemory";
import { nextConstellationSuggestion } from "./nextConstellationSuggestion";
import { WiggleTwinAvatar } from "./WiggleTwinAvatar";
import styles from "./twinLauncher.module.css";

export type TwinLauncherContext = "science" | null;

export interface TwinLauncherProps {
  childId: string;
  client?: ApiClient;
  context?: TwinLauncherContext;
}

interface TwinSuggestion {
  title: string;
  description: string;
}

/**
 * The ambient, everywhere-reachable Twin presence (see
 * docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md). Shows
 * the child's current Twin mood and lets them peek at their whole Twin or hear the
 * message read aloud, without ever needing an active mission session. When a
 * mission session exists, Lexi's own beacon inside the mission already covers
 * this role, so the caller hides this launcher instead of rendering a second,
 * competing panel.
 */
export function TwinLauncher({ childId, client: suppliedClient, context = null }: TwinLauncherProps) {
  const [client] = useState(() => suppliedClient ?? new ApiClient());
  const [state, setState] = useState<TwinVisualState>("ready");
  const [message, setMessage] = useState<string>(twinVisualCopy.ready);
  const [suggestion, setSuggestion] = useState<TwinSuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const launcherButton = useRef<HTMLButtonElement>(null);

  const applyTwin = (twin: LearnerTwin, persist: boolean) => {
    const previous = getLastSeenTwin(childId);
    const nextState = getTwinVisualState(twin, previous);
    setState(nextState);
    setMessage(twinVisualCopy[nextState]);
    const star = nextConstellationSuggestion(twin);
    setSuggestion(star ? { title: star.title, description: star.description } : null);
    if (persist) saveSeenTwin(childId, twin);
  };

  const loadTwin = async (signal: AbortSignal, persist: boolean) => {
    try {
      const { twin } = await client.twin(childId, signal);
      if (!signal.aborted) applyTwin(twin, persist);
    } catch {
      if (!signal.aborted) applyTwin(demoParent.twin, persist);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadTwin(controller.signal, false);
    return () => controller.abort();
  }, [client, childId]);

  useEffect(() => { if (open) heading.current?.focus(); }, [open]);

  const close = () => {
    setOpen(false);
    window.speechSynthesis?.cancel();
    launcherButton.current?.focus();
  };

  const toggle = () => {
    if (open) { close(); return; }
    setOpen(true);
    const controller = new AbortController();
    void loadTwin(controller.signal, true);
  };

  const scienceLine = context === "science" ? " Science is full of surprises today!" : "";

  return <div className={styles.launcher}>
    <button
      ref={launcherButton}
      type="button"
      className={styles.button}
      aria-label={open ? "Close my Wiggle Twin" : twinVisualCopy[state]}
      aria-expanded={open}
      onClick={toggle}
    >
      <span aria-hidden="true"><WiggleTwinAvatar state={state} size={52} /></span>
    </button>
    {open ? <section
      className={styles.panel}
      aria-label="My Wiggle Twin"
      onKeyDown={event => { if (event.key === "Escape") close(); }}
    >
      <h2 ref={heading} tabIndex={-1}>My Wiggle Twin</h2>
      <p role="status">{message}{scienceLine}</p>
      {suggestion ? <p className={styles.suggestion}>What can I try? {suggestion.description}</p> : null}
      <div className={styles.actions}>
        <button type="button" onClick={() => speakIfUnmuted(`${message}${scienceLine}`)}>Read aloud</button>
        <a href={`/twin?child=${encodeURIComponent(childId)}`}>See my whole Twin</a>
      </div>
      <button type="button" className={styles.close} onClick={close}>Close</button>
    </section> : null}
  </div>;
}
```

```css
/* apps/web/components/wiggle/twinLauncher.module.css */
.launcher{position:fixed;right:20px;bottom:20px;z-index:40;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.button{border:1px solid #285c8540;border-radius:50%;width:64px;height:64px;padding:4px;background:#fff7e7;box-shadow:0 12px 26px #285c8530}
.button:hover{background:#e4f4f6}
.button:focus-visible{outline:3px solid #173e5e;outline-offset:3px}
.panel{width:min(300px,calc(100vw - 40px));padding:16px 16px 14px;border:1px solid #285c8540;border-radius:18px;background:#fff7e7;color:#285c85;box-shadow:0 18px 38px #285c8524}
.panel h2{margin:0 0 8px;font-size:19px;letter-spacing:-.02em}
.panel h2:focus{outline:none}
.panel p{margin:0;font-size:13px;line-height:1.45}
.suggestion{margin-top:8px!important;font-size:12px!important}
.actions{display:grid;gap:6px;margin-top:12px}
.actions button,.actions a{min-height:44px;border:1px solid #285c8540;border-radius:999px;padding:0 14px;background:#fff7e7;color:#285c85;font-size:12px;font-weight:800;text-decoration:none;display:grid;place-items:center}
.actions button:hover,.actions a:hover{background:#e4f4f6}
.close{border:0;background:transparent;display:block;margin:10px auto 0;font-size:12px;text-decoration:underline;text-underline-offset:4px;padding:0;color:#285c85}
@media(prefers-reduced-motion:reduce){.button,.actions button,.actions a{transition:none}}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run components/wiggle/TwinLauncher.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/wiggle/TwinLauncher.tsx apps/web/components/wiggle/twinLauncher.module.css apps/web/components/wiggle/TwinLauncher.test.tsx
git commit -m "feat: add global TwinLauncher component"
```

---

### Task 4: Remove the now-redundant links from `ExplorationHud`

**Files:**
- Modify: `apps/web/components/universe/ExplorationHud.tsx`
- Modify: `apps/web/components/universe/UniverseCanvas.tsx`
- Modify: `apps/web/components/mission/MissionAtlas.tsx`
- Test: `apps/web/components/universe/ExplorationHud.test.tsx` (new file)

**Interfaces:**
- Consumes: `LANDMARKS` from `./world` (existing) for the test fixture.
- Produces: `ExplorationHud` no longer accepts a `childId` prop and no longer renders "My Wiggle Twin" or "Parent mission control" links — `UniverseCanvasProps` and `MissionAtlas`'s call site are updated to match (both currently pass `childId` through only for this purpose).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/components/universe/ExplorationHud.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ExplorationHud } from "./ExplorationHud";
import { LANDMARKS } from "./world";

afterEach(cleanup);

const baseProps = {
  mode: "follow" as const,
  mapVisible: false,
  selectedLandmark: LANDMARKS[0].id,
  landmark: LANDMARKS[0],
  help: false,
  onHelpChange: vi.fn(),
  onModeChange: vi.fn(),
  onToggleMap: vi.fn(),
  onSelectLandmark: vi.fn(),
  instructionsId: "instructions",
  missionVisible: false,
};

describe("ExplorationHud", () => {
  it("no longer renders its own Twin or Parent links — the global launcher and ParentEntryLink cover them now", () => {
    render(<ExplorationHud {...baseProps} />);
    expect(screen.queryByRole("link", { name: "My Wiggle Twin" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Parent mission control" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Parent mission control" })).toBeNull();
  });

  it("still omits both links while a mission is visible", () => {
    render(<ExplorationHud {...baseProps} missionVisible />);
    expect(screen.queryByRole("link", { name: "My Wiggle Twin" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Parent mission control" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run components/universe/ExplorationHud.test.tsx`
Expected: FAIL — both links are found (they still render today)

- [ ] **Step 3: Remove the links from `ExplorationHud.tsx`**

Remove the `childId` field from `ExplorationHudProps`:

```ts
  onWorldsRequest?: () => void;
  worldsDisabled?: boolean;
  worldsDisabledMessage?: string;
};
```

(deleting the `childId?: string;` line that preceded the closing brace).

Remove `childId` from the function's destructured parameters and delete the `twinHref` line, so the top of the function body reads:

```tsx
export function ExplorationHud({ mode, mapVisible, selectedLandmark, landmark, help, onHelpChange, onModeChange, onToggleMap, onSelectLandmark, onMissionStart, instructionsId, missionVisible, onWorldsRequest, worldsDisabled = false, worldsDisabledMessage = "Worlds are unavailable right now." }: ExplorationHudProps) {
  const [navigatorOpen, setNavigatorOpen] = useState(false);
```

In the `missionVisible && !mapVisible` early return, delete the whole `<div className={styles.actions}>...</div>` block (it only ever held the two removed links), so the branch reads:

```tsx
  if (missionVisible && !mapVisible) return <header className={styles.topbar}>
    <a className={styles.brand} href="/" aria-label="Wiggle home"><img src="/brand/wiggle-mark.png" alt="" /></a>
    <div className={styles.location} aria-label="Current world"><span>WIGGLE SPACE</span><strong>Numeria</strong></div>
  </header>;
```

In the main return's `.actions` div, delete the "My Twin" link and the Parent conditional, leaving the Help button as the last child:

```tsx
        <button type="button" className={styles.tool} onClick={() => onHelpChange(!help)} aria-label="How to explore" aria-expanded={help}>Help</button>
      </div>
    </header>
```

- [ ] **Step 4: Remove `childId` pass-through from `UniverseCanvas.tsx`**

Remove the `childId?: string;` line from `UniverseCanvasProps`, remove `childId` from the destructured props (the end of the long function-signature line becomes `..., className = "" }: UniverseCanvasProps) {`), and remove ` childId={childId}` from the `<ExplorationHud ... />` call so it ends `worldsDisabledMessage={worldsDisabledMessage} />}`.

- [ ] **Step 5: Remove the now-unnecessary `childId` prop from `MissionAtlas`'s `UniverseCanvas` call**

In `MissionAtlas.tsx`, remove ` childId={childId}` from the `<UniverseCanvas ... />` call (the rest of that call, including `pizza={{...}}`, is unchanged; `childId` is still used elsewhere in `MissionAtlas` for session calls — only this one pass-through is removed).

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run components/universe/ExplorationHud.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Run the full web test suite to confirm nothing else depended on the removed props**

Run: `cd apps/web && npx vitest run`
Expected: PASS (no new failures; in particular `UniverseCanvas.test.tsx` and `MissionAtlas.test.tsx`, if present, still pass)

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/universe/ExplorationHud.tsx apps/web/components/universe/ExplorationHud.test.tsx apps/web/components/universe/UniverseCanvas.tsx apps/web/components/mission/MissionAtlas.tsx
git commit -m "refactor: drop ExplorationHud's Twin/Parent links now that the shell covers them"
```

---

### Task 5: Wire `TwinLauncher` and `ParentEntryLink` into `SubjectWorlds`

**Files:**
- Modify: `apps/web/components/worlds/SubjectWorlds.tsx`
- Modify: `apps/web/components/worlds/SubjectWorlds.test.tsx`

**Interfaces:**
- Consumes: `TwinLauncher` (Task 3), `ParentEntryLink` (Task 2), `DEMO_CHILD_ID` from `../../lib/demo/seed` (existing, already used the same way in `MissionAtlas.tsx`).

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/components/worlds/SubjectWorlds.test.tsx` (after the existing `it(...)` blocks, before the file's closing):

```tsx
it("shows the global Twin launcher and Parent link on the worlds hub, and hides the launcher during an active Maths mission", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds childId="owned" allowLocalFallback={false} initialRoute={{ world: null, child: "owned" }} />);
  enterWorlds();

  expect(screen.getByRole("link", { name: "Parent mission control" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ready for a mission whenever you are!" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  fireEvent.click(screen.getByRole("button", { name: "Open Maths mission" }));

  expect(screen.queryByRole("button", { name: "Ready for a mission whenever you are!" })).toBeNull();
  expect(screen.getByRole("button", { name: "Parent mission control" })).toBeTruthy();
  expect(screen.getByText("Finish or leave your Maths mission before changing worlds.")).toBeTruthy();
});

it("tells the Twin launcher when the child is in Science", async () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: "science", zone: "magnet-lab", child: "owned" }} />);
  enterWorlds();
  fireEvent.click(screen.getByRole("button", { name: "Ready for a mission whenever you are!" }));
  await screen.findByText(/Science is full of surprises today!/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run components/worlds/SubjectWorlds.test.tsx`
Expected: FAIL — neither the "Parent mission control" link/button nor the launcher button exist yet

- [ ] **Step 3: Add the imports**

At the top of `apps/web/components/worlds/SubjectWorlds.tsx`, alongside the existing imports:

```tsx
import { DEMO_CHILD_ID } from "../../lib/demo/seed";
import { ParentEntryLink } from "../wiggle/ParentEntryLink";
import { TwinLauncher } from "../wiggle/TwinLauncher";
```

- [ ] **Step 4: Restructure the post-splash return to mount the shell-level launcher and link**

Replace this (the three early returns after `if (!entered) return <WiggleSplash .../>;`):

```tsx
  if (route.world === "math") return <section className={styles.worldContent} aria-label="Numeria">
    <MissionAtlas
      childId={childId}
      allowLocalFallback={allowLocalFallback}
      client={client}
      quality={quality}
      showSplash={false}
      onMissionOverlayChange={setMathsOverlayOpen}
      onWorldsRequest={() => navigate({ world: null, child: currentChild })}
    />
    <p className={styles.routeStatus} role="status" aria-live="polite">{statusMessage}</p>
  </section>;

  if (route.world === "science") return <SciencePlanet
    selectedZone={route.zone}
    quality={quality}
    onZoneSelect={(zone) => navigate({ world: "science", zone, child: currentChild })}
    onBackToWorlds={() => navigate({ world: null, child: currentChild })}
  />;

  return <section className={styles.worldsView} aria-label="Subject worlds">
    <div className={styles.constellationLayer}
      onPointerDownCapture={event => { if (event.button !== 0) return; swipeStart.current = { x: event.clientX, y: event.clientY }; suppressClick.current = false; }}
      onPointerUpCapture={event => {
        const start = swipeStart.current; swipeStart.current = null;
        if (!start) return;
        const dx = event.clientX - start.x; const dy = event.clientY - start.y;
        if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) { suppressClick.current = true; slide(dx < 0 ? 1 : -1); }
      }}
      onPointerCancel={() => { swipeStart.current = null; }}
      onClickCapture={event => { if (suppressClick.current) { event.stopPropagation(); suppressClick.current = false; } }}>
      <WorldsConstellation
        selectedWorld={selectedWorld}
        onChoose={chooseWorld}
        activeWorld={activeWorld}
        quality={quality}
        onActiveWorldChange={setActiveWorld}
        onSelect={selectWorld}
      />
    </div>
    <WorldSelector
      selectedWorld={selectedWorld}
      onChoose={chooseWorld}
      onSlide={slide}
      activeWorld={activeWorld}
      onActiveWorldChange={setActiveWorld}
      onSelect={selectWorld}
      statusMessage={statusMessage}
    />
  </section>;
}
```

with:

```tsx
  const content = route.world === "math" ? <section className={styles.worldContent} aria-label="Numeria">
    <MissionAtlas
      childId={childId}
      allowLocalFallback={allowLocalFallback}
      client={client}
      quality={quality}
      showSplash={false}
      onMissionOverlayChange={setMathsOverlayOpen}
      onWorldsRequest={() => navigate({ world: null, child: currentChild })}
    />
    <p className={styles.routeStatus} role="status" aria-live="polite">{statusMessage}</p>
  </section> : route.world === "science" ? <SciencePlanet
    selectedZone={route.zone}
    quality={quality}
    onZoneSelect={(zone) => navigate({ world: "science", zone, child: currentChild })}
    onBackToWorlds={() => navigate({ world: null, child: currentChild })}
  /> : <section className={styles.worldsView} aria-label="Subject worlds">
    <div className={styles.constellationLayer}
      onPointerDownCapture={event => { if (event.button !== 0) return; swipeStart.current = { x: event.clientX, y: event.clientY }; suppressClick.current = false; }}
      onPointerUpCapture={event => {
        const start = swipeStart.current; swipeStart.current = null;
        if (!start) return;
        const dx = event.clientX - start.x; const dy = event.clientY - start.y;
        if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) { suppressClick.current = true; slide(dx < 0 ? 1 : -1); }
      }}
      onPointerCancel={() => { swipeStart.current = null; }}
      onClickCapture={event => { if (suppressClick.current) { event.stopPropagation(); suppressClick.current = false; } }}>
      <WorldsConstellation
        selectedWorld={selectedWorld}
        onChoose={chooseWorld}
        activeWorld={activeWorld}
        quality={quality}
        onActiveWorldChange={setActiveWorld}
        onSelect={selectWorld}
      />
    </div>
    <WorldSelector
      selectedWorld={selectedWorld}
      onChoose={chooseWorld}
      onSlide={slide}
      activeWorld={activeWorld}
      onActiveWorldChange={setActiveWorld}
      onSelect={selectWorld}
      statusMessage={statusMessage}
    />
  </section>;

  return <>
    {content}
    <ParentEntryLink disabled={mathsOverlayOpen} disabledMessage="Finish or leave your Maths mission before changing worlds." />
    {!mathsOverlayOpen ? <TwinLauncher childId={currentChild ?? DEMO_CHILD_ID} client={client} context={route.world === "science" ? "science" : null} /> : null}
  </>;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run components/worlds/SubjectWorlds.test.tsx`
Expected: PASS (all tests, including the two new ones)

- [ ] **Step 6: Run the full web test suite**

Run: `cd apps/web && npx vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/worlds/SubjectWorlds.test.tsx
git commit -m "feat: mount the global Twin launcher and Parent entry link in SubjectWorlds"
```

---

## Manual verification

After Task 5, run the dev server and confirm by hand (this exercises the real `/api/backend` route and the demo fallback path together, which the unit tests above stub out):

```bash
cd apps/web && npm run dev
```

- Visit `/` → World Selector shows the Twin launcher (bottom-right) and "Parent" link (top-right).
- Enter Numeria, start the Maths mission → the launcher disappears and "Parent" becomes disabled with the "Finish or leave your Maths mission…" message; `FractionMission`'s own "Ask Lexi" beacon is still there.
- Leave the mission → the launcher and enabled "Parent" link return.
- Enter Science Planet and Magnet Lab → the launcher is present, and opening it shows the Science-specific line.
- Click "See my whole Twin" → lands on `/twin` with the full avatar/stats/constellation view unchanged.
- Visit `/parent` directly → no Twin launcher renders there.

## Self-review notes

- **Spec coverage:** mount point + suppression on `/parent` (Task 5, Global Constraints), session gating (Task 3 + Task 5's `mathsOverlayOpen` check), no-session content — state line, read-aloud, `/twin` link, nearest-star suggestion (Task 3), Science/Magnet Lab context copy (Task 3, exercised on the Science route in Task 5), consolidating "My Twin"/"Parent" (Task 4, Task 2/5), accessibility — focus-on-open/Escape/focus-return (Task 3), tests across World Selector/Science/Magnet Lab/fallback (Magnet Lab and the fallback/2D view are both reached through the same `SciencePlanet`/`MissionAtlas` render paths already covered by Task 5's integration tests and Task 3's unit tests — no separate mount point exists for either, so no extra task is needed).
- **Placeholder scan:** none — every step has runnable code, no "TBD"/"similar to Task N".
- **Type consistency:** `TwinLauncherProps.context` (`"science" | null`) matches the literal passed from `SubjectWorlds` (`route.world === "science" ? "science" : null`); `ParentEntryLink`'s `disabled`/`disabledMessage` match `SubjectWorlds`'s `mathsOverlayOpen` state and the exact message string used both there and in the new test.
- **Scope check:** single subsystem (one shell, two new small components, one consolidation), no decomposition needed.
