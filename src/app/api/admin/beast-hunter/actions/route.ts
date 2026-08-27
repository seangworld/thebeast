import { NextResponse } from "next/server";
import { buildBeastHunterBuildBrief, beastHunterMonitorSchema, beastHunterValidationSchema, parseBeastHunterMonitor, parseBeastHunterValidation } from "@/lib/beastHunterDecision";
import { recommendBeastHunterCandidate, type BeastHunterCandidate, type BeastHunterRankedCandidate } from "@/lib/beastHunter";
import type { BeastHunterResearchPayload } from "@/lib/beastHunterResearch";
import { buildBeastHunterWorkRequest } from "@/lib/beastHunterExecution";
import { requestOpenAIResponse } from "@/lib/digitalStaffRuntime/provider";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function owner() {
  const client = createRouteClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { client, user: null };
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { client, user: profile?.role === "admin" ? user : null };
}

export async function POST(request: Request) {
  const { client, user } = await owner();
  if (!user) return NextResponse.json({ error: "BeastAdmin owner access required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: unknown; opportunityId?: unknown } | null;
  if (typeof body?.opportunityId !== "string" || !["validate", "build_brief", "monitor", "roadmap", "export", "set_next"].includes(String(body.action))) return NextResponse.json({ error: "A valid BeastHunter action and opportunity are required." }, { status: 400 });
  const { data: row, error } = await client.from("beast_hunter_opportunities").select("id,title,summary,hunt_type,market,discovered_at,attributes,scores,total_score,rank,filter_notes,tracking_status,validation,build_brief,trend_status,last_monitored_at,roadmap_item_id").eq("id", body.opportunityId).eq("owner_id", user.id).maybeSingle();
  if (error || !row) return NextResponse.json({ error: "That opportunity could not be found." }, { status: error ? 503 : 404 });
  const attributes = row.attributes as Record<string, unknown>;
  const { data: evidence } = await client.from("beast_hunter_evidence").select("label,source_url,observed_at").eq("opportunity_id", row.id).eq("owner_id", user.id);
  const legacyExplanation = { whatItIs: row.summary, customer: row.market, whatToBuild: row.hunt_type, whyNow: "Review the cited evidence for the original opportunity timing.", monetization: Array.isArray(attributes.revenueModels) ? attributes.revenueModels.join(", ") : "Not recorded", verifiability: "Run validation to assess whether the result can be independently checked.", difficulty: attributes.buildDays ? `Estimated ${attributes.buildDays} build days.` : "Not recorded", ownerInvolvement: "Not recorded in this legacy result." };
  const candidate = { id: row.id, title: row.title, summary: row.summary, huntType: row.hunt_type, market: row.market, audience: attributes.audience ?? "general_consumer", discoveredAt: row.discovered_at, startupCost: attributes.startupCost ?? null, buildDays: attributes.buildDays ?? null, interaction: attributes.interaction, automation: attributes.automation, competition: attributes.competition ?? null, actionWindowDays: attributes.actionWindowDays ?? null, revenueModels: attributes.revenueModels ?? [], geography: attributes.geography ?? "", expectedMonthlyRevenueLow: attributes.expectedMonthlyRevenueLow ?? null, expectedMonthlyRevenueHigh: attributes.expectedMonthlyRevenueHigh ?? null, specializedDomain: attributes.specializedDomain ?? "none", explanation: attributes.explanation ?? legacyExplanation, brandFit: attributes.brandFit, scores: row.scores, evidence: (evidence || []).map((source) => ({ label: source.label, url: source.source_url, observedAt: source.observed_at })) } as BeastHunterCandidate;
  const recommendation = recommendBeastHunterCandidate(candidate, row.total_score);
  const opportunity = { ...candidate, score: row.total_score, rank: row.rank, filterNotes: row.filter_notes, recommendation: recommendation.recommendation, recommendationReason: recommendation.reason, trackingStatus: row.tracking_status, rejectionReason: attributes.rejectionReason ?? null, feedbackAdjustment: attributes.feedbackAdjustment ?? null, validation: row.validation, buildBrief: row.build_brief, trendStatus: row.trend_status, lastMonitoredAt: row.last_monitored_at, roadmapItemId: row.roadmap_item_id } as BeastHunterRankedCandidate;

  if (["roadmap", "export", "set_next"].includes(String(body.action))) {
    let roadmapItemId = row.roadmap_item_id as string | null;
    let roadmap: { id: string; github_issue_url?: string | null; github_issue_number?: number | null } | null = null;
    if (roadmapItemId) {
      const { data } = await client.from("beast_admin_roadmap_items").select("id,github_issue_url,github_issue_number").eq("id", roadmapItemId).eq("user_id", user.id).maybeSingle();
      roadmap = data;
    }
    if (!roadmap) {
      const buildBrief = opportunity.buildBrief || buildBeastHunterBuildBrief(opportunity);
      opportunity.buildBrief = buildBrief;
      const { data, error: roadmapError } = await client.from("beast_admin_roadmap_items").insert({ user_id: user.id, product_id: "future", title: opportunity.title, summary: opportunity.summary, status: "planned", owner_notes: `Candidate intake from BeastHunter opportunity ${opportunity.id}. BeastFusion approval is still required.`, source_type: "beast_hunter", source_id: opportunity.id, governance_classification: "intake", execution_status: "candidate_intake", execution_payload: { opportunity, buildBrief } }).select("id,github_issue_url,github_issue_number").single();
      if (roadmapError || !data) return NextResponse.json({ error: "The BeastAdmin roadmap handoff is unavailable until its execution-bridge migration is applied." }, { status: 503 });
      roadmap = data; roadmapItemId = data.id;
      await client.from("beast_hunter_opportunities").update({ roadmap_item_id: data.id, build_brief: buildBrief, tracking_status: "build", updated_at: new Date().toISOString() }).eq("id", row.id).eq("owner_id", user.id);
    }
    const workRequest = buildBeastHunterWorkRequest({ roadmapItemId: roadmapItemId!, opportunity });
    if (body.action === "roadmap") return NextResponse.json({ roadmapItemId, trackingStatus: "build", governanceClassification: "intake", executionStatus: "candidate_intake" });
    if (body.action === "export") return NextResponse.json({ roadmapItemId, workRequest, filename: `beast-build-${roadmapItemId}.md` });

    await client.from("beast_admin_roadmap_items").update({ is_next_build: false, governance_classification: "intake", execution_status: "candidate_intake", execution_payload: { workRequest }, queued_at: null }).eq("id", roadmapItemId!).eq("user_id", user.id);
    return NextResponse.json({ roadmapItemId, workRequest, governanceClassification: "intake", executionStatus: "candidate_intake", authorizationRequired: "BeastFusion roadmap approval", warning: "Next Build is candidate intake only. It does not create executable roadmap truth or a GitHub execution ticket." });
  }

  if (body.action === "build_brief") {
    const buildBrief = buildBeastHunterBuildBrief(opportunity);
    const { error: updateError } = await client.from("beast_hunter_opportunities").update({ build_brief: buildBrief, tracking_status: "build", updated_at: new Date().toISOString() }).eq("id", row.id).eq("owner_id", user.id);
    if (updateError) return NextResponse.json({ error: "The build brief could not be saved." }, { status: 503 });
    return NextResponse.json({ buildBrief, trackingStatus: "build" });
  }

  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "BeastHunter research is not configured in this environment." }, { status: 503 });
  const common = { model: process.env.OPENAI_BEAST_HUNTER_MODEL || "gpt-5", store: false, tools: [{ type: "web_search" as const, search_context_size: "high" as const }], tool_choice: "required" as const, include: ["web_search_call.action.sources"] };

  if (body.action === "validate") {
    const payload = await requestOpenAIResponse<BeastHunterResearchPayload>({ ...common, instructions: "You are BeastHunter's validation analyst. Use current attributable web evidence. Be conservative and never guarantee revenue. Return a decisive Go, Caution, or No-Go assessment. Opportunity economics must clearly distinguish price, gross revenue, operating cost, margin, and income confidence; use ranges and state uncertainty.", input: JSON.stringify({ opportunity, task: "Deeply validate demand, competitors, price per sale/customer/subscription, revenue model, monthly sales needed, realistic gross revenue range, operating cost, gross margin, break-even, time to first revenue, income confidence, startup cost, build effort, marketing difficulty, dependencies, proceed/reject reasons, and next steps." }), text: { format: { type: "json_schema", name: "beast_hunter_validation", strict: true, schema: beastHunterValidationSchema } } });
    const { validation, sourceUrls } = parseBeastHunterValidation(payload);
    const { error: updateError } = await client.from("beast_hunter_opportunities").update({ validation, tracking_status: "validate", updated_at: new Date().toISOString() }).eq("id", row.id).eq("owner_id", user.id);
    if (updateError) return NextResponse.json({ error: "The validation could not be saved." }, { status: 503 });
    return NextResponse.json({ validation, sourceUrls, trackingStatus: "validate" });
  }

  const payload = await requestOpenAIResponse<BeastHunterResearchPayload>({ ...common, instructions: "You are BeastHunter's trend monitor. Use current attributable web evidence and compare it conservatively with the saved opportunity. Never invent movement.", input: JSON.stringify({ opportunity, task: "Classify the current opportunity as rising, stable, falling, saturated, or expired and provide a refreshed 0-100 opportunity score." }), text: { format: { type: "json_schema", name: "beast_hunter_monitor", strict: true, schema: beastHunterMonitorSchema } } });
  const monitored = parseBeastHunterMonitor(payload);
  const monitoredAt = new Date().toISOString();
  const { error: snapshotError } = await client.from("beast_hunter_opportunity_snapshots").insert({ opportunity_id: row.id, owner_id: user.id, total_score: monitored.totalScore, scores: row.scores, trend_status: monitored.trendStatus, summary: monitored.summary, evidence: monitored.sourceUrls });
  if (snapshotError) return NextResponse.json({ error: "Trend monitoring is unavailable until the v1 migration is applied." }, { status: 503 });
  await client.from("beast_hunter_opportunities").update({ trend_status: monitored.trendStatus, last_monitored_at: monitoredAt, updated_at: monitoredAt }).eq("id", row.id).eq("owner_id", user.id);
  return NextResponse.json({ ...monitored, lastMonitoredAt: monitoredAt });
}
