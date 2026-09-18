"use client";

import { useEffect, useRef, useState } from "react";
import { MATHS_MISSION_BLOCKED_MESSAGE, MissionAtlas } from "../mission/MissionAtlas";
import { SciencePlanet } from "../science/SciencePlanet";
import type { ApiClient } from "../../lib/api/client";
import type { QualityPreference } from "../universe/world";
import { DEMO_CHILD_ID } from "../../lib/demo/seed";
import { ParentEntryLink } from "../wiggle/ParentEntryLink";
import { TwinLauncher } from "../wiggle/TwinLauncher";
import {
  DEFAULT_SCIENCE_ZONE,
  SUBJECT_WORLD_ORDER,
  SUBJECT_WORLDS,
  buildWorldHref,
  isEnterableWorld,
  parseSubjectRoute,
  type SubjectRoute,
  type SubjectWorldId,
} from "./subjectRoute";
import { WiggleSplash } from "./WiggleSplash";
import { WorldsConstellation } from "./WorldsConstellation";
import { WorldSelector } from "./WorldSelector";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import styles from "./SubjectWorlds.module.css";

export type SubjectWorldsProps = {
  childId?: string;
  allowLocalFallback?: boolean;
  client?: ApiClient;
  quality?: QualityPreference;
  initialRoute: SubjectRoute;
};

function routeForChild(route: SubjectRoute, childId?: string): SubjectRoute {
  if (!childId) return route;
  if (route.world === "science") return { ...route, child: childId };
  if (route.world === "math") return { world: "math", child: childId };
  return { world: null, child: childId };
}

export function SubjectWorlds({ childId, allowLocalFallback, client, quality, initialRoute }: SubjectWorldsProps) {
  const [entered, setEntered] = useState(false);
  const [route, setRoute] = useState<SubjectRoute>(() => routeForChild(initialRoute, childId));
  const [mathsOverlayOpen, setMathsOverlayOpen] = useState(false);
  const [scienceOverlayOpen, setScienceOverlayOpen] = useState(false);
  const [activeWorld, setActiveWorld] = useState<SubjectWorldId | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<SubjectWorldId>("math");
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const sound = useWiggleSound();
  const chooseWorld = (world: SubjectWorldId) => { setSelectedWorld(world); setStatusMessage(""); };
  const slide = (direction: number) => {
    const order = SUBJECT_WORLD_ORDER;
    const next = order[Math.max(0, Math.min(order.length - 1, order.indexOf(selectedWorld) + direction))];
    if (next !== selectedWorld) sound.play("slideWhoosh");
    setSelectedWorld(next);
    setStatusMessage("");
  };
  const [statusMessage, setStatusMessage] = useState("");
  const currentChild = childId ?? route.child;

  const navigate = (next: SubjectRoute) => {
    const ownedNext = routeForChild(next, childId);
    if (route.world === "math" && mathsOverlayOpen && ownedNext.world !== "math") {
      window.history.replaceState({}, "", buildWorldHref(routeForChild(route, childId)));
      setStatusMessage(MATHS_MISSION_BLOCKED_MESSAGE);
      return;
    }
    window.history.pushState({}, "", buildWorldHref(ownedNext));
    setRoute(ownedNext);
  };

  useEffect(() => {
    const onPopState = () => {
      const next = routeForChild(parseSubjectRoute(new URLSearchParams(window.location.search)), childId);
      if (route.world === "math" && mathsOverlayOpen && next.world !== "math") {
        window.history.replaceState({}, "", buildWorldHref(routeForChild(route, childId)));
        setStatusMessage(MATHS_MISSION_BLOCKED_MESSAGE);
        return;
      }
      setRoute(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [childId, mathsOverlayOpen, route]);

  const selectWorld = (world: SubjectWorldId) => {
    setActiveWorld(null);
    if (!isEnterableWorld(world)) {
      const name = SUBJECT_WORLDS.find(item => item.id === world)?.name ?? "This world";
      setStatusMessage(`${name} is coming soon. Your current world is still here.`);
      return;
    }
    setStatusMessage("");
    if (world === "science") {
      navigate({ world: "science", zone: DEFAULT_SCIENCE_ZONE, child: currentChild });
      return;
    }
    navigate({ world: "math", child: currentChild });
  };

  if (!entered) return <WiggleSplash onEntered={() => setEntered(true)} />;

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
    onSessionOpenChange={setScienceOverlayOpen}
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
      onSlide={slide}
      activeWorld={activeWorld}
      onActiveWorldChange={setActiveWorld}
      onSelect={selectWorld}
      statusMessage={statusMessage}
    />
  </section>;

  return <>
    {content}
    <ParentEntryLink disabled={mathsOverlayOpen} disabledMessage={MATHS_MISSION_BLOCKED_MESSAGE} />
    {!mathsOverlayOpen && !scienceOverlayOpen ? <TwinLauncher childId={currentChild ?? DEMO_CHILD_ID} client={client} context={route.world === "science" ? "science" : null} /> : null}
  </>;
}
