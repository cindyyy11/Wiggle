"use client";
import { useEffect, useState } from "react";
import { parentRequest, type ParentPinStatus } from "../../lib/api/parent";
import { ParentPinGate } from "./ParentPinGate";
import { ParentDashboard } from "./ParentDashboard";

export function ParentPortal() {
  const [status, setStatus] = useState<ParentPinStatus | null>(null);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let active = true;
    parentRequest<ParentPinStatus>("pin/status").then(result => {
      if (typeof result.setupRequired !== "boolean" || !["local_demo", "memory_demo", "household"].includes(result.dataMode)) throw new Error("The parent service could not confirm its data mode. Please try again later.");
      if (active) setStatus(result);
    }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [generation]);
  if (error) return <div role="alert"><p>{error}</p><a href="/parent/sign-in">Household sign-in</a> · <a href="/parent">Try again</a></div>;
  if (status === null) return <p role="status">Preparing your parent space…</p>;
  return <ParentPinGate key={generation} mode={status.dataMode} setup={status.setupRequired} verify={async pin => {
    await parentRequest(status.setupRequired ? "pin/setup" : "pin/verify", { pin });
    setStatus(previous => previous ? { ...previous, setupRequired: false } : previous);
  }}>
    <ParentDashboard mode={status.dataMode} onLock={() => {
      // Immediately unmount household data even when the lock request is delayed.
      setGeneration(value => value + 1);
      void parentRequest("pin/lock", {}).catch(() => setError("Could not confirm the lock. Close this tab and try again when connected."));
    }} />
  </ParentPinGate>;
}
