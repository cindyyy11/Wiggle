'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { useHandTracking } from '../../features/gestures/useHandTracking';
import { GESTURE_CONFIG } from '../../features/gestures/config';
import { scienceLand } from './scienceLands';
import { matchesActivity, SCIENCE_ACTIVITIES, StarterHandController, type StarterLand } from './scienceActivities';
import styles from './ScienceSession.module.css';
import { Check } from 'lucide-react';
const Models = dynamic(() => import('./ScienceActivityModels'), { ssr: false });
export type StarterProgress = { observed: string[]; matched: string[] };
export function ScienceStarterSession({ land, progress, onProgress, onClose, graphics }: { land: StarterLand; progress: StarterProgress; onProgress: (next: StarterProgress) => void; onClose: () => void; graphics: boolean }) {
  const activity = SCIENCE_ACTIVITIES[land];
  const [matching, setMatching] = useState(progress.observed.length === activity.items.length);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(activity.instruction);
  const [enabled, setEnabled] = useState(false);
  const tracking = useHandTracking({ enabled });
  const root = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLOutputElement>(null);
  const controller = useRef(new StarterHandController());
  const finished = progress.matched.length === activity.items.length;
  const discover = useCallback((id: string) => {
    const item = activity.items.find(entry => entry.id === id);
    if (!item) return;
    setFeedback(item.fact);
    if (!progress.observed.includes(id)) onProgress({ ...progress, observed: [...progress.observed, id] });
  }, [activity, onProgress, progress]);
  const match = useCallback((id: string, target: string) => {
    if (progress.matched.includes(id) || !matching) return;
    if (!matchesActivity(land, id, target)) { setFeedback(`Try again. ${activity.items.find(item => item.id === id)?.fact ?? ''}`); return; }
    const next = [...progress.matched, id]; onProgress({ ...progress, matched: next }); setSelected(null);
    setFeedback(next.length === activity.items.length ? 'You did it! Every discovery is in its place.' : 'That’s a match! Choose another discovery.');
  }, [activity, land, matching, onProgress, progress]);
  useEffect(() => {
    if (!enabled || finished) { controller.current.reset(); if (cursor.current) cursor.current.hidden = true; return; }
    let frameId = 0;
    const tick = (at: number) => {
      const frame = tracking.latest.current;
      const confident = frame.isTracking && frame.confidence >= GESTURE_CONFIG.minConfidence && !!frame.gesture && !!frame.pointer;
      const box = root.current?.getBoundingClientRect();
      let item: string | null = null; let target: string | null = null;
      if (confident && box && frame.pointer) {
        const x = box.left + (frame.pointer.x + 1) / 2 * box.width;
        const y = box.top + (1 - frame.pointer.y) / 2 * box.height;
        if (cursor.current) { cursor.current.hidden = false; cursor.current.style.transform = `translate(${x}px, ${y}px)`; }
        let nearest = Infinity;
        root.current?.querySelectorAll<HTMLButtonElement>('[data-hand-item]:not(:disabled), [data-hand-target]').forEach(button => {
          const rect = button.getBoundingClientRect();
          const dx = Math.max(rect.left - x, 0, x - rect.right); const dy = Math.max(rect.top - y, 0, y - rect.bottom);
          const distance = Math.hypot(dx, dy); const hit = distance <= 22;
          button.dataset.handOver = String(hit);
          if (hit && distance < nearest) { nearest = distance; item = button.dataset.handItem ?? null; target = button.dataset.handTarget ?? null; }
        });
      } else { if (cursor.current) cursor.current.hidden = true; root.current?.querySelectorAll<HTMLElement>('[data-hand-over="true"]').forEach(element => { element.dataset.handOver = 'false'; }); }
      const previouslyHeld = controller.current.held;
      const action = controller.current.update({ tracking: confident, gesture: frame.gesture ?? null, item, target, discover: !matching, at });
      if (previouslyHeld && !controller.current.held && action?.type !== 'drop') setSelected(null);
      if (action?.type === 'discover') discover(action.item);
      if (action?.type === 'grab') setSelected(action.item);
      if (action?.type === 'drop') { match(action.item, action.target); setSelected(null); }
      const text = !confident ? controller.current.held ? 'Tracking paused — keep your hand in view' : 'Show your hand to the camera' : controller.current.held ? `Holding ${activity.items.find(entry => entry.id === controller.current.held)?.name} — open your palm over a target` : matching ? 'Pinch a discovery, move to a target, then open your palm' : 'Point at a discovery to learn';
      if (status.current && status.current.textContent !== text) status.current.textContent = text;
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    const cancel = () => { controller.current.reset(); setSelected(null); };
    window.addEventListener('blur', cancel);
    return () => { cancelAnimationFrame(frameId); window.removeEventListener('blur', cancel); };
  }, [enabled, finished, tracking.latest, matching, discover, match, activity]);
  return <div className={styles.sessionBackdrop}><div ref={root} className={styles.starter} data-session-controls style={{ '--land-color': scienceLand(land).color } as CSSProperties}>
    <header className={styles.sessionHeader}><div><h1>{scienceLand(land).name}</h1><p>{activity.title}</p></div><button type="button" onClick={onClose}>Back to Science Planet</button></header>
    <div className={styles.sessionInstructions}><p>{finished ? 'Wonderful exploring!' : matching ? 'Pinch to grab. Open your palm over a target — or use the buttons.' : 'Point to discover — or tap each miniature.'}</p><button type="button" aria-pressed={enabled} onClick={() => { controller.current.reset(); setSelected(null); setEnabled(!enabled); }}>{enabled ? 'Turn camera off' : 'Use hand gestures'}</button></div>
    <div className={styles.objectShelf}>
      {graphics ? <div className={styles.modelShelf} aria-hidden="true"><Models items={activity.items} land={land} /></div> : null}
      <div className={styles.objectButtons} style={{ '--items': activity.items.length } as CSSProperties}>{activity.items.map(item => <button type="button" key={item.id} data-hand-item={item.id} disabled={matching && progress.matched.includes(item.id)} aria-pressed={selected === item.id} onClick={() => matching ? setSelected(item.id) : discover(item.id)} style={{ '--item-color': item.color } as CSSProperties}>
        {land === 'colors' ? <span className={styles.colorSymbol} data-symbol={item.id} aria-hidden="true" /> : null}
        <span>{matching ? 'Grab' : 'Discover'} {item.name}{(matching ? progress.matched : progress.observed).includes(item.id) ? <Check aria-hidden="true" size={15} style={{ marginLeft: 6, verticalAlign: -3 }} /> : null}</span>
      </button>)}</div>
    </div>
    <p className={styles.feedback} role="status">{feedback}</p>
    {!matching ? <button className={styles.primary} type="button" disabled={progress.observed.length !== activity.items.length} onClick={() => { controller.current.reset(); setMatching(true); setFeedback('Choose a discovery and its matching target.'); }}>Next: {land === 'life-cycle' ? 'Put them in order' : 'Match the discoveries'} ({progress.observed.length}/{activity.items.length})</button> : <div className={styles.targets} aria-label="Activity targets">{activity.targets.map(target => <button key={target.id} type="button" data-hand-target={target.id} aria-disabled={!selected} onClick={() => { if (selected) { match(selected, target.id); controller.current.reset(); } }}><strong>{target.name}</strong><small>{progress.matched.some(id => matchesActivity(land, id, target.id)) ? <><Check aria-hidden="true" size={14} /> Matched</> : 'Release here'}</small></button>)}</div>}
    {finished ? <button className={styles.primary} type="button" onClick={onClose}>Finish {scienceLand(land).name}</button> : null}
    <div className={styles.cameraArea} hidden={!enabled}><video ref={tracking.video} muted playsInline aria-label="Your mirrored hand camera preview" /><div><p>{tracking.status === 'starting' ? 'Opening your camera…' : (tracking.status === 'unavailable' || tracking.status === 'denied') ? 'Camera unavailable. Use the discovery and target buttons, or retry.' : 'Camera processing stays on this device.'}</p>{(tracking.status === 'unavailable' || tracking.status === 'denied') || tracking.status === 'off' ? <button type="button" onClick={() => { controller.current.reset(); tracking.retry(); }}>Retry camera</button> : null}<output ref={status} aria-live="polite">Show your hand to the camera</output></div></div>
    <span ref={cursor} className={styles.starterCursor} hidden aria-hidden="true" />
  </div></div>;
}
