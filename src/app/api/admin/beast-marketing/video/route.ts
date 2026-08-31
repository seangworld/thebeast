import { NextResponse } from "next/server";
import { allowedVideoTransitions, defaultVideoSeriesSettings, videoJobStates, type VideoJobState, type VideoSeriesSettings } from "@/lib/beastMarketingVideo";
import { buildGroundedScript, buildYouTubeMetadata, scoreVideoOpportunity, type ScriptFact, type VideoEvidence } from "@/lib/beastMarketingContent";
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

const forbidden = () => NextResponse.json({ error: "BeastMarketing owner access required." }, { status: 403 });
const unavailable = () => NextResponse.json({ error: "The BMKT-003 migration must be applied before the Video Growth Engine can operate." }, { status: 503 });
const clean = (value: unknown, maximum = 500) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const list = (value: unknown, limit = 30) => Array.isArray(value) ? value.map((item) => clean(item, 160)).filter(Boolean).slice(0, limit) : [];
const integer = (value: unknown, minimum: number, maximum: number, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
};

function settings(value: unknown): VideoSeriesSettings {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const minimumRuntimeSeconds = integer(record.minimumRuntimeSeconds, 15, 3600, defaultVideoSeriesSettings.minimumRuntimeSeconds);
  const maximumRuntimeSeconds = integer(record.maximumRuntimeSeconds, minimumRuntimeSeconds, 7200, defaultVideoSeriesSettings.maximumRuntimeSeconds);
  return {
    ...defaultVideoSeriesSettings,
    publishingEnabled: record.publishingEnabled === true,
    approvalMode: record.approvalMode === "automatic" ? "automatic" : "owner_approval",
    daysOfWeek: Array.isArray(record.daysOfWeek) ? record.daysOfWeek.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6).slice(0, 7) : defaultVideoSeriesSettings.daysOfWeek,
    preferredWindows: list(record.preferredWindows, 7),
    minimumSpacingMinutes: integer(record.minimumSpacingMinutes, 15, 10080, defaultVideoSeriesSettings.minimumSpacingMinutes),
    maximumPerDay: integer(record.maximumPerDay, 1, 24, defaultVideoSeriesSettings.maximumPerDay),
    maximumPerWeek: integer(record.maximumPerWeek, 1, 100, defaultVideoSeriesSettings.maximumPerWeek),
    minimumRuntimeSeconds,
    targetRuntimeSeconds: integer(record.targetRuntimeSeconds, minimumRuntimeSeconds, maximumRuntimeSeconds, Math.min(Math.max(defaultVideoSeriesSettings.targetRuntimeSeconds, minimumRuntimeSeconds), maximumRuntimeSeconds)),
    maximumRuntimeSeconds,
    aspectRatio: ["9:16", "16:9", "1:1"].includes(String(record.aspectRatio)) ? record.aspectRatio as VideoSeriesSettings["aspectRatio"] : "9:16",
    voiceProfileId: clean(record.voiceProfileId, 80) || null,
    visualStyle: clean(record.visualStyle, 100) || defaultVideoSeriesSettings.visualStyle,
    captionStyle: clean(record.captionStyle, 100) || defaultVideoSeriesSettings.captionStyle,
    presenterProfileId: clean(record.presenterProfileId, 80) || null,
    qualityThreshold: integer(record.qualityThreshold, 1, 100, defaultVideoSeriesSettings.qualityThreshold),
    allowedTopics: list(record.allowedTopics), excludedTopics: list(record.excludedTopics),
    evergreenPercent: integer(record.evergreenPercent, 0, 100, defaultVideoSeriesSettings.evergreenPercent),
    beastPromotionPercent: integer(record.beastPromotionPercent, 0, 100, defaultVideoSeriesSettings.beastPromotionPercent),
    trendSensitivity: integer(record.trendSensitivity, 0, 100, defaultVideoSeriesSettings.trendSensitivity),
    minimumOpportunityConfidence: integer(record.minimumOpportunityConfidence, 0, 100, defaultVideoSeriesSettings.minimumOpportunityConfidence),
    optimizeTitle: record.optimizeTitle !== false, optimizeDescription: record.optimizeDescription !== false,
    researchKeywords: record.researchKeywords !== false, generateTags: record.generateTags !== false, generateHashtags: record.generateHashtags !== false,
    testHooks: record.testHooks !== false, testCtas: record.testCtas !== false, selectDestination: record.selectDestination !== false,
    campaignAttribution: record.campaignAttribution !== false, optimizeTiming: record.optimizeTiming !== false,
  };
}

export async function GET() {
  const { client, user } = await owner();
  if (!user) return forbidden();
  const [controls, series, presenters, jobs] = await Promise.all([
    client.from("beast_marketing_video_controls").select("*").eq("owner_id", user.id).maybeSingle(),
    client.from("beast_marketing_video_series").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    client.from("beast_marketing_presenter_profiles").select("*").eq("owner_id", user.id).order("created_at", { ascending: true }),
    client.from("beast_marketing_video_jobs").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
  ]);
  if (controls.error || series.error || presenters.error || jobs.error) return unavailable();
  return NextResponse.json({
    controls: controls.data || { pause_all_publishing: true, external_publishing_authorized: false, automatic_publishing_authorized: false, youtube_authorized: false },
    series: series.data || [], presenters: presenters.data || [], jobs: jobs.data || [],
    authorities: { externalPublishing: "disabled", automaticPublishing: "disabled", youtube: "not_authorized", paidProviders: "not_configured" },
  }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { client, user } = await owner();
  if (!user) return forbidden();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = clean(body?.kind, 40);
  if (kind === "evaluate_job") {
    const id = clean(body?.id, 80);
    const { data: job } = await client.from("beast_marketing_video_jobs").select("id, series_id, topic, state").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!job || !["idea", "modify"].includes(job.state)) return NextResponse.json({ error: "Only an owner-scoped idea can be evaluated." }, { status: 409 });
    const { data: series } = await client.from("beast_marketing_video_series").select("settings").eq("id", job.series_id).eq("owner_id", user.id).maybeSingle();
    if (!series) return NextResponse.json({ error: "The series settings are unavailable." }, { status: 404 });
    const evidence = Array.isArray(body?.evidence) ? body.evidence as VideoEvidence[] : [];
    const opportunity = scoreVideoOpportunity({ title: clean((job.topic as Record<string, unknown>)?.title, 240), category: clean(body?.category, 100), capabilityMatch: integer(body?.capabilityMatch, 0, 100, 0), funnelValue: integer(body?.funnelValue, 0, 100, 0), historicalPerformance: body?.historicalPerformance == null ? null : integer(body.historicalPerformance, 0, 100, 0), audienceInterest: body?.audienceInterest == null ? null : integer(body.audienceInterest, 0, 100, 0), trendOpportunity: body?.trendOpportunity == null ? null : integer(body.trendOpportunity, 0, 100, 0), evidence }, settings(series.settings));
    const { data, error } = await client.from("beast_marketing_video_jobs").update({ topic: opportunity, state: opportunity.selectable ? "selected" : "idea", provenance: { evaluatedBy: "bmkt-004", evidence: opportunity.evidence, evidenceStatus: opportunity.evidenceStatus }, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ job: data, opportunity });
  }
  if (kind === "script_job") {
    const id = clean(body?.id, 80);
    const { data: job } = await client.from("beast_marketing_video_jobs").select("id, series_id, topic, state").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!job || !["selected", "modify"].includes(job.state)) return NextResponse.json({ error: "The queue item must be selected before scripting." }, { status: 409 });
    const { data: series } = await client.from("beast_marketing_video_series").select("settings").eq("id", job.series_id).eq("owner_id", user.id).maybeSingle();
    if (!series) return NextResponse.json({ error: "The series settings are unavailable." }, { status: 404 });
    const topic = clean((job.topic as Record<string, unknown>)?.title, 240);
    const destinationUrl = clean(body?.destinationUrl, 1000);
    const script = buildGroundedScript({ topic, facts: Array.isArray(body?.facts) ? body.facts as ScriptFact[] : [], destinationLabel: clean(body?.destinationLabel, 120) || "SEANGWORLD", destinationUrl, settings: settings(series.settings) });
    const metadata = buildYouTubeMetadata({ topic, summary: clean(body?.summary, 2000), keywords: list(body?.keywords, 20), destinationUrl, campaignId: clean(body?.campaignId, 120) || `bmkt-${id}` });
    const ready = script.generationReady && metadata.warnings.length === 0;
    const { data, error } = await client.from("beast_marketing_video_jobs").update({ script, metadata, destination: { url: metadata.destinationUrl, campaign: metadata.campaign }, state: ready ? "scripted" : "selected", quality: { scriptReady: ready, warnings: [...script.warnings, ...metadata.warnings] }, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ job: data, ready });
  }
  if (kind === "series") {
    const name = clean(body?.name, 160);
    if (!name) return NextResponse.json({ error: "A series name is required." }, { status: 400 });
    const { data, error } = await client.from("beast_marketing_video_series").insert({ owner_id: user.id, name, description: clean(body?.description, 1000), enabled: false, settings: settings(body?.settings) }).select("*").single();
    return error || !data ? unavailable() : NextResponse.json({ series: data }, { status: 201 });
  }
  if (kind === "presenter") {
    const name = clean(body?.name, 160);
    if (!name) return NextResponse.json({ error: "A presenter profile name is required." }, { status: 400 });
    const { data, error } = await client.from("beast_marketing_presenter_profiles").insert({ owner_id: user.id, name, presenter_type: "faceless", presentation_rules: { style: clean(body?.style, 300) || "Faceless editorial narration" }, active: false, provenance: { origin: "owner_created_profile", likenessOrVoiceMediaUsed: false } }).select("*").single();
    return error || !data ? unavailable() : NextResponse.json({ presenter: data }, { status: 201 });
  }
  if (kind === "job") {
    const seriesId = clean(body?.seriesId, 80); const topicTitle = clean(body?.topicTitle, 240);
    if (!seriesId || !topicTitle) return NextResponse.json({ error: "A series and topic are required." }, { status: 400 });
    const { data: ownedSeries } = await client.from("beast_marketing_video_series").select("id").eq("id", seriesId).eq("owner_id", user.id).maybeSingle();
    if (!ownedSeries) return NextResponse.json({ error: "The selected series is unavailable." }, { status: 404 });
    const { data, error } = await client.from("beast_marketing_video_jobs").insert({ owner_id: user.id, series_id: seriesId, state: "idea", idempotency_key: crypto.randomUUID(), topic: { title: topicTitle, source: "owner", confidence: null }, provenance: { createdBy: "owner", providersUsed: [] } }).select("*").single();
    return error || !data ? unavailable() : NextResponse.json({ job: data }, { status: 201 });
  }
  return NextResponse.json({ error: "That video operation is not supported." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const { client, user } = await owner();
  if (!user) return forbidden();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = clean(body?.kind, 40); const id = clean(body?.id, 80);
  if (kind === "controls") {
    const pause = body?.pauseAllPublishing !== false;
    const { data, error } = await client.from("beast_marketing_video_controls").upsert({ owner_id: user.id, pause_all_publishing: pause, external_publishing_authorized: false, automatic_publishing_authorized: false, youtube_authorized: false, updated_at: new Date().toISOString() }).select("*").single();
    return error || !data ? unavailable() : NextResponse.json({ controls: data });
  }
  if (!id) return NextResponse.json({ error: "A record ID is required." }, { status: 400 });
  if (kind === "series") {
    const normalized = settings(body?.settings);
    const { data, error } = await client.from("beast_marketing_video_series").update({ name: clean(body?.name, 160), description: clean(body?.description, 1000), enabled: body?.enabled === true, settings: normalized, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ series: data });
  }
  if (kind === "job") {
    const next = clean(body?.state, 40) as VideoJobState;
    if (!videoJobStates.includes(next)) return NextResponse.json({ error: "A valid queue state is required." }, { status: 400 });
    const { data: current } = await client.from("beast_marketing_video_jobs").select("state").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!current || !allowedVideoTransitions[current.state as VideoJobState]?.includes(next)) return NextResponse.json({ error: "That queue transition is not allowed." }, { status: 409 });
    if (["scheduled", "published"].includes(next)) return NextResponse.json({ error: "YouTube authorization and external publishing authority are required before scheduling or publishing." }, { status: 409 });
    const { data, error } = await client.from("beast_marketing_video_jobs").update({ state: next, updated_at: new Date().toISOString(), last_error: null }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ job: data });
  }
  return NextResponse.json({ error: "A valid video update is required." }, { status: 400 });
}
