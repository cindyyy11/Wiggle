"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, ChevronLeft, Flag, Flame, Globe, MessageCircle, Rocket, Sparkles, Star } from "lucide-react";
import type { ParentInsightsResponse } from "@wiggle/contracts";
import { getConstellationStars, getTwinVisualState, newlyUnlockedStars, type ConstellationStarId } from "@wiggle/contracts";
import { ApiClient } from "../../lib/api/client";
import { demoParent } from "../../lib/demo/parent";
import { WiggleTwinAvatar } from "./WiggleTwinAvatar";
import { WiggleConstellation } from "./WiggleConstellation";
import { TwinCheckIn } from "./TwinCheckIn";
import { getLastSeenTwin, saveSeenTwin } from "./twinMemory";
import { saveSeenConstellationStars, seenConstellationStars } from "./constellationMemory";
import { recordTwinVisit } from "./twinStreak";
import { getNextStep, type NextStep } from "./nextStep";
import { getLastSuggestedMission, saveSuggestedMission } from "./nextStepMemory";
import { planetStarProgressFor } from "../planet/planetCompletionMemory";
import styles from "./myWiggleTwin.module.css";

export interface MyWiggleTwinScreenProps {
  childId: string;
  client?: ApiClient;
}

/** "MY WIGGLE TWIN" (Part 22): the child's own Twin, Lexi's line, and their constellation. No deficits shown. */
export function MyWiggleTwinScreen({ childId, client: suppliedClient }: MyWiggleTwinScreenProps) {
  const [client] = useState(() => suppliedClient ?? new ApiClient());
  const [data, setData] = useState<ParentInsightsResponse | null>(null);
  const [freshStars, setFreshStars] = useState<ConstellationStarId[]>([]);
  const [streak, setStreak] = useState(0);
  const [nextStep, setNextStep] = useState<NextStep | null>(null);
  const remembered = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    client.childProgress(childId, controller.signal)
      .catch(() => demoParent)
      .then(result => { if (!controller.signal.aborted) setData(result); });
    return () => controller.abort();
  }, [client, childId]);

  useEffect(() => {
    if (!data || remembered.current) return;
    remembered.current = true;
    const seenStars = seenConstellationStars(childId);
    const planetProgress = planetStarProgressFor(childId);
    const fresh = newlyUnlockedStars(data.twin, seenStars, planetProgress);
    setFreshStars(fresh.map(star => star.id));
    const allUnlocked = getConstellationStars(data.twin, planetProgress).filter(star => star.unlocked).map(star => star.id);
    saveSeenConstellationStars(childId, [...new Set([...seenStars, ...allUnlocked])]);
    saveSeenTwin(childId, data.twin);
    setStreak(recordTwinVisit(childId));
    const step = getNextStep(data.twin, childId, getLastSuggestedMission(childId));
    setNextStep(step);
    if (step) saveSuggestedMission(childId, step.missionName);
  }, [data, childId]);

  if (!data) return <main className={styles.shell}><p role="status" className={styles.empty}>Waking up your Twin…</p></main>;

  const previous = getLastSeenTwin(childId);
  const state = getTwinVisualState(data.twin, previous);
  const planetProgress = planetStarProgressFor(childId);
  const stars = getConstellationStars(data.twin, planetProgress);
  const unlockedCount = stars.filter(star => star.unlocked).length;
  const subjectsProgressing = Object.keys(data.twin.mastery).length;
  const topStar = stars.find(star => freshStars.includes(star.id)) ?? stars.find(star => star.unlocked);

  return <main className={styles.shell}>
    <div className={styles.inner}>
      <header className={styles.header}>
        <a className={styles.back} href="/"><ChevronLeft aria-hidden="true" size={18} />Back to my universe</a>
        <a className={styles.brand} href="/" aria-label="Wiggle home"><img src="/brand/wiggle-wordmark.png" alt="" /></a>
      </header>
      <section className={styles.hero}>
        <h1 className={styles.title}>My Wiggle Twin</h1>
        <div className={styles.stage}>
          <span className={styles.stageGlow} aria-hidden="true" />
          <span className={`${styles.stageSparkle} ${styles.stageSparkleA}`} aria-hidden="true" />
          <span className={`${styles.stageSparkle} ${styles.stageSparkleB}`} aria-hidden="true" />
          <WiggleTwinAvatar state={state} size={190} />
        </div>
        <p className={styles.bubble} role="status"><MessageCircle aria-hidden="true" size={18} /><span>Lexi says: “{data.twin && topStar ? `${topStar.description}` : "One small step is a good place to start."}”</span></p>
      </section>
      {freshStars.length > 0 && topStar ? (
        <p className={styles.discovery} role="status"><Sparkles aria-hidden="true" size={18} /><span>Your Twin discovered something! New star: <strong>{topStar.title}</strong></span></p>
      ) : null}
      <TwinCheckIn />
      <section className={styles.stats} aria-label="Your progress">
        <div className={styles.stat}><Flame aria-hidden="true" size={18} /><strong>{streak}</strong><span>Day streak</span></div>
        <div className={styles.stat}><Globe aria-hidden="true" size={18} /><strong>{data.completedMissions > 0 ? 1 : 0}</strong><span>Planets explored</span></div>
        <div className={styles.stat}><Flag aria-hidden="true" size={18} /><strong>{data.completedMissions}</strong><span>Missions completed</span></div>
        <div className={styles.stat}><Star aria-hidden="true" size={18} /><strong>{unlockedCount}</strong><span>Stars unlocked</span></div>
        <div className={styles.stat}><BookOpen aria-hidden="true" size={18} /><strong>{subjectsProgressing}</strong><span>Subjects progressing</span></div>
      </section>
      {nextStep ? <section className={styles.nextStep} aria-label="What to try next">
        <Rocket className={styles.nextStepIcon} aria-hidden="true" size={22} />
        <div className={styles.nextStepText}>
          <h2>What can I try?</h2>
          <p>{nextStep.description}</p>
        </div>
        <a className={styles.nextStepLink} href={nextStep.href}>{nextStep.actionLabel}<ArrowUpRight aria-hidden="true" size={17} /></a>
      </section> : null}
      <section className={styles.achievements} aria-label="Recent discoveries">
        <h2>Recent discoveries</h2>
        {unlockedCount > 0 ? <ul>{stars.filter(star => star.unlocked).map(star => <li key={star.id}><Star aria-hidden="true" size={13} />{star.title}</li>)}</ul> : <p className={styles.empty}>Keep exploring missions to discover your first star.</p>}
      </section>
      <WiggleConstellation twin={data.twin} planetProgress={planetProgress} newlyUnlocked={new Set(freshStars)} />
      <a className={styles.primary} href="/">Continue exploring<ArrowUpRight aria-hidden="true" size={18} /></a>
      <p className={styles.footer}>This page shows how your missions are going. It isn’t a test or a grade.</p>
    </div>
  </main>;
}
