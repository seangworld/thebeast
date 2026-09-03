import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { ProductionManifest } from "@/lib/beastMarketingProduction";
import { evaluateSeriesAutoApproval } from "@/lib/beastMarketingOwnerWorkflow";
import { defaultVideoSeriesSettings, type VideoSeriesSettings } from "@/lib/beastMarketingVideo";
import {
  SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER,
  SHOTSTACK_PROVIDER_ID,
  ShotstackProviderError,
  buildShotstackEdit,
  estimateShotstackCredits,
  inspectShotstackRender,
  nextShotstackManualAttempt,
  shotstackConfiguration,
  shotstackVisualAssetBaseUrl,
  shotstackWatermarkPolicy,
  submitShotstackRender,
} from "@/lib/beastMarketingShotstack";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const safeError = "The internal Shotstack render could not be completed.";
const clean = (value: unknown, maximum = 500) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const boundedInteger = (value: unknown, minimum: number, maximum: number, fallback: number) => {
  const parsed = Number(value); return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
};

function renderSettings(value: unknown): VideoSeriesSettings {
  const stored = record(value);
  return {
    ...defaultVideoSeriesSettings,
    ...stored,
    approvalMode: stored.approvalMode === "automatic" ? "automatic" : "owner_approval",
    manualApprovalFirstN: boundedInteger(stored.manualApprovalFirstN, 0, 100, defaultVideoSeriesSettings.manualApprovalFirstN),
    minimumRuntimeSeconds: boundedInteger(stored.minimumRuntimeSeconds, 15, 3600, defaultVideoSeriesSettings.minimumRuntimeSeconds),
    maximumRuntimeSeconds: boundedInteger(stored.maximumRuntimeSeconds, 15, 7200, defaultVideoSeriesSettings.maximumRuntimeSeconds),
    qualityThreshold: boundedInteger(stored.qualityThreshold, 1, 100, defaultVideoSeriesSettings.qualityThreshold),
    allowedTopics: Array.isArray(stored.allowedTopics) ? stored.allowedTopics.filter((item): item is string => typeof item === "string") : [],
    excludedTopics: Array.isArray(stored.excludedTopics) ? stored.excludedTopics.filter((item): item is string => typeof item === "string") : [],
  } as VideoSeriesSettings;
}

async function owner() {
  const client = createRouteClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { client, user: null };
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { client, user: profile?.role === "admin" ? user : null };
}

function validManifest(value: unknown): value is ProductionManifest {
  const manifest = record(value);
  return manifest.schemaVersion === "bmkt-production-1" && clean(manifest.jobId, 100).length > 0 && Number.isInteger(manifest.revision)
    && Array.isArray(manifest.scenes) && manifest.scenes.length > 0 && clean(manifest.checksum, 100).length > 0
    && ["9:16", "16:9", "1:1"].includes(String(manifest.aspectRatio)) && Number.isInteger(manifest.width) && Number.isInteger(manifest.height)
    && Number.isInteger(manifest.runtimeMs) && Number(manifest.runtimeMs) > 0;
}

function providerFailure(error: unknown) {
  const failure = error instanceof ShotstackProviderError ? error : new ShotstackProviderError("provider", false);
  return { category: failure.category, retryable: failure.retryable };
}

export async function POST(request: Request) {
  const { client, user } = await owner();
  if (!user) return NextResponse.json({ error: "BeastMarketing owner access required." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = clean(body?.action, 40);
  const jobId = clean(body?.jobId, 80);
  if (!jobId || !["submit", "inspect"].includes(action)) return NextResponse.json({ error: "A valid internal-render operation is required." }, { status: 400 });

  const configuration = shotstackConfiguration();
  if (!configuration.configured) return NextResponse.json({ error: "Shotstack is not configured for this environment." }, { status: 503 });

  const { data: job } = await client.from("beast_marketing_video_jobs").select("id, owner_id, series_id, state, revision, production, provenance, quality").eq("id", jobId).eq("owner_id", user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "The owner-scoped video job is unavailable." }, { status: 404 });
  const production = record(job.production);
  const manifest = production.manifest;
  if (!validManifest(manifest) || manifest.jobId !== job.id || manifest.revision !== job.revision) return NextResponse.json({ error: "A valid exact-revision BMKT production manifest is required before rendering." }, { status: 409 });

  if (action === "submit") {
    const quality = record(job.quality);
    const qualityRemediation = job.state === "ready" && quality.ownerQualityReview === "pending" && quality.remediationRenderUsed !== true;
    const pronunciationValidation = job.state === "ready" && quality.ownerQualityReview === "pending" && quality.remediationRenderUsed === true && quality.narrationNormalizationRenderUsed !== true;
    const controlTokenRemediation = job.state === "ready" && quality.ownerQualityReview === "pending" && quality.narrationNormalizationRenderUsed === true && quality.controlTokenRemediationRenderUsed !== true;
    const spokenControlTokenRemediation = job.state === "ready" && quality.ownerQualityReview === "pending" && quality.controlTokenRemediationRenderUsed === true && quality.spokenControlTokenRemediationRenderUsed !== true;
    if (job.state !== "scripted" && !qualityRemediation && !pronunciationValidation && !controlTokenRemediation && !spokenControlTokenRemediation) return NextResponse.json({ error: "Only a scripted queue item or its bounded pending quality validation can start an internal render." }, { status: 409 });
    const estimate = estimateShotstackCredits(manifest, configuration.environment);
    if (estimate.estimatedTotal > SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER) {
      return NextResponse.json({ error: `The estimated ${estimate.estimatedTotal.toFixed(1)} credits exceed the ${SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER.toFixed(1)}-credit internal-render cap.` }, { status: 409 });
    }
    const { data: latest, error: latestError } = await client.from("beast_marketing_video_attempts").select("*").eq("owner_id", user.id).eq("job_id", job.id).eq("provider_id", SHOTSTACK_PROVIDER_ID).order("attempt_number", { ascending: false }).limit(1).maybeSingle();
    if (latestError) return NextResponse.json({ error: safeError }, { status: 503 });
    const attemptNumber = nextShotstackManualAttempt(latest ? {
      attemptNumber: Number(latest.attempt_number), status: clean(latest.status, 40),
      errorCategory: clean(latest.error_category, 40) || null,
      providerRequestId: clean(latest.provider_request_id, 100) || null,
    } : null);
    if (!attemptNumber) return NextResponse.json({ error: "No additional internal Shotstack attempt is authorized for this exact job revision." }, { status: 409 });
    const idempotencyKey = `bmkt-shotstack:${job.id}:${job.revision}:${manifest.checksum}:${attemptNumber}`;
    const { data: existing } = await client.from("beast_marketing_video_attempts").select("*").eq("owner_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return NextResponse.json({ attempt: existing, estimate, duplicatePrevented: true });
    const now = new Date().toISOString();
    const { data: attempt, error: insertError } = await client.from("beast_marketing_video_attempts").insert({
      owner_id: user.id, job_id: job.id, attempt_number: attemptNumber, operation: "composition", provider_id: SHOTSTACK_PROVIDER_ID,
      idempotency_key: idempotencyKey, status: "planned", retryable: false,
      evidence: { environment: configuration.environment, manifestChecksum: manifest.checksum, estimate, automaticRetry: false, youtubeDestination: false, manualCredentialRemediation: attemptNumber === 2, manualSchemaRemediation: [3, 4].includes(attemptNumber), qualityRemediation: attemptNumber === 5, narrationNormalization: attemptNumber === 6, controlTokenRemediation: attemptNumber === 7, spokenControlTokenRemediation: attemptNumber === 8, ...shotstackWatermarkPolicy(configuration.environment), previousAttemptId: latest?.id || null },
      started_at: now, updated_at: now,
    }).select("*").single();
    if (insertError || !attempt) return NextResponse.json({ error: safeError }, { status: 503 });
    try {
      const submitted = await submitShotstackRender({ apiKey: configuration.apiKey, environment: configuration.environment, edit: buildShotstackEdit(manifest, { visualAssetBaseUrl: shotstackVisualAssetBaseUrl() }) });
      await client.from("beast_marketing_video_attempts").update({ status: "submitted", provider_request_id: submitted.providerRequestId, retryable: true, updated_at: new Date().toISOString() }).eq("id", attempt.id).eq("owner_id", user.id);
      await client.from("beast_marketing_video_jobs").update({
        state: "generating",
        production: { ...production, providerState: "submitted", providerId: SHOTSTACK_PROVIDER_ID, providerEnvironment: configuration.environment, attemptId: attempt.id, externalActionPerformed: true, estimatedCredits: estimate },
        provenance: { ...record(job.provenance), productionProvider: { id: SHOTSTACK_PROVIDER_ID, environment: configuration.environment, editApi: true, serveApi: true, youtubeDestination: false, ...shotstackWatermarkPolicy(configuration.environment) } },
        quality: { ...quality, renderReady: false, internalRenderStatus: "submitted", remediationRenderUsed: qualityRemediation || quality.remediationRenderUsed === true, narrationNormalizationRenderUsed: pronunciationValidation || quality.narrationNormalizationRenderUsed === true, controlTokenRemediationRenderUsed: controlTokenRemediation || quality.controlTokenRemediationRenderUsed === true, spokenControlTokenRemediationRenderUsed: spokenControlTokenRemediation || quality.spokenControlTokenRemediationRenderUsed === true, warnings: ["Internal Shotstack render is awaiting media and quality validation."] },
        last_error: null, updated_at: new Date().toISOString(),
      }).eq("id", job.id).eq("owner_id", user.id);
      return NextResponse.json({ attempt: { ...attempt, status: "submitted", provider_request_id: submitted.providerRequestId }, estimate, duplicatePrevented: false }, { status: 202 });
    } catch (error) {
      const failure = providerFailure(error);
      await client.from("beast_marketing_video_attempts").update({ status: "failed", retryable: failure.retryable, error_category: failure.category, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", attempt.id).eq("owner_id", user.id);
      return NextResponse.json({ error: safeError, category: failure.category, retryable: failure.retryable }, { status: failure.category === "authentication" ? 502 : 503 });
    }
  }

  const { data: attempt } = await client.from("beast_marketing_video_attempts").select("*").eq("owner_id", user.id).eq("job_id", job.id).eq("provider_id", SHOTSTACK_PROVIDER_ID).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!attempt?.provider_request_id) return NextResponse.json({ error: "No submitted Shotstack render exists for this job." }, { status: 409 });
  const { data: existingAsset } = await client.from("beast_marketing_video_assets").select("*").eq("owner_id", user.id).eq("attempt_id", attempt.id).eq("role", "final_video").maybeSingle();
  if (existingAsset) {
    if (job.state === "generating") await client.from("beast_marketing_video_jobs").update({ state: "ready", last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id).eq("owner_id", user.id);
    const { data: signed } = await client.storage.from("beast-marketing-media").createSignedUrl(existingAsset.storage_path, 3600);
    return NextResponse.json({ status: "succeeded", attempt, asset: existingAsset, signedUrl: signed?.signedUrl || null });
  }
  try {
    const inspection = await inspectShotstackRender({ apiKey: configuration.apiKey, environment: configuration.environment, providerRequestId: attempt.provider_request_id });
    if (inspection.status === "submitted") {
      await client.from("beast_marketing_video_attempts").update({ evidence: { ...record(attempt.evidence), providerStatus: inspection.providerStatus }, updated_at: new Date().toISOString() }).eq("id", attempt.id).eq("owner_id", user.id);
      return NextResponse.json({ status: "submitted", providerStatus: inspection.providerStatus }, { status: 202 });
    }
    if (inspection.status === "failed" || !inspection.asset) {
      await client.from("beast_marketing_video_attempts").update({ status: "failed", retryable: inspection.retryable, error_category: "provider", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", attempt.id).eq("owner_id", user.id);
      await client.from("beast_marketing_video_jobs").update({ state: "failed", last_error: safeError, updated_at: new Date().toISOString() }).eq("id", job.id).eq("owner_id", user.id);
      return NextResponse.json({ error: safeError, retryable: inspection.retryable }, { status: 502 });
    }

    const mediaResponse = await fetch(inspection.asset.url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!mediaResponse.ok) throw new ShotstackProviderError("provider", true);
    const media = Buffer.from(await mediaResponse.arrayBuffer());
    if (!media.length || media.length > 50_000_000) throw new ShotstackProviderError("validation", false);
    const contentHash = `sha256:${createHash("sha256").update(media).digest("hex")}`;
    const storagePath = `${user.id}/${job.id}/${attempt.id}/final.mp4`;
    const { error: uploadError } = await client.storage.from("beast-marketing-media").upload(storagePath, media, { contentType: "video/mp4", upsert: false });
    if (uploadError) throw new ShotstackProviderError("provider", false);
    const { data: asset, error: assetError } = await client.from("beast_marketing_video_assets").insert({
      owner_id: user.id, job_id: job.id, attempt_id: attempt.id, role: "final_video", storage_path: storagePath, mime_type: "video/mp4",
      source_type: "generated", provider_id: SHOTSTACK_PROVIDER_ID, provider_asset_id: inspection.asset.id, license_reference: "Shotstack account-generated internal render",
      content_hash: contentHash, size_bytes: media.length, duration_ms: manifest.runtimeMs, status: "available",
      provenance: { provider: SHOTSTACK_PROVIDER_ID, environment: configuration.environment, renderId: attempt.provider_request_id, serveAssetId: inspection.asset.id, manifestChecksum: manifest.checksum, internalOnly: true, youtubePublished: false, ...shotstackWatermarkPolicy(configuration.environment) },
    }).select("*").single();
    if (assetError || !asset) throw new ShotstackProviderError("provider", false);
    const completed = new Date().toISOString();
    await client.from("beast_marketing_video_attempts").update({ status: "succeeded", retryable: false, completed_at: completed, evidence: { ...record(attempt.evidence), providerStatus: "ready", assetId: asset.id }, updated_at: completed }).eq("id", attempt.id).eq("owner_id", user.id);
    const [seriesResult, controlsResult, historyResult] = await Promise.all([
      client.from("beast_marketing_video_series").select("enabled, settings").eq("id", job.series_id).eq("owner_id", user.id).maybeSingle(),
      client.from("beast_marketing_video_controls").select("pause_all_publishing, external_publishing_authorized, automatic_publishing_authorized, youtube_authorized").eq("owner_id", user.id).maybeSingle(),
      client.from("beast_marketing_video_jobs").select("id, quality").eq("owner_id", user.id).eq("series_id", job.series_id),
    ]);
    const normalizedSettings = renderSettings(seriesResult.data?.settings);
    const existingQuality = record(job.quality);
    const manuallyApprovedCount = (historyResult.data || []).filter((candidate) => candidate.id !== job.id && record(candidate.quality).ownerApprovalSource === "manual" && record(candidate.quality).ownerWorkflowDecision === "approved").length;
    const watermark = shotstackWatermarkPolicy(configuration.environment);
    const autoApproval = evaluateSeriesAutoApproval({
      settings: normalizedSettings,
      seriesEnabled: seriesResult.data?.enabled === true,
      manuallyApprovedCount,
      controls: {
        pauseAllPublishing: controlsResult.data?.pause_all_publishing !== false,
        externalPublishingAuthorized: controlsResult.data?.external_publishing_authorized === true,
        automaticPublishingAuthorized: controlsResult.data?.automatic_publishing_authorized === true,
        youtubeAuthorized: controlsResult.data?.youtube_authorized === true,
      },
      evidence: {
        factualClaimsVerified: existingQuality.factualClaimsVerified as boolean | undefined,
        productTruthVerified: existingQuality.productTruthVerified as boolean | undefined,
        misleadingClaimsAbsent: existingQuality.misleadingClaimsAbsent as boolean | undefined,
        safeContent: existingQuality.safeContent as boolean | undefined,
        provenanceComplete: true,
        destinationValid: existingQuality.destinationValid as boolean | undefined,
        duplicateRisk: existingQuality.duplicateRisk as number | undefined,
        mediaIntegrity: true,
        metadataQuality: existingQuality.metadataQuality as number | undefined,
        attributionValid: existingQuality.attributionValid as boolean | undefined,
        runtimeSeconds: manifest.runtimeMs / 1000,
        publicationEligibleMedia: watermark.publicationWatermarkEligible,
      },
    });
    const automaticMode = normalizedSettings.approvalMode === "automatic";
    const ownerWorkflowDecision = autoApproval.approved ? "approved" : automaticMode && autoApproval.fallback === "needs_changes" ? "needs_changes" : "pending";
    const nextState = autoApproval.approved ? "scheduled" : ownerWorkflowDecision === "needs_changes" ? "modify" : "ready";
    const baseWarning = configuration.environment === "stage" ? "Sandbox watermark is test-only. This asset is not publication-eligible; external publishing remains disabled and owner quality review is required." : "Internal render complete. External publishing remains disabled; owner quality review is still required.";
    await client.from("beast_marketing_video_jobs").update({
      state: nextState, production: { ...production, providerState: "rendered_internal", providerId: SHOTSTACK_PROVIDER_ID, assetId: asset.id, externalActionPerformed: true },
      quality: { ...existingQuality, renderReady: true, mediaIntegrity: true, provenanceComplete: true, publicationEligibleMedia: watermark.publicationWatermarkEligible, runtimeSeconds: manifest.runtimeMs / 1000, internalRenderStatus: "ready", ownerQualityReview: ownerWorkflowDecision, ownerWorkflowDecision, ownerApprovalSource: autoApproval.approved ? "automatic" : existingQuality.ownerApprovalSource, autoApprovalEvaluated: automaticMode, autoApprovalBlockers: automaticMode ? autoApproval.blockers : [], warnings: [baseWarning] },
      provenance: { ...record(job.provenance), waitingForOwnerApproval: !autoApproval.approved, autoApproval: { evaluatedAt: completed, approved: autoApproval.approved, fallback: autoApproval.fallback, blockers: autoApproval.blockers, manuallyApprovedCount, requiredManualApprovals: normalizedSettings.manualApprovalFirstN, youtubePublished: false } },
      last_error: null, updated_at: completed,
    }).eq("id", job.id).eq("owner_id", user.id);
    const { data: signed } = await client.storage.from("beast-marketing-media").createSignedUrl(storagePath, 3600);
    return NextResponse.json({ status: "succeeded", attempt: { ...attempt, status: "succeeded" }, asset, signedUrl: signed?.signedUrl || null });
  } catch (error) {
    const failure = providerFailure(error);
    await client.from("beast_marketing_video_attempts").update({ retryable: failure.retryable, error_category: failure.category, evidence: { ...record(attempt.evidence), providerStatus: "inspection_error" }, updated_at: new Date().toISOString() }).eq("id", attempt.id).eq("owner_id", user.id);
    return NextResponse.json({ error: safeError, category: failure.category, retryable: failure.retryable }, { status: 503 });
  }
}
