import { redirect } from "next/navigation";
import { householdSession } from "../../lib/supabase/server";
import { authConfig } from "../../lib/supabase/config";
import { ParentPortal } from "../../components/parent/ParentPortal";
import styles from "../../components/parent/parent.module.css";

export const dynamic = "force-dynamic";
export default async function ParentPage() {
  const configured = Boolean(authConfig());
  if (configured && !await householdSession()) redirect("/parent/sign-in");
  return <main className={styles.shell}><ParentPortal demo={!configured && !process.env.WIGGLE_API_URL} /></main>;
}
