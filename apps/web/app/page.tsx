import { WiggleExperience } from "../components/wiggle/WiggleExperience";
import { authConfig } from "../lib/supabase/config";
import { createClient, householdSession } from "../lib/supabase/server";
import styles from "../components/parent/parent.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  try {
    if (!authConfig()) return <WiggleExperience />;
    const session = await householdSession();
    if (!session) return <main className={styles.shell}><section className={styles.gate}><h1>Your learning universe</h1><p>Sign in to choose your explorer.</p><a href="/parent/sign-in?next=/">Household sign-in</a></section></main>;
    const client = await createClient();
    const result = await client!.from("children").select("id, display_name").eq("parent_id", session.userId).order("created_at");
    if (result.error || !result.data) throw new Error("Explorers unavailable");
    const requested = (await searchParams).child;
    const child = requested ? result.data.find(row => row.id === requested) : result.data.length === 1 ? result.data[0] : undefined;
    if (child) return <WiggleExperience key={child.id} childId={child.id} allowLocalFallback={false} />;
    return <main className={styles.shell}><section className={styles.gate}><h1>Choose your explorer</h1>
      {result.data.length ? <ul>{result.data.map(row => <li key={row.id}><a href={`/?child=${encodeURIComponent(row.id)}`}>{row.display_name}</a></li>)}</ul> : <p>Your household needs an explorer and a fraction mission before play. Ask the person setting up your household.</p>}
      <a href="/parent">Parent mission control</a>
    </section></main>;
  } catch {
    return <main className={styles.shell}><section className={styles.gate}><h1>Your universe is resting</h1><p>We couldn’t connect to your household. Your saved progress is still there.</p><a href="/">Try again</a> · <a href="/parent/sign-in?next=/">Household sign-in</a></section></main>;
  }
}
