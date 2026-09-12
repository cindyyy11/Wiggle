"use client";

import type { ApiClient } from "../../lib/api/client";
import { MissionAtlas } from "../mission/MissionAtlas";
import type { QualityPreference } from "../universe/world";
import { OpeningMoment } from "./OpeningMoment";
import { SolarSystemHub } from "./SolarSystemHub";
import { useWorldStore } from "./worldStore";

type WiggleExperienceProps = {
  quality?: QualityPreference;
  client?: ApiClient;
  childId?: string;
  allowLocalFallback?: boolean;
};

/** Owns the lightweight world phases; MissionAtlas remains the learning-session boundary. */
export function WiggleExperience({ quality, client, childId, allowLocalFallback }: WiggleExperienceProps) {
  const phase = useWorldStore((state) => state.phase);
  const reducedMotion = useWorldStore((state) => state.reducedMotion);
  const enterHub = useWorldStore((state) => state.enterHub);
  const enterNumeria = useWorldStore((state) => state.enterNumeria);

  if (phase === "numeria") {
    return <MissionAtlas quality={quality} client={client} childId={childId} allowLocalFallback={allowLocalFallback} />;
  }

  if (phase === "opening") {
    return <OpeningMoment reducedMotion={reducedMotion} onEnter={enterHub} />;
  }

  return <SolarSystemHub onEnterNumeria={enterNumeria} />;
}
