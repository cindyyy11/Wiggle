"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase/browser";
import styles from "../../../components/parent/parent.module.css";

export default function SignIn() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className={styles.shell}><section className={styles.gate}><p className={styles.eyebrow}>Welcome to your parent space</p><h1>Household sign-in</h1><p>Use the account connected to your explorer’s household.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      const form = new FormData(event.currentTarget);
      try {
        const { error } = await createClient().auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
        if (error) { setError("Sign-in was not accepted. Check your email and password."); return; }
        window.location.assign("/parent");
      } catch { setError("Household sign-in is unavailable. Please try again later."); }
      finally { setBusy(false); }
    }}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required />
      <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>{error && <p role="alert">{error}</p>}
    </form><a href="/">Back to the universe</a></section></main>;
}
