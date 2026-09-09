import { NextResponse } from "next/server";
import { verifyCronAuthorization } from "@/lib/standingObservation";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { runMarketingGrowthCycle } from "@/lib/server/marketingGrowthCycleRunner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!verifyCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const controls = await createBeastFusionPublicationClient().from("beast_marketing_growth_controls").select("owner_id", { count: "exact" }).eq("enabled", true).limit(10);
  if (controls.error || controls.count === null || controls.count > 10 || controls.data?.length !== controls.count) return NextResponse.json({ error: "Growth controls unavailable or exceed cycle capacity." }, { status: 503 });
  const outcomes = await Promise.all(controls.data!.map(async (control) => {
    try { return { status: (await runMarketingGrowthCycle(control.owner_id)).status }; }
    catch { return { status: "failed" }; }
  }));
  return NextResponse.json({ outcomes, publishing: "disabled" }, { headers: { "Cache-Control": "no-store" } });
}
