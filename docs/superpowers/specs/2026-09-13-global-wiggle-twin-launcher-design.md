# Global Wiggle Twin Launcher — Design

## Problem

Today, a child can only reach their Twin (`/twin`, "My Wiggle Twin") or their in-mission
support companion (Lexi) from one screen: the Numeria/fractions mission's header
(`ExplorationHud`). Science Planet, Magnet Lab, and the World Selector hub have no way
to check in with the Twin or get help at all. The ask is to make that presence global.

## Correcting the starting premise

The original proposal assumed the child-facing concept needed to be renamed to
"Wiggle Twin" while keeping "Learner Digital Twin" as an internal name. That's already
true in the codebase: `MyWiggleTwinScreen.tsx`, `WiggleTwinAvatar.tsx`,
`WiggleConstellation.tsx`, and the `/twin` route already say "My Wiggle Twin" to the
child, while `LearnerTwin` (in `packages/contracts`) is the internal/parent-facing name.
No renaming work is needed. The real gap is **reach**, not naming.

Two pieces already exist and should be reused, not rebuilt:
- **Lexi** (`LexiBeacon` + `LexiPanel`, `apps/web/components/lexi/`): a chat-style panel
  with hint / tiny-step / reset / reality-mission / self-report / read-aloud actions,
  currently mounted only inside `FractionMission`. Its actions all extend
  `SimulateRequest { sessionId }` — they require an active mission session and cannot
  run without one.
- **The Twin model** (`packages/contracts`: `LearnerTwin`, `getTwinVisualState`,
  `twinVisualCopy`, `getConstellationStars`): pure, deterministic, no raw numbers or
  diagnostic labels. Already renders as `WiggleTwinAvatar` + stats + constellation on
  `/twin` (`MyWiggleTwinScreen.tsx`). Not currently surfaced anywhere else.

Magnet Lab (`MagnetLabMission.tsx`) does not emit learning events, touch the Twin, or
use Lexi today — it has no session at all. That does not change as part of this work;
the launcher on Magnet Lab always runs in the no-session state described below.

## Design

### Mount point

Add one launcher component, mounted once in `SubjectWorlds`
(`apps/web/components/worlds/SubjectWorlds.tsx`) — the single client-side shell that
already owns World Selector, Science Planet, and the Numeria mission. Mounting here
means Science Planet, Magnet Lab, the World Selector hub, and any fallback/2D view all
get it automatically, with no per-screen prop drilling. `SubjectWorlds` already has
`currentChild` available.

The launcher does **not** render on `/parent` (the PIN-gated `ParentDashboard`) — that
screen keeps its own detailed, numeric view, unaffected by this work.

### Consolidating existing nav

- `ExplorationHud`'s existing "My Twin" text link is removed — the global launcher
  replaces it, so Numeria doesn't end up with two Twin entry points.
- A single "Parent" entry point moves to the shell level so it's consistent across all
  worlds (today it only exists inside `ExplorationHud`, so Science Planet, Magnet Lab,
  and World Selector currently have no way to reach `/parent` either). This is a small,
  directly related fix, not a scope expansion.

### The launcher button

A small floating button rendering `WiggleTwinAvatar` (already exists, already driven by
`TwinVisualState`) at a compact size, fixed on screen. `aria-label` comes from
`twinVisualCopy[state]`, so it's never a generic "chat" label — it already says the
Twin's current mood in words.

Twin data is fetched via the same `client.twin(childId)` call `MyWiggleTwinScreen`
already uses: once on mount (to drive the idle avatar state), and again each time the
panel opens (in case time has passed). No new sync/event plumbing — same fetch pattern,
one more call site.

### The panel — with an active mission session

Currently only the Numeria/fractions mission has a session. When one is active, the
panel **is `LexiPanel`**, unmodified: hint, tiny step, reset, reality mission,
self-report, read-aloud, Escape-to-close, focus-on-open. No new button copy is
introduced here — "Help me focus" and "What should I try?" are dropped as separate
labels so the child isn't shown two different phrasings for the same underlying
actions ("Try one tiny step," "Take a learning reset" already exist and are tested).

### The panel — without a session

World Selector, Science Planet (before starting an activity), and Magnet Lab all fall
here, since none of them have a session. The panel shows only what's backed by real
data:
- the `twinVisualCopy[state]` line;
- a read-aloud button (`speechSynthesis`, same pattern as `LexiPanel`'s, no session
  needed);
- "See my whole Twin," linking to `/twin?child=...` for the full avatar/stats/
  constellation view — the detailed view stays a dedicated page, not duplicated inside
  the panel;
- a "What can I try?" line naming the nearest not-yet-unlocked constellation star and
  its existing description (from `getConstellationStars`) — e.g. "You're close to
  becoming a Movement Explorer!" This is exposition of data that already exists, not a
  new recommendation engine; nothing in the codebase currently maps a star to a specific
  world or mission to suggest, and building that mapping is out of scope here.

There is no "Help me focus" action in the no-session case — it would have no backend
behavior behind it (no session to send `report_learning_friction` to).

### Science / Magnet Lab context

`SciencePlanetCanvas` already shows land-guide greetings (Maggie the Magnet, Pip,
Sprout — `LAND_GUIDES`) about the *activity* the child is near. The Twin panel stays
about the *learner's own state*, so the two coexist without competing. The only
Science-specific touch: `SubjectWorlds` passes the current world/zone down as a
`context` value, which swaps in one trailing copy fragment when in Science/Magnet Lab
(e.g. "...in Science"). No separate message system, no gating of Science access.

### Accessibility

Reuse `LexiPanel`'s existing pattern exactly: heading receives focus on open, Escape
closes the panel, focus returns to the launcher button on close, the message uses
`role="status"`, and any in-flight speech synthesis is cancelled on close.

## Testing

- Launcher renders on World Selector, Science Planet, Magnet Lab, and the Numeria
  fallback/2D view; absent on `/parent`.
- With an active session: the panel renders `LexiPanel`'s five actions.
- Without a session: the panel renders state line, read-aloud, "See my whole Twin," and
  the nearest-star suggestion — and none of Lexi's session-bound actions.
- Escape closes the panel; focus moves to the heading on open and back to the launcher
  button on close.
- `ExplorationHud` no longer renders a "My Twin" link; the shell-level "Parent" link
  renders across all worlds.
- Panel copy includes the Science-specific fragment when `context` is Science/Magnet
  Lab, and not otherwise.

## Out of scope

- Wiring Magnet Lab into learning events, mastery, or Lexi sessions.
- A cross-world "next mission" recommendation engine.
- Any raw score, percentage, or diagnostic label in child-facing copy (unchanged
  constraint, already enforced by `twinVisualCopy` and `getConstellationStars`).
- Changes to `ParentDashboard`/`ParentPortal` beyond adding the one shell-level link
  that leads to it.
