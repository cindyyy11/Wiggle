# Wiggle Hybrid Universe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a production-shaped Wiggle MVP that completes the full fractions Digital Twin loop inside an original walkable 3D hybrid universe.

**Architecture:** A pnpm monorepo contains a Next.js child/parent web app, a FastAPI domain API, shared TypeScript contracts, and Supabase migrations. The browser owns rendering, input, accessibility fallbacks, and local MediaPipe inference; FastAPI owns learner-state mutation, deterministic simulation, AI orchestration, and parent insights; Supabase owns authentication and persistence.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, React Three Fiber, Three.js, Drei, Vitest, Playwright, FastAPI, Python, Pydantic, pytest, Supabase PostgreSQL/Auth, Gemini, MediaPipe Hand Landmarker, Vercel, Render.

**Spec:** `docs/superpowers/specs/2026-09-11-wiggle-hybrid-universe-design.md`

## Global Constraints

- Child audience is ages 6–12; no diagnostic, therapeutic, or clinical claims.
- The required loop is OBSERVE → MODEL → SIMULATE → PREDICT → ADAPT → MEASURE → UPDATE.
- Gemini never performs authentication, timing, hand tracking, numerical simulation, persistence, scoring, or screen-time enforcement.
- MediaPipe processes camera frames locally; continuous webcam footage never leaves the browser.
- Every gesture interaction has mouse, touch, and keyboard equivalents.
- The 3D world, copy, models, textures, branding, icons, and audio must be original Wiggle assets.
- The app must work without credentials through deterministic local fallbacks and activate live Gemini/Supabase providers when configured.
- Production targets are Vercel for web, Render for API, and Supabase for Auth/PostgreSQL.

---

## Planned File Structure

```text
apps/web/                         Next.js child and parent application
  app/                            Routes, layouts, API proxy/health surfaces
  components/universe/            Canvas, planet, avatar, camera, landmarks
  components/mission/             Mission, simulation, morph, completion UI
  components/lexi/                Lexi beacon and conversation overlay
  components/parent/              PIN gate and parent dashboard
  features/gestures/              MediaPipe adapter and gesture interpreter
  features/events/                Browser event queue and typed emitters
  lib/                            API client, environment, local demo state
  tests/                          Component and browser tests
apps/api/                         FastAPI service
  app/domain/                     Twin, simulation, intervention domain logic
  app/providers/                  Gemini and local AI providers
  app/repositories/               Supabase and in-memory persistence adapters
  app/routes/                     Typed HTTP endpoints
  app/services/                   Sessions, adaptation, Lexi, parent insights
  tests/                          Unit, contract, and integration tests
packages/contracts/               Shared TypeScript DTOs and event taxonomy
supabase/migrations/              Versioned schema and RLS policies
supabase/tests/                   SQL authorization tests
assets/source/                    Original editable Blender source files
apps/web/public/models/           Optimized GLB runtime assets
```

### Task 1: Establish the Monorepo and Quality Gates

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.editorconfig`, `.env.example`
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- Create: `apps/api/pyproject.toml`, `apps/api/app/main.py`, `apps/api/tests/test_health.py`
- Create: `packages/contracts/package.json`, `packages/contracts/src/index.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: `GET /health -> {"status":"ok"}` and workspace commands `dev`, `test`, `lint`, `typecheck`, `build`.

- [ ] **Step 1: Write the API health test**

```py
from fastapi.testclient import TestClient
from app.main import app

def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run `cd apps/api; python -m pytest tests/test_health.py -v`**

Expected: FAIL because `app.main` does not exist.

- [ ] **Step 3: Scaffold the pinned workspaces and implement the health route**

Use pinned dependency versions, commit `pnpm-lock.yaml`, configure strict TypeScript, ESLint, Vitest, pytest, Ruff, and mypy, and document Node/Python prerequisites plus environment variables.

- [ ] **Step 4: Run `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `cd apps/api; python -m pytest -v`**

Expected: all checks pass and the web production build renders a semantic landing shell.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .editorconfig .env.example README.md apps packages pnpm-lock.yaml
git commit -m "chore: scaffold Wiggle monorepo"
```

### Task 2: Define Shared Contracts and Digital Twin Domain Logic

**Files:**
- Create: `packages/contracts/src/twin.ts`, `packages/contracts/src/events.ts`, `packages/contracts/src/api.ts`
- Create: `apps/api/app/domain/models.py`, `apps/api/app/domain/twin.py`
- Create: `apps/api/tests/domain/test_twin.py`, `packages/contracts/src/contracts.test.ts`

**Interfaces:**
- Produces: `LearnerTwin`, `LearningEvent`, `EventType`, `TwinUpdate`; `update_twin(twin: LearnerTwin, events: list[LearningEvent]) -> TwinUpdate`.

- [ ] **Step 1: Write failing tests for event validation, clamping, and explainable updates**

```py
def test_stuck_and_success_update_relevant_fields(default_twin, event_factory):
    result = update_twin(default_twin, [
        event_factory("stuck_requested"),
        event_factory("mission_completed", correctness=0.92, mode="visual_gesture"),
    ])
    assert 0 <= result.twin.persistence_friction <= 1
    assert result.twin.modality_effectiveness.gesture > default_twin.modality_effectiveness.gesture
    assert {change.field for change in result.changes} >= {
        "persistence_friction", "modality_effectiveness.gesture"
    }
```

- [ ] **Step 2: Run the Python and TypeScript contract tests**

Expected: FAIL because contracts and updater are undefined.

- [ ] **Step 3: Implement matching Pydantic/TypeScript models and pure update functions**

Use discriminated event payloads, UTC timestamps, 0–1 validators, immutable inputs, bounded exponential updates, and an audit change list containing prior value, evidence, delta, and result.

- [ ] **Step 4: Run `pnpm test --filter @wiggle/contracts` and `cd apps/api; python -m pytest tests/domain/test_twin.py -v`**

Expected: PASS with deterministic snapshots.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts apps/api/app/domain apps/api/tests/domain
git commit -m "feat: add learner digital twin domain"
```

### Task 3: Implement the Deterministic Simulation Engine

**Files:**
- Create: `apps/api/app/domain/simulation.py`, `apps/api/app/domain/strategies.py`
- Create: `apps/api/tests/domain/test_simulation.py`
- Create: `packages/contracts/src/simulation.ts`

**Interfaces:**
- Consumes: `LearnerTwin` from Task 2.
- Produces: `simulate(twin, objective, activity) -> SimulationReport`; ranked `StrategyPrediction` items with `predicted_success`, `predicted_friction`, `expected_mastery_gain`, and `factors`.

- [ ] **Step 1: Write failing determinism and ranking tests**

```py
def test_visual_gesture_wins_for_seeded_fraction_twin(seed_twin, fraction_activity):
    first = simulate(seed_twin, "fractions.three_quarters", fraction_activity)
    second = simulate(seed_twin, "fractions.three_quarters", fraction_activity)
    assert first == second
    assert first.recommended_strategy == "visual_gesture"
    assert [round(x.predicted_success, 2) for x in first.ranked[:3]] == [0.87, 0.68, 0.43]
```

- [ ] **Step 2: Run `cd apps/api; python -m pytest tests/domain/test_simulation.py -v`**

Expected: FAIL because the simulation module is absent.

- [ ] **Step 3: Implement named weights and factor-level explanations**

Score modality history, strategy history, objective compatibility, current friction, fatigue, cognitive load, and novelty. Keep strategy definitions in data, clamp outputs, and use deterministic tie-breaking.

- [ ] **Step 4: Run the domain suite and mutation/branch coverage**

Expected: seeded hero values match, arbitrary values stay in range, identical inputs match byte-for-byte.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/domain apps/api/tests/domain packages/contracts/src/simulation.ts
git commit -m "feat: add interpretable adaptation simulation"
```

### Task 4: Add Supabase Schema, Auth Boundaries, and Repositories

**Files:**
- Create: `supabase/config.toml`
- Create via `supabase migration new initial_wiggle_schema`: the CLI-returned `supabase/migrations/*_initial_wiggle_schema.sql`
- Create: `supabase/seed.sql`, `supabase/tests/rls.test.sql`
- Create: `apps/api/app/repositories/protocols.py`, `apps/api/app/repositories/memory.py`, `apps/api/app/repositories/supabase.py`
- Create: `apps/api/tests/repositories/test_memory_repository.py`

**Interfaces:**
- Produces: `WiggleRepository` protocol for children, twins, missions, sessions, events, interventions, settings, and check-ins; `MemoryRepository`; `SupabaseRepository`.

- [ ] **Step 1: Use `supabase migration new initial_wiggle_schema` and write failing repository contract tests**

The same test suite must run against the in-memory adapter and a local Supabase adapter when available.

- [ ] **Step 2: Create tables, foreign keys, constraints, ownership indexes, append-only events, and RLS policies**

Policies must derive parent ownership through `auth.uid()` and child relationships, use both `USING` and `WITH CHECK` for updates, and never authorize from user-editable metadata.

- [ ] **Step 3: Implement both repository adapters and dependency selection from validated environment configuration**

Never expose the Supabase service role to `apps/web`.

- [ ] **Step 4: Run repository tests, local SQL tests, and Supabase advisors**

Expected: cross-parent reads/writes fail, owned rows succeed, required indexes exist, and advisors have no unresolved security findings.

- [ ] **Step 5: Commit**

```bash
git add supabase apps/api/app/repositories apps/api/tests/repositories
git commit -m "feat: add secure learner persistence"
```

### Task 5: Build Typed FastAPI Workflows and AI Provider Abstraction

**Files:**
- Create: `apps/api/app/providers/base.py`, `apps/api/app/providers/local.py`, `apps/api/app/providers/gemini.py`
- Create: `apps/api/app/services/sessions.py`, `adaptation.py`, `lexi.py`, `parent.py`
- Create: `apps/api/app/routes/sessions.py`, `events.py`, `twin.py`, `adaptation.py`, `lexi.py`, `parent.py`
- Create: `apps/api/tests/routes/test_hero_loop.py`, `apps/api/tests/providers/test_provider_contract.py`

**Interfaces:**
- Consumes: repository, twin updater, and simulation engine.
- Produces: all typed endpoints in the spec and `AIProvider` methods `generate_activity`, `generate_hint`, `generate_explanation`, `generate_parent_insight`, `chat_with_lexi`.

- [ ] **Step 1: Write a failing API test for the complete hero loop**

Start a session, append timed events with idempotency keys, fetch the twin, simulate, select the recommended intervention, complete at 92%, and assert mastery/effectiveness changes plus a parent insight.

- [ ] **Step 2: Write provider contract tests for valid output, malformed Gemini output, timeout, and local fallback**

Expected: invalid external content never reaches domain services.

- [ ] **Step 3: Implement routes and services with explicit dependencies and idempotency handling**

Return structured developer errors while keeping child-facing recovery messages short. Validate Gemini output with Pydantic and fall back to authored content on timeout or validation failure.

- [ ] **Step 4: Run `cd apps/api; python -m pytest -v`, Ruff, and mypy**

Expected: the full API loop passes under the memory repository and local AI provider.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app apps/api/tests
git commit -m "feat: expose Wiggle adaptation API"
```

### Task 6: Create Original 3D Assets and the Hybrid Numeria World

**Files:**
- Create: `assets/source/numeria.blend`, `assets/source/astronaut.blend`
- Create: `apps/web/public/models/numeria.glb`, `astronaut.glb`, `pizza.glb`, `lexi-beacon.glb`
- Create: `apps/web/components/universe/UniverseCanvas.tsx`, `Numeria.tsx`, `OrbitingWorlds.tsx`, `Astronaut.tsx`, `Landmarks.tsx`, `CameraRig.tsx`
- Create: `apps/web/components/universe/UniverseCanvas.test.tsx`

**Interfaces:**
- Produces: `<UniverseCanvas mode="globe" | "follow" | "mission" />`, landmark selection callbacks, avatar destination controls, and original compressed GLB assets.

- [ ] **Step 1: Write component tests for quality fallback, camera-mode state, and accessible canvas replacement**

- [ ] **Step 2: Model the original spherical Numeria world and export optimized GLBs**

Include Fraction Forest, Number Valley, Geometry Ridge, Crystal Crater, Lexi beacon, mission pedestal, and two low-detail locked orbiting planets. Use shared materials, instancing, baked lighting where appropriate, and mesh/texture compression.

- [ ] **Step 3: Implement the R3F scene and camera choreography**

Support globe/follow/mission modes, drag orbit, scroll/pinch zoom, click/tap movement, keyboard movement, hop, bounded camera distances, reduced motion, and WebGL/low-quality fallbacks.

- [ ] **Step 4: Run component tests, Lighthouse/WebGL smoke checks, and inspect desktop plus 390 × 844 mobile layouts**

Expected: no frame-driven React state updates, no lost controls, and the fallback remains mission-capable.

- [ ] **Step 5: Commit**

```bash
git add assets/source apps/web/public/models apps/web/components/universe apps/web/tests
git commit -m "feat: build the Numeria hybrid universe"
```

### Task 7: Implement Mission Atlas, Fractions Mission, and Lesson Morph

**Files:**
- Create: `apps/web/components/mission/MissionAtlas.tsx`, `FractionMission.tsx`, `SimulationHologram.tsx`, `LessonMorph.tsx`, `PizzaActivity.tsx`, `StuckMode.tsx`, `CompletionMoment.tsx`
- Create: `apps/web/features/events/eventQueue.ts`, `emitLearningEvent.ts`
- Create: `apps/web/lib/api/client.ts`, `apps/web/lib/demo/seed.ts`
- Create: `apps/web/tests/mission/hero-loop.test.tsx`

**Interfaces:**
- Consumes: typed API contracts and Universe camera/landmark APIs.
- Produces: standard → simulation → visual-gesture → measured completion state machine and resilient browser event queue.

- [ ] **Step 1: Write the failing child hero-loop component test**

Assert task start, first interaction, stuck mode, three visible prediction values, visible scene morph, three selected slices, 92% completion, Wiggle Energy reward, and queued completion event.

- [ ] **Step 2: Implement the Mission Atlas and finite mission state machine**

Keep the learning objective constant across Standard, Visual, Gesture, and Chunk modes. Use abortable API requests and idempotency keys. Persist queued noncritical events locally with a versioned schema.

- [ ] **Step 3: Implement the holographic simulation and spatial lesson morph**

Use short, interruptible transitions; dim unrelated landmarks; move the camera to the mission pedestal; reveal the 3D pizza; preserve visible focus and reduced-motion behavior.

- [ ] **Step 4: Run mission component tests and the web type/lint/build suite**

Expected: the loop works entirely through seeded fallbacks and typed fixtures.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/mission apps/web/features/events apps/web/lib apps/web/tests/mission
git commit -m "feat: complete the adaptive fraction mission"
```

### Task 8: Add MediaPipe Gestures, Lexi, Reality Missions, and Reset Station

**Files:**
- Create: `apps/web/features/gestures/handLandmarker.ts`, `gestureClassifier.ts`, `useGestureControls.ts`
- Create: `apps/web/features/gestures/gestureClassifier.test.ts`
- Create: `apps/web/components/lexi/LexiBeacon.tsx`, `LexiPanel.tsx`
- Create: `apps/web/components/mission/ResetStation.tsx`, `RealityMission.tsx`
- Create: `apps/web/tests/accessibility/input-equivalence.test.tsx`

**Interfaces:**
- Produces: stable events `pinch`, `point`, `open_palm`, `fist`; Lexi tool request client; reset and offline mission events.

- [ ] **Step 1: Write failing gesture tests from fixed landmark fixtures**

Test confidence smoothing, activation frames, release frames, cooldowns, left/right hands, missing frames, and false-positive resistance.

- [ ] **Step 2: Implement lazy MediaPipe loading and local inference**

Request camera permission only on entry to Gesture Mode, stop tracks on exit, never upload frame data, and expose a clear local-processing indicator.

- [ ] **Step 3: Wire gestures and equivalent inputs into PizzaActivity and Lexi**

Pinch/point selects, open palm summons Lexi, fist grabs; pointer, touch, keyboard, and screen-reader buttons trigger the same domain commands.

- [ ] **Step 4: Add Lexi, Reset Station, and Reality Mission flows using typed APIs and curated fallbacks**

- [ ] **Step 5: Run gesture, accessibility, permission-denial, and build tests**

Expected: denial never blocks the mission and no network request contains camera-frame data.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/gestures apps/web/components/lexi apps/web/components/mission apps/web/tests/accessibility
git commit -m "feat: add multimodal learning supports"
```

### Task 9: Build Parent Mission Control and Authentication UX

**Files:**
- Create: `apps/web/app/parent/page.tsx`, `apps/web/components/parent/ParentPinGate.tsx`, `ParentDashboard.tsx`, `HomeworkCheckIn.tsx`
- Create: `apps/web/lib/supabase/browser.ts`, `server.ts`, `middleware.ts`
- Create: `apps/api/app/services/parent_pin.py`, `apps/api/tests/services/test_parent_pin.py`
- Create: `apps/web/tests/parent/dashboard.test.tsx`

**Interfaces:**
- Consumes: Supabase household session and parent insight/check-in endpoints.
- Produces: rate-limited parent PIN verification and responsive mission/mastery/strategy/independence views.

- [ ] **Step 1: Write failing tests for unauthorized access, PIN lockout, successful entry, and low-weight check-in submission**

- [ ] **Step 2: Implement SSR-safe Supabase clients and route protection**

Use publishable frontend credentials only, validate server sessions, and never use user metadata for authorization.

- [ ] **Step 3: Implement PIN hashing/verification and the dashboard**

Show missions, mastery trend, working strategies, independence trend, break settings, and one practical insight. Use non-clinical language and accessible charts with text equivalents.

- [ ] **Step 4: Run parent component, API, RLS, and authorization tests**

Expected: a parent cannot access another household and repeated wrong PINs are throttled.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/parent apps/web/components/parent apps/web/lib/supabase apps/api/app/services/parent_pin.py apps/api/tests apps/web/tests/parent
git commit -m "feat: add parent mission control"
```

### Task 10: End-to-End Verification, Visual QA, and Production Deployment

**Files:**
- Create: `apps/web/e2e/hero-loop.spec.ts`, `apps/web/e2e/fallbacks.spec.ts`, `apps/web/e2e/parent.spec.ts`
- Create: `apps/api/Dockerfile`, `render.yaml`, `vercel.json`
- Create: `docs/operations/deployment.md`, `docs/operations/demo-runbook.md`, `design-qa.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete web, API, assets, providers, and schema.
- Produces: verified local and live builds plus a repeatable hackathon demo runbook.

- [ ] **Step 1: Write Playwright tests for the primary loop and failure modes**

Cover desktop and 390 × 844 mobile, pointer-only completion, camera denial, Gemini timeout, API interruption/event replay, WebGL fallback, parent insight, and keyboard-only navigation.

- [ ] **Step 2: Run all local quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
cd apps/api && python -m pytest -v && ruff check . && mypy app
```

Expected: every command exits zero.

- [ ] **Step 3: Compare the reference and Wiggle at matched desktop/mobile states**

Verify the intended composition and interactions while confirming Wiggle uses original assets. Record issues in `design-qa.md`, fix all P0/P1/P2 issues, and repeat until it states `final result: passed`.

- [ ] **Step 4: Deploy and configure production services**

Create the Supabase project/schema, configure allowed origins and environment values, deploy FastAPI to Render, deploy Next.js to Vercel, and point the web app at the live API. Keep secrets only in provider dashboards.

- [ ] **Step 5: Run production smoke tests**

Verify household login, child session, the full Digital Twin loop, Gemini fallback behavior, parent PIN, mobile controls, RLS isolation, health checks, and structured logs without child-sensitive payloads.

- [ ] **Step 6: Document the demo path and rollback/fallback switches**

The runbook must include a two-minute judge flow, credential-free local startup, live-provider health checks, fallback activation, and known P3 polish notes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/e2e apps/api/Dockerfile render.yaml vercel.json docs README.md design-qa.md
git commit -m "chore: verify and prepare Wiggle for production"
```
