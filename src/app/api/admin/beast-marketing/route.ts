import { NextResponse } from "next/server";
import {
  buildMarketingRecommendation,
  isMarketingAssetStatus,
  isMarketingCampaignStatus,
  isMarketingOutcomeMetric,
  normalizeMarketingSourceFacts,
  type MarketingCampaign,
  type MarketingOutcome,
  validateCampaignDraft,
} from "@/lib/beastMarketing";
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

function forbidden() {
  return NextResponse.json({ error: "BeastMarketing owner access required." }, { status: 403 });
}

function unavailable() {
  return NextResponse.json({ error: "BeastMarketing is unavailable until migration 20260823161535 is applied." }, { status: 503 });
}

function clean(value: unknown, maximum = 4_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function campaign(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    objective: row.objective,
    audience: row.audience,
    offer: row.offer,
    channels: row.channels,
    callToAction: row.call_to_action,
    sourceFacts: row.source_facts,
    successMeasures: row.success_measures,
    limitations: row.limitations,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asset(row: Record<string, unknown>) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    assetType: row.asset_type,
    channel: row.channel,
    body: row.body,
    sourceFacts: row.source_facts,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function outcome(row: Record<string, unknown>) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    metric: row.metric,
    value: row.value,
    measuredAt: row.measured_at,
    sourceLabel: row.source_label,
    sourceUrl: row.source_url,
    notes: row.notes,
  };
}

export async function GET() {
  const { client, user } = await owner();
  if (!user) return forbidden();
  const [campaigns, assets, outcomes, recommendations, decisions] = await Promise.all([
    client.from("beast_marketing_campaigns").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    client.from("beast_marketing_assets").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    client.from("beast_marketing_outcomes").select("*").eq("owner_id", user.id).order("measured_at", { ascending: false }),
    client.from("beast_marketing_recommendations").select("id,campaign_id,decision,confidence,rationale,evidence,limitations,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
    client.from("beast_marketing_decisions").select("id,entity_type,entity_id,decision,note,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (campaigns.error || assets.error || outcomes.error || recommendations.error || decisions.error) return unavailable();
  return NextResponse.json({
    campaigns: (campaigns.data || []).map((row) => campaign(row)),
    assets: (assets.data || []).map((row) => asset(row)),
    outcomes: (outcomes.data || []).map((row) => outcome(row)),
    recommendations: recommendations.data || [],
    decisions: decisions.data || [],
    providerState: { externalPublishing: "disabled", externalScheduling: "disabled", paidMedia: "disabled", credentials: "not_used" },
  }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { client, user } = await owner();
  if (!user) return forbidden();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = clean(body?.kind, 40);

  if (kind === "campaign") {
    const draft = validateCampaignDraft(body?.campaign);
    if (!draft) return NextResponse.json({ error: "Title, objective, audience, offer, call to action, and an approved public source fact are required." }, { status: 400 });
    const { data, error } = await client.from("beast_marketing_campaigns").insert({
      owner_id: user.id,
      title: draft.title,
      objective: draft.objective,
      audience: draft.audience,
      offer: draft.offer,
      channels: draft.channels,
      call_to_action: draft.callToAction,
      source_facts: draft.sourceFacts,
      success_measures: draft.successMeasures,
      limitations: draft.limitations,
    }).select("*").single();
    if (error || !data) return unavailable();
    return NextResponse.json({ campaign: campaign(data) }, { status: 201 });
  }

  const campaignId = clean(body?.campaignId, 80);
  if (!campaignId) return NextResponse.json({ error: "A campaign is required." }, { status: 400 });

  if (kind === "asset") {
    const name = clean(body?.name, 160);
    const assetType = clean(body?.assetType, 80);
    const channel = clean(body?.channel, 80);
    const assetBody = clean(body?.body, 12_000);
    if (!name || !assetType || !channel || !assetBody) return NextResponse.json({ error: "Asset name, type, channel, and copy are required." }, { status: 400 });
    const { data, error } = await client.from("beast_marketing_assets").insert({ owner_id: user.id, campaign_id: campaignId, name, asset_type: assetType, channel, body: assetBody, source_facts: normalizeMarketingSourceFacts(body?.sourceFacts) }).select("*").single();
    if (error || !data) return unavailable();
    return NextResponse.json({ asset: asset(data) }, { status: 201 });
  }

  if (kind === "outcome") {
    const metric = body?.metric;
    const value = typeof body?.value === "number" ? body.value : Number(body?.value);
    const sourceLabel = clean(body?.sourceLabel, 240);
    const sourceUrl = clean(body?.sourceUrl, 1_000);
    const measuredAt = clean(body?.measuredAt, 80);
    if (!isMarketingOutcomeMetric(metric) || !Number.isFinite(value) || value < 0 || !sourceLabel) return NextResponse.json({ error: "A valid non-negative outcome and evidence source are required." }, { status: 400 });
    const { data, error } = await client.from("beast_marketing_outcomes").insert({ owner_id: user.id, campaign_id: campaignId, metric, value, source_label: sourceLabel, source_url: /^https:\/\//i.test(sourceUrl) ? sourceUrl : null, measured_at: measuredAt && Number.isFinite(Date.parse(measuredAt)) ? measuredAt : new Date().toISOString(), notes: clean(body?.notes, 1_000) }).select("*").single();
    if (error || !data) return unavailable();
    return NextResponse.json({ outcome: outcome(data) }, { status: 201 });
  }

  if (kind === "recommendation") {
    const [campaignResult, outcomeResult, assetResult] = await Promise.all([
      client.from("beast_marketing_campaigns").select("*").eq("id", campaignId).eq("owner_id", user.id).maybeSingle(),
      client.from("beast_marketing_outcomes").select("metric,value,source_label").eq("campaign_id", campaignId).eq("owner_id", user.id),
      client.from("beast_marketing_assets").select("id").eq("campaign_id", campaignId).eq("owner_id", user.id).eq("status", "approved"),
    ]);
    if (campaignResult.error || !campaignResult.data || outcomeResult.error || assetResult.error) return unavailable();
    const normalizedCampaign = campaign(campaignResult.data) as MarketingCampaign;
    if (!isMarketingCampaignStatus(normalizedCampaign.status)) return unavailable();
    const normalizedOutcomes = (outcomeResult.data || []).map((row) => ({
      metric: row.metric,
      value: Number(row.value),
      sourceLabel: row.source_label,
    })) as Pick<MarketingOutcome, "metric" | "value" | "sourceLabel">[];
    const recommendation = buildMarketingRecommendation({
      campaign: normalizedCampaign,
      outcomes: normalizedOutcomes,
      approvedAssetCount: (assetResult.data || []).length,
    });
    const { data, error } = await client.from("beast_marketing_recommendations").insert({ owner_id: user.id, campaign_id: campaignId, ...recommendation }).select("id,campaign_id,decision,confidence,rationale,evidence,limitations,created_at").single();
    if (error || !data) return unavailable();
    return NextResponse.json({ recommendation: data }, { status: 201 });
  }

  if (kind === "decision") {
    const entityType = body?.entityType;
    const decision = body?.decision;
    const nextStatus = body?.nextStatus;
    const entityId = clean(body?.entityId, 80);
    const validStatus = entityType === "campaign" ? isMarketingCampaignStatus(nextStatus) : entityType === "asset" ? isMarketingAssetStatus(nextStatus) : false;
    if (!entityId || !validStatus || !["approve", "reject", "request_changes"].includes(String(decision))) return NextResponse.json({ error: "A valid governed decision is required." }, { status: 400 });
    const { data, error } = await client.rpc("record_beast_marketing_decision", { selected_entity_type: entityType, selected_entity_id: entityId, selected_decision: decision, selected_status: nextStatus, decision_note: clean(body?.note, 1_000) });
    if (error) return unavailable();
    return NextResponse.json({ decision: data });
  }

  return NextResponse.json({ error: "That BeastMarketing operation is not supported." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const { client, user } = await owner();
  if (!user) return forbidden();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = body?.kind;
  const id = clean(body?.id, 80);
  if (!id) return NextResponse.json({ error: "A record ID is required." }, { status: 400 });
  if (kind === "campaign" && isMarketingCampaignStatus(body?.status)) {
    const { data, error } = await client.from("beast_marketing_campaigns").update({ status: body.status }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    if (error || !data) return unavailable();
    return NextResponse.json({ campaign: campaign(data) });
  }
  if (kind === "asset" && isMarketingAssetStatus(body?.status)) {
    const { data, error } = await client.from("beast_marketing_assets").update({ status: body.status }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    if (error || !data) return unavailable();
    return NextResponse.json({ asset: asset(data) });
  }
  return NextResponse.json({ error: "A valid status update is required." }, { status: 400 });
}
