"use client";
import { useRef, useState } from "react";
import type { CheckInRequest, CheckInResponse } from "@wiggle/contracts";
import { parentRequest } from "../../lib/api/parent";

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

  return <section aria-labelledby="quick-check-in-title">
    <h2 id="quick-check-in-title">How did learning go today?</h2>
    <div role="group" aria-label="How did learning go today?">
      {HOW_OPTIONS.map(option => (
        <button
          key={option.label}
          type="button"
          disabled={busy}
          aria-pressed={how === option.label}
          onClick={() => { setHow(option.label); void send(option.label, hardest); }}
        >
          {option.label}
        </button>
      ))}
    </div>
    {how && how !== "Smooth" ? <>
      <p>What seemed hardest? (optional)</p>
      <div role="group" aria-label="What seemed hardest?">
        {HARDEST_OPTIONS.map(option => (
          <button
            key={option}
            type="button"
            disabled={busy}
            aria-pressed={hardest === option}
            onClick={() => { setHardest(option); void send(how, option); }}
          >
            {option}
          </button>
        ))}
      </div>
    </> : null}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
