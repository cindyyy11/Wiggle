"use client";
import { useEffect, useState, type ReactNode } from "react";
import styles from "./parent.module.css";

export function ParentPinGate({ children, verify, setup = false, demo = false }: {
  children: ReactNode; verify: (pin: string) => Promise<unknown>; setup?: boolean; demo?: boolean;
}) {
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 15 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [open]);
  if (open) return children;
  return <section className={styles.gate} aria-labelledby="parent-entry">
    <p className={styles.eyebrow}>A little space for the grown-ups</p>
    <h1 id="parent-entry">Parent mission control</h1>
    <p>{setup ? "Create a six-digit PIN for this shared device." : "Enter your six-digit PIN to see your explorer’s progress."}</p>
    {demo && <p className={styles.notice}>Local demo · PIN <strong>123456</strong>. Sample progress only.</p>}
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try { await verify(pin); setPin(""); setOpen(true); }
      catch (error) { setError(error instanceof Error ? error.message : "Please try again."); setPin(""); }
      finally { setBusy(false); }
    }}>
      <label htmlFor="parent-pin">Parent PIN</label>
      <input id="parent-pin" className={styles.pin} type="password" inputMode="numeric" autoComplete={setup ? "new-password" : "current-password"} pattern="[0-9]{6}" minLength={6} maxLength={6} required value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ""))} />
      <button disabled={busy}>{busy ? "Checking…" : setup ? "Set PIN and enter" : "Enter mission control"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
    <a href="/">Back to the universe</a>
  </section>;
}
