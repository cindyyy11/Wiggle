import { MyWiggleTwinScreen } from "../../components/wiggle/MyWiggleTwinScreen";
import { DEMO_CHILD_ID } from "../../lib/demo/seed";

export const dynamic = "force-dynamic";

export default async function TwinPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const { child } = await searchParams;
  return <MyWiggleTwinScreen childId={child || DEMO_CHILD_ID} />;
}
