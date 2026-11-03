import { redirect } from "next/navigation";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import { beastGuideAvailable } from "@/lib/beastguide/configuration";
import BeastGuideWorkspace from "./workspace";

export const dynamic = "force-dynamic";
export default async function BeastGuidePage() {
  if (!beastGuideAvailable({enabled:process.env.NEXT_PUBLIC_BEASTGUIDE_ENABLED, authUrl:process.env.NEXT_PUBLIC_SUPABASE_URL})) {
    return <section><h1>BeastGuide</h1><p>BeastGuide integration is being prepared for your Beast account.</p></section>;
  }
  const access = await requireMemberModuleEntitlement("beastguide");
  if (!access.ok) {
    if (access.status === 401) redirect("/login?next=%2Fdashboard%2Fbeastguide");
    return <section><h1>BeastGuide</h1><p>This workspace is unavailable for the current member profile.</p></section>;
  }
  return <BeastGuideWorkspace />;
}
