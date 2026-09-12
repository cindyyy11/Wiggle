"use client";

import { useEffect, useState } from "react";
import { MissionAtlas } from "../mission/MissionAtlas";
import type { ApiClient } from "../../lib/api/client";
import type { QualityPreference } from "../universe/world";
import {
  DEFAULT_SCIENCE_ZONE,
  buildWorldHref,
  isEnterableWorld,
  parseSubjectRoute,
  type SubjectRoute,
  type SubjectWorldId,
} from "./subjectRoute";
import { WiggleSplash } from "./WiggleSplash";
import { WorldsConstellation } from "./WorldsConstellation";
import { WorldSelector } from "./WorldSelector";
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
  const [statusMessage, setStatusMessage] = useState("Science Planet is ready to explore.");
  const currentChild = childId ?? route.child;

  const navigate = (next: SubjectRoute) => {
    const ownedNext = routeForChild(next, childId);
    if (route.world === "math" && mathsOverlayOpen && ownedNext.world !== "math") {
      window.history.replaceState({}, "", buildWorldHref(routeForChild(route, childId)));
      setStatusMessage("Finish or leave your Maths mission before changing worlds.");
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
        setStatusMessage("Finish or leave your Maths mission before changing worlds.");
        return;
      }
      setRoute(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [childId, mathsOverlayOpen, route]);

  const selectWorld = (world: SubjectWorldId) => {
    if (!isEnterableWorld(world)) {
      setStatusMessage(`${world === "english" ? "English" : "Bahasa Melayu"} is coming soon. Your current world is still here.`);
      return;
    }
    if (world === "science") {
      navigate({ world: "science", zone: DEFAULT_SCIENCE_ZONE, child: currentChild });
      return;
    }
    navigate({ world: "math", child: currentChild });
  };

  if (!entered) return <WiggleSplash onEntered={() => setEntered(true)} />;

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

  if (route.world === "science") return <section className={styles.scienceStaging} aria-label="Science Planet">
    <img src="/brand/wiggle-mark.png" alt="Wiggle" />
    <p>SCIENCE PLANET</p>
    <h1>Science is coming into view</h1>
    <p>Magnet Lab is getting ready for your first discovery.</p>
    <button type="button" onClick={() => navigate({ world: null, child: currentChild })}>Back to Worlds</button>
    <p className={styles.routeStatus} role="status" aria-live="polite">{statusMessage}</p>
  </section>;

  return <section className={styles.worldsView} aria-label="Subject worlds">
    <div className={styles.constellationLayer}>
      <WorldsConstellation selectedWorld="science" quality={quality} onSelect={selectWorld} />
    </div>
    <WorldSelector selectedWorld="science" onSelect={selectWorld} statusMessage={statusMessage} />
  </section>;
}
