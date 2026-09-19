"use client";
import { useRef, useState } from "react";
import { Check } from "lucide-react";
import type { CheckInRequest, CheckInResponse } from "@wiggle/contracts";
import { parentRequest } from "../../lib/api/parent";
import styles from "./parent.module.css";

const HOW_OPTIONS = [
  { label: "Smooth", difficulty: .15 },
  { label: "Needed support", difficulty: .5 },
  { label: "Difficult", difficulty: .85 },
] as const;
const HARDEST_OPTIONS = ["Starting", "Understanding", "Continuing", "Switching", "Frustration"] as const;

const defaultSubmit = (body: CheckInRequest, key: string) => parentRequest<CheckInResponse>("check-in", body, key);

/** Part 10's lightweight daily check-in. Context only — never a diagnosis, never a twin write. */
export function QuickCheckIn({ childId, submit = defaultSubmit }: {
  childId: string; submit?: (body: CheckInRequest, key: string) => Promise<{ message: string }>;
}) {
  const [how, setHow] = useState<(typeof HOW_OPTIONS)[number]["label"] | null>(null);
  const [hardest, setHardest] = useState<(typeof HARDEST_OPTIONS)[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);

  const send = async (howLabel: (typeof HOW_OPTIONS)[number]["label"], hardestLabel: (typeof HARDEST_OPTIONS)[number] | null) => {
    setBusy(true); setError(""); setMessage("");
    const difficulty = HOW_OPTIONS.find(option => option.label === howLabel)!.difficulty;
    const note = hardestLabel ? `Hardest part: ${hardestLabel}` : "";
    key.current ??= crypto.randomUUID();
    try {
      const result = await submit({ childId, difficulty, note }, key.current);
      setMessage(result.message);
      key.current = null;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <article className={`${styles.panel} ${styles.toneSage}`} aria-labelledby="quick-check-in-title">
    <h3 id="quick-check-in-title" className={styles.panelTitle}>How did learning go today?</h3>
    <p className={styles.panelLead}>Tap one option. This is context only — it does not change scores.</p>
    <div className={styles.choiceGroup} role="group" aria-label="How did learning go today?">
      {HOW_OPTIONS.map(option => (
        <button
          key={option.label}
          type="button"
          className={styles.choice}
          disabled={busy}
          aria-pressed={how === option.label}
          onClick={() => { setHow(option.label); void send(option.label, hardest); }}
        >
          {option.label}
        </button>
      ))}
    </div>
    {how && how !== "Smooth" ? <>
      <p className={styles.subLabel}>What seemed hardest? (optional)</p>
      <div className={styles.choiceGroup} role="group" aria-label="What seemed hardest?">
        {HARDEST_OPTIONS.map(option => (
          <button
            key={option}
            type="button"
            className={styles.choice}
            disabled={busy}
            aria-pressed={hardest === option}
            onClick={() => { setHardest(option); void send(how, option); }}
          >
            {option}
          </button>
        ))}
      </div>
    </> : null}
    {message && <p role="status" className={styles.formStatus}><Check className={styles.btnIcon} aria-hidden="true" />{message}</p>}
    {error && <p role="alert" className={styles.formStatus} data-tone="error">{error}</p>}
  </article>;
}
