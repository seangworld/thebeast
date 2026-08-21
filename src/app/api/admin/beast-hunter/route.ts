import { NextResponse } from "next/server";
import { isBeastHunterTrackingStatus, normalizeBeastHunterCriteria, rankBeastHunterCandidates, type BeastHunterRankedCandidate } from "@/lib/beastHunter";
import { beastHunterResearchInstructions, beastHunterResearchSchema, buildBeastHunterResearchInput, parseBeastHunterResearch, type BeastHunterResearchPayload } from "@/lib/beastHunterResearch";
import { requestOpenAIResponse } from "@/lib/digitalStaffRuntime/provider";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function owner() {
  const client = createRouteClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { client, user: null };
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { client, user: profile?.role === "admin" ? user : null };
}

export async function GET(request: Request) {
  const { client, user } = await owner();
  if (!user) return NextResponse.json({ error: "BeastAdmin owner access required." }, { status: 403 });
  const huntId = new URL(request.url).searchParams.get("huntId");
  if (huntId) {
    const { data: hunt, error: huntError } = await client.from("beast_hunter_hunts").select("id,name,status,query,criteria,result_limit,strictness,created_at,completed_at,archived_at").eq("id", huntId).eq("owner_id", user.id).maybeSingle();
    if (huntError || !hunt) return NextResponse.json({ error: "That saved hunt could not be found." }, { status: 404 });
    const { data: opportunities, error: opportunityError } = await client.from("beast_hunter_opportunities").select("id,title,summary,hunt_type,market,discovered_at,attributes,scores,total_score,rank,filter_notes,tracking_status,validation,build_brief,trend_status,last_monitored_at").eq("hunt_id", huntId).eq("owner_id", user.id).order("rank");
    if (opportunityError) return NextResponse.json({ error: "Saved opportunities are unavailable until the tracking migration is applied." }, { status: 503 });
    const ids = (opportunities || []).map((item) => item.id);
    const { data: evidence, error: evidenceError } = ids.length ? await client.from("beast_hunter_evidence").select("opportunity_id,label,source_url,observed_at").eq("owner_id", user.id).in("opportunity_id", ids) : { data: [], error: null };
    if (evidenceError) return NextResponse.json({ error: "Saved opportunity evidence could not be loaded." }, { status: 503 });
    const results = (opportunities || []).map((item) => {
      const attributes = item.attributes as Record<string, unknown>;
      return { id: item.id, title: item.title, summary: item.summary, huntType: item.hunt_type, market: item.market, discoveredAt: item.discovered_at, startupCost: attributes.startupCost ?? null, buildDays: attributes.buildDays ?? null, interaction: attributes.interaction, automation: attributes.automation, competition: attributes.competition ?? null, actionWindowDays: attributes.actionWindowDays ?? null, revenueModels: attributes.revenueModels ?? [], geography: attributes.geography ?? "", scores: item.scores, score: item.total_score, rank: item.rank, filterNotes: item.filter_notes, trackingStatus: item.tracking_status, validation: item.validation, buildBrief: item.build_brief, trendStatus: item.trend_status, lastMonitoredAt: item.last_monitored_at, evidence: (evidence || []).filter((source) => source.opportunity_id === item.id).map((source) => ({ label: source.label, url: source.source_url, observedAt: source.observed_at })) } as BeastHunterRankedCandidate;
    });
    const { data: priorHunts } = await client.from("beast_hunter_hunts").select("id,criteria,created_at").eq("owner_id", user.id).lt("created_at", hunt.created_at).eq("status", "completed").order("created_at", { ascending: false }).limit(10);
    const prior = (priorHunts || []).find((item) => JSON.stringify(item.criteria) === JSON.stringify(hunt.criteria));
    let comparison: { priorHuntId: string; newTitles: string[]; removedTitles: string[]; rankChanges: Array<{ title: string; from: number; to: number }> } | null = null;
    if (prior) {
      const { data: priorItems } = await client.from("beast_hunter_opportunities").select("title,rank").eq("hunt_id", prior.id).eq("owner_id", user.id);
      const currentRanks = new Map(results.map((item) => [item.title, item.rank]));
      const priorRanks = new Map((priorItems || []).map((item) => [item.title, item.rank]));
      comparison = { priorHuntId: prior.id, newTitles: results.filter((item) => !priorRanks.has(item.title)).map((item) => item.title), removedTitles: (priorItems || []).filter((item) => !currentRanks.has(item.title)).map((item) => item.title), rankChanges: results.flatMap((item) => { const before = priorRanks.get(item.title); return typeof before === "number" && before !== item.rank ? [{ title: item.title, from: before, to: item.rank }] : []; }) };
    }
    return NextResponse.json({ hunt, opportunities: results, comparison }, { headers: { "cache-control": "private, no-store" } });
  }
  const { data, error } = await client.from("beast_hunter_hunts").select("id,name,status,query,criteria,result_limit,strictness,created_at,completed_at,archived_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "BeastHunter history is unavailable until its database migration is applied." }, { status: 503 });
  return NextResponse.json({ hunts: data || [] }, { headers: { "cache-control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const { client, user } = await owner();
  if (!user) return NextResponse.json({ error: "BeastAdmin owner access required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { opportunityId?: unknown; trackingStatus?: unknown; huntId?: unknown; name?: unknown; archived?: unknown } | null;
  if (typeof body?.huntId === "string") {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : undefined;
    const updates = body.archived === true ? { status: "archived", archived_at: new Date().toISOString(), ...(name !== undefined ? { name } : {}) } : body.archived === false ? { status: "completed", archived_at: null, ...(name !== undefined ? { name } : {}) } : name !== undefined ? { name } : null;
    if (!updates) return NextResponse.json({ error: "Enter a hunt name or archive choice." }, { status: 400 });
    const { data, error } = await client.from("beast_hunter_hunts").update(updates).eq("id", body.huntId).eq("owner_id", user.id).select("id,name,status,archived_at").maybeSingle();
    if (error || !data) return NextResponse.json({ error: "The saved hunt could not be updated." }, { status: error ? 503 : 404 });
    return NextResponse.json({ hunt: data }, { headers: { "cache-control": "private, no-store" } });
  }
  if (typeof body?.opportunityId !== "string" || !isBeastHunterTrackingStatus(body.trackingStatus)) return NextResponse.json({ error: "A valid opportunity and tracking status are required." }, { status: 400 });
  const { data, error } = await client.from("beast_hunter_opportunities").update({ tracking_status: body.trackingStatus, updated_at: new Date().toISOString() }).eq("id", body.opportunityId).eq("owner_id", user.id).select("id,tracking_status").maybeSingle();
  if (error) return NextResponse.json({ error: "Opportunity tracking is unavailable until the tracking migration is applied." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "That opportunity could not be found." }, { status: 404 });
  return NextResponse.json({ opportunityId: data.id, trackingStatus: data.tracking_status }, { headers: { "cache-control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  const { client, user } = await owner();
  if (!user) return NextResponse.json({ error: "BeastAdmin owner access required." }, { status: 403 });
  const huntId = new URL(request.url).searchParams.get("huntId");
  if (!huntId) return NextResponse.json({ error: "A hunt ID is required." }, { status: 400 });
  const { data, error } = await client.from("beast_hunter_hunts").delete().eq("id", huntId).eq("owner_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "The saved hunt could not be deleted." }, { status: error ? 503 : 404 });
  return NextResponse.json({ deleted: true });
}

export async function POST(request: Request) {
  const { client, user } = await owner();
  if (!user) return NextResponse.json({ error: "BeastAdmin owner access required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { criteria?: unknown; force?: unknown } | null;
  const criteria = normalizeBeastHunterCriteria(body?.criteria);
  if (!criteria) return NextResponse.json({ error: "The hunt contract is invalid." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "BeastHunter research is not configured in this environment." }, { status: 503 });
  if (body?.force !== true) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await client.from("beast_hunter_hunts").select("id,criteria").eq("owner_id", user.id).eq("query", criteria.query).gte("created_at", since).neq("status", "failed").limit(10);
    const duplicate = (recent || []).find((item) => JSON.stringify(item.criteria) === JSON.stringify(criteria));
    if (duplicate) return NextResponse.json({ error: "An identical hunt was run in the last 24 hours.", duplicateHuntId: duplicate.id }, { status: 409 });
  }
  const { data: hunt, error: insertError } = await client.from("beast_hunter_hunts").insert({ owner_id: user.id, status: "researching", query: criteria.query, criteria, result_limit: criteria.resultCount, strictness: criteria.strictness, started_at: new Date().toISOString() }).select("id").single();
  if (insertError || !hunt) return NextResponse.json({ error: "BeastHunter cannot save this hunt until its database migration is applied." }, { status: 503 });
  try {
    const payload = await requestOpenAIResponse<BeastHunterResearchPayload>({ model: process.env.OPENAI_BEAST_HUNTER_MODEL || "gpt-5", store: false, instructions: beastHunterResearchInstructions, input: buildBeastHunterResearchInput(criteria), tools: [{ type: "web_search", search_context_size: "high" }], tool_choice: "required", include: ["web_search_call.action.sources"], text: { format: { type: "json_schema", name: "beast_hunter_opportunities", strict: true, schema: beastHunterResearchSchema } } });
    if (request.signal.aborted) { await client.from("beast_hunter_hunts").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", hunt.id).eq("owner_id", user.id); return NextResponse.json({ error: "The hunt was cancelled." }, { status: 499 }); }
    const ranked = rankBeastHunterCandidates(parseBeastHunterResearch(payload, criteria), criteria);
    if (!ranked.length) throw new Error("No attributable opportunities survived validation.");
    const { error: opportunityError } = await client.from("beast_hunter_opportunities").insert(ranked.map((item) => ({ id: item.id, hunt_id: hunt.id, owner_id: user.id, title: item.title, summary: item.summary, hunt_type: item.huntType, market: item.market, discovered_at: item.discoveredAt, attributes: { startupCost: item.startupCost, buildDays: item.buildDays, interaction: item.interaction, automation: item.automation, competition: item.competition, actionWindowDays: item.actionWindowDays, revenueModels: item.revenueModels, geography: item.geography }, scores: item.scores, total_score: item.score, rank: item.rank, filter_notes: item.filterNotes })));
    if (opportunityError) throw opportunityError;
    const evidenceRows = ranked.flatMap((item) => item.evidence.map((evidence) => ({ opportunity_id: item.id, owner_id: user.id, label: evidence.label, source_url: evidence.url, source_type: "web", observed_at: evidence.observedAt })));
    const { error: evidenceError } = await client.from("beast_hunter_evidence").insert(evidenceRows);
    if (evidenceError) throw evidenceError;
    await client.from("beast_hunter_hunts").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", hunt.id).eq("owner_id", user.id);
    return NextResponse.json({ huntId: hunt.id, status: "completed", opportunities: ranked }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    await client.from("beast_hunter_hunts").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", hunt.id).eq("owner_id", user.id);
    return NextResponse.json({ error: "BeastHunter could not produce attributable opportunities. No uncited results were saved." }, { status: 502 });
  }
}
