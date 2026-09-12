"use client";
import { useEffect, useState } from "react";
import type { ParentInsightsResponse } from "@wiggle/contracts";
import { parentRequest, type ParentDataMode } from "../../lib/api/parent";
import { HomeworkCheckIn } from "./HomeworkCheckIn";
import styles from "./parent.module.css";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const names: Record<string, string> = { visual: "Pictures & diagrams", gesture: "Hands-on gestures", voice: "Spoken guidance", movement: "Moving to learn", story: "Learning through stories", text: "Reading", chunking: "Small steps", movementBreak: "Movement breaks", visualHint: "Picture hints", voiceHint: "Spoken hints", choice: "A choice of activities" };

function Trend({ title, points, description }: { title: string; points: readonly { label: string; value: number }[]; description: string }) {
  return <section><h2>{title}</h2><p>{description}</p>
    {points.length ? <><div className={styles.bars} aria-hidden="true">{points.slice(-8).map((point, index) => <div key={index}><span style={{ height: `${Math.max(4, point.value * 100)}%` }} /></div>)}</div>
      <ol className={styles.trendText}>{points.slice(-8).map((point, index) => <li key={index}>{point.label}: {percent(point.value)}</li>)}</ol>
    </> : <p className={styles.empty}>A trend will appear after completed missions. There isn’t enough history yet.</p>}
  </section>;
}

export function ParentDashboard({ mode, onLock }: { mode: ParentDataMode; onLock: () => void }) {
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [childId, setChildId] = useState("");
  const [data, setData] = useState<ParentInsightsResponse | null>(null);
  const [interval, setInterval] = useState(20);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([parentRequest<{ id: string; name: string }[]>("children"), parentRequest<{ breakIntervalMinutes: number }>("settings")]).then(([rows, settings]) => {
      if (active) { setChildren(rows); setChildId(previous => rows.some(row => row.id === previous) ? previous : rows[0]?.id || ""); setInterval(settings.breakIntervalMinutes); }
    }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    if (!childId) return;
    let active = true;
    setData(null); setError("");
    parentRequest<ParentInsightsResponse>(`insights?child_id=${encodeURIComponent(childId)}`).then(result => { if (active) setData(result); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [childId, retry]);
  const name = children.find(child => child.id === childId)?.name || "Your explorer";
  return <>
    <header className={styles.header}><a href="/" className={styles.brand}>wiggle<span> / parent space</span></a><button className={styles.secondary} onClick={onLock}>Lock parent space</button></header>
    {mode === "local_demo" && <p className={styles.notice}>Local demo · Sample starting state for Nova. Changes last for this server session. Complete mission history is available when the API is connected.</p>}
    {mode === "memory_demo" && <p className={styles.notice}>Connected demo · Shared sample explorer data. Settings and check-ins last only for this API server session.</p>}
    <div className={styles.intro}><div><p className={styles.eyebrow}>Little steps. Real discoveries.</p><h1>Mission control</h1><p>A window into how {name} is finding their way.</p></div>
      {children.length > 0 && <label className={styles.childSelect}>Your explorer<select value={childId} onChange={event => setChildId(event.target.value)}>{children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
    </div>
    {error && <div role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>Try again</button> <button onClick={onLock}>Return to PIN entry</button></div>}
    {!children.length && !error && <p role="status">Loading your explorers… If this household is new, add a child profile before starting a mission.</p>}
    {childId && !data && !error && <p role="status">Loading progress…</p>}
    {data && <div className={styles.grid}>
      <section className={styles.missionCard}><p className={styles.eyebrow}>The journey so far</p><h2>{data.completedMissions} completed {data.completedMissions === 1 ? "mission" : "missions"}</h2>
        <p>Every attempt is a chance to discover a new way.</p><ul>{data.missions?.map(mission => <li key={mission.objective}><strong>{mission.title}</strong><span>Finding three quarters with equal parts</span></li>)}</ul>
        <a href="/">Explore the universe ↗</a>
      </section>
      <section className={styles.insight}><p className={styles.eyebrow}>One thing to try together</p><h2>Bring the learning home.</h2><p>{data.insight.text}</p><span>Small moments count, too.</span></section>
      <section><h2>Mastery today</h2><p>Learning estimates that grow with practice.</p>{Object.entries(data.twin.mastery).map(([objective, value]) => <div className={styles.meter} key={objective}><label htmlFor={`mastery-${objective}`}>{objective === "identify-three-quarters" ? "Finding three quarters" : objective} <strong>{percent(value)}</strong></label><meter id={`mastery-${objective}`} min={0} max={1} value={value}>{percent(value)}</meter></div>)}</section>
      <Trend title="Mastery trend" points={data.masteryHistory || []} description="Estimated mastery after each completed mission." />
      <section><h2>Ways that are working</h2><p>Current signals, not fixed learning labels.</p><ul className={styles.strategies}>{Object.entries(data.twin.modalityEffectiveness).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key, value]) => <li key={key}><span>{names[key]}</span><strong>{percent(value)}</strong></li>)}</ul><p>Support strategies</p><ul className={styles.strategies}>{Object.entries(data.twin.strategyEffectiveness).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key, value]) => <li key={key}><span>{names[key]}</span><strong>{percent(value)}</strong></li>)}</ul></section>
      <Trend title="Growing independence" points={data.independenceHistory || []} description="100% means a completed mission had no hint or “I’m stuck” request; 0% means support was requested. Asking for help is a useful skill. This does not measure adult help." />
      <section><h2>Make room for a breather</h2><p>Save your preferred time between breaks. Automatic reminders are not available yet.</p><form onSubmit={async event => {
        event.preventDefault(); setSaving(true); setSaved("");
        try { await parentRequest("settings", { breakIntervalMinutes: interval }); setSaved("Break preference saved."); }
        catch (error) { setSaved(error instanceof Error ? error.message : "Please try again."); }
        finally { setSaving(false); }
      }}><label htmlFor="break-interval">Preferred minutes between breaks</label><input id="break-interval" type="number" min={5} max={120} value={interval} onChange={event => setInterval(Number(event.target.value))} required /><button disabled={saving}>{saving ? "Saving…" : "Save break preference"}</button><p role="status">{saved}</p></form><small>{mode === "household" ? "This preference is saved for your household." : "This demo preference lasts only for this server session."} Breaks can always be started from the mission’s Reset Station.</small></section>
      <HomeworkCheckIn key={childId} childId={childId} />
    </div>}
    <footer className={styles.footer}>Progress has its own pace. This space describes learning activity and is not a clinical assessment.</footer>
  </>;
}
