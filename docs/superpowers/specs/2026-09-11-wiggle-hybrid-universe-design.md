# Wiggle Hybrid Universe Design

## Product Definition

Wiggle is an ADHD-first predictive learning universe for children aged 6–12. It adapts the learning environment to the child through an explicit Learner Digital Twin. It is not a diagnostic tool, medical product, therapist, generic chatbot, or conventional LMS.

The MVP proves one complete loop: a child enters Numeria, begins a fractions mission, produces learning-interaction signals, receives an interpretable intervention, completes a visibly transformed lesson, updates the Learner Digital Twin, and creates a useful parent insight.

## Chosen Experience

The product uses a hybrid 3D universe. Numeria is one detailed, walkable spherical planet. Smaller orbiting planets represent future English and Science worlds and remain visibly locked. This gives the product the scope and wonder of a universe while concentrating modeling, performance, and learning polish on one hero planet.

The interaction composition follows the supplied Little Planet reference with original Wiggle models, branding, copy, audio, and learning behavior:

- A full-screen low-poly spherical world floating in deep space.
- Smooth globe and close-follow camera modes.
- A child astronaut avatar who walks, runs, hops, and travels to clicked or tapped ground.
- Drag-to-orbit and scroll/pinch-to-zoom camera control.
- A minimal persistent HUD with Mission Atlas progress, camera, sound, help, Wiggle Energy, and parent entry.
- Contextual region labels and landmark action cards.
- A modal mission journal, translated into Wiggle's Mission Atlas.
- Short confirmation toasts for interactions and discoveries.
- Touch joystick and large action buttons on small screens.

The implementation must not reuse the reference site's branding, prose, models, textures, icons, fonts, or audio. It may reproduce the general interaction pattern and spatial composition with original assets.

## Visual Direction

The world is a calm storybook cosmos rather than a loud arcade interface. Deep navy space creates contrast around a jewel-toned, low-poly Numeria. Regions use distinctive terrain palettes: mint Fraction Forest, violet Crystal Crater, warm amber Number Valley, and icy cyan Geometry Ridge. Soft atmospheric glow, tiny orbiting rocks, sparse stars, and restrained particles provide wonder without visual overload.

Typography combines an expressive display face for region names with a highly legible rounded sans serif for instructions and controls. Child-facing copy is short, concrete, and non-clinical. Controls use generous hit areas, strong contrast, visible focus states, reduced-motion support, and no essential instruction conveyed by color alone.

## Child Journey

1. The child enters through a lightweight child profile selection or authenticated household session.
2. The camera reveals Numeria in globe view with two smaller locked planets in orbit.
3. The Mission Atlas identifies Fraction Forest as the active destination.
4. Selecting the mission flies the camera toward the astronaut and begins a guided walk to the Fraction Beacon.
5. A standard fraction prompt asks the child to create three-fourths of a pizza.
6. Seeded hero-demo conditions and genuine event timing create measurable friction without deliberately trapping the child.
7. The Learner Digital Twin updates from the interaction events.
8. A short holographic panel shows ranked simulations: Standard, Visual, and Gesture + Visual.
9. The selected strategy transforms the landmark into an interactive 3D pizza with four slices.
10. The child selects three slices by pinch, point, touch, or mouse.
11. Completion awards Wiggle Energy, records the intervention outcome, and updates mastery and modality effectiveness.
12. Lexi celebrates in one sentence and offers an optional Reality Mission.
13. Parent Mission Control presents the outcome as a practical, non-clinical insight.

## Lesson Morph

One learning objective supports four required modes:

- Standard Mode: compact written prompt with large answer targets.
- Visual Mode: illustrated or 3D manipulatives with visual grouping cues.
- Gesture Mode: camera-enabled selection and movement with a mouse/touch fallback.
- Chunk Mode: one tiny action at a time with nonessential interface elements removed.

Mode changes are spatial transformations, not page replacements. The camera eases toward the mission area, unrelated landmarks dim, controls simplify, and the active object gains focus lighting. The learning objective remains unchanged across modes.

## I'm Stuck and Reset Station

The persistent “I'm stuck” action records a learning-friction event and immediately reduces the task to: “Select three pizza slices.” Lexi may add one short hint. The intervention measures whether response time and completion improve.

Reset Station is a nearby space pod offering a brief breathing animation, stretch, movement mission, eye break, calm sound, or doodle. It is described as a learning reset, never as therapy. Entering and completing a reset produces explicit events without altering state directly.

## Lexi

Lexi is a glowing companion beacon represented in the 3D world and a voice-first overlay. Responses stay brief, friendly, and concrete. Lexi can explain, question, respond to “I'm stuck,” suggest learning-mode changes, trigger Reset Station, and create Reality Missions.

Lexi uses explicit tools:

- `get_current_twin`
- `get_current_mission`
- `report_learning_friction`
- `request_hint`
- `switch_learning_mode`
- `start_reset_station`
- `create_reality_mission`
- `record_self_report`

Lexi never writes learner-state values. Tool requests pass through the FastAPI orchestration layer, and the Digital Twin engine owns all learner-state mutations. Gemini responses that affect application behavior use validated structured JSON. A deterministic local provider supplies curated fallback responses when Gemini is unavailable.

## Gesture Interaction

MediaPipe Hand Landmarker runs locally in the browser. Continuous webcam frames never leave the device and are never sent to Gemini. The gesture interpreter maps:

- Pinch to pick up or toggle a slice.
- Point to select.
- Open palm to summon Lexi or request help.
- Fist to grab.

Gesture confidence is smoothed across consecutive frames with cooldowns to prevent accidental repeat actions. The camera preview is small, optional, and clearly indicates local processing. Every gesture action has equivalent pointer, touch, and keyboard behavior. Camera permission is requested only when the child enters Gesture Mode.

## Learner Digital Twin

The Digital Twin is an explicit Pydantic and TypeScript model with values clamped from 0 to 1:

```ts
type LearnerTwin = {
  mastery: Record<string, number>;
  initiationFriction: number;
  persistenceFriction: number;
  cognitiveLoad: number;
  transitionFriction: number;
  fatigueEstimate: number;
  modalityEffectiveness: {
    visual: number;
    voice: number;
    gesture: number;
    movement: number;
    story: number;
    text: number;
  };
  strategyEffectiveness: {
    chunking: number;
    movementBreak: number;
    visualHint: number;
    voiceHint: number;
    choice: number;
  };
};
```

The event pipeline records session and task start, first interaction, response time, correctness, retries, hints, skips, completion, abandonment, stuck actions, resets, mode changes, and self-reported difficulty. Parent check-ins are low-weight contextual signals. Child-facing screens translate relevant patterns into “My Learning Constellation” labels such as Visual Explorer and Tiny-Step Starter; raw friction scores remain in parent/admin contexts only.

## Deterministic Simulation

The simulation engine is deterministic and interpretable. Given the current twin, objective, and activity characteristics, it scores `standard`, `chunked`, `visual`, `voice`, `gesture`, `visual+gesture`, `movement`, `story`, and `challenge` strategies. Each result returns predicted success, predicted friction, expected mastery gain, and human-readable contributing factors.

The ranking uses explicit weighted components: prior modality effectiveness, relevant strategy effectiveness, current friction, objective compatibility, fatigue penalty, cognitive-load penalty, and novelty penalty. Identical inputs produce identical outputs. The LLM does not participate in numerical scoring.

After completion, the engine compares predicted and actual success. Bounded exponential updates adjust only relevant mastery, modality, and strategy values. All changes create an intervention-result record containing prior value, evidence, delta, and resulting value.

## Application Architecture

The repository is a monorepo with independently deployable services:

- `apps/web`: Next.js App Router, TypeScript, Tailwind CSS, React Three Fiber, Three.js, and Drei.
- `apps/api`: FastAPI, Python, Pydantic, deterministic twin/simulation modules, Lexi orchestration, and provider adapters.
- `packages/contracts`: generated or hand-maintained shared API contracts and event names.
- `supabase`: schema migrations, seed data, and RLS tests.

The web app owns rendering, input, local MediaPipe inference, accessible fallbacks, optimistic interaction feedback, and queued event delivery. FastAPI owns business logic, twin updates, simulation, adaptation selection, Lexi tool execution, and parent insight assembly. Supabase owns household authentication and persistent data. Gemini is accessed only through a provider abstraction.

Production deployment uses Vercel for the web app, Render for FastAPI, and Supabase for Auth and PostgreSQL. Local development supports Supabase/Gemini credentials and a complete fallback path using seeded in-memory or file-backed demo data.

## AI Provider Boundary

The backend defines an `AIProvider` protocol with `generate_activity`, `generate_hint`, `generate_explanation`, `generate_parent_insight`, and `chat_with_lexi`. `GeminiProvider` is the production implementation. `LocalAIProvider` supplies safe curated content for tests and demo fallback. Provider responses are parsed into Pydantic schemas before application use.

Gemini may generate explanations, questions, activities, stories, Lexi dialogue, semantic interpretations, and parent-summary prose. It does not perform authentication, timing, hand tracking, simulation, state storage, scoring, or screen-time enforcement.

## Data Model

Supabase PostgreSQL includes:

- `profiles`: parent-owned account profile linked to `auth.users`.
- `children`: child profiles owned by a parent account.
- `learner_twins`: current JSONB twin state plus schema version and update timestamp.
- `missions`: learning objectives, supported modes, and authored content.
- `sessions`: child mission sessions and lifecycle state.
- `learning_events`: append-only typed interaction events with timestamps and payloads.
- `interventions`: simulation snapshot, selected strategy, prediction, outcome, and status.
- `strategy_effectiveness`: auditable per-child strategy aggregates.
- `parent_settings`: PIN hash, screen/break preferences, and feature permissions.
- `parent_check_ins`: optional contextual reports with low weighting.

All public tables use row-level security. Parent ownership is checked through `auth.uid()` and explicit child relationships. Service-role credentials remain backend-only. Parent PIN verification is rate-limited and stores a secure hash, never the PIN. Useful indexes cover parent ownership, child/timestamp event reads, active sessions, and mission objective lookup.

## API Surface

Typed endpoints include:

- `POST /session/start`
- `POST /events`
- `GET /twin/{child_id}`
- `POST /twin/simulate`
- `POST /adaptation/select`
- `POST /lexi/chat`
- `POST /session/complete`
- `GET /parent/insights`
- `POST /parent/check-in`

Requests use idempotency keys where retries could duplicate events or completions. Validation errors return child-safe UI recovery paths and structured developer diagnostics. Event delivery batches noncritical telemetry and retries with bounded backoff; mission completion is persisted immediately.

## Parent Mission Control

Parent Mission Control is a separate responsive route behind the household session and a parent PIN. It shows completed missions, mastery trends, currently effective strategies, independence trends, break settings, and one short practical recommendation. Parents can submit the optional homework check-in without uploading homework. The UI avoids diagnostic language and does not expose speculative labels.

## Performance and Accessibility

The first 3D view uses code splitting and progressive asset loading. Models use compressed glTF/GLB, shared materials, instancing for repeated objects, constrained shadows, capped device pixel ratio, and adaptive quality for lower-powered devices. Nonessential orbiting worlds use low-detail geometry. React state does not update per animation frame; transient motion remains inside the render loop or refs.

A reduced-motion mode replaces long camera flights with short fades and disables decorative orbit/particle motion. A 2D mission fallback preserves the entire learning loop on unsupported devices or when WebGL fails. Keyboard focus, screen-reader labels, visible instructions, and pointer/touch alternatives cover every required interaction.

## Error Handling and Safety

- If WebGL initialization fails, load the 2D mission map.
- If camera permission is denied, continue with mouse/touch controls without blocking the mission.
- If Gemini fails or times out, use `LocalAIProvider` and display no technical error to the child.
- If the API is temporarily unavailable, queue events locally and preserve mission progress.
- If Supabase is unavailable in demo mode, use seeded local data and mark the session as pending synchronization.
- If structured AI output fails validation, discard it and use authored content.
- Child copy avoids clinical claims, shame, streak pressure, and screen-time-maximizing rewards.

## Testing and Acceptance

Unit tests cover event-to-twin updates, value clamping, deterministic rankings, actual-versus-predicted learning, provider validation, and authorization helpers. API contract tests cover every endpoint and idempotent completion. Database tests verify RLS ownership boundaries. Component tests cover mode morphing, stuck mode, fallback controls, permission denial, and parent PIN states. End-to-end tests exercise the complete hero loop with deterministic fixtures.

Visual and interaction QA covers desktop and a 390 × 844 mobile viewport. The 3D experience must maintain an interactive frame rate on a representative mid-range laptop and degrade quality rather than fail on a representative mobile device.

The MVP is accepted when a fresh user can complete the closed loop without credentials using fallbacks, the same build uses live Supabase and Gemini when configured, all state changes are auditable, all gesture actions have fallbacks, and the parent receives a practical insight derived from the completed intervention.

## Out of Scope

The MVP does not include seven finished planets, a teacher portal, diagnosis, medical scoring, webcam upload, open-ended child-to-LLM access, parent homework uploads, multiplayer play, economy purchases, or production-quality avatar customization. Locked planets and spaceship upgrades may appear as noninteractive future-world signals only.
