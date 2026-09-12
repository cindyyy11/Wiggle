"use client";

import { useEffect, useRef, useState } from "react";
import type { ParentInsightsResponse } from "@wiggle/contracts";
import { getConstellationStars, getTwinVisualState, newlyUnlockedStars, type ConstellationStarId } from "@wiggle/contracts";
import { ApiClient } from "../../lib/api/client";
import { demoParent } from "../../lib/demo/parent";
import { WiggleTwinAvatar } from "./WiggleTwinAvatar";
import { WiggleConstellation } from "./WiggleConstellation";
import { getLastSeenTwin, saveSeenTwin } from "./twinMemory";
import { saveSeenConstellationStars, seenConstellationStars } from "./constellationMemory";
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
    const fresh = newlyUnlockedStars(data.twin, seenStars);
    setFreshStars(fresh.map(star => star.id));
    const allUnlocked = getConstellationStars(data.twin).filter(star => star.unlocked).map(star => star.id);
    saveSeenConstellationStars(childId, [...new Set([...seenStars, ...allUnlocked])]);
    saveSeenTwin(childId, data.twin);
  }, [data, childId]);

  if (!data) return <main className={styles.shell}><p role="status" className={styles.empty}>Waking up your Twin…</p></main>;

  const previous = getLastSeenTwin(childId);
  const state = getTwinVisualState(data.twin, previous);
  const stars = getConstellationStars(data.twin);
  const unlockedCount = stars.filter(star => star.unlocked).length;
  const subjectsProgressing = Object.keys(data.twin.mastery).length;
  const topStar = stars.find(star => freshStars.includes(star.id)) ?? stars.find(star => star.unlocked);

  return <main className={styles.shell}>
    <header className={styles.header}>
      <a className={styles.brand} href="/">wiggle</a>
      <a className={styles.back} href="/">Back to my universe</a>
    </header>
    <h1 className={styles.title}>My Wiggle Twin</h1>
    <div className={styles.stage}>
      <WiggleTwinAvatar state={state} size={190} />
      <p className={styles.bubble} role="status">Lexi says: “{data.twin && topStar ? `${topStar.description}` : "One small step is a good place to start."}”</p>
    </div>
    {freshStars.length > 0 && topStar ? (
      <p className={styles.discovery} role="status">✨ Your Twin discovered something! New star: <strong>{topStar.title}</strong></p>
    ) : null}
    <section className={styles.stats} aria-label="Your progress">
      <div className={styles.stat}><strong>{data.completedMissions > 0 ? 1 : 0}</strong><span>Planets explored</span></div>
      <div className={styles.stat}><strong>{data.completedMissions}</strong><span>Missions completed</span></div>
      <div className={styles.stat}><strong>{unlockedCount}</strong><span>Stars unlocked</span></div>
      <div className={styles.stat}><strong>{subjectsProgressing}</strong><span>Subjects progressing</span></div>
    </section>
    <section className={styles.achievements} aria-label="Recent discoveries">
      <h2>Recent discoveries</h2>
      {unlockedCount > 0 ? <ul>{stars.filter(star => star.unlocked).map(star => <li key={star.id}>{star.title}</li>)}</ul> : <p className={styles.empty}>Keep exploring missions to discover your first star.</p>}
    </section>
    <WiggleConstellation twin={data.twin} newlyUnlocked={new Set(freshStars)} />
    <a className={styles.primary} href="/">Continue exploring ↗</a>
    <p className={styles.footer}>This page shows how your missions are going. It isn’t a test or a grade.</p>
  </main>;
}
