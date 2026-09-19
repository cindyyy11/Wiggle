"use client";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import type { CheckInRequest, CheckInResponse } from "@wiggle/contracts";
import { parentRequest } from "../../lib/api/parent";
import styles from "./parent.module.css";

const defaultSubmit = (body: CheckInRequest, key: string) => parentRequest<CheckInResponse>("check-in", body, key);
export function HomeworkCheckIn({ childId, submit = defaultSubmit }: {
  childId: string; submit?: (body: CheckInRequest, key: string) => Promise<{ message: string }>;
}) {
  const [difficulty, setDifficulty] = useState(.5);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const retry = useRef<{ body: string; key: string } | null>(null);
  return <article className={`${styles.panel} ${styles.toneBlue}`} aria-labelledby="check-in-title">
    <h3 id="check-in-title" className={styles.panelTitle}>How did homework feel?</h3>
    <p className={styles.panelLead}>A little context helps. This check-in does not change mastery scores.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage(""); setError("");
      const body = { childId, difficulty, note };
      const serialized = JSON.stringify(body);
      if (retry.current?.body !== serialized) retry.current = { body: serialized, key: crypto.randomUUID() };
      try { const result = await submit(body, retry.current.key); setMessage(result.message); retry.current = null; setNote(""); }
      catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="homework-feel">Today’s experience</label>
      <select id="homework-feel" value={difficulty} onChange={event => setDifficulty(Number(event.target.value))} disabled={busy}>
        <option value={.2}>Felt comfortable</option><option value={.5}>A bit of both</option><option value={.8}>Needed more support</option>
      </select>
      <label htmlFor="homework-note">Anything helpful to know?</label>
      <textarea id="homework-note" maxLength={1000} rows={3} value={note} onChange={event => setNote(event.target.value)} disabled={busy} />
      <div className={styles.actionRow}>
        <button type="submit" disabled={busy} aria-busy={busy}>{busy ? "Sharing…" : "Share check-in"}</button>
        {message && <p role="status" className={styles.formStatus}><Check className={styles.btnIcon} aria-hidden="true" />{message}</p>}
        {error && <p role="alert" className={styles.formStatus} data-tone="error">{error}</p>}
      </div>
    </form>
  </article>;
}
