import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { runMarketingGrowthCycle } from "@/lib/server/marketingGrowthCycleRunner";
import { GROWTH_PUBLISHING_BLOCKER } from "@/lib/marketingGrowthCycle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
async function owner() {
  const client = createRouteClient();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, id: auth.data.user.id } : null;
}
export async function GET() {
  const context = await owner();
  if (!context) return json({ error: "Owner access required." }, 403);
  const [control, runs] = await Promise.all([
    context.client.from("beast_marketing_growth_controls").select("enabled,updated_at").eq("owner_id", context.id).maybeSingle(),
    context.client.from("beast_marketing_growth_runs").select("id,cycle_date,status,report,started_at,completed_at").eq("owner_id", context.id).order("cycle_date", { ascending: false }).limit(14),
  ]);
  if (control.error || runs.error) return json({ error: "Growth cycle history unavailable." }, 503);
  return json({ enabled: control.data?.enabled === true, runs: runs.data, blocker: GROWTH_PUBLISHING_BLOCKER });
}
export async function POST(request: Request) {
  const context = await owner();
  if (!context) return json({ error: "Owner access required." }, 403);
  const body = await request.json().catch(() => null);
  try {
    if (body?.action === "run") return json(await runMarketingGrowthCycle(context.id));
    if (body?.action !== "set_enabled" || typeof body.enabled !== "boolean") return json({ error: "Choose run or set_enabled." }, 400);
    const saved = await createBeastFusionPublicationClient().from("beast_marketing_growth_controls").upsert({ owner_id: context.id, enabled: body.enabled, updated_at: new Date().toISOString() });
    if (saved.error) throw saved.error;
    return json({ enabled: body.enabled });
  } catch { return json({ error: "Growth operation could not be confirmed. Review cycle history before retrying." }, 503); }
}
