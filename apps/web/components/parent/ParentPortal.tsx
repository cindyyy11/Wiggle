"use client";
import { useEffect, useState } from "react";
import { parentRequest } from "../../lib/api/parent";
import { ParentPinGate } from "./ParentPinGate";
import { ParentDashboard } from "./ParentDashboard";

export function ParentPortal({ demo }: { demo: boolean }) {
  const [setup, setSetup] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    parentRequest<{ setupRequired: boolean }>("pin/status").then(result => { if (active) setSetup(result.setupRequired); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [generation]);
  if (error) return <div role="alert"><p>{error}</p><a href="/parent/sign-in">Household sign-in</a> · <a href="/parent">Try again</a></div>;
  if (setup === null) return <p role="status">Preparing your parent space…</p>;
  return <ParentPinGate key={generation} demo={demo} setup={setup} verify={pin => parentRequest(setup ? "pin/setup" : "pin/verify", { pin })}>
    <ParentDashboard demo={demo} onLock={() => {
      // Immediately unmount household data even when the lock request is delayed.
      setGeneration(value => value + 1);
      void parentRequest("pin/lock", {}).catch(() => setError("Could not confirm the lock. Close this tab and try again when connected."));
    }} />
  </ParentPinGate>;
}
