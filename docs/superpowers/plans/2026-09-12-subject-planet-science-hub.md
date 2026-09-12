# Wiggle Subject-Planet Hub and Science Planet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build a child-friendly subject-world selector that leads to a new playable 3D Science Planet and preserves the existing Numeria Maths experience.

**Architecture:** A new client-side SubjectWorlds shell owns the single splash, URL-backed world/zone navigation, and active-mission guard. Maths remains the existing MissionAtlas/UniverseCanvas path with its splash suppressed only inside the shell. Science is a separate, procedural React Three Fiber subsystem with complete DOM controls and a 2D fallback; Magnet Lab is its first local, repeatable activity.

**Tech Stack:** Next.js 15, React 19, TypeScript, React Three Fiber, Three.js, CSS Modules, Vitest, Testing Library, Playwright.

**Spec:** docs/superpowers/specs/2026-09-12-subject-planet-science-hub-design.md

## Global Constraints

- Preserve the existing Maths/Numeria movement, fraction mission, gesture/pizza flow, event queue, parent route, authenticated child boundary, and 2D fallback.
- Do not discard or overwrite current dirty work in MissionAtlas, UniverseCanvas, ExplorationHud, Numeria, landmarks, astronaut, orbiting worlds, or universe.module.css.
- Add no package dependency, global state library, remote GLB/texture pipeline, copied reference asset, copied reference text, or fake navigation.
- Use original procedural rounded geometry, shared materials, instancing for repeated decoration, and high/low-quality density budgets.
- Science, Numeria, English, and Bahasa Melayu are distinct subject planets. Science is featured; Numeria is playable; English and Bahasa Melayu are visibly locked with truthful coming-soon copy.
- Science exposes six topic zones: Magnet Lab, Sink & Float Bay, pH Lab, Animal Arena, Colors Canyon, and Life Cycle Garden. Only Magnet Lab is playable in this delivery.
- The only user-visible persistent navigation is real navigation: Worlds, actual subject selection, real parent access, and existing Maths controls.
- Each action has a native DOM control, visible focus state, a minimum 44 by 44 pixel target, meaningful accessible name, and a non-color-only state.
- Reduced motion disables ornamental drift, camera flight, and magnetic motion while preserving immediate state changes and task completion.
- WebGL loss or non-support must retain complete Science selection, Magnet Lab, Worlds navigation, and Numeria access.
- World changes must not unmount Maths while a fraction overlay or start/adaptation request is active. The existing Leave mission path remains the sole event-emitting abandonment path.
- Persist world and science-zone navigation in the URL. Preserve child on every internal route. A refresh never claims that a mission remains active.
- Magnet Lab completion is local and repeatable: no API event, no parent-dashboard entry, and no real Wiggle Energy/token award.

---

## Planned File Structure

~~~text
apps/web/
  app/
    page.tsx                                      # Server auth boundary and SubjectWorlds mount
  components/
    worlds/
      subjectRoute.ts                             # Typed world/zone configuration and URL helpers
      subjectRoute.test.ts                        # Pure route/config coverage
      WiggleSplash.tsx                            # One top-level, labelled session splash
      WorldSelector.tsx                           # Semantic subject-card controls and lock messaging
      WorldsConstellation.tsx                     # Dynamic Canvas boundary and quality/fallback state
      WorldsConstellationScene.tsx                # Low-detail procedural subject-planet scene
      SubjectWorlds.tsx                           # Splash, route, subject view, Maths guard
      SubjectWorlds.module.css                    # World selector/splash/constellation layout
      SubjectWorlds.test.tsx                      # Shell behavior and prop forwarding
    science/
      scienceWorld.ts                             # Zone and magnet-object data plus pure helpers
      scienceWorld.test.ts                        # Zone/object invariants
      MagnetLabMission.tsx                        # DOM-first magnet activity state and controls
      magnetLab.module.css                        # Magnet activity presentation
      MagnetLabMission.test.tsx                   # Activity behavior
      ScienceHud.tsx                              # Back control, zone selector, contextual card
      ScienceFallback.tsx                         # Complete DOM map/topic/action fallback
      ScienceFallback.test.tsx                    # Fallback action parity
      SciencePlanet.tsx                           # Science hub/activity owner
      SciencePlanetCanvas.tsx                     # Dynamic Canvas, WebGL detection, error fallback
      SciencePlanetCanvas.test.tsx                # Canvas/fallback parity and context loss
      SciencePlanetScene.tsx                      # R3F Canvas, lights, health monitor
      ScienceDiorama.tsx                          # Planet body, paths, observatory, decoration budget
      ScienceZoneLandmarks.tsx                    # Six original clickable zone silhouettes
      sciencePlanet.module.css                    # Science shell, HUD, fallback, responsive layout
  components/mission/
    MissionAtlas.tsx                              # Narrow splash/worlds/overlay callback props only
  components/universe/
    UniverseCanvas.tsx                            # Thread optional Worlds action into HUD
    ExplorationHud.tsx                            # Safe Worlds control in 3D and map states
  tests/
    mission/
      household.test.tsx                          # Server route forwards owned child to shell
      splash.test.tsx                             # Direct MissionAtlas default-splash regression
    accessibility/
      subject-worlds.test.tsx                     # DOM equivalents, focus, lock status
    browser/
      helpers.ts                                  # Subject-aware launch helpers
      subject-worlds.spec.ts                      # Desktop/mobile Science and world-selector journey
      universe.spec.ts                            # Existing Maths path now selects Numeria first
      mission.spec.ts                             # Existing Maths path now selects Numeria first
      supports.spec.ts                            # Existing Maths path now selects Numeria first
  e2e/
    helpers.ts                                    # Connected Maths helpers pass Worlds then Numeria
~~~

### Task 1: Define typed subject routes, zones, and deterministic URL helpers

**Files:**
- Create: apps/web/components/worlds/subjectRoute.ts
- Create: apps/web/components/worlds/subjectRoute.test.ts

**Interfaces:**

~~~ts
export type SubjectWorldId = "science" | "math" | "english" | "bm";
export type EnterableWorldId = "science" | "math";
export type ScienceZoneId =
  | "magnet-lab"
  | "sink-float"
  | "ph-lab"
  | "animals"
  | "colors"
  | "life-cycle";

export type SubjectWorld = {
  id: SubjectWorldId;
  name: string;
  status: "available" | "coming-soon";
  accent: string;
};

export type SubjectRoute =
  | { world: "science"; zone: ScienceZoneId; child?: string }
  | { world: "math"; child?: string }
  | { world: null; child?: string };

export const SUBJECT_WORLDS: readonly SubjectWorld[];
export const DEFAULT_SCIENCE_ZONE: ScienceZoneId;
export function parseSubjectRoute(input: URLSearchParams): SubjectRoute;
export function buildWorldHref(route: SubjectRoute): string;
export function isEnterableWorld(id: SubjectWorldId): id is EnterableWorldId;
~~~

- [ ] **Step 1: Write the failing pure route and configuration tests.**

Create subjectRoute.test.ts with explicit expectations for the four worlds, the default Science zone, route normalization, and child preservation:

~~~ts
import { expect, it } from "vitest";
import {
  DEFAULT_SCIENCE_ZONE,
  SUBJECT_WORLDS,
  buildWorldHref,
  parseSubjectRoute,
} from "./subjectRoute";

it("models four subject planets with only Science and Numeria enterable", () => {
  expect(SUBJECT_WORLDS.map(world => [world.id, world.status])).toEqual([
    ["science", "available"],
    ["math", "available"],
    ["english", "coming-soon"],
    ["bm", "coming-soon"],
  ]);
  expect(DEFAULT_SCIENCE_ZONE).toBe("magnet-lab");
});

it("normalizes invalid or locked routes to the Worlds selector", () => {
  expect(parseSubjectRoute(new URLSearchParams("world=english&child=owned"))).toEqual({
    world: null,
    child: "owned",
  });
  expect(parseSubjectRoute(new URLSearchParams("world=science&zone=unknown"))).toEqual({
    world: "science",
    zone: "magnet-lab",
  });
});

it("serializes an enterable route without dropping the owned child", () => {
  expect(buildWorldHref({ world: "science", zone: "magnet-lab", child: "owned" }))
    .toBe("/?child=owned&world=science&zone=magnet-lab");
});
~~~

- [ ] **Step 2: Run the focused test and confirm that the module is missing.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/worlds/subjectRoute.test.ts
~~~

Expected: FAIL because subjectRoute.ts does not exist.

- [ ] **Step 3: Implement the route/configuration module with no browser-only side effects.**

Create four configuration records in a stable order. Give Science a sky-blue/coral/mustard palette, Numeria the existing Wiggle palette, and English/Bahasa Melayu their own muted future-world accents. Keep route parsing deterministic:

~~~ts
export const DEFAULT_SCIENCE_ZONE: ScienceZoneId = "magnet-lab";

export function parseSubjectRoute(input: URLSearchParams): SubjectRoute {
  const child = input.get("child") || undefined;
  const world = input.get("world");
  if (world === "math") return { world: "math", child };
  if (world === "science") {
    const zone = SCIENCE_ZONE_IDS.includes(input.get("zone") as ScienceZoneId)
      ? input.get("zone") as ScienceZoneId
      : DEFAULT_SCIENCE_ZONE;
    return { world: "science", zone, child };
  }
  return { world: null, child };
}

export function buildWorldHref(route: SubjectRoute) {
  const query = new URLSearchParams();
  if (route.child) query.set("child", route.child);
  if (route.world === "science") {
    query.set("world", "science");
    query.set("zone", route.zone);
  }
  if (route.world === "math") query.set("world", "math");
  const search = query.toString();
  return search ? "/?" + search : "/";
}
~~~

Do not serialize English or Bahasa Melayu as active destinations. Their controls will show a status message while keeping the current route/selection.

- [ ] **Step 4: Run the focused test and type-check the new module.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/worlds/subjectRoute.test.ts
npm run typecheck --workspace=@wiggle/web
~~~

Expected: all subjectRoute tests pass and TypeScript reports no error in the new module.

- [ ] **Step 5: Commit the isolated route/configuration slice.**

~~~bash
git add apps/web/components/worlds/subjectRoute.ts apps/web/components/worlds/subjectRoute.test.ts
git commit -m "feat: define subject world routes"
~~~

### Task 2: Make the existing Maths boundary safe for a top-level world shell

**Files:**
- Modify: apps/web/components/mission/MissionAtlas.tsx
- Modify: apps/web/components/universe/UniverseCanvas.tsx
- Modify: apps/web/components/universe/ExplorationHud.tsx
- Modify: apps/web/components/universe/explorationHud.module.css
- Modify: apps/web/tests/mission/splash.test.tsx
- Modify: apps/web/tests/mission/hero-loop.test.tsx

**Interfaces:**

~~~ts
type MissionAtlasProps = {
  quality?: QualityPreference;
  client?: ApiClient;
  childId?: string;
  allowLocalFallback?: boolean;
  showSplash?: boolean;
  onMissionOverlayChange?: (open: boolean) => void;
  onWorldsRequest?: () => void;
};

type UniverseCanvasProps = {
  onWorldsRequest?: () => void;
  worldsDisabled?: boolean;
  worldsDisabledMessage?: string;
};
~~~

- [ ] **Step 1: Add failing regression tests for suppressed splash and active-mission guarding.**

Extend splash.test.tsx and hero-loop.test.tsx with behavior that must stay compatible with default tests:

~~~tsx
it("skips the internal splash only when the shell requests it", () => {
  render(<MissionAtlas quality="fallback" showSplash={false} />);
  expect(screen.queryByRole("button", { name: "Let's Wiggle" })).toBeNull();
  expect(screen.getByRole("region", { name: "Explore Numeria" })).toBeTruthy();
});

it("reports an active overlay and blocks Worlds until the existing leave action closes it", async () => {
  const onMissionOverlayChange = vi.fn();
  const onWorldsRequest = vi.fn();
  render(
    <MissionAtlas
      quality="fallback"
      showSplash={false}
      onMissionOverlayChange={onMissionOverlayChange}
      onWorldsRequest={onWorldsRequest}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("region", { name: "Fraction mission" });
  expect(screen.getByRole("button", { name: "Back to Worlds" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Leave mission" }));
  expect(onMissionOverlayChange).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(onWorldsRequest).toHaveBeenCalledOnce();
});
~~~

- [ ] **Step 2: Run the focused Maths tests and verify the new prop contract fails.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- tests/mission/splash.test.tsx tests/mission/hero-loop.test.tsx
~~~

Expected: FAIL because showSplash, overlay callbacks, and the Worlds button do not exist.

- [ ] **Step 3: Add only narrow, backward-compatible props to MissionAtlas.**

Keep the default direct-rendered experience unchanged. Initialize the existing splash state from showSplash, report busy or overlay state through an effect, and pass the world callback to UniverseCanvas:

~~~tsx
export function MissionAtlas({
  quality = "auto",
  client: suppliedClient,
  childId = DEMO_CHILD_ID,
  allowLocalFallback = true,
  showSplash = true,
  onMissionOverlayChange,
  onWorldsRequest,
}: MissionAtlasProps) {
  const [splashState, setSplashState] = useState<SplashState>(
    showSplash ? "ready" : "complete",
  );
  const missionOverlayOpen = phase !== null || busy;

  useEffect(() => {
    onMissionOverlayChange?.(missionOverlayOpen);
  }, [missionOverlayOpen, onMissionOverlayChange]);

  const handleStuck = () => {
    interact();
    setCameraEnabled(false);
    emit({ kind: "stuck_requested", mode });
    setFeedback("");
    setPhase("stuck");
    supportReady.current = false;
    void operation(signal => adapt("visual_gesture", signal, true));
  };

  return <UniverseCanvas
    quality={quality}
    className={styles.atlas + (phase ? " " + styles.active : "") + (phase === "stuck" ? " " + styles.simplified : "")}
    mode={camera}
    onModeChange={setCamera}
    destination={destination}
    onDestinationChange={setDestination}
    selectedLandmark={landmark}
    onLandmarkSelect={setLandmark}
    onMissionStart={start}
    onWorldsRequest={onWorldsRequest}
    worldsDisabled={missionOverlayOpen}
    worldsDisabledMessage="Finish or leave your Maths mission before changing worlds."
    pizza={{ visible: pizzaVisible, selectedSlices: slices, slices: pizzaSlices, plate: { accepting: heldSlice !== null, focused: false }, hand: cameraEnabled ? { enabled: true, latest: handTracking.latest, gesture: handTracking.gesture, phase: gesturePhase, status: handTracking.status } : undefined, onGestureAction: handleGestureAction, onSliceSelect: commands.selectSlice }}
  >
    <div className={styles.atlasHud} aria-label="Mission Atlas progress"><span>MISSION ATLAS</span><strong>{completed} discoveries</strong><small>✳ {completed * WIGGLE_REWARD} Wiggle Energy</small></div>
    {!phase && busy ? <p className={styles.starting} role="status">Your mission is coming into view…</p> : null}
    {!phase && feedback ? <p className={styles.starting} role="alert">{feedback}</p> : null}
    {phase ? <FractionMission phase={phase} mode={mode} selectedSlices={slices} report={report} answer={answer} feedback={feedback} busy={busy} correctness={correctness} realityCompleted={realityCompleted} onAnswer={value => { interact(); setAnswer(value); setFeedback(""); }} onStuck={handleStuck} onSimulate={simulate} onSelect={select} onCheck={check} onClose={close} onBack={() => setPhase(mode === "standard" ? "standard" : "activity")} commands={commands} cameraEnabled={cameraEnabled} onCameraEnable={() => setCameraEnabled(true)} onCameraDisable={() => { setCameraEnabled(false); setGesturePhase(null); setHeld(null); }} tracking={handTracking} support={support} supportText={supportText} onLexiRequest={requestLexi} onSupportClose={closeSupport} onSupportComplete={completeSupport} /> : null}
  </UniverseCanvas>;
}
~~~

Retain the existing close() implementation as the only code path that emits mission_abandoned. Do not give the outer shell an imperative reset, unmount, or event-emission hook.

- [ ] **Step 4: Thread the optional Worlds action through the existing HUD without altering Numeria behavior.**

In UniverseCanvas, extend only the props passed to ExplorationHud. In ExplorationHud, replace the unconditional home navigation only when onWorldsRequest is supplied:

~~~tsx
{onWorldsRequest ? (
  <>
    <button
      type="button"
      className={styles.tool}
      onClick={onWorldsRequest}
      disabled={worldsDisabled}
      aria-describedby={worldsDisabled ? worldsMessageId : undefined}
    >
      Back to Worlds
    </button>
    {worldsDisabled ? (
      <p id={worldsMessageId} className={styles.worldsMessage} role="status">
        {worldsDisabledMessage}
      </p>
    ) : null}
  </>
) : (
  <a className={styles.brand} href="/" aria-label="Wiggle home">
    <img src="/brand/wiggle-mark.png" alt="" />
  </a>
)}
~~~

Ensure this control remains available and disabled in map fallback when the fraction overlay is visible. Preserve the Parent link, the current Places controls, and the original brand link for direct MissionAtlas use.

- [ ] **Step 5: Run the focused Maths regression suite.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- tests/mission/splash.test.tsx tests/mission/hero-loop.test.tsx components/universe/UniverseCanvas.test.tsx
~~~

Expected: default MissionAtlas still has one native Let's Wiggle action; shell mode skips it; a live Maths mission cannot be abandoned by world navigation; existing event assertions still pass.

- [ ] **Step 6: Commit the safe Maths-shell seam.**

~~~bash
git add apps/web/components/mission/MissionAtlas.tsx apps/web/components/universe/UniverseCanvas.tsx apps/web/components/universe/ExplorationHud.tsx apps/web/components/universe/explorationHud.module.css apps/web/tests/mission/splash.test.tsx apps/web/tests/mission/hero-loop.test.tsx
git commit -m "feat: add safe worlds seam to maths"
~~~

### Task 3: Mount the authenticated subject shell and complete semantic world selection

**Files:**
- Create: apps/web/components/worlds/WiggleSplash.tsx
- Create: apps/web/components/worlds/WorldSelector.tsx
- Create: apps/web/components/worlds/SubjectWorlds.tsx
- Create: apps/web/components/worlds/SubjectWorlds.module.css
- Create: apps/web/components/worlds/SubjectWorlds.test.tsx
- Modify: apps/web/app/page.tsx
- Modify: apps/web/tests/mission/household.test.tsx

**Interfaces:**

~~~ts
export type SubjectWorldsProps = {
  childId?: string;
  allowLocalFallback?: boolean;
  client?: ApiClient;
  quality?: QualityPreference;
  initialRoute: SubjectRoute;
};

export type WorldSelectorProps = {
  selectedWorld: SubjectWorldId;
  onSelect: (world: SubjectWorldId) => void;
  statusMessage: string;
};
~~~

- [ ] **Step 1: Write failing shell and server-boundary tests.**

In SubjectWorlds.test.tsx mock MissionAtlas and SciencePlanet. Give the Maths mock an inspectable prop boundary:

~~~tsx
vi.mock("../mission/MissionAtlas", () => ({
  MissionAtlas: (props: {
    childId?: string;
    allowLocalFallback?: boolean;
    quality?: string;
    showSplash?: boolean;
  }) => <output
    data-testid="maths-props"
    data-child-id={props.childId}
    data-demo={String(props.allowLocalFallback)}
    data-quality={props.quality}
    data-splash={String(props.showSplash)}
  />,
}));
~~~

Verify the top-level flow and exact Maths prop forwarding:

~~~tsx
it("opens Worlds once, features Science, and forwards owned Maths props unchanged", async () => {
  render(
    <SubjectWorlds
      childId="owned"
      allowLocalFallback={false}
      client={client}
      quality="fallback"
      initialRoute={{ world: null, child: "owned" }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Let's Wiggle" }));
  expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Explore Science Planet" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  expect(screen.getByTestId("maths-props").dataset).toMatchObject({
    childId: "owned",
    demo: "false",
    quality: "fallback",
    splash: "false",
  });
});
~~~

Update household.test.tsx to mock SubjectWorlds, preserve the existing owned-child and foreign-child assertions, and add:

~~~tsx
expect(screen.getByTestId("subject-worlds").dataset).toMatchObject({
  child: "owned",
  demo: "false",
  world: "science",
  zone: "magnet-lab",
});
~~~

- [ ] **Step 2: Run the focused shell tests and confirm the new components are absent.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/worlds/SubjectWorlds.test.tsx tests/mission/household.test.tsx
~~~

Expected: FAIL because SubjectWorlds and its test seam do not exist.

- [ ] **Step 3: Implement the single session splash and semantic WorldSelector.**

WiggleSplash owns the 320 millisecond visual exit and invokes onEntered once. WorldSelector renders real buttons, not decorative images:

~~~tsx
export function WorldSelector({ selectedWorld, onSelect, statusMessage }: WorldSelectorProps) {
  return (
    <section aria-label="Choose a subject world">
      <h1>Choose your next world</h1>
      {SUBJECT_WORLDS.map(world => (
        <button
          key={world.id}
          type="button"
          aria-pressed={selectedWorld === world.id}
          aria-describedby={world.status === "coming-soon" ? "world-lock-status" : undefined}
          onClick={() => onSelect(world.id)}
        >
          {world.status === "available"
            ? "Explore " + world.name
            : world.name + " (coming soon)"}
        </button>
      ))}
      <p id="world-lock-status" role="status">{statusMessage}</p>
    </section>
  );
}
~~~

Use the existing Wiggle brand image and original copy. Do not reproduce the reference navigation labels.

- [ ] **Step 4: Implement SubjectWorlds route ownership and the active-Maths navigation guard.**

Keep SubjectWorlds mounted while changing selected content. On a normal selection, use history.pushState and the shared builder. On popstate that tries to leave active Maths, replace the address with the current maths URL, keep the Maths component rendered, and announce the active-mission explanation:

~~~tsx
const navigate = (next: SubjectRoute) => {
  window.history.pushState({}, "", buildWorldHref(next));
  setRoute(next);
};

useEffect(() => {
  const onPopState = () => {
    const next = parseSubjectRoute(new URLSearchParams(window.location.search));
    if (mathsOverlayOpen && next.world !== "math") {
      window.history.replaceState({}, "", buildWorldHref({ world: "math", child: childId }));
      setStatusMessage("Finish or leave your Maths mission before changing worlds.");
      return;
    }
    setRoute(next);
  };
  window.addEventListener("popstate", onPopState);
  return () => window.removeEventListener("popstate", onPopState);
}, [childId, mathsOverlayOpen]);
~~~

Fresh launch ends at Worlds with Science selected. A direct valid world query opens that subject after the splash. English/Bahasa Melayu actions set a status message and leave the active route unchanged. Never key SubjectWorlds by world or zone; key it only by child at the page boundary.

- [ ] **Step 5: Replace only the direct MissionAtlas mount in the page server component.**

Extend the typed searchParams to world and zone. Keep household authorization before rendering the shell:

~~~tsx
const params = await searchParams;
const query = new URLSearchParams();
if (params.child) query.set("child", params.child);
if (params.world) query.set("world", params.world);
if (params.zone) query.set("zone", params.zone);
const route = parseSubjectRoute(query);

if (!authConfig()) {
  return <main><SubjectWorlds initialRoute={route} /></main>;
}
// retain the existing session, owned-child, child chooser, sign-in, and recovery branches
return <main><SubjectWorlds key={child.id} childId={child.id} allowLocalFallback={false} initialRoute={route} /></main>;
~~~

The child chooser must retain only a verified owned child id. It does not trust an arbitrary world/zone query to authorize a child.

- [ ] **Step 6: Run shell, household, and direct-Maths regression tests.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/worlds/subjectRoute.test.ts components/worlds/SubjectWorlds.test.tsx tests/mission/household.test.tsx tests/mission/splash.test.tsx
~~~

Expected: verified child props reach the shell and Maths unchanged; locked worlds announce availability; back navigation cannot unmount active Maths.

- [ ] **Step 7: Commit the shell and route integration.**

~~~bash
git add apps/web/components/worlds/WiggleSplash.tsx apps/web/components/worlds/WorldSelector.tsx apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/worlds/SubjectWorlds.module.css apps/web/components/worlds/SubjectWorlds.test.tsx apps/web/app/page.tsx apps/web/tests/mission/household.test.tsx
git commit -m "feat: add subject world selector shell"
~~~

### Task 4: Add a lightweight, original 3D Worlds constellation without making it the only selector

**Files:**
- Create: apps/web/components/worlds/WorldsConstellation.tsx
- Create: apps/web/components/worlds/WorldsConstellationScene.tsx
- Create: apps/web/components/worlds/WorldsConstellation.test.tsx
- Modify: apps/web/components/worlds/SubjectWorlds.tsx
- Modify: apps/web/components/worlds/SubjectWorlds.module.css

**Interfaces:**

~~~ts
export type WorldsConstellationProps = {
  selectedWorld: SubjectWorldId;
  quality?: QualityPreference;
  reducedMotion?: boolean;
  onSelect: (world: SubjectWorldId) => void;
};

export function worldDecorationCounts(quality: "high" | "low"): {
  stars: number;
  debris: number;
};
~~~

- [ ] **Step 1: Write failing Canvas boundary tests around the DOM selector.**

Create WorldsConstellation.test.tsx that mocks the dynamic R3F scene and proves the Canvas is decorative while selecting a visible planet calls the same callback:

~~~tsx
it("keeps DOM world controls available when graphics fall back", async () => {
  const onSelect = vi.fn();
  render(<>
    <WorldsConstellation selectedWorld="science" quality="fallback" onSelect={onSelect} />
    <WorldSelector selectedWorld="science" onSelect={onSelect} statusMessage="" />
  </>);
  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  expect(onSelect).toHaveBeenCalledWith("math");
  expect(screen.queryByTestId("worlds-constellation-scene")).toBeNull();
});

it("uses a smaller decoration budget at low quality", () => {
  expect(worldDecorationCounts("low").stars).toBeLessThan(worldDecorationCounts("high").stars);
});
~~~

- [ ] **Step 2: Run the new test and confirm the constellation modules are absent.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/worlds/WorldsConstellation.test.tsx
~~~

Expected: FAIL because WorldsConstellation does not exist.

- [ ] **Step 3: Implement the dynamic Canvas boundary and WebGL-safe fallback.**

Mirror the existing Science/Numeria detection pattern without changing it:

~~~tsx
const Scene = dynamic(() => import("./WorldsConstellationScene"), {
  ssr: false,
  loading: () => <p role="status">Gathering the worlds…</p>,
});

export function WorldsConstellation(props: WorldsConstellationProps) {
  const [quality, setQuality] = useState<SceneQuality>("fallback");
  // detect WebGL once, then call resolveQuality(props.quality ?? "auto", supported, memory, cores)
  return (
    <section aria-hidden="true" data-quality={quality}>
      {quality === "fallback" ? null : <Scene
        selectedWorld={props.selectedWorld}
        reducedMotion={props.reducedMotion ?? false}
        onSelect={props.onSelect}
        quality={quality}
        onQualityChange={() => setQuality("low")}
      />}
    </section>
  );
}
~~~

Render four original low-detail planet meshes: large Science, smaller Numeria, and two subtly locked future worlds. Each mesh may call onSelect on a pointer click, but all semantic selection stays in WorldSelector. Use shared matte materials, simple orbit rings, 40/18 star/debris high/low budgets, transform/opacity animation only, and no camera flight under reduced motion.

- [ ] **Step 4: Compose the constellation behind the semantic selector and check responsive layering.**

Mount exactly one constellation Canvas only in the Worlds view. Keep WorldSelector above it. At 390 by 844, keep one selected subject card visible without pushing the selector off-screen or exposing horizontal scroll.

- [ ] **Step 5: Run focused visual-boundary tests.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/worlds/WorldsConstellation.test.tsx components/worlds/SubjectWorlds.test.tsx
~~~

Expected: both Canvas and fallback paths preserve the same world-selection callback.

- [ ] **Step 6: Commit the World constellation enhancement.**

~~~bash
git add apps/web/components/worlds/WorldsConstellation.tsx apps/web/components/worlds/WorldsConstellationScene.tsx apps/web/components/worlds/WorldsConstellation.test.tsx apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/worlds/SubjectWorlds.module.css
git commit -m "feat: add procedural subject constellation"
~~~

### Task 5: Define Magnet Lab’s local learning rules and build its complete DOM-first activity

**Files:**
- Create: apps/web/components/science/scienceWorld.ts
- Create: apps/web/components/science/scienceWorld.test.ts
- Create: apps/web/components/science/MagnetLabMission.tsx
- Create: apps/web/components/science/magnetLab.module.css
- Create: apps/web/components/science/MagnetLabMission.test.tsx

**Interfaces:**

~~~ts
export type MagnetObjectId = "paper-clip" | "iron-nail" | "wooden-block" | "plastic-button";
export type MagnetResult = "attracted" | "not-attracted";
export type MagnetObject = {
  id: MagnetObjectId;
  name: string;
  result: MagnetResult;
  color: string;
};

export type ScienceZone = {
  id: ScienceZoneId;
  name: string;
  subtitle: string;
  status: "available" | "coming-soon";
  color: string;
  scenePosition: readonly [number, number, number];
};

export const MAGNET_OBJECTS: readonly MagnetObject[];
export function resultForMagnetObject(id: MagnetObjectId): MagnetResult;

export type MagnetLabMissionProps = {
  onExit: () => void;
  onComplete: () => void;
};
~~~

- [ ] **Step 1: Write failing data and activity behavior tests.**

Create the pure scienceWorld test:

~~~ts
it("has exactly six zones and only Magnet Lab is available", () => {
  expect(SCIENCE_ZONES).toHaveLength(6);
  expect(SCIENCE_ZONES.filter(zone => zone.status === "available").map(zone => zone.id))
    .toEqual(["magnet-lab"]);
});

it("classifies every tested object deterministically", () => {
  expect(resultForMagnetObject("paper-clip")).toBe("attracted");
  expect(resultForMagnetObject("wooden-block")).toBe("not-attracted");
});
~~~

Create the mission test:

~~~tsx
it("does not advance after an incorrect classification and completes once after all correct results", () => {
  const onComplete = vi.fn();
  render(<MagnetLabMission onExit={vi.fn()} onComplete={onComplete} />);
  fireEvent.click(screen.getByRole("button", { name: "Test paper clip" }));
  fireEvent.click(screen.getByRole("button", { name: "Not attracted" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Try that object with the magnet again.");
  expect(screen.getByText("0 of 4 discoveries")).toBeTruthy();
  // complete paper clip, iron nail, wooden block, then plastic button with their defined results
  expect(onComplete).toHaveBeenCalledTimes(1);
});
~~~

- [ ] **Step 2: Run the focused tests and verify the modules are absent.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/science/scienceWorld.test.ts components/science/MagnetLabMission.test.tsx
~~~

Expected: FAIL because the science modules do not exist.

- [ ] **Step 3: Implement six stable zones and four friendly magnetic-test objects.**

Keep data in one pure module. Use exactly the approved zone names and original one-line educational copy. Mark only magnet-lab as available:

~~~ts
export const SCIENCE_ZONES = [
  { id: "magnet-lab", name: "Magnet Lab", subtitle: "See what moves toward a magnet.", status: "available", color: "#ef8b78", scenePosition: [-1.2, 0.9, 0.4] },
  { id: "sink-float", name: "Sink & Float Bay", subtitle: "Will it sink or float?", status: "coming-soon", color: "#73c6e8", scenePosition: [1.3, 1.0, 0.2] },
  { id: "ph-lab", name: "pH Lab", subtitle: "Explore careful color changes.", status: "coming-soon", color: "#b68fd8", scenePosition: [-1.4, -0.5, 0.6] },
  { id: "animals", name: "Animal Arena", subtitle: "Meet different animal families.", status: "coming-soon", color: "#9dc99a", scenePosition: [1.25, -0.45, 0.4] },
  { id: "colors", name: "Colors Canyon", subtitle: "Mix and discover color.", status: "coming-soon", color: "#f4c95d", scenePosition: [-0.4, -1.25, 0.5] },
  { id: "life-cycle", name: "Life Cycle Garden", subtitle: "Watch life grow and change.", status: "coming-soon", color: "#7fbe86", scenePosition: [0.75, -1.2, 0.4] },
] as const satisfies readonly ScienceZone[];
~~~

Use safe, simple object content: paper clip and iron nail are attracted; wooden block and plastic button are not attracted.

- [ ] **Step 4: Implement MagnetLabMission as a DOM-first finite interaction.**

The component keeps selected object, observed result, completed object ids, and feedback locally. Its exact interaction order is:

1. Choose a labelled Test object button.
2. Press Try the magnet to reveal a visible, live observation.
3. Choose Attracted or Not attracted.
4. Correct classification advances one discovery; incorrect classification leaves progress unchanged and provides one retry message.
5. All four correct classifications show Magnet Lab complete and call onComplete once.

Use this core state pattern:

~~~tsx
const [selectedId, setSelectedId] = useState<MagnetObjectId | null>(null);
const [observed, setObserved] = useState(false);
const [completedIds, setCompletedIds] = useState<MagnetObjectId[]>([]);
const [feedback, setFeedback] = useState("");

const classify = (answer: MagnetResult) => {
  if (!selectedId || !observed) return;
  if (answer !== resultForMagnetObject(selectedId)) {
    setFeedback("Try that object with the magnet again.");
    return;
  }
  const next = completedIds.includes(selectedId) ? completedIds : [...completedIds, selectedId];
  setCompletedIds(next);
  setFeedback(answer === "attracted" ? "It moves toward the magnet!" : "It stays where it is.");
  setObserved(false);
  if (next.length === MAGNET_OBJECTS.length) onComplete();
};
~~~

Expose the region as Magnet Lab mission; use Exit Magnet Lab to call only onExit; do not import the Maths event queue, reward seed, API client, or parent data.

- [ ] **Step 5: Run the Magnet Lab tests.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/science/scienceWorld.test.ts components/science/MagnetLabMission.test.tsx
~~~

Expected: all four classifications are deterministic; incorrect choices cannot progress; completion is local and called exactly once.

- [ ] **Step 6: Commit the independent Magnet Lab activity.**

~~~bash
git add apps/web/components/science/scienceWorld.ts apps/web/components/science/scienceWorld.test.ts apps/web/components/science/MagnetLabMission.tsx apps/web/components/science/magnetLab.module.css apps/web/components/science/MagnetLabMission.test.tsx
git commit -m "feat: add magnet lab activity"
~~~

### Task 6: Deliver a complete accessible Science Planet hub and 2D fallback

**Files:**
- Create: apps/web/components/science/ScienceHud.tsx
- Create: apps/web/components/science/ScienceFallback.tsx
- Create: apps/web/components/science/ScienceFallback.test.tsx
- Create: apps/web/components/science/SciencePlanet.tsx
- Create: apps/web/components/science/sciencePlanet.module.css
- Modify: apps/web/components/worlds/SubjectWorlds.tsx
- Modify: apps/web/components/worlds/SubjectWorlds.test.tsx

**Interfaces:**

~~~ts
export type SciencePlanetProps = {
  selectedZone: ScienceZoneId;
  quality?: QualityPreference;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
};

export type ScienceFallbackProps = {
  selectedZone: ScienceZoneId;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
  onStartMagnetLab: () => void;
};
~~~

- [ ] **Step 1: Write failing fallback parity tests.**

Create ScienceFallback.test.tsx with controlled props:

~~~tsx
it("keeps all six topic actions available in the fallback", () => {
  const onZoneSelect = vi.fn();
  const onStartMagnetLab = vi.fn();
  render(
    <ScienceFallback
      selectedZone="magnet-lab"
      onZoneSelect={onZoneSelect}
      onBackToWorlds={vi.fn()}
      onStartMagnetLab={onStartMagnetLab}
    />,
  );
  expect(screen.getByRole("img", { name: "Science Planet map" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Visit Sink & Float Bay" }));
  expect(onZoneSelect).toHaveBeenCalledWith("sink-float");
  expect(screen.getByRole("button", { name: "Start Magnet Lab" })).toBeTruthy();
});

it("shows a truthful future-zone card without a start action", () => {
  const callbacks = {
    onZoneSelect: vi.fn(),
    onBackToWorlds: vi.fn(),
    onStartMagnetLab: vi.fn(),
  };
  render(<ScienceFallback selectedZone="animals" {...callbacks} />);
  expect(screen.getByText("Coming soon")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start Magnet Lab" })).toBeNull();
});
~~~

- [ ] **Step 2: Run the test and verify that the Science UI has not been created.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/science/ScienceFallback.test.tsx components/worlds/SubjectWorlds.test.tsx
~~~

Expected: FAIL because ScienceFallback and SciencePlanet do not exist.

- [ ] **Step 3: Implement ScienceHud and ScienceFallback with one source of selected-zone truth.**

ScienceHud renders Back to Worlds, six Visit zone buttons, a selected-zone card, and either Start Magnet Lab or Coming soon. ScienceFallback renders the same controls around a DOM map:

~~~tsx
{SCIENCE_ZONES.map(zone => (
  <button
    key={zone.id}
    type="button"
    aria-pressed={zone.id === selectedZone}
    aria-label={"Visit " + zone.name}
    onClick={() => onZoneSelect(zone.id)}
  >
    {zone.name}
  </button>
))}
~~~

The fallback map uses regular semantic content and may have role img with the label Science Planet map. It is never the only control surface. Keep future-zone buttons enabled so a child can inspect their card, then use role status for the coming-soon explanation.

- [ ] **Step 4: Implement the SciencePlanet owner and mount MagnetLabMission.**

SciencePlanet owns only local activity open state. It resets the local Magnet Lab completion state when SciencePlanet unmounts, which happens on World exit or refresh:

~~~tsx
const [magnetLabOpen, setMagnetLabOpen] = useState(false);
const [magnetComplete, setMagnetComplete] = useState(false);

if (magnetLabOpen) {
  return (
    <MagnetLabMission
      onExit={() => setMagnetLabOpen(false)}
      onComplete={() => {
        setMagnetComplete(true);
        setMagnetLabOpen(false);
      }}
    />
  );
}
~~~

Show a concise local completion status after returning to the hub, such as Magnet Lab discovery complete. Do not display token totals, award copy, or parent progress.

- [ ] **Step 5: Integrate the new Science view into SubjectWorlds.**

When a child chooses Science, route to world=science with the selected zone. When they choose Back to Worlds, route to the selector without losing child. Before the Canvas task, SciencePlanet renders ScienceFallback as the complete Science UI.

- [ ] **Step 6: Run focused Science hub tests.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/science/ScienceFallback.test.tsx components/science/MagnetLabMission.test.tsx components/worlds/SubjectWorlds.test.tsx
~~~

Expected: all topics can be inspected in the fallback; only Magnet Lab starts an activity; return navigation keeps child context.

- [ ] **Step 7: Commit the accessible Science hub.**

~~~bash
git add apps/web/components/science/ScienceHud.tsx apps/web/components/science/ScienceFallback.tsx apps/web/components/science/ScienceFallback.test.tsx apps/web/components/science/SciencePlanet.tsx apps/web/components/science/sciencePlanet.module.css apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/worlds/SubjectWorlds.test.tsx
git commit -m "feat: add accessible science planet hub"
~~~

### Task 7: Add the original procedural 3D Science Planet as an enhancement of the complete fallback

**Files:**
- Create: apps/web/components/science/SciencePlanetCanvas.tsx
- Create: apps/web/components/science/SciencePlanetCanvas.test.tsx
- Create: apps/web/components/science/SciencePlanetScene.tsx
- Create: apps/web/components/science/ScienceDiorama.tsx
- Create: apps/web/components/science/ScienceZoneLandmarks.tsx
- Modify: apps/web/components/science/SciencePlanet.tsx
- Modify: apps/web/components/science/sciencePlanet.module.css

**Interfaces:**

~~~ts
export type SciencePlanetCanvasProps = {
  quality?: QualityPreference;
  reducedMotion?: boolean;
  selectedZone: ScienceZoneId;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
  onStartMagnetLab: () => void;
};

export function scienceDecorationCounts(quality: "high" | "low"): {
  clouds: number;
  stars: number;
  magneticFragments: number;
};
~~~

- [ ] **Step 1: Write failing Canvas/fallback parity tests.**

Mock next/dynamic in SciencePlanetCanvas.test.tsx with a scene double that renders a button bearing data-testid science-model-ph-lab and calls its onZoneSelect prop with ph-lab. Test the same selection callback and forced loss behavior:

~~~tsx
it("uses the same selected-zone callback in the 3D scene and fallback", async () => {
  const onZoneSelect = vi.fn();
  render(
    <SciencePlanetCanvas
      selectedZone="magnet-lab"
      onZoneSelect={onZoneSelect}
      onBackToWorlds={vi.fn()}
      onStartMagnetLab={vi.fn()}
    />,
  );
  fireEvent.click(await screen.findByTestId("science-model-ph-lab"));
  expect(onZoneSelect).toHaveBeenCalledWith("ph-lab");
});

it("shows a working fallback after graphics failure", async () => {
  render(
    <SciencePlanetCanvas
      selectedZone="magnet-lab"
      onZoneSelect={vi.fn()}
      onBackToWorlds={vi.fn()}
      onStartMagnetLab={vi.fn()}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Simulate Science graphics loss" }));
  expect(screen.getByRole("img", { name: "Science Planet map" })).toBeTruthy();
});

it("reduces only decoration density on low quality", () => {
  expect(scienceDecorationCounts("low").clouds).toBeLessThan(
    scienceDecorationCounts("high").clouds,
  );
});
~~~

- [ ] **Step 2: Run the focused test and confirm the Canvas modules are absent.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/science/SciencePlanetCanvas.test.tsx
~~~

Expected: FAIL because SciencePlanetCanvas does not exist.

- [ ] **Step 3: Implement the Canvas boundary using the proven quality/fallback pattern.**

Import QualityPreference, SceneQuality, and resolveQuality from the stable universe/world module. Keep the Science failure boundary private:

~~~tsx
const Scene = dynamic(() => import("./SciencePlanetScene"), {
  ssr: false,
  loading: () => <p className={styles.loading} role="status">Building Science Planet…</p>,
});

function graphicsFailed() {
  setFailed(true);
  setAnnouncement("Science Planet map is ready. Every topic is still here.");
}

return failed || quality === "fallback"
  ? <ScienceFallback
      selectedZone={selectedZone}
      onZoneSelect={onZoneSelect}
      onBackToWorlds={onBackToWorlds}
      onStartMagnetLab={onStartMagnetLab}
    />
  : <GraphicsBoundary onFailure={graphicsFailed}>
      <Scene
        quality={quality}
        reducedMotion={reducedMotion}
        selectedZone={selectedZone}
        onZoneSelect={onZoneSelect}
        onContextLost={graphicsFailed}
        onQualityChange={() => setQuality("low")}
      />
    </GraphicsBoundary>;
~~~

Detect WebGL once, honor forced fallback and reduced-motion media changes, attach a webglcontextlost listener, and sample FPS only once before lowering high quality to low. Do not export or alter the private Numeria renderer-health component.

- [ ] **Step 4: Build the original ScienceDiorama and six zone silhouettes.**

Use a soft-edged, asymmetrical floating planet made from a low-detail icosahedron base, layered terrain discs, a central observatory, and six anchored groups:

~~~tsx
<ScienceZoneLandmarks
  selectedZone={selectedZone}
  onSelect={onZoneSelect}
  quality={quality}
  reducedMotion={reducedMotion}
/>
~~~

Implement each group with a recognisable original silhouette:

- Magnet Lab: copper rock ledge, large horseshoe magnet, paper-clip fragments, rounded bench.
- Sink & Float Bay: blue basin, small iceberg shapes, buoyant toy forms.
- pH Lab: contained pastel flasks, a round gauge, safe work table.
- Animal Arena: rounded green habitat, neutral animal silhouette figures.
- Colors Canyon: faceted rainbow mineral ridge and colour-disc stones.
- Life Cycle Garden: leaves, seed/egg forms, cocoon, sprouting plant.

Zone meshes call onZoneSelect on a click with a small drag threshold. They must not contain baked text; DOM labels remain authoritative. Use shared geometries/materials where repeated, high/low decoration counts, and useFrame refs only. Under reduced motion, every decorative rotation, drift, and magnetic fragment motion remains static.

- [ ] **Step 5: Replace the fallback-only Science rendering with Canvas plus fallback, retaining the same HUD.**

SciencePlanet always mounts ScienceHud. Mount exactly one Science Canvas when supported and ScienceFallback when not. Do not mount Numeria and Science Canvas at the same time. Keep the fallback topic list and Start Magnet Lab callback unchanged.

- [ ] **Step 6: Run Canvas, Science, and existing Numeria component tests.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/science/SciencePlanetCanvas.test.tsx components/science/ScienceFallback.test.tsx components/science/MagnetLabMission.test.tsx components/universe/UniverseCanvas.test.tsx
~~~

Expected: Science Canvas remains optional, all fallback actions work after context loss, and the Numeria boundary remains unchanged.

- [ ] **Step 7: Commit the procedural Science Planet.**

~~~bash
git add apps/web/components/science/SciencePlanetCanvas.tsx apps/web/components/science/SciencePlanetCanvas.test.tsx apps/web/components/science/SciencePlanetScene.tsx apps/web/components/science/ScienceDiorama.tsx apps/web/components/science/ScienceZoneLandmarks.tsx apps/web/components/science/SciencePlanet.tsx apps/web/components/science/sciencePlanet.module.css
git commit -m "feat: render procedural science planet"
~~~

### Task 8: Update cross-feature accessibility, browser journeys, and final verification

**Files:**
- Create: apps/web/tests/accessibility/subject-worlds.test.tsx
- Create: apps/web/tests/browser/subject-worlds.spec.ts
- Modify: apps/web/tests/browser/helpers.ts
- Modify: apps/web/tests/browser/universe.spec.ts
- Modify: apps/web/tests/browser/mission.spec.ts
- Modify: apps/web/tests/browser/supports.spec.ts
- Modify: apps/web/e2e/helpers.ts
- Modify: apps/web/e2e/parent.spec.ts only if its helper import needs the new Maths launch path
- Modify: design-qa.md

**Interfaces:**

~~~ts
export async function launchWiggle(page: Page): Promise<void>;
export async function enterScience(page: Page): Promise<void>;
export async function enterNumeria(page: Page): Promise<void>;
export async function launchNumeria(page: Page): Promise<void>;
~~~

- [ ] **Step 1: Write the accessible input-equivalence tests for the new subject and Science controls.**

Create subject-worlds.test.tsx:

~~~tsx
it("keeps every Canvas action available through native labelled controls", () => {
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);
  fireEvent.click(screen.getByRole("button", { name: "Let's Wiggle" }));
  expect(screen.getByRole("button", { name: "Explore Science Planet" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Explore Science Planet" }));
  expect(screen.getByRole("button", { name: "Visit Magnet Lab" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start Magnet Lab" })).toBeTruthy();
});

it("announces locked worlds without moving focus away from the selector", () => {
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);
  fireEvent.click(screen.getByRole("button", { name: "Let's Wiggle" }));
  const locked = screen.getByRole("button", { name: "English Planet (coming soon)" });
  locked.focus();
  fireEvent.click(locked);
  expect(document.activeElement).toBe(locked);
  expect(screen.getByRole("status")).toHaveTextContent("coming soon");
});
~~~

- [ ] **Step 2: Update all browser helpers to make Maths selection explicit.**

Replace the direct Numeria assumption with these helpers:

~~~ts
export async function launchWiggle(page: Page) {
  await page.getByRole("button", { name: "Let's Wiggle", exact: true }).click();
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible();
}

export async function enterScience(page: Page) {
  await page.getByRole("button", { name: "Explore Science Planet", exact: true }).click();
  await expect(page.getByRole("region", { name: "Science Planet" })).toBeVisible();
}

export async function enterNumeria(page: Page) {
  await page.getByRole("button", { name: "Explore Numeria", exact: true }).click();
  await expect(page.getByRole("region", { name: "Explore Numeria" })).toBeVisible();
}

export async function launchNumeria(page: Page) {
  await launchWiggle(page);
  await enterNumeria(page);
}
~~~

Update existing Numeria, mission, support, and connected browser helpers to call launchNumeria before legacy assertions. Do not duplicate an unguarded direct Numeria path.

- [ ] **Step 3: Create the new subject-world browser coverage.**

Create subject-worlds.spec.ts with these test cases:

1. Splash to Worlds features Science, enters Science, starts Magnet Lab, completes all four classifications with native buttons, returns to Science, and never displays a real token/reward claim.
2. Worlds enters Numeria and exposes Start fractions mission, preserving the existing Maths journey.
3. English and Bahasa Melayu activation announces coming soon and does not expose a fake lesson.
4. Direct science URL with child and zone restores the selected zone after splash; every internal selection retains child in page.url().
5. Desktop and mobile assert document.documentElement.scrollWidth is not larger than innerWidth; mobile keeps one selected topic card visible.
6. Reduced motion exposes data-reduced-motion=true on the Science root and still completes Magnet Lab.
7. Overriding webgl getContext to return null exposes Science Planet map, starts/completes Magnet Lab, and returns to Worlds.
8. keyboardActivate reaches Let's Wiggle, Explore Science Planet, and Start Magnet Lab without programmatic focus or pointer input.

Use accessible roles/names for all assertions. Canvas screenshots may be collected as evidence but no critical assertion may rely on pixels or coordinates.

- [ ] **Step 4: Run focused unit, accessibility, and browser tests.**

Run:

~~~bash
npm run test --workspace=@wiggle/web -- components/worlds/subjectRoute.test.ts components/worlds/SubjectWorlds.test.tsx components/worlds/WorldsConstellation.test.tsx components/science/scienceWorld.test.ts components/science/ScienceFallback.test.tsx components/science/SciencePlanetCanvas.test.tsx components/science/MagnetLabMission.test.tsx tests/accessibility/subject-worlds.test.tsx
npm run test --workspace=@wiggle/web -- components/universe/UniverseCanvas.test.tsx tests/mission/hero-loop.test.tsx tests/mission/completion.test.tsx tests/accessibility/input-equivalence.test.tsx
npm run build --workspace=@wiggle/web
npm run test:e2e --workspace=@wiggle/web -- tests/browser/subject-worlds.spec.ts --project=desktop --project=mobile
~~~

Expected: all focused Science and existing Maths checks pass. Browser runs cover both 1440 by 900 and 390 by 844 with no horizontal overflow.

- [ ] **Step 5: Run full static and browser verification.**

Run:

~~~bash
npm run test --workspace=@wiggle/web
npm run lint --workspace=@wiggle/web
npm run typecheck --workspace=@wiggle/web
npm run build --workspace=@wiggle/web
npm run test:e2e --workspace=@wiggle/web -- --project=desktop --project=mobile
~~~

Expected: no test, lint, type, build, hydration, accessibility, fallback, or browser regression remains.

- [ ] **Step 6: Record visual QA and commit the verification layer.**

Update design-qa.md with desktop/mobile screenshots and check results for Worlds, Science Planet, Magnet Lab, Numeria, reduced motion, and forced WebGL fallback. State explicitly that the five future Science zones plus English/Bahasa Melayu are visual coming-soon destinations without fake progress.

~~~bash
git add apps/web/tests/accessibility/subject-worlds.test.tsx apps/web/tests/browser/subject-worlds.spec.ts apps/web/tests/browser/helpers.ts apps/web/tests/browser/universe.spec.ts apps/web/tests/browser/mission.spec.ts apps/web/tests/browser/supports.spec.ts apps/web/e2e/helpers.ts apps/web/e2e/parent.spec.ts design-qa.md
git commit -m "test: verify subject worlds and science planet"
~~~

## Plan Self-Review

### Spec coverage

- Subject constellation, separate Science/Numeria/English/Bahasa Melayu planets: Tasks 1, 3, and 4.
- Featured, original, six-zone procedural Science Planet: Tasks 5, 6, and 7.
- Complete first Magnet Lab activity with local-only completion: Task 5.
- Existing Maths preservation, authenticated child forwarding, single splash, and active-mission guard: Tasks 2 and 3.
- URL-backed navigation and child preservation: Tasks 1 and 3.
- DOM-first controls, locked-world explanation, focus, reduced motion, responsive layout, quality tiers, and 2D fallback: Tasks 3 through 8.
- Context-loss handling, mobile browser coverage, and regressions across existing Maths: Tasks 7 and 8.

### Placeholder scan

This plan specifies every planned file, public interface, test path, test behavior, command, and commit boundary. It deliberately leaves unfinished subject/zone activities in truthful coming-soon states rather than leaving implementation instructions incomplete.

### Type consistency

- SubjectWorldId and ScienceZoneId originate in subjectRoute.ts and flow into SubjectWorlds, SciencePlanet, and their tests.
- QualityPreference, SceneQuality, and resolveQuality remain imported from the stable universe/world module.
- MissionAtlas keeps its existing required props and only adds optional backward-compatible shell hooks.
- ScienceFallback and SciencePlanetCanvas receive the same selectedZone and callbacks, so fallback behavior cannot diverge from the 3D enhancement.
