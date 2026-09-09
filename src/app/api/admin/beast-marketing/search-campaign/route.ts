import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { loadLiveSeangworldProviders } from "@/lib/server/seangworldGoogleProviders";
import { getSeangworldAnalyticsScope } from "@/lib/seangworldAnalyticsScope";
import { prepareSearchGrowthCampaign, searchGrowthCampaignId, searchGrowthProduct } from "@/lib/searchGrowthCampaign";

import { retainOrCreateSearchCampaign } from "@/lib/searchGrowthCampaignPersistence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const client = createRouteClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return json({ error: "BeastMarketing owner access required." }, 403);
  const profile = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile.error || profile.data?.role !== "admin") return json({ error: "BeastMarketing owner access required." }, 403);
  const body = await request.json().catch(() => null);
  const page = typeof body?.page === "string" ? body.page.trim() : "";
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const days = body?.days;
  const product = searchGrowthProduct(page);
  if (!product || page.length > 1000 || !query || query.length > 240 || ![7, 30, 90].includes(days)) return json({ error: "Select a verified search opportunity and a supported reporting range." }, 400);
  const id = searchGrowthCampaignId(user.id, page, query);
  try {
    const result = await retainOrCreateSearchCampaign({
      async find() {
        const result = await client.from("beast_marketing_campaigns").select("id,status").eq("owner_id", user.id).eq("id", id).maybeSingle();
        if (result.error) throw result.error;
        return result.data;
      },
      async prepare() {
        // Client metrics, claims and approval flags are never accepted.
        const now = new Date();
        const providers = await loadLiveSeangworldProviders(process.env, now, fetch, undefined, days, getSeangworldAnalyticsScope(product));
        return prepareSearchGrowthCampaign({ provider: providers?.find((item) => item.id === "search_console"), page, query, now });
      },
      async insert(draft) {
        const result = await client.from("beast_marketing_campaigns").insert({ id, owner_id: user.id, title: draft.title, objective: draft.objective, audience: draft.audience, offer: draft.offer, channels: draft.channels, call_to_action: draft.callToAction, source_facts: draft.sourceFacts, success_measures: draft.successMeasures, limitations: draft.limitations, status: "draft" }).select("id,status").single();
        if (result.error) throw result.error;
        if (!result.data) throw new Error("campaign_save_unconfirmed");
        return result.data;
      },
    });
    if (!result) return json({ error: "Fresh actionable Search Console evidence is unavailable. Refresh the opportunity before preparing a campaign." }, 409);
    return json(result, result.reused ? 200 : 201);
  } catch {
    return json({ error: "Campaign preparation could not be confirmed. Retry safely; existing work is preserved." }, 503);
  }
}
