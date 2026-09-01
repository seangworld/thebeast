import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { ProductionManifest } from "@/lib/beastMarketingProduction";
import {
  SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER,
  SHOTSTACK_PROVIDER_ID,
  ShotstackProviderError,
  buildShotstackEdit,
  estimateShotstackCredits,
  inspectShotstackRender,
  shotstackConfiguration,
  submitShotstackRender,
} from "@/lib/beastMarketingShotstack";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const safeError = "The internal Shotstack render could not be completed.";
const clean = (value: unknown, maximum = 500) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};

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

  const { data: job } = await client.from("beast_marketing_video_jobs").select("id, owner_id, state, revision, production, provenance, quality").eq("id", jobId).eq("owner_id", user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "The owner-scoped video job is unavailable." }, { status: 404 });
  const production = record(job.production);
  const manifest = production.manifest;
  if (!validManifest(manifest) || manifest.jobId !== job.id || manifest.revision !== job.revision) return NextResponse.json({ error: "A valid exact-revision BMKT production manifest is required before rendering." }, { status: 409 });

  if (action === "submit") {
    if (job.state !== "scripted") return NextResponse.json({ error: "Only a scripted queue item can start an internal render." }, { status: 409 });
    const estimate = estimateShotstackCredits(manifest, configuration.environment);
    if (estimate.estimatedTotal > SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER) {
      return NextResponse.json({ error: `The estimated ${estimate.estimatedTotal.toFixed(1)} credits exceed the ${SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER.toFixed(1)}-credit internal-render cap.` }, { status: 409 });
    }
    const idempotencyKey = `bmkt-shotstack:${job.id}:${job.revision}:${manifest.checksum}:1`;
    const { data: existing } = await client.from("beast_marketing_video_attempts").select("*").eq("owner_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return NextResponse.json({ attempt: existing, estimate, duplicatePrevented: true });
    const now = new Date().toISOString();
    const { data: attempt, error: insertError } = await client.from("beast_marketing_video_attempts").insert({
      owner_id: user.id, job_id: job.id, attempt_number: 1, operation: "composition", provider_id: SHOTSTACK_PROVIDER_ID,
      idempotency_key: idempotencyKey, status: "planned", retryable: false,
      evidence: { environment: configuration.environment, manifestChecksum: manifest.checksum, estimate, automaticRetry: false, youtubeDestination: false },
      started_at: now, updated_at: now,
    }).select("*").single();
    if (insertError || !attempt) return NextResponse.json({ error: safeError }, { status: 503 });
    try {
      const submitted = await submitShotstackRender({ apiKey: configuration.apiKey, environment: configuration.environment, edit: buildShotstackEdit(manifest) });
      await client.from("beast_marketing_video_attempts").update({ status: "submitted", provider_request_id: submitted.providerRequestId, retryable: true, updated_at: new Date().toISOString() }).eq("id", attempt.id).eq("owner_id", user.id);
      await client.from("beast_marketing_video_jobs").update({
        state: "generating",
        production: { ...production, providerState: "submitted", providerId: SHOTSTACK_PROVIDER_ID, providerEnvironment: configuration.environment, attemptId: attempt.id, externalActionPerformed: true, estimatedCredits: estimate },
        provenance: { ...record(job.provenance), productionProvider: { id: SHOTSTACK_PROVIDER_ID, environment: configuration.environment, editApi: true, serveApi: true, youtubeDestination: false } },
        quality: { ...record(job.quality), renderReady: false, internalRenderStatus: "submitted", warnings: ["Internal Shotstack render is awaiting media and quality validation."] },
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
    if (job.state !== "ready") await client.from("beast_marketing_video_jobs").update({ state: "ready", last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id).eq("owner_id", user.id);
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
      provenance: { provider: SHOTSTACK_PROVIDER_ID, environment: configuration.environment, renderId: attempt.provider_request_id, serveAssetId: inspection.asset.id, manifestChecksum: manifest.checksum, internalOnly: true, youtubePublished: false },
    }).select("*").single();
    if (assetError || !asset) throw new ShotstackProviderError("provider", false);
    const completed = new Date().toISOString();
    await client.from("beast_marketing_video_attempts").update({ status: "succeeded", retryable: false, completed_at: completed, evidence: { ...record(attempt.evidence), providerStatus: "ready", assetId: asset.id }, updated_at: completed }).eq("id", attempt.id).eq("owner_id", user.id);
    await client.from("beast_marketing_video_jobs").update({
      state: "ready", production: { ...production, providerState: "rendered_internal", providerId: SHOTSTACK_PROVIDER_ID, assetId: asset.id, externalActionPerformed: true },
      quality: { ...record(job.quality), renderReady: true, mediaIntegrity: true, provenanceComplete: true, internalRenderStatus: "ready", ownerQualityReview: "pending", warnings: ["Internal render complete. External publishing remains disabled; owner quality review is still required."] },
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
