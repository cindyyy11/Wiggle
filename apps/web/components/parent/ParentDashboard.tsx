"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Clock, LifeBuoy, Lightbulb, Lock, Pause, Sprout } from "lucide-react";
import type { LearnerTwin, ParentInsightsResponse } from "@wiggle/contracts";
import { getLearnerPatterns, getTwinVisualState, patternLabels, twinVisualCopy } from "@wiggle/contracts";
import { parentRequest, type ParentDataMode } from "../../lib/api/parent";
import { subscribeWiggleLiveEvents } from "../../features/sync/wiggleLiveChannel";
import { getNextStep } from "../wiggle/nextStep";
import { getLastSeenTwin, saveSeenTwin } from "../wiggle/twinMemory";
import { HomeworkCheckIn } from "./HomeworkCheckIn";
import { QuickCheckIn } from "./QuickCheckIn";
import { feelingSignals, feelingTip, masteryLevel, objectiveLabel, plural, todayHeadline, type Tone } from "./insightCopy";
import { TrendChart } from "./TrendChart";
import styles from "./parent.module.css";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const names: Record<string, string> = { visual: "Pictures & diagrams", gesture: "Hands-on gestures", voice: "Spoken guidance", movement: "Moving to learn", story: "Learning through stories", text: "Reading", chunking: "Small steps", movementBreak: "Movement breaks", visualHint: "Picture hints", voiceHint: "Spoken hints", choice: "A choice of activities" };
const toneClass: Record<Tone, string> = {
  sage: styles.toneSage,
  blue: styles.toneBlue,
  mustard: styles.toneMustard,
  coral: styles.toneCoral,
};

const BREAK_PRESETS = [15, 20, 25, 30, 45] as const;

/** Below this width the three forms become tabs (one at a time) instead of sitting side by side. */
const COMPACT_QUERY = "(max-width: 1100px)";
const FORM_TABS = [
  { id: "break", label: "Break time" },
  { id: "today", label: "Today" },
  { id: "homework", label: "Homework" },
] as const;
type FormTab = (typeof FORM_TABS)[number]["id"];

function useCompactLayout() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#progress", label: "Progress" },
  { href: "#learning", label: "How they learn" },
  { href: "#actions", label: "Share & settings" },
] as const;

function rankedSignals(data: ParentInsightsResponse) {
  return [...Object.entries(data.twin.modalityEffectiveness), ...Object.entries(data.twin.strategyEffectiveness)]
    .sort((a, b) => b[1] - a[1]);
}

/** Independence is a yes/no per mission, so say how many, not "up N points". */
function independentSummary(points: readonly { label: string; value: number }[]) {
  const independent = points.filter(point => point.value >= 0.5).length;
  return `Independent in ${independent} of ${plural(points.length, "recent mission")}`;
}

/** One colour per list (green = working well, amber = less effective) instead of a rainbow. */
function SignalBars({ items, empty, tone }: { items: readonly [string, number][]; empty: string; tone: Tone }) {
  if (!items.length) return <p className={styles.empty}>{empty}</p>;
  return <ul className={styles.signalList}>
    {items.map(([key, value]) => (
      <li key={key}>
        <div className={styles.signalMeta}>
          <span>{names[key] ?? key}</span>
          <strong>{percent(value)}</strong>
        </div>
        <div className={styles.signalTrack} aria-hidden="true">
          <span className={styles.signalFill} data-tone={tone} style={{ width: `${Math.max(6, value * 100)}%` }} />
        </div>
      </li>
    ))}
  </ul>;
}

export function ParentDashboard({ mode, onLock }: { mode: ParentDataMode; onLock: () => void }) {
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [childId, setChildId] = useState("");
  const [data, setData] = useState<ParentInsightsResponse | null>(null);
  const [interval, setInterval] = useState(20);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(NAV[0].href.slice(1));
  const [formTab, setFormTab] = useState<FormTab>("break");
  const compact = useCompactLayout();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [insightsRefresh, setInsightsRefresh] = useState(0);
  const [liveNotice, setLiveNotice] = useState("");
  const [previousTwin, setPreviousTwin] = useState<LearnerTwin | null>(null);
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
  }, [childId, retry, insightsRefresh]);
  useEffect(() => {
    // Same per-browser "last seen twin" memory the child's own Twin screen uses (see
    // twinMemory.ts) — reused here so the plain-English mood below can say "finding
    // its groove" instead of only ever "ready", "mastered", or a friction state.
    if (!data || !childId) return;
    setPreviousTwin(getLastSeenTwin(childId));
    saveSeenTwin(childId, data.twin);
  }, [data, childId]);
  const name = children.find(child => child.id === childId)?.name || "Your explorer";
  useEffect(() => {
    setLiveNotice("");
    return subscribeWiggleLiveEvents(event => {
      if (event.type === "mission_completed" && event.childId === childId) {
        setLiveNotice(`${name} completed: ${event.missionTitle}`);
        setInsightsRefresh(value => value + 1);
      }
    });
  }, [childId, name]);

  useEffect(() => {
    // Highlight the section the parent is reading in the app bar's section nav.
    if (!data || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      const inBand = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (inBand) setActiveSection(inBand.target.id);
    }, { rootMargin: "-25% 0px -60% 0px" });
    NAV.forEach(item => { const element = document.getElementById(item.href.slice(1)); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [data]);

  const signals = data ? rankedSignals(data) : [];
  const topSignal = signals[0];
  const masteryEntries = data ? Object.entries(data.twin.mastery) : [];

  return <>
    <header className={styles.header}>
      <a href="/" className={styles.brand}><img src="/brand/wiggle-wordmark.png" alt="Wiggle" /><span>parent space</span></a>
      {data && <nav className={styles.pageNav} aria-label="On this page">
        {NAV.map(item => {
          const id = item.href.slice(1);
          return <a key={item.href} href={item.href} aria-current={activeSection === id ? "location" : undefined} onClick={() => setActiveSection(id)}>{item.label}</a>;
        })}
      </nav>}
      <div className={styles.headerActions}>
        <a href="/" className={styles.ghostLink} title="Back to worlds"><ArrowLeft className={styles.btnIcon} aria-hidden="true" /><span className={styles.btnLabel}>Back to worlds</span></a>
        <button type="button" className={styles.secondary} onClick={onLock} title="Lock parent space"><Lock className={styles.btnIcon} aria-hidden="true" /><span className={styles.btnLabel}>Lock parent space</span></button>
      </div>
    </header>

    {mode === "local_demo" && <p className={styles.notice}>Local demo · Sample starting state for Nova. Changes last for this server session. Complete mission history is available when the API is connected.</p>}
    {mode === "memory_demo" && <p className={styles.notice}>Connected demo · Shared sample explorer data. Settings and check-ins last only for this API server session.</p>}

    <div className={styles.intro}>
      <div>
        <p className={styles.eyebrow}>Little steps. Real discoveries.</p>
        <h1>Mission control</h1>
        <p className={styles.introLead}>A colourful snapshot of how {name} is learning — useful numbers first, then the detail when you want it.</p>
      </div>
      {children.length > 0 && <label className={styles.childSelect}>Your explorer<select value={childId} onChange={event => setChildId(event.target.value)}>{children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
    </div>

    {liveNotice && <p className={styles.liveNotice} role="status">
      <span>{liveNotice}</span>
      <button type="button" className={styles.secondary} onClick={() => setLiveNotice("")}>Dismiss</button>
    </p>}
    {error && <div className={styles.errorBox} role="alert"><p>{error}</p><div className={styles.errorActions}><button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button><button type="button" className={styles.secondary} onClick={onLock}>Return to PIN entry</button></div></div>}
    {!children.length && !error && <p role="status" className={styles.inlineStatus}>Loading your explorers… If this household is new, add a child profile before starting a mission.</p>}
    {childId && !data && !error && <p role="status" className={styles.inlineStatus}>Loading progress…</p>}

    {data && <>
      <section id="overview" className={styles.region} aria-labelledby="overview-heading">
        <div className={styles.regionHead}>
          <p className={styles.eyebrow}>Start here</p>
          <h2 id="overview-heading">Overview</h2>
          <p className={styles.regionLead}>The quick picture of {name}&rsquo;s day and one practical idea to try at home.</p>
        </div>

        {(() => {
          const today = data.today;
          const doneToday = today?.missionsCompleted ?? 0;
          return <>
            <div className={styles.hero}>
              <div className={styles.heroMain}>
                <p className={styles.eyebrow}>{name} today</p>
                <h3 className={styles.heroTitle}>{todayHeadline(name, today, data.completedMissions)}</h3>
                <ul className={styles.factChips} aria-label="Today's activity">
                  <li data-tone="sage"><Clock className={styles.btnIcon} aria-hidden="true" />{today?.learningMinutes ?? 0} min learning</li>
                  <li data-tone="blue"><Sprout className={styles.btnIcon} aria-hidden="true" />{today?.offlineMinutes ?? 0} min offline</li>
                  <li data-tone="coral"><Pause className={styles.btnIcon} aria-hidden="true" />{plural(today?.resetBreaks ?? 0, "reset break")}</li>
                  <li data-tone="mustard"><LifeBuoy className={styles.btnIcon} aria-hidden="true" />{plural(today?.helpRequests ?? 0, "help request")}</li>
                </ul>
              </div>
              <aside className={styles.heroTip} aria-label="Try this at home">
                <p className={styles.eyebrow}><Lightbulb className={styles.btnIcon} aria-hidden="true" />Try this at home</p>
                <p className={styles.heroTipText}>{data.insight.text}</p>
                <span>Small moments count, too.</span>
              </aside>
            </div>

            <div className={styles.snapshot} aria-label="Key numbers">
              <div className={`${styles.snapCard} ${styles.snapSage}`}>
                <p className={styles.snapLabel}>Missions done</p>
                <p className={styles.snapValue}>{data.completedMissions}</p>
                <p className={styles.snapHint}>{doneToday > 0 ? `${doneToday} of them today` : "All-time completed"}</p>
              </div>
              <div className={`${styles.snapCard} ${styles.snapBlue}`}>
                <p className={styles.snapLabel}>Learning today</p>
                <p className={styles.snapValue}>{today?.learningMinutes ?? 0}<span className={styles.snapUnit}>min</span></p>
                <p className={styles.snapHint}>{doneToday > 0 ? plural(doneToday, "mission") : "No missions yet"}</p>
              </div>
              <div className={`${styles.snapCard} ${styles.snapMustard}`}>
                <p className={styles.snapLabel}>Did it independently</p>
                <p className={styles.snapValue}>{doneToday > 0 ? `${today?.independentMissions ?? 0} of ${doneToday}` : "–"}</p>
                <p className={styles.snapHint}>{doneToday > 0 ? "with no help asked" : "Shows after a mission today"}</p>
              </div>
              <div className={`${styles.snapCard} ${styles.snapCoral}`}>
                <p className={styles.snapLabel}>Working well</p>
                <p className={styles.snapValueSmall}>{topSignal ? (names[topSignal[0]] ?? topSignal[0]) : "Still gathering"}</p>
                <p className={styles.snapHint}>{topSignal ? `${percent(topSignal[1])} fit right now` : "Complete a mission to unlock"}</p>
              </div>
            </div>
          </>;
        })()}

        <div className={styles.overviewGrid}>
          <article className={styles.missionCard}>
            <p className={styles.eyebrow}>The journey so far</p>
            <h3 className={styles.panelTitle}>{data.completedMissions} completed {data.completedMissions === 1 ? "mission" : "missions"}</h3>
            <p>Every attempt is a chance to discover a new way.</p>
            <p className={styles.subLabel}>{data.completedMissions > 0 ? "Recent missions" : "Up next"}</p>
            <ul className={styles.missionList}>{data.missions?.length
              ? data.missions.map((mission, index) => {
                const value = data.twin.mastery[mission.objective];
                const level = value === undefined ? null : masteryLevel(value);
                return <li key={`${mission.objective}-${index}`}>
                  <div><strong>{mission.title}</strong><span>{objectiveLabel(mission.objective)}</span></div>
                  {level ? <span className={styles.levelBadge} data-tone={level.tone}>{level.label}</span> : null}
                </li>;
              })
              : <li><div><strong>No completed missions yet</strong><span>Head into the universe to begin.</span></div></li>}
            </ul>
            <a className={styles.ctaLink} href="/">Explore the universe<ArrowUpRight className={styles.btnIcon} aria-hidden="true" /></a>
          </article>
          {(() => {
              const signals = feelingSignals(data.twin);
              const tip = feelingTip(signals);
              return <article className={`${styles.panel} ${toneClass.blue}`} aria-label={`How ${name} is feeling`}>
                <h3 className={styles.panelTitle}>How {name} is feeling</h3>
                <p className={styles.panelLead}>Gentle signals from recent missions, not a diagnosis.</p>
                {data.completedMissions === 0 ? <p className={styles.empty}>Energy, focus and how {name} takes to new things will appear after the first mission.</p> : <dl className={styles.feelings}>
                  {signals.map(signal => <div key={signal.key} data-level={signal.level}>
                    <dt>{signal.label}</dt>
                    <dd><span className={styles.feelDot} aria-hidden="true" />{signal.word}</dd>
                  </div>)}
                </dl>}
                {tip && data.completedMissions > 0 ? <p className={styles.tip}><Lightbulb className={styles.btnIcon} aria-hidden="true" />{tip}</p> : null}
              </article>;
            })()}
          {(() => {
              const mood = twinVisualCopy[getTwinVisualState(data.twin, previousTwin)];
              const nextStep = getNextStep(data.twin, childId);
              return <article className={`${styles.panel} ${toneClass.sage} ${styles.spanAll}`} aria-label="Your child's Wiggle Twin">
                <h3 className={styles.panelTitle}>{name}&rsquo;s Wiggle Twin, in plain English</h3>
                <p className={styles.panelLead}>The same warm summary {name} sees on their own Twin screen: no scores, just the gist.</p>
                <p>&ldquo;{mood}&rdquo;</p>
                {nextStep && <p>A good next step: <strong>{nextStep.actionLabel.replace(/^Go to /, "")}</strong> — {nextStep.description}</p>}
              </article>;
            })()}
        </div>
      </section>

      <section id="progress" className={styles.region} aria-labelledby="progress-heading">
        <div className={styles.regionHead}>
          <p className={styles.eyebrow}>Growth over time</p>
          <h2 id="progress-heading">Progress</h2>
          <p className={styles.regionLead}>Estimates from practice, not grades. Look for gentle upward movement, not perfection.</p>
        </div>
        <div className={styles.grid}>
          <article className={`${styles.panel} ${toneClass.sage}`}>
            <h3 className={styles.panelTitle}>Mastery today</h3>
            <p className={styles.panelLead}>Where each skill is right now. It grows with practice.</p>
            {masteryEntries.length ? <>
              {masteryEntries.map(([objective, value]) => {
                const level = masteryLevel(value);
                return <div className={styles.meter} key={objective}>
                  <label htmlFor={`mastery-${objective}`}>
                    <span>{objectiveLabel(objective)}</span>
                    <span className={styles.meterValue}><span className={styles.levelBadge} data-tone={level.tone}>{level.label}</span><strong>{percent(value)}</strong></span>
                  </label>
                  <div className={styles.meterTrack} aria-hidden="true"><span data-tone={level.tone} style={{ width: `${Math.max(6, value * 100)}%` }} /></div>
                  <meter id={`mastery-${objective}`} min={0} max={1} value={value} className={styles.srMeter}>{percent(value)}</meter>
                </div>;
              })}
              <p className={styles.legend}>Just starting · Growing · Strong · Mastered</p>
            </> : <p className={styles.empty}>Mastery appears after the first completed mission.</p>}
          </article>
          <TrendChart title="Mastery trend" points={data.masteryHistory || []} description="Estimated mastery after each completed mission." tone="blue" />
          <TrendChart title="Growing independence" points={data.independenceHistory || []} description="100% means a completed mission had no hint or “I’m stuck” request; 0% means support was requested. Asking for help is a useful skill. This does not measure adult help." tone="mustard" summarize={independentSummary} />
          {data.weeklySummary && <article className={`${styles.panel} ${styles.weekly}`} aria-label="Weekly summary">
            <p className={styles.eyebrow}>{name}&rsquo;s week</p>
            <h3 className={styles.panelTitle}>Wiggle noticed</h3>
            <p className={styles.panelLead}>{data.weeklySummary.wiggleNoticed}</p>
            <dl className={styles.today}>
              {Object.entries(data.weeklySummary.masteryDeltaBySubject).slice(0, 1).map(([subject, delta]) => <div key={subject} data-tone="sage"><dt>Mastery</dt><dd>{delta >= 0 ? "+" : ""}{Math.round(delta * 100)}%</dd></div>)}
              <div data-tone="blue"><dt>Independent completion</dt><dd>{data.weeklySummary.independentCompletionDelta >= 0 ? "+" : ""}{Math.round(data.weeklySummary.independentCompletionDelta * 100)}%</dd></div>
              {data.weeklySummary.mostEffectiveStrategy && <div data-tone="mustard"><dt>Most effective</dt><dd className={styles.todayText}>{data.weeklySummary.mostEffectiveStrategy}</dd></div>}
              {data.weeklySummary.biggestImprovement && <div data-tone="coral"><dt>Biggest improvement</dt><dd className={styles.todayText}>{data.weeklySummary.biggestImprovement}</dd></div>}
            </dl>
            <div className={styles.suggestion}>
              <p className={styles.subLabel}>Parent suggestion</p>
              <p>{data.weeklySummary.parentSuggestion}</p>
            </div>
          </article>}
        </div>
      </section>

      <section id="learning" className={styles.region} aria-labelledby="learning-heading">
        <div className={styles.regionHead}>
          <p className={styles.eyebrow}>Support that fits</p>
          <h2 id="learning-heading">How they learn</h2>
          <p className={styles.regionLead}>Current signals from recent missions — not fixed labels or diagnoses.</p>
        </div>
        <div className={styles.grid}>
          <article className={`${styles.panel} ${toneClass.blue}`} aria-label="What Wiggle learned">
            <h3 className={styles.panelTitle}>What Wiggle learned</h3>
            <p className={styles.panelLead}>Current signals, not fixed learning labels.</p>
            <p className={styles.subLabel}>{name} currently responds best to</p>
            <SignalBars items={signals.slice(0, 3)} empty="Still gathering evidence" tone="sage" />
            <p className={styles.subLabel}>Less effective right now</p>
            <SignalBars items={[...signals].reverse().slice(0, 2)} empty="Nothing stands out yet" tone="mustard" />
          </article>
          <article className={`${styles.panel} ${toneClass.coral}`} aria-label="Learning patterns">
            <h3 className={styles.panelTitle}>{name}&rsquo;s learning patterns</h3>
            <p className={styles.panelLead}>Not a score, not a diagnosis — just what the last few missions show.</p>
            {(() => {
              const patterns = getLearnerPatterns(data.twin);
              return <>
                <p className={styles.subLabel}>Currently effective</p>
                <ul className={styles.patternChips}>{patterns.effective.length ? patterns.effective.map(key => <li key={key} data-tone="sage">{patternLabels[key]}</li>) : <li data-tone="blue">Still gathering evidence</li>}</ul>
                <p className={styles.subLabel}>Improving</p>
                <ul className={styles.patternChips}>{patterns.improving.length ? patterns.improving.map(key => <li key={key} data-tone="mustard">{patternLabels[key]}</li>) : <li data-tone="mustard">Nothing new yet</li>}</ul>
                <p className={styles.subLabel}>Needs more data</p>
                <ul className={styles.patternChips}>{patterns.needsMoreData.length ? patterns.needsMoreData.map(key => <li key={key} data-tone="coral">{patternLabels[key]}</li>) : <li data-tone="coral">Everything has some evidence</li>}</ul>
              </>;
            })()}
          </article>
        </div>
      </section>

      <section id="actions" className={styles.region} aria-labelledby="actions-heading">
        <div className={styles.regionHead}>
          <p className={styles.eyebrow}>Your turn</p>
          <h2 id="actions-heading">Share &amp; settings</h2>
          <p className={styles.regionLead}>Optional check-ins and break preferences for {name}. These never change mastery scores.</p>
        </div>
        {compact && <div className={styles.formTabs} role="tablist" aria-label="Share and settings" onKeyDown={event => {
          const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (!step) return;
          event.preventDefault();
          const next = FORM_TABS[(FORM_TABS.findIndex(tab => tab.id === formTab) + step + FORM_TABS.length) % FORM_TABS.length];
          setFormTab(next.id);
          document.getElementById(`form-tab-${next.id}`)?.focus();
        }}>
          {FORM_TABS.map(tab => <button key={tab.id} type="button" role="tab" id={`form-tab-${tab.id}`} className={styles.formTab} aria-selected={formTab === tab.id} aria-controls={`form-pane-${tab.id}`} tabIndex={formTab === tab.id ? 0 : -1} onClick={() => setFormTab(tab.id)}>{tab.label}</button>)}
        </div>}
        <div className={`${styles.grid} ${styles.actionsGrid}`}>
          {/* Inactive tabs are hidden, not unmounted, so anything already typed is kept. */}
          <div className={styles.formPane} {...(compact ? { role: "tabpanel", id: "form-pane-break", "aria-labelledby": "form-tab-break", hidden: formTab !== "break" } : {})}>
            <article className={`${styles.panel} ${toneClass.mustard}`}>
              <h3 className={styles.panelTitle}>Make room for a breather</h3>
              <p className={styles.panelLead}>Save your preferred time between breaks. Automatic reminders are not available yet.</p>
              <form onSubmit={async event => {
                event.preventDefault(); setSaving(true); setSaved(""); setSaveFailed(false);
                try { await parentRequest("settings", { breakIntervalMinutes: interval }); setSaved("Break preference saved."); }
                catch (error) { setSaveFailed(true); setSaved(error instanceof Error ? error.message : "Please try again."); }
                finally { setSaving(false); }
              }}>
                <label htmlFor="break-interval">Preferred minutes between breaks</label>
                <input id="break-interval" type="number" min={5} max={120} value={interval} onChange={event => setInterval(Number(event.target.value))} required />
                <div className={styles.choiceGroup} role="group" aria-label="Quick picks">
                  {BREAK_PRESETS.map(minutes => <button key={minutes} type="button" className={styles.choice} aria-pressed={interval === minutes} onClick={() => setInterval(minutes)}>{minutes} min</button>)}
                </div>
                <div className={styles.actionRow}>
                  <button type="submit" disabled={saving} aria-busy={saving}>{saving ? "Saving…" : "Save break preference"}</button>
                  <p role="status" className={styles.formStatus} data-tone={saveFailed ? "error" : "ok"}>{saved && !saveFailed ? <Check className={styles.btnIcon} aria-hidden="true" /> : null}{saved}</p>
                </div>
              </form>
              <small>{mode === "household" ? "This preference is saved for your household." : "This demo preference lasts only for this server session."} Breaks can always be started from the mission’s Reset Station.</small>
            </article>
          </div>
          <div className={styles.formPane} {...(compact ? { role: "tabpanel", id: "form-pane-today", "aria-labelledby": "form-tab-today", hidden: formTab !== "today" } : {})}>
            <QuickCheckIn key={`quick-${childId}`} childId={childId} />
          </div>
          <div className={styles.formPane} {...(compact ? { role: "tabpanel", id: "form-pane-homework", "aria-labelledby": "form-tab-homework", hidden: formTab !== "homework" } : {})}>
            <HomeworkCheckIn key={childId} childId={childId} />
          </div>
        </div>
      </section>
    </>}

    <footer className={styles.footer}>Progress has its own pace. This space describes learning activity and is not a clinical assessment.</footer>
  </>;
}
