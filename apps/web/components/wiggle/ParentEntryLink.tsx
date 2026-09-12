"use client";

import { useId } from "react";
import styles from "./parentEntryLink.module.css";

export interface ParentEntryLinkProps {
  disabled?: boolean;
  disabledMessage?: string;
}

/**
 * The one entry point into the PIN-gated Parent Mission Control, reachable from
 * every world (see the "Consolidating existing nav" section of
 * docs/superpowers/specs/2026-09-13-global-wiggle-twin-launcher-design.md).
 * Mirrors the guard the old Numeria-only "Parent" link had: disabled with an
 * explanatory message while a mission session is in progress.
 */
export function ParentEntryLink({ disabled = false, disabledMessage = "Parent mission control is unavailable right now." }: ParentEntryLinkProps) {
  const messageId = useId();
  return <div className={styles.wrap}>
    {disabled
      ? <button type="button" className={styles.link} disabled aria-label="Parent mission control" aria-describedby={messageId}>Parent</button>
      : <a className={styles.link} href="/parent" aria-label="Parent mission control">Parent</a>}
    {disabled ? <p id={messageId} role="status" className={styles.message}>{disabledMessage}</p> : null}
  </div>;
}
