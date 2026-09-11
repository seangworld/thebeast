import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { allowedVideoTransitions, defaultVideoSeriesSettings, normalizeVideoTopicPhrases, validateVideoTopicPhrases, videoJobStates, type VideoJobState, type VideoSeriesSettings } from "@/lib/beastMarketingVideo";
import { buildGroundedScript, buildYouTubeMetadata, scoreVideoOpportunity, type ScriptFact, type VideoEvidence } from "@/lib/beastMarketingContent";
import { buildProductionManifest, fingerprintProductionManifest, validateProductionManifest } from "@/lib/beastMarketingProduction";
import { planCandidateCadence, validateTopicFamily, type OwnerWorkflowDecision } from "@/lib/beastMarketingOwnerWorkflow";
import { SHOTSTACK_ADAPTER_VERSION, buildShotstackEdit, shotstackConfiguration } from "@/lib/beastMarketingShotstack";
import { bindNewsAcceptance2Visuals, bindNewsTestVisuals, newsAcceptance2Script } from "@/lib/beastMarketingNewsVisualTest";
import { buildStaticContainVisualPlan, evaluateProductionQuality } from "@/lib/beastMarketingQuality";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
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
const decimal = (value: unknown, minimum: number, maximum: number, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
};
const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const httpsUrl = (value: unknown, maximum = 1000) => {
  const normalized = clean(value, maximum);
  return /^https:\/\//i.test(normalized) ? normalized : null;
};
const seangworldUrl = (value: unknown) => {
  const normalized = httpsUrl(value);
  if (!normalized) return null;
  try { const hostname = new URL(normalized).hostname.toLowerCase(); return hostname === "seangworld.com" || hostname.endsWith(".seangworld.com") ? normalized : null; }
  catch { return null; }
};

function providerValidationFailure(attempt: Record<string, unknown> | null | undefined) {
  if (!attempt || clean(attempt.status, 40) !== "failed" || clean(attempt.error_category, 40) !== "validation" || clean(attempt.provider_request_id, 100)) return false;
  const attemptEvidence = record(attempt.evidence);
  return [400, 422].includes(Number(attemptEvidence.providerHttpStatus));
}

function evidence(value: unknown): VideoEvidence[] {
  if (!Array.isArray(value)) return [];
  const sources = new Set<VideoEvidence["source"]>(["search_console", "ga4", "first_party", "owner", "youtube_history"]);
  return value.flatMap((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const source = clean(record.source, 40) as VideoEvidence["source"];
    const label = clean(record.label, 200);
    if (!sources.has(source) || !label) return [];
    return [{ source, label, url: httpsUrl(record.url), observedAt: clean(record.observedAt, 40) || null, sampleSize: record.sampleSize == null ? null : integer(record.sampleSize, 0, 10_000_000, 0), value: record.value == null ? null : integer(record.value, 0, 100, 0), limitation: clean(record.limitation, 500) || null }];
  }).slice(0, 20);
}

function facts(value: unknown): ScriptFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const statement = clean(record.statement, 1000); const sourceLabel = clean(record.sourceLabel, 200);
    if (!statement || !sourceLabel) return [];
    return [{ statement, sourceLabel, sourceUrl: httpsUrl(record.sourceUrl), verified: record.verified === true }];
  }).slice(0, 8);
}

function settings(value: unknown): VideoSeriesSettings {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const minimumRuntimeSeconds = integer(record.minimumRuntimeSeconds, 15, 3600, defaultVideoSeriesSettings.minimumRuntimeSeconds);
  const maximumRuntimeSeconds = integer(record.maximumRuntimeSeconds, minimumRuntimeSeconds, 7200, defaultVideoSeriesSettings.maximumRuntimeSeconds);
  return {
    ...defaultVideoSeriesSettings,
    publishingEnabled: record.publishingEnabled === true,
    approvalMode: record.approvalMode === "automatic" ? "automatic" : "owner_approval",
    manualApprovalFirstN: integer(record.manualApprovalFirstN, 0, 100, defaultVideoSeriesSettings.manualApprovalFirstN),
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
    allowedTopics: normalizeVideoTopicPhrases(record.allowedTopics), excludedTopics: normalizeVideoTopicPhrases(record.excludedTopics),
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
  const [controls, series, presenters, jobs, youtube, attempts] = await Promise.all([
    client.from("beast_marketing_video_controls").select("*").eq("owner_id", user.id).maybeSingle(),
    client.from("beast_marketing_video_series").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    client.from("beast_marketing_presenter_profiles").select("*").eq("owner_id", user.id).order("created_at", { ascending: true }),
    client.from("beast_marketing_video_jobs").select("*").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    createBeastFusionPublicationClient().from("beast_marketing_youtube_connections").select("channel_handle").eq("owner_id", user.id).maybeSingle(),
    client.from("beast_marketing_video_attempts").select("job_id, attempt_number, status, error_category, provider_request_id, evidence, created_at, completed_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (controls.error || series.error || presenters.error || jobs.error || attempts.error) return unavailable();
  const latestAttempts = new Map<string, Record<string, unknown>>();
  (attempts.data || []).forEach((attempt) => {
    const jobId = clean(attempt.job_id, 80);
    if (jobId && !latestAttempts.has(jobId)) latestAttempts.set(jobId, attempt as Record<string, unknown>);
  });
  const enrichedJobs = (jobs.data || []).map((job) => {
    const latestAttempt = latestAttempts.get(job.id) || null;
    const provenance = record(job.provenance);
    const production = record(job.production);
    const available = !provenance.superseded && providerValidationFailure(latestAttempt)
      && Boolean(record(production.manifest).checksum);
    const evidence = record(latestAttempt?.evidence);
    return {
      ...job,
      latestAttempt: latestAttempt ? { attemptNumber: latestAttempt.attempt_number, status: latestAttempt.status, errorCategory: latestAttempt.error_category, providerRequestId: latestAttempt.provider_request_id, providerHttpStatus: evidence.providerHttpStatus ?? null, providerErrorCode: evidence.providerErrorCode ?? null, providerErrorMessage: evidence.providerErrorMessage ?? null, providerValidationPath: evidence.providerValidationPath ?? null, providerErrorAt: evidence.providerErrorAt ?? null, createdAt: latestAttempt.created_at, completedAt: latestAttempt.completed_at } : null,
      technicalRecovery: available ? { available: true, attemptNumber: Number(latestAttempt?.attempt_number) || 1, providerHttpStatus: Number(evidence.providerHttpStatus) || null } : { available: false },
    };
  });
  return NextResponse.json({
    controls: controls.data || { pause_all_publishing: true, external_publishing_authorized: false, automatic_publishing_authorized: false, youtube_authorized: false },
    series: (series.data || []).map((item) => ({ ...item, settings: settings(item.settings) })), presenters: presenters.data || [], jobs: enrichedJobs,
    authorities: {
      externalPublishing: "disabled",
      automaticPublishing: "disabled",
      youtube: youtube.error ? "connection_unavailable" : youtube.data ? "connected_private_upload_only" : "not_connected",
      paidProviders: shotstackConfiguration().configured ? "shotstack_internal_only" : "not_configured",
    },
  }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const { client, user } = await owner();
  if (!user) return forbidden();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = clean(body?.kind, 40);
  if (kind === "create_corrected_revision") {
    if (request.headers.get("origin") !== new URL(request.url).origin) return forbidden();
    const sourceId = clean(body?.id, 80);
    const { data: source } = await client.from("beast_marketing_video_jobs").select("*").eq("id", sourceId).eq("owner_id", user.id).maybeSingle();
    if (!source) return NextResponse.json({ error: "The selected video candidate is unavailable." }, { status: 404 });
    const sourceProvenance = record(source.provenance);
    const sourceProduction = record(source.production);
    if (sourceProvenance.superseded) return NextResponse.json({ error: "This candidate has already been superseded by a corrected revision." }, { status: 409 });
    if (sourceProvenance.externalPublishingDisabled !== true || sourceProvenance.youtubePublishingDisabled !== true) return NextResponse.json({ error: "A corrected revision requires explicit external and YouTube publishing locks." }, { status: 409 });
    const { data: latestAttempt, error: attemptError } = await client.from("beast_marketing_video_attempts").select("*").eq("owner_id", user.id).eq("job_id", source.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (attemptError) return unavailable();
    if (!providerValidationFailure(latestAttempt as Record<string, unknown> | null)) return NextResponse.json({ error: "An explicit corrected revision requires a retained pre-submission provider validation failure." }, { status: 409 });
    const sourceManifest = record(sourceProduction.manifest);
    if (!sourceManifest.checksum || !Array.isArray(sourceManifest.scenes) || !Array.isArray(sourceManifest.assets)) return NextResponse.json({ error: "The failed candidate does not contain a complete production manifest." }, { status: 409 });
    try { buildShotstackEdit(sourceManifest as Parameters<typeof buildShotstackEdit>[0]); }
    catch { return NextResponse.json({ error: "The corrected Shotstack adapter still rejects this candidate's provider payload; no new revision was created." }, { status: 409 }); }
    const nextRevision = integer(source.revision, 1, 1_000_000, 1) + 1;
    const sourceKey = clean(source.idempotency_key, 160);
    const idempotencyKey = `${sourceKey}-r${nextRevision}`;
    const { data: existing } = await client.from("beast_marketing_video_jobs").select("*").eq("owner_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return NextResponse.json({ job: existing, duplicatePrevented: true, shotstackCreditsConsumed: 0, externallyPublished: false });
    const id = randomUUID();
    const manifest = fingerprintProductionManifest({ ...structuredClone(sourceManifest), jobId: id, revision: nextRevision } as Parameters<typeof fingerprintProductionManifest>[0]);
    const sourceTopic = record(source.topic);
    const baseTitle = clean(sourceTopic.title, 240).replace(/\s+—\s+Revision\s+\d+$/i, "") || "Video candidate";
    const revisionLabel = `${baseTitle} — Revision ${nextRevision}`;
    const now = new Date().toISOString();
    const sourceQuality = record(source.quality);
    const newProduction = {
      ...sourceProduction, manifest, providerState: "authorization_required", providerId: null, providerEnvironment: null,
      attemptId: null, externalActionPerformed: false, renderAuthorizationRequired: false,
      technicalRetry: { authorizedByOwner: true, maximumAttempts: 1, attemptsConsumed: 0, correction: "Shotstack Edit schema correction: documented text-to-speech narration asset, supported CTA transition, aspect-safe crop, non-overlapping tracks, and explicit output settings.", adapterVersion: SHOTSTACK_ADAPTER_VERSION, sourceAttemptId: latestAttempt?.id || null },
      shotstackCreditsConsumed: 0,
    };
    const manifestVisualPlan = record(manifest.visualPlan);
    const manifestBeatCount = Array.isArray(manifestVisualPlan.beats) ? manifestVisualPlan.beats.length : undefined;
    const newQuality = {
      ...sourceQuality, renderReady: false, ownerQualityReview: "not_ready", ownerWorkflowDecision: "pending", ownerApprovalSource: null,
      internalRenderStatus: "not_submitted", qualityScore: sourceQuality.qualityScore ?? 100,
      runtimeSeconds: sourceQuality.runtimeSeconds ?? Number(manifest.runtimeMs) / 1000,
      visualBeatCount: sourceQuality.visualBeatCount ?? manifestBeatCount,
      warnings: [`Revision ${nextRevision} created from the exact approved candidate after a provider validation correction. One Owner-authorized internal render is available; no automatic retry.`],
    };
    const newProvenance = {
      ...sourceProvenance, candidateLabel: revisionLabel, revisionLabel, activeCandidate: true, acceptanceTest: sourceProvenance.acceptanceTest,
      parentJobId: source.id, parentRevision: source.revision, supersedesJobId: source.id, supersedesRevision: source.revision,
      technicalCorrection: "Shotstack Edit schema correction: documented text-to-speech narration asset, supported CTA transition, aspect-safe crop, non-overlapping tracks, and explicit output settings.", technicalCorrectionAdapterVersion: SHOTSTACK_ADAPTER_VERSION,
      technicalRetryAuthorized: true, technicalRetryMaximumAttempts: 1, technicalRetryAttemptsConsumed: 0,
      waitingForOwnerApproval: true, renderAuthorizationRequired: false, providersUsed: [], paidServicesUsed: false,
      shotstackCreditsConsumed: 0, externallyPublished: false, externalPublishingDisabled: true, youtubePublishingDisabled: true,
    };
    const { data: corrected, error: insertError } = await client.from("beast_marketing_video_jobs").insert({
      id, owner_id: user.id, series_id: source.series_id, state: "scripted", revision: nextRevision, idempotency_key: idempotencyKey,
      topic: { ...sourceTopic, title: revisionLabel, candidateLabel: revisionLabel, activeCandidate: true, acceptanceTest: sourceProvenance.acceptanceTest },
      script: structuredClone(source.script), production: newProduction, quality: newQuality, provenance: newProvenance,
    }).select("*").single();
    if (insertError || !corrected) return unavailable();
    const supersededProvenance = {
      ...sourceProvenance, activeCandidate: false, superseded: true, supersededByJobId: id, supersededByRevision: nextRevision,
      supersededReason: "Provider validation failure superseded by an Owner-authorized corrected adapter revision.", waitingForOwnerApproval: false,
    };
    const supersededQuality = {
      ...sourceQuality, renderReady: false, ownerQualityReview: "needs_changes", ownerWorkflowDecision: "needs_changes",
      warnings: ["Superseded after the retained Shotstack provider validation failure. Review the corrected revision."],
    };
    await client.from("beast_marketing_video_jobs").update({ state: "failed", quality: supersededQuality, provenance: supersededProvenance, last_error: "Superseded after provider validation failure; corrected revision created.", updated_at: now }).eq("id", source.id).eq("owner_id", user.id);
    return NextResponse.json({ job: corrected, supersededJobId: source.id, sourceAttemptId: latestAttempt?.id || null, shotstackCreditsConsumed: 0, externallyPublished: false }, { status: 201 });
  }
  if (kind === "create_visual_presentation_revision") {
    if (request.headers.get("origin") !== new URL(request.url).origin) return forbidden();
    const sourceId = clean(body?.id, 80);
    const { data: source } = await client.from("beast_marketing_video_jobs").select("*").eq("id", sourceId).eq("owner_id", user.id).maybeSingle();
    if (!source) return NextResponse.json({ error: "The selected video candidate is unavailable." }, { status: 404 });
    const sourceProvenance = record(source.provenance);
    const sourceQuality = record(source.quality);
    const sourceProduction = record(source.production);
    if (sourceProvenance.superseded) return NextResponse.json({ error: "This candidate has already been superseded by a later revision." }, { status: 409 });
    if (sourceQuality.ownerQualityGrade !== "B" || sourceQuality.technicalResult !== "PASS" || sourceQuality.creativeResult !== "REVISION REQUIRED" || sourceQuality.visualFramingReview !== "NEEDS REVISION" || sourceQuality.motionTreatmentReview !== "NEEDS REVISION") return NextResponse.json({ error: "The candidate requires a persisted Owner visual-presentation review before creating this revision." }, { status: 409 });
    if (sourceProvenance.externalPublishingDisabled !== true || sourceProvenance.youtubePublishingDisabled !== true) return NextResponse.json({ error: "A visual presentation revision requires explicit external and YouTube publishing locks." }, { status: 409 });
    const sourceManifest = record(sourceProduction.manifest);
    if (!sourceManifest.checksum || !Array.isArray(sourceManifest.scenes) || !Array.isArray(sourceManifest.assets)) return NextResponse.json({ error: "The source candidate does not contain a complete production manifest." }, { status: 409 });
    const nextRevision = integer(source.revision, 1, 1_000_000, 1) + 1;
    const sourceKey = clean(source.idempotency_key, 160);
    const idempotencyKey = `${sourceKey}-visual-r${nextRevision}`;
    const { data: existing } = await client.from("beast_marketing_video_jobs").select("*").eq("owner_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return NextResponse.json({ job: existing, duplicatePrevented: true, shotstackCreditsConsumed: 0, externallyPublished: false });
    const id = randomUUID();
    const manifestBase = { ...structuredClone(sourceManifest), jobId: id, revision: nextRevision } as Parameters<typeof fingerprintProductionManifest>[0];
    manifestBase.visualPlan = buildStaticContainVisualPlan(manifestBase);
    const manifest = fingerprintProductionManifest(manifestBase);
    const { data: series } = await client.from("beast_marketing_video_series").select("settings").eq("id", source.series_id).eq("owner_id", user.id).maybeSingle();
    const normalizedSettings = settings(series?.settings);
    const qualityReport = evaluateProductionQuality(manifest, normalizedSettings);
    if (!qualityReport.ready || qualityReport.score < normalizedSettings.qualityThreshold) return NextResponse.json({ error: "The visual presentation revision did not meet the configured zero-cost quality threshold.", quality: qualityReport }, { status: 409 });
    try { buildShotstackEdit(manifest); }
    catch { return NextResponse.json({ error: "The static full-frame presentation did not pass provider schema validation; no revision was created." }, { status: 409 }); }
    const sourceTopic = record(source.topic);
    const baseTitle = clean(sourceTopic.title, 240).replace(/\s+—\s+Revision\s+\d+$/i, "") || "Video candidate";
    const revisionLabel = `${baseTitle} — Revision ${nextRevision}`;
    const now = new Date().toISOString();
    const newProduction = {
      ...sourceProduction,
      manifest,
      providerState: "authorization_required",
      providerId: null,
      providerEnvironment: null,
      attemptId: null,
      externalActionPerformed: false,
      renderAuthorizationRequired: true,
      technicalRetry: null,
      visualPresentationRevision: true,
      visualPresentation: { remediation: "static_contain", framing: "contain", motion: "static", background: "#070b14", canvas: { width: manifest.width, height: manifest.height }, sourceRevision: source.revision },
      shotstackCreditsConsumed: 0,
    };
    const newQuality = {
      ...sourceQuality,
      ...qualityReport.metrics,
      renderReady: false,
      ownerQualityReview: "not_ready",
      ownerWorkflowDecision: "pending",
      ownerApprovalSource: null,
      internalRenderStatus: "not_submitted",
      qualityScore: qualityReport.score,
      blockers: qualityReport.blockers,
      warnings: ["Revision created for visual presentation only: full screenshots use contain framing and static holds; accepted voice, pacing, script, captions, assets, hook, and CTA are unchanged."],
      visualPresentationRevision: true,
    };
    const newProvenance = {
      ...sourceProvenance,
      candidateLabel: revisionLabel,
      revisionLabel,
      activeCandidate: true,
      parentJobId: source.id,
      parentRevision: source.revision,
      supersedesJobId: source.id,
      supersedesRevision: source.revision,
      visualPresentationRevision: true,
      visualPresentationCorrection: "Full-frame contain framing with static screenshot holds and supported fade transitions; accepted creative elements unchanged.",
      visualPresentationSourceRevision: source.revision,
      waitingForOwnerApproval: true,
      renderAuthorizationRequired: true,
      providersUsed: [],
      paidServicesUsed: false,
      shotstackCreditsConsumed: 0,
      externallyPublished: false,
      externalPublishingDisabled: true,
      youtubePublishingDisabled: true,
    };
    const { data: corrected, error: insertError } = await client.from("beast_marketing_video_jobs").insert({
      id,
      owner_id: user.id,
      series_id: source.series_id,
      state: "scripted",
      revision: nextRevision,
      idempotency_key: idempotencyKey,
      topic: { ...sourceTopic, title: revisionLabel, candidateLabel: revisionLabel, activeCandidate: true, acceptanceTest: sourceProvenance.acceptanceTest },
      script: structuredClone(source.script),
      production: newProduction,
      quality: newQuality,
      provenance: newProvenance,
    }).select("*").single();
    if (insertError || !corrected) return unavailable();
    await client.from("beast_marketing_video_jobs").update({
      state: "failed",
      quality: { ...sourceQuality, ownerQualityReview: "needs_changes", ownerWorkflowDecision: "needs_changes", ownerQualityGrade: "B", technicalResult: "PASS", creativeResult: "REVISION REQUIRED", voiceReview: "ACCEPTED", pacingReview: "ACCEPTED", visualFramingReview: "NEEDS REVISION", motionTreatmentReview: "NEEDS REVISION", warnings: ["Superseded by the visual-presentation-only revision; retained for Owner review history."] },
      provenance: { ...sourceProvenance, activeCandidate: false, superseded: true, supersededByJobId: id, supersededByRevision: nextRevision, supersededReason: "Owner-requested visual framing and motion remediation; accepted creative elements retained." },
      updated_at: now,
      last_error: "Superseded by visual presentation revision.",
    }).eq("id", source.id).eq("owner_id", user.id);
    return NextResponse.json({ job: corrected, supersededJobId: source.id, shotstackCreditsConsumed: 0, externallyPublished: false, quality: qualityReport }, { status: 201 });
  }
  if (kind === "prepare_news_acceptance2") {
    if (request.headers.get("origin") !== new URL(request.url).origin) return forbidden();
    const key = "news-acceptance2-v1";
    const { data: existing, error: lookupError } = await client.from("beast_marketing_video_jobs").select("*").eq("owner_id", user.id).eq("idempotency_key", key).maybeSingle();
    if (lookupError) return unavailable();
    if (existing) return NextResponse.json({ job: existing, duplicatePrevented: true, shotstackCreditsConsumed: 0, externallyPublished: false });
    const { data: source } = await client.from("beast_marketing_video_jobs").select("id, series_id, state, topic, idempotency_key").eq("id", clean(body?.id, 80)).eq("owner_id", user.id).maybeSingle();
    if (!source || source.idempotency_key !== "direct-youtube-first-news-walkthrough-20260910" || source.state !== "ready") return NextResponse.json({ error: "The original completed News walkthrough is required before preparing Acceptance Test #2." }, { status: 409 });
    const { data: series } = await client.from("beast_marketing_video_series").select("settings").eq("id", source.series_id).eq("owner_id", user.id).maybeSingle();
    if (!series) return unavailable();
    const id = randomUUID();
    const normalizedSettings = settings(series.settings);
    const script = { hook: newsAcceptance2Script.hook, narration: [...newsAcceptance2Script.narration], cta: newsAcceptance2Script.cta, estimatedSeconds: newsAcceptance2Script.estimatedSeconds };
    let manifest;
    try { manifest = bindNewsAcceptance2Visuals(buildProductionManifest({ jobId: id, revision: 1, script, settings: normalizedSettings })); }
    catch { return NextResponse.json({ error: "The verified Acceptance Test #2 News candidate could not be built." }, { status: 409 }); }
    const validation = validateProductionManifest(manifest, normalizedSettings);
    if (!validation.planValid) return NextResponse.json({ error: "The Acceptance Test #2 production plan is invalid." }, { status: 409 });
    const qualityReport = evaluateProductionQuality(manifest, normalizedSettings);
    if (!qualityReport.ready || qualityReport.score < 90) return NextResponse.json({ error: "Acceptance Test #2 did not meet the publication-quality preflight threshold." }, { status: 409 });
    const generatedAt = new Date().toISOString();
    const { data, error } = await client.from("beast_marketing_video_jobs").insert({
      id, owner_id: user.id, series_id: source.series_id, state: "scripted", revision: 1, idempotency_key: key,
      topic: { ...record(source.topic), title: "SEANGWORLD News — Acceptance Test #2", candidateLabel: "Acceptance Test #2", activeCandidate: true, acceptanceTest: 2 },
      script,
      production: { manifest, validation, qualityReport, providerState: "authorization_required", externalActionPerformed: false, renderAuthorizationRequired: true, estimatedCredits: { renderCredits: 0.8, speechCredits: 0.7, estimatedTotal: 1.5, basis: "Acceptance Test #2 preflight estimate; no request submitted" }, shotstackCreditsConsumed: 0 },
      quality: { renderReady: false, scriptReady: true, productionPlanReady: true, ownerQualityReview: "not_ready", ownerWorkflowDecision: "pending", qualityScore: qualityReport.score, runtimeSeconds: qualityReport.metrics.runtimeSeconds, visualBeatCount: qualityReport.metrics.visualBeatCount, warnings: [...qualityReport.blockers, ...qualityReport.warnings] },
      provenance: { generatedBy: "BeastMarketing", generationMode: "acceptance_test", generatedAt, sourceJobId: source.id, sourceScriptHash: createHash("sha256").update(JSON.stringify(script)).digest("hex"), visualTemplate: "news-acceptance2-v1", acceptanceTest: 2, candidateLabel: "Acceptance Test #2", waitingForOwnerApproval: true, providersUsed: [], paidServicesUsed: false, shotstackCreditsConsumed: 0, externallyPublished: false, externalPublishingDisabled: true, youtubePublishingDisabled: true, manifestChecksum: manifest.checksum },
    }).select("*").single();
    if (error?.code === "23505") {
      const { data: retained } = await client.from("beast_marketing_video_jobs").select("*").eq("owner_id", user.id).eq("idempotency_key", key).maybeSingle();
      if (retained) return NextResponse.json({ job: retained, duplicatePrevented: true, shotstackCreditsConsumed: 0, externallyPublished: false });
    }
    return error || !data ? unavailable() : NextResponse.json({ job: data, shotstackCreditsConsumed: 0, externallyPublished: false }, { status: 201 });
  }
  if (kind === "prepare_news_visual_test") {
    if (request.headers.get("origin") !== new URL(request.url).origin) return forbidden();
    const key = "news-visual-test-v1";
    const { data: existing, error: lookupError } = await client.from("beast_marketing_video_jobs").select("*").eq("owner_id", user.id).eq("idempotency_key", key).maybeSingle();
    if (lookupError) return unavailable();
    if (existing) return NextResponse.json({ job: existing, duplicatePrevented: true, shotstackCreditsConsumed: 0 });
    const { data: source } = await client.from("beast_marketing_video_jobs").select("id, series_id, state, script, topic, idempotency_key").eq("id", clean(body?.id, 80)).eq("owner_id", user.id).maybeSingle();
    if (!source || source.idempotency_key !== "direct-youtube-first-news-walkthrough-20260910" || source.state !== "ready") return NextResponse.json({ error: "The original completed News walkthrough is required for this one-off visual test." }, { status: 409 });
    const { data: series } = await client.from("beast_marketing_video_series").select("settings").eq("id", source.series_id).eq("owner_id", user.id).maybeSingle();
    if (!series) return unavailable();
    const script = record(source.script);
    const normalizedScript = { hook: clean(script.hook, 1000), narration: Array.isArray(script.narration) ? script.narration.map((line) => clean(line, 1000)).filter(Boolean).slice(0, 8) : [], cta: clean(script.cta, 1000), estimatedSeconds: integer(script.estimatedSeconds, 1, 7200, 1) };
    const id = randomUUID();
    const normalizedSettings = settings(series.settings);
    let manifest;
    try { manifest = bindNewsTestVisuals(buildProductionManifest({ jobId: id, revision: 1, script: normalizedScript, settings: normalizedSettings })); }
    catch { return NextResponse.json({ error: "The script does not match the verified News visual test template." }, { status: 409 }); }
    const validation = validateProductionManifest(manifest, normalizedSettings);
    if (!validation.planValid) return NextResponse.json({ error: "The visual plan does not meet the series runtime or caption requirements." }, { status: 409 });
    const qualityReport = evaluateProductionQuality(manifest, normalizedSettings);
    const { data, error } = await client.from("beast_marketing_video_jobs").insert({
      id, owner_id: user.id, series_id: source.series_id, state: "scripted", revision: 1, idempotency_key: key,
      topic: { ...record(source.topic), title: "SEANGWORLD News — visual test" }, script: normalizedScript,
      production: { manifest, validation, qualityReport, providerState: "authorization_required", externalActionPerformed: false },
      quality: { renderReady: false, scriptReady: true, productionPlanReady: true, ownerQualityReview: "not_ready", ownerWorkflowDecision: "pending", warnings: ["Image-backed test prepared. Review the visual plan before rendering. Captions use estimated timing pending audio review.", ...qualityReport.blockers] },
      provenance: { generatedBy: "BeastMarketing", generationMode: "test", sourceJobId: source.id, sourceScriptHash: createHash("sha256").update(JSON.stringify(normalizedScript)).digest("hex"), visualTemplate: "news-visual-test-v1", waitingForOwnerApproval: false, providersUsed: [], paidServicesUsed: false, shotstackCreditsConsumed: 0, externallyPublished: false },
    }).select("*").single();
    if (error?.code === "23505") {
      const { data: retained } = await client.from("beast_marketing_video_jobs").select("*").eq("owner_id", user.id).eq("idempotency_key", key).maybeSingle();
      if (retained) return NextResponse.json({ job: retained, duplicatePrevented: true, shotstackCreditsConsumed: 0 });
    }
    return error || !data ? unavailable() : NextResponse.json({ job: data, shotstackCreditsConsumed: 0, externallyPublished: false }, { status: 201 });
  }
  if (kind === "plan_production") {
    const id = clean(body?.id, 80);
    const { data: job } = await client.from("beast_marketing_video_jobs").select("id, series_id, state, revision, script, provenance").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!job || job.state !== "scripted") return NextResponse.json({ error: "A grounded scripted queue item is required before production planning." }, { status: 409 });
    const { data: series } = await client.from("beast_marketing_video_series").select("settings").eq("id", job.series_id).eq("owner_id", user.id).maybeSingle();
    if (!series) return NextResponse.json({ error: "The series settings are unavailable." }, { status: 404 });
    const rawScript = job.script && typeof job.script === "object" ? job.script as Record<string, unknown> : {};
    const normalizedScript = { hook: clean(rawScript.hook, 1000), narration: Array.isArray(rawScript.narration) ? rawScript.narration.map((line) => clean(line, 1000)).filter(Boolean).slice(0, 8) : [], cta: clean(rawScript.cta, 1000), estimatedSeconds: integer(rawScript.estimatedSeconds, 1, 7200, 1) };
    if (!normalizedScript.hook || !normalizedScript.narration.length || !normalizedScript.cta) return NextResponse.json({ error: "The grounded script is incomplete and cannot be planned for production." }, { status: 409 });
    const normalizedSettings = settings(series.settings);
    let manifest = buildProductionManifest({ jobId: job.id, revision: integer(job.revision, 1, 1_000_000, 1), script: normalizedScript, settings: normalizedSettings });
    if (record(job.provenance).visualTemplate === "news-visual-test-v1") {
      try { manifest = bindNewsTestVisuals(manifest); }
      catch { return NextResponse.json({ error: "This visual test must retain its verified News walkthrough script." }, { status: 409 }); }
    }
    if (/^news-acceptance2-v\d+$/i.test(clean(record(job.provenance).visualTemplate, 80))) {
      try { manifest = bindNewsAcceptance2Visuals(manifest); }
      catch { return NextResponse.json({ error: "This Acceptance Test #2 revision must retain its verified News visual plan." }, { status: 409 }); }
    }
    const validation = validateProductionManifest(manifest, normalizedSettings);
    if (!validation.planValid) return NextResponse.json({ error: validation.errors.join(" ") }, { status: 409 });
    const qualityReport = evaluateProductionQuality(manifest, normalizedSettings);
    const priorProvenance = job.provenance && typeof job.provenance === "object" ? job.provenance as Record<string, unknown> : {};
    const { data, error } = await client.from("beast_marketing_video_jobs").update({ production: { manifest, validation, qualityReport, providerState: "authorization_required", externalActionPerformed: false }, provenance: { ...priorProvenance, productionPlan: { engine: "bmkt-010", manifestChecksum: manifest.checksum, providersUsed: [], paidServicesUsed: false } }, quality: { productionPlanReady: true, renderReady: false, warnings: [...manifest.blockers, ...qualityReport.blockers, ...qualityReport.warnings] }, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ job: data, manifest, validation });
  }
  if (kind === "search_opportunity_job") {
    const seriesId = clean(body?.seriesId, 80);
    const raw = body?.opportunity && typeof body.opportunity === "object" ? body.opportunity as Record<string, unknown> : {};
    const query = clean(raw.query, 240); const page = seangworldUrl(raw.page); const generatedAt = clean(body?.generatedAt, 40) || null;
    if (!seriesId || !query || !page) return NextResponse.json({ error: "A series and valid Search Console page/query opportunity are required." }, { status: 400 });
    const { data: ownedSeries } = await client.from("beast_marketing_video_series").select("id").eq("id", seriesId).eq("owner_id", user.id).maybeSingle();
    if (!ownedSeries) return NextResponse.json({ error: "The selected series is unavailable." }, { status: 404 });
    const current = raw.current && typeof raw.current === "object" ? raw.current as Record<string, unknown> : {};
    const normalized = {
      page, query,
      score: integer(raw.score, 0, 100, 0),
      disposition: clean(raw.disposition, 80), classification: clean(raw.classification, 80), recommendedAsset: clean(raw.recommendedAsset, 80),
      rationale: clean(raw.rationale, 1000), signals: list(raw.signals, 12),
      current: { clicks: integer(current.clicks, 0, 10_000_000, 0), impressions: integer(current.impressions, 0, 100_000_000, 0), ctr: decimal(current.ctr, 0, 1), position: decimal(current.position, 0, 1000) },
    };
    const idempotencyKey = `bmkt-004:gsc:${createHash("sha256").update(`${seriesId}|${page}|${query.toLowerCase()}`).digest("hex")}`;
    const { data: existing } = await client.from("beast_marketing_video_jobs").select("id").eq("owner_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return NextResponse.json({ error: "This Search Console opportunity is already in the selected series queue.", jobId: existing.id }, { status: 409 });
    const sourceEvidence: VideoEvidence[] = [{ source: "search_console", label: `Search Console page/query sample: ${query}`, url: page, observedAt: generatedAt, sampleSize: normalized.current.impressions, value: normalized.score, limitation: "Search Console query samples can be partial and do not prove trend, product fit, funnel value, or causality." }];
    const topic = { title: query, category: "search_intelligence", source: "search_console", confidence: null, evidenceStatus: "partial", selectable: false, evidence: sourceEvidence, searchOpportunity: normalized, rationale: ["Audience-interest evidence is available from Search Console.", "Beast capability match and funnel value must be verified before selection.", "Trend and prior YouTube performance remain unavailable."] };
    const { data, error } = await client.from("beast_marketing_video_jobs").insert({ owner_id: user.id, series_id: seriesId, state: "idea", idempotency_key: idempotencyKey, topic, provenance: { createdBy: "bmkt-004_search_intelligence", providersUsed: ["search_console"], evidence: sourceEvidence, evidenceStatus: "partial" } }).select("*").single();
    if (error?.code === "23505") return NextResponse.json({ error: "This Search Console opportunity is already in the selected series queue." }, { status: 409 });
    return error || !data ? unavailable() : NextResponse.json({ job: data }, { status: 201 });
  }
  if (kind === "evaluate_job") {
    const id = clean(body?.id, 80);
    const { data: job } = await client.from("beast_marketing_video_jobs").select("id, series_id, topic, state").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!job || !["idea", "modify"].includes(job.state)) return NextResponse.json({ error: "Only an owner-scoped idea can be evaluated." }, { status: 409 });
    const { data: series } = await client.from("beast_marketing_video_series").select("settings").eq("id", job.series_id).eq("owner_id", user.id).maybeSingle();
    if (!series) return NextResponse.json({ error: "The series settings are unavailable." }, { status: 404 });
    const storedTopic = job.topic as Record<string, unknown>;
    const normalizedEvidence = evidence(storedTopic.evidence);
    const searchOpportunity = storedTopic.searchOpportunity && typeof storedTopic.searchOpportunity === "object" ? storedTopic.searchOpportunity as Record<string, unknown> : null;
    const audienceInterest = normalizedEvidence.some((item) => ["search_console", "ga4", "first_party"].includes(item.source)) && searchOpportunity ? integer(searchOpportunity.score, 0, 100, 0) : null;
    const opportunity = scoreVideoOpportunity({ title: clean(storedTopic.title, 240), category: clean(body?.category, 100), capabilityMatch: integer(body?.capabilityMatch, 0, 100, 0), funnelValue: integer(body?.funnelValue, 0, 100, 0), historicalPerformance: null, audienceInterest, trendOpportunity: null, evidence: normalizedEvidence }, settings(series.settings));
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
    const script = buildGroundedScript({ topic, facts: facts(body?.facts), destinationLabel: clean(body?.destinationLabel, 120) || "SEANGWORLD", destinationUrl, settings: settings(series.settings) });
    const metadata = buildYouTubeMetadata({ topic, summary: clean(body?.summary, 2000), keywords: list(body?.keywords, 20), destinationUrl, campaignId: clean(body?.campaignId, 120) || `bmkt-${id}` });
    const ready = script.generationReady && metadata.warnings.length === 0;
    const { data, error } = await client.from("beast_marketing_video_jobs").update({ script, metadata, destination: { url: metadata.destinationUrl, campaign: metadata.campaign }, state: ready ? "scripted" : "selected", quality: { scriptReady: ready, warnings: [...script.warnings, ...metadata.warnings] }, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ job: data, ready });
  }
  if (kind === "series") {
    const name = clean(body?.name, 160);
    if (!name) return NextResponse.json({ error: "A series name is required." }, { status: 400 });
    const rawSettings = body?.settings && typeof body.settings === "object" ? body.settings as Record<string, unknown> : {};
    const topicValidation = [validateVideoTopicPhrases(rawSettings.allowedTopics), validateVideoTopicPhrases(rawSettings.excludedTopics)].find((result) => !result.valid);
    if (topicValidation?.error) return NextResponse.json({ error: topicValidation.error }, { status: 400 });
    const { data, error } = await client.from("beast_marketing_video_series").insert({ owner_id: user.id, name, description: clean(body?.description, 1000), enabled: false, settings: settings(body?.settings) }).select("*").single();
    return error || !data ? unavailable() : NextResponse.json({ series: data }, { status: 201 });
  }
  if (kind === "presenter") {
    const name = clean(body?.name, 160);
    if (!name) return NextResponse.json({ error: "A presenter profile name is required." }, { status: 400 });
    const { data, error } = await client.from("beast_marketing_presenter_profiles").insert({ owner_id: user.id, name, presenter_type: "faceless", presentation_rules: { style: clean(body?.style, 300) || "Faceless editorial narration" }, active: false, provenance: { origin: "owner_created_profile", likenessOrVoiceMediaUsed: false } }).select("*").single();
    return error || !data ? unavailable() : NextResponse.json({ presenter: data }, { status: 201 });
  }
  if (kind === "owner_generate") {
    const seriesId = clean(body?.seriesId, 80);
    const mode = body?.mode === "batch" ? "batch" : "test";
    const requestedCount = mode === "test" ? 1 : integer(body?.count, 1, 5, 0);
    const { data: ownedSeries } = await client.from("beast_marketing_video_series").select("id, name, enabled, settings").eq("id", seriesId).eq("owner_id", user.id).maybeSingle();
    if (!ownedSeries) return NextResponse.json({ error: "The selected series is unavailable." }, { status: 404 });
    const normalizedSettings = settings(ownedSeries.settings);
    const topicPolicy = validateTopicFamily(clean(body?.topicFamily, 240), normalizedSettings);
    if (!topicPolicy.valid) return NextResponse.json({ error: topicPolicy.error }, { status: 400 });
    const cadence = planCandidateCadence(normalizedSettings, requestedCount);
    if (!cadence.valid) return NextResponse.json({ error: cadence.error }, { status: 400 });
    const { data: controls } = await client.from("beast_marketing_video_controls").select("pause_all_publishing, external_publishing_authorized, automatic_publishing_authorized, youtube_authorized").eq("owner_id", user.id).maybeSingle();
    const generatedAt = new Date().toISOString();
    const rows = cadence.slots.map((plannedFor, index) => ({
      owner_id: user.id,
      series_id: seriesId,
      state: "idea" as const,
      idempotency_key: crypto.randomUUID(),
      topic: { title: topicPolicy.topicFamily, source: "beastmarketing_owner_workflow", confidence: null, topicFamily: topicPolicy.topicFamily },
      quality: { renderReady: false, ownerQualityReview: "not_ready", ownerWorkflowDecision: "pending", warnings: ["Candidate prepared from the series strategy. Grounded scripting and internal rendering remain gated."] },
      provenance: {
        createdBy: "beastmarketing_owner_workflow", generatedBy: "BeastMarketing", generationMode: mode, generatedAt,
        waitingForOwnerApproval: false, candidateIndex: index + 1, candidateCount: requestedCount, topicFamily: topicPolicy.topicFamily,
        cadencePlan: { plannedFor, minimumSpacingMinutes: normalizedSettings.minimumSpacingMinutes, maximumPerDay: normalizedSettings.maximumPerDay, maximumPerWeek: normalizedSettings.maximumPerWeek },
        generationSettings: { minimumRuntimeSeconds: normalizedSettings.minimumRuntimeSeconds, targetRuntimeSeconds: normalizedSettings.targetRuntimeSeconds, maximumRuntimeSeconds: normalizedSettings.maximumRuntimeSeconds, aspectRatio: normalizedSettings.aspectRatio, presenterProfileId: normalizedSettings.presenterProfileId, qualityThreshold: normalizedSettings.qualityThreshold, allowedTopics: normalizedSettings.allowedTopics, excludedTopics: normalizedSettings.excludedTopics, approvalMode: normalizedSettings.approvalMode, manualApprovalFirstN: normalizedSettings.manualApprovalFirstN },
        publishingInterlocks: { pauseAllPublishing: controls?.pause_all_publishing !== false, externalPublishingAuthorized: false, automaticPublishingAuthorized: false, youtubeAuthorized: false },
        providersUsed: [], paidServicesUsed: false, shotstackCreditsConsumed: 0, externallyPublished: false,
      },
    }));
    const { data, error } = await client.from("beast_marketing_video_jobs").insert(rows).select("*");
    return error || !data ? unavailable() : NextResponse.json({ jobs: data, mode, candidateCount: data.length, shotstackCreditsConsumed: 0, externallyPublished: false }, { status: 201 });
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
    const rawSettings = body?.settings && typeof body.settings === "object" ? body.settings as Record<string, unknown> : {};
    const topicValidation = [validateVideoTopicPhrases(rawSettings.allowedTopics), validateVideoTopicPhrases(rawSettings.excludedTopics)].find((result) => !result.valid);
    if (topicValidation?.error) return NextResponse.json({ error: topicValidation.error }, { status: 400 });
    const normalized = settings(body?.settings);
    const { data, error } = await client.from("beast_marketing_video_series").update({ name: clean(body?.name, 160), description: clean(body?.description, 1000), enabled: body?.enabled === true, settings: normalized, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ series: data });
  }
  if (kind === "job") {
    const next = clean(body?.state, 40) as VideoJobState;
    if (!videoJobStates.includes(next)) return NextResponse.json({ error: "A valid queue state is required." }, { status: 400 });
    const { data: current } = await client.from("beast_marketing_video_jobs").select("state").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!current || !allowedVideoTransitions[current.state as VideoJobState]?.includes(next)) return NextResponse.json({ error: "That queue transition is not allowed." }, { status: 409 });
    if (next === "generating") return NextResponse.json({ error: "An authorized production provider and renderer are required before generation can start." }, { status: 409 });
    if (["scheduled", "published"].includes(next)) return NextResponse.json({ error: "YouTube authorization and external publishing authority are required before scheduling or publishing." }, { status: 409 });
    const { data, error } = await client.from("beast_marketing_video_jobs").update({ state: next, updated_at: new Date().toISOString(), last_error: null }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ job: data });
  }
  if (kind === "owner_review") {
    const decision = clean(body?.decision, 40) as OwnerWorkflowDecision;
    if (!["pending", "held", "approved", "rejected", "needs_changes"].includes(decision)) return NextResponse.json({ error: "A valid owner review decision is required." }, { status: 400 });
    const { data: current } = await client.from("beast_marketing_video_jobs").select("state, quality, provenance").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!current) return NextResponse.json({ error: "The selected video candidate is unavailable." }, { status: 404 });
    const currentState = current.state as VideoJobState;
    const currentQuality = record(current.quality);
    if (decision === "approved" && (currentState !== "ready" || currentQuality.renderReady !== true)) return NextResponse.json({ error: "Only a finished internal render can be approved." }, { status: 409 });
    if (decision === "rejected" && !allowedVideoTransitions[currentState]?.includes("skipped")) return NextResponse.json({ error: "This candidate cannot be rejected from its current preparation state." }, { status: 409 });
    if (decision === "needs_changes" && !allowedVideoTransitions[currentState]?.includes("modify")) return NextResponse.json({ error: "A finished candidate is required before requesting changes." }, { status: 409 });
    if (decision === "held" && ["published", "measuring", "completed", "scale", "stop", "skipped"].includes(currentState)) return NextResponse.json({ error: "This candidate is no longer active and cannot be held." }, { status: 409 });
    if (decision === "pending" && currentState !== "ready" && !(currentQuality.ownerWorkflowDecision === "held" && ["idea", "selected", "scripted", "generating"].includes(currentState))) return NextResponse.json({ error: "Only a finished candidate can return to Needs Review." }, { status: 409 });
    const reviewedAt = new Date().toISOString();
    const nextState = decision === "rejected" ? "skipped" : decision === "needs_changes" ? "modify" : currentState;
    const reviewFields = {
      ...(clean(body?.grade, 10) ? { ownerQualityGrade: clean(body?.grade, 10) } : {}),
      ...(clean(body?.technicalResult, 40) ? { technicalResult: clean(body?.technicalResult, 40) } : {}),
      ...(clean(body?.creativeResult, 80) ? { creativeResult: clean(body?.creativeResult, 80) } : {}),
      ...(clean(body?.voiceReview, 40) ? { voiceReview: clean(body?.voiceReview, 40) } : {}),
      ...(clean(body?.pacingReview, 40) ? { pacingReview: clean(body?.pacingReview, 40) } : {}),
      ...(clean(body?.visualFramingReview, 80) ? { visualFramingReview: clean(body?.visualFramingReview, 80) } : {}),
      ...(clean(body?.motionTreatmentReview, 80) ? { motionTreatmentReview: clean(body?.motionTreatmentReview, 80) } : {}),
    };
    const { data, error } = await client.from("beast_marketing_video_jobs").update({
      state: nextState,
      quality: { ...currentQuality, ...reviewFields, ownerQualityReview: decision, ownerWorkflowDecision: decision, ownerApprovalSource: decision === "approved" ? "manual" : currentQuality.ownerApprovalSource, ownerReviewedAt: reviewedAt },
      provenance: { ...record(current.provenance), waitingForOwnerApproval: currentQuality.renderReady === true && ["pending", "held"].includes(decision), ownerDecision: decision, ownerReviewedAt: reviewedAt, youtubePublished: false },
      updated_at: reviewedAt,
      last_error: null,
    }).eq("id", id).eq("owner_id", user.id).select("*").maybeSingle();
    return error || !data ? unavailable() : NextResponse.json({ job: data, externallyPublished: false, schedulingAuthorized: false });
  }
  return NextResponse.json({ error: "A valid video update is required." }, { status: 400 });
}
