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
import {
  buildMarketingDistributionPackage,
  fingerprintMarketingAdRevision,
  getMarketingPlacementProfile,
  isMarketingDistributionStatus,
  marketingPlacementProfiles,
  normalizeMarketingAdRevision,
  validateMarketingAdRevision,
  type MarketingAdVariant,
  type MarketingDistributionPlan,
} from "@/lib/beastMarketingPreview";
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
  return NextResponse.json({ error: "BeastMarketing is unavailable until its required database migrations are applied." }, { status: 503 });
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

function adVariant(row: Record<string, unknown>): MarketingAdVariant {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    placementProfileId: row.placement_profile_id as MarketingAdVariant["placementProfileId"],
    platform: String(row.platform),
    placement: String(row.placement),
    headline: String(row.headline || ""),
    primaryText: String(row.primary_text || ""),
    description: String(row.description || ""),
    callToAction: String(row.call_to_action),
    destinationUrl: String(row.destination_url),
    mediaUrl: row.media_url ? String(row.media_url) : null,
    mediaType: row.media_type as MarketingAdVariant["mediaType"],
    mediaAltText: String(row.media_alt_text || ""),
    sourceFacts: (row.source_facts || []) as MarketingAdVariant["sourceFacts"],
    limitations: (row.limitations || []) as string[],
    revision: Number(row.revision),
    revisionHash: String(row.revision_hash),
    status: row.status as MarketingAdVariant["status"],
    approvedRevision: row.approved_revision == null ? null : Number(row.approved_revision),
    approvedRevisionHash: row.approved_revision_hash ? String(row.approved_revision_hash) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function distributionPlan(row: Record<string, unknown>): MarketingDistributionPlan {
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    variantId: String(row.variant_id),
    variantRevision: Number(row.variant_revision),
    variantRevisionHash: String(row.variant_revision_hash),
    platform: String(row.platform),
    placement: String(row.placement),
    plannedFor: String(row.planned_for),
    timezone: String(row.timezone),
    status: row.status as MarketingDistributionPlan["status"],
    ownerNotes: String(row.owner_notes || ""),
    exportedAt: row.exported_at ? String(row.exported_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function GET() {
  const { client, user } = await owner();
  if (!user) return forbidden();
  const [campaigns, assets, outcomes, recommendations, decisions, adVariants, adDecisions, distributionPlans] = await Promise.all([
    client.from("beast_marketing_campaigns").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    client.from("beast_marketing_assets").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    client.from("beast_marketing_outcomes").select("*").eq("owner_id", user.id).order("measured_at", { ascending: false }),
    client.from("beast_marketing_recommendations").select("id,campaign_id,decision,confidence,rationale,evidence,limitations,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
    client.from("beast_marketing_decisions").select("id,entity_type,entity_id,decision,note,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
    client.from("beast_marketing_ad_variants").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    client.from("beast_marketing_ad_decisions").select("id,variant_id,revision,revision_hash,decision,note,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
    client.from("beast_marketing_distribution_plans").select("*").eq("owner_id", user.id).order("planned_for", { ascending: true }),
  ]);
  if (campaigns.error || assets.error || outcomes.error || recommendations.error || decisions.error || adVariants.error || adDecisions.error || distributionPlans.error) return unavailable();
  return NextResponse.json({
    campaigns: (campaigns.data || []).map((row) => campaign(row)),
    assets: (assets.data || []).map((row) => asset(row)),
    outcomes: (outcomes.data || []).map((row) => outcome(row)),
    recommendations: recommendations.data || [],
    decisions: decisions.data || [],
    adVariants: (adVariants.data || []).map((row) => adVariant(row)),
    adDecisions: adDecisions.data || [],
    distributionPlans: (distributionPlans.data || []).map((row) => distributionPlan(row)),
    placementProfiles: marketingPlacementProfiles,
    providerState: { externalPublishing: "disabled", externalScheduling: "disabled", paidMedia: "disabled", credentials: "not_used", internalPlanning: "enabled", providerNeutralExport: "enabled" },
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

  if (kind === "ad_variant") {
    const revision = normalizeMarketingAdRevision({ ...(body?.variant as Record<string, unknown> || {}), campaignId });
    if (!revision) return NextResponse.json({ error: "A campaign, supported placement, CTA, HTTPS destination, evidence source, and valid media details are required." }, { status: 400 });
    const validation = validateMarketingAdRevision(revision);
    if (validation.errors.length) return NextResponse.json({ error: validation.errors.join(" "), validation }, { status: 400 });
    const profile = getMarketingPlacementProfile(revision.placementProfileId);
    if (!profile) return NextResponse.json({ error: "A supported placement is required." }, { status: 400 });
    const revisionHash = fingerprintMarketingAdRevision(revision);
    const { data, error } = await client.from("beast_marketing_ad_variants").insert({
      owner_id: user.id,
      campaign_id: campaignId,
      placement_profile_id: profile.id,
      platform: profile.platform,
      placement: profile.placement,
      headline: revision.headline,
      primary_text: revision.primaryText,
      description: revision.description,
      call_to_action: revision.callToAction,
      destination_url: revision.destinationUrl,
      media_url: revision.mediaUrl,
      media_type: revision.mediaType,
      media_alt_text: revision.mediaAltText,
      source_facts: revision.sourceFacts,
      limitations: revision.limitations,
      revision_hash: revisionHash,
    }).select("*").single();
    if (error || !data) return unavailable();
    return NextResponse.json({ adVariant: adVariant(data), validation }, { status: 201 });
  }

  if (kind === "ad_decision") {
    const variantId = clean(body?.variantId, 80);
    const revision = Number(body?.revision);
    const revisionHash = clean(body?.revisionHash, 40);
    const decision = clean(body?.decision, 40);
    if (!variantId || !Number.isInteger(revision) || !/^fnv1a32:[0-9a-f]{8}$/.test(revisionHash) || !["approve", "reject", "request_changes"].includes(decision)) {
      return NextResponse.json({ error: "An exact ad revision and valid owner decision are required." }, { status: 400 });
    }
    const { data, error } = await client.rpc("record_beast_marketing_ad_decision", {
      selected_variant_id: variantId,
      selected_revision: revision,
      selected_revision_hash: revisionHash,
      selected_decision: decision,
      decision_note: clean(body?.note, 1_000),
    });
    if (error) return NextResponse.json({ error: "The exact ad revision could not be approved. Reload it and try again." }, { status: 409 });
    return NextResponse.json({ adDecision: data });
  }

  if (kind === "distribution_plan") {
    const variantId = clean(body?.variantId, 80);
    const plannedFor = clean(body?.plannedFor, 80);
    const timezone = clean(body?.timezone, 100);
    if (!variantId || !timezone || !plannedFor || !Number.isFinite(Date.parse(plannedFor))) return NextResponse.json({ error: "An approved ad, valid planned time, and timezone are required." }, { status: 400 });
    const { data: selectedVariant, error: variantError } = await client.from("beast_marketing_ad_variants").select("*").eq("id", variantId).eq("campaign_id", campaignId).eq("owner_id", user.id).maybeSingle();
    if (variantError || !selectedVariant) return unavailable();
    const exact = adVariant(selectedVariant);
    if (exact.status !== "approved" || exact.approvedRevision !== exact.revision || exact.approvedRevisionHash !== exact.revisionHash) {
      return NextResponse.json({ error: "Approve this exact ad revision before marking an internal distribution plan ready." }, { status: 409 });
    }
    const { data, error } = await client.from("beast_marketing_distribution_plans").insert({
      owner_id: user.id,
      campaign_id: campaignId,
      variant_id: exact.id,
      variant_revision: exact.revision,
      variant_revision_hash: exact.revisionHash,
      platform: exact.platform,
      placement: exact.placement,
      planned_for: plannedFor,
      timezone,
      status: "ready",
      owner_notes: clean(body?.ownerNotes, 2_000),
    }).select("*").single();
    if (error || !data) return unavailable();
    return NextResponse.json({ distributionPlan: distributionPlan(data) }, { status: 201 });
  }

  if (kind === "distribution_export") {
    const planId = clean(body?.planId, 80);
    const { data: planRow, error: planError } = await client.from("beast_marketing_distribution_plans").select("*").eq("id", planId).eq("campaign_id", campaignId).eq("owner_id", user.id).maybeSingle();
    if (planError || !planRow) return unavailable();
    const plan = distributionPlan(planRow);
    const [variantResult, campaignResult] = await Promise.all([
      client.from("beast_marketing_ad_variants").select("*").eq("id", plan.variantId).eq("owner_id", user.id).maybeSingle(),
      client.from("beast_marketing_campaigns").select("id,title,objective,audience,offer").eq("id", campaignId).eq("owner_id", user.id).maybeSingle(),
    ]);
    if (variantResult.error || !variantResult.data || campaignResult.error || !campaignResult.data) return unavailable();
    const handoff = buildMarketingDistributionPackage({ campaign: campaignResult.data, variant: adVariant(variantResult.data), plan });
    if (!handoff) return NextResponse.json({ error: "The planned ad no longer matches the exact approved revision. Review and approve it again." }, { status: 409 });
    const { data, error } = await client.from("beast_marketing_distribution_plans").update({ status: "exported", handoff_payload: handoff, exported_at: handoff.generatedAt }).eq("id", plan.id).eq("owner_id", user.id).eq("variant_revision", plan.variantRevision).eq("variant_revision_hash", plan.variantRevisionHash).select("*").maybeSingle();
    if (error || !data) return unavailable();
    return NextResponse.json({ handoff, distributionPlan: distributionPlan(data) });
  }

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
  if (kind === "ad_variant") {
    const expectedRevision = Number(body?.revision);
    const expectedRevisionHash = clean(body?.revisionHash, 40);
    const revision = normalizeMarketingAdRevision(body?.variant);
    if (!revision || !Number.isInteger(expectedRevision) || !/^fnv1a32:[0-9a-f]{8}$/.test(expectedRevisionHash)) return NextResponse.json({ error: "A complete exact ad revision is required." }, { status: 400 });
    const validation = validateMarketingAdRevision(revision);
    if (validation.errors.length) return NextResponse.json({ error: validation.errors.join(" "), validation }, { status: 400 });
    const profile = getMarketingPlacementProfile(revision.placementProfileId);
    if (!profile) return NextResponse.json({ error: "A supported placement is required." }, { status: 400 });
    const nextRevisionHash = fingerprintMarketingAdRevision(revision);
    const { data, error } = await client.from("beast_marketing_ad_variants").update({
      campaign_id: revision.campaignId,
      placement_profile_id: profile.id,
      platform: profile.platform,
      placement: profile.placement,
      headline: revision.headline,
      primary_text: revision.primaryText,
      description: revision.description,
      call_to_action: revision.callToAction,
      destination_url: revision.destinationUrl,
      media_url: revision.mediaUrl,
      media_type: revision.mediaType,
      media_alt_text: revision.mediaAltText,
      source_facts: revision.sourceFacts,
      limitations: revision.limitations,
      revision_hash: nextRevisionHash,
    }).eq("id", id).eq("owner_id", user.id).eq("revision", expectedRevision).eq("revision_hash", expectedRevisionHash).select("*").maybeSingle();
    if (error) return unavailable();
    if (!data) return NextResponse.json({ error: "The ad changed before this update. Reload the current revision and try again." }, { status: 409 });
    return NextResponse.json({ adVariant: adVariant(data), validation });
  }
  if (kind === "distribution_plan" && isMarketingDistributionStatus(body?.status)) {
    const status = body.status;
    if (!["draft", "cancelled"].includes(status)) return NextResponse.json({ error: "Only draft or cancelled internal-plan updates are supported here." }, { status: 400 });
    const { data, error } = await client.from("beast_marketing_distribution_plans").update({ status, handoff_payload: null, exported_at: null }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    if (error || !data) return unavailable();
    return NextResponse.json({ distributionPlan: distributionPlan(data) });
  }
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
