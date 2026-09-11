import { NextResponse } from "next/server";
import type { ProductionManifest } from "@/lib/beastMarketingProduction";
import {
  SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER,
  SHOTSTACK_PROVIDER_ID,
  ShotstackProviderError,
  buildShotstackEdit,
  estimateShotstackCredits,
  shotstackConfiguration,
  shotstackWatermarkPolicy,
  submitShotstackRender,
} from "@/lib/beastMarketingShotstack";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const clean = (value: unknown, maximum = 1000) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function owner() {
  const client = createRouteClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { client, user: null };
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { client, user: profile?.role === "admin" ? user : null };
}

function validManifest(value: unknown): value is ProductionManifest {
  const manifest = record(value);
  return manifest.schemaVersion === "bmkt-production-1"
    && clean(manifest.jobId, 100).length > 0
    && Number.isInteger(manifest.revision)
    && Array.isArray(manifest.scenes)
    && manifest.scenes.length > 0
    && clean(manifest.checksum, 100).length > 0;
}

function creditFailure(attempt: Record<string, unknown> | null) {
  if (!attempt || attempt.status !== "failed" || Number(attempt.attempt_number) !== 1 || !clean(attempt.provider_request_id, 120)) return false;
  const evidence = record(attempt.evidence);
  const runtime = record(evidence.runtimeDiagnostics);
  const message = clean(runtime.providerError || evidence.providerErrorMessage, 1200).toLowerCase();
  return message.includes("credits required") && message.includes("credits left") && message.includes("plan limit");
}

function providerFailure(error: unknown) {
  const failure = error instanceof ShotstackProviderError ? error : new ShotstackProviderError("provider", false);
  return {
    category: failure.category,
    retryable: failure.retryable,
    httpStatus: failure.httpStatus,
    providerCode: failure.providerCode,
    providerMessage: failure.providerMessage,
    providerRequestId: failure.providerRequestId,
    providerValidationPath: failure.providerValidationPath,
    sanitizedResponseBody: failure.sanitizedResponseBody,
    occurredAt: failure.occurredAt,
  };
}

export async function GET(request: Request) {
  const { client, user } = await owner();
  if (!user) return NextResponse.json({ error: "BeastMarketing owner access required." }, { status: 403 });

  const url = new URL(request.url);
  const jobId = clean(url.searchParams.get("jobId"), 80);
  const confirmed = url.searchParams.get("confirm") === "1";
  if (!jobId) return NextResponse.json({ error: "A video job id is required." }, { status: 400 });

  const { data: job } = await client.from("beast_marketing_video_jobs").select("*").eq("id", jobId).eq("owner_id", user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "The owner-scoped video job is unavailable." }, { status: 404 });

  const provenance = record(job.provenance);
  const production = record(job.production);
  const quality = record(job.quality);
  const manifest = production.manifest;
  if (job.revision !== 5 || provenance.acceptanceTest !== 2 || provenance.visualPresentationRevision !== true || provenance.activeCandidate === false || provenance.superseded === true) {
    return NextResponse.json({ error: "This retry is restricted to the active Acceptance Test #2 Revision 5 candidate." }, { status: 409 });
  }
  if (provenance.externalPublishingDisabled !== true || provenance.youtubePublishingDisabled !== true) {
    return NextResponse.json({ error: "External and YouTube publishing locks are required." }, { status: 409 });
  }
  if (!validManifest(manifest) || manifest.jobId !== job.id || manifest.revision !== job.revision) {
    return NextResponse.json({ error: "The exact Revision 5 production manifest is unavailable." }, { status: 409 });
  }

  const { data: attempts } = await client.from("beast_marketing_video_attempts").select("*").eq("owner_id", user.id).eq("job_id", job.id).eq("provider_id", SHOTSTACK_PROVIDER_ID).order("attempt_number", { ascending: true });
  const history = (attempts || []) as Record<string, unknown>[];
  const first = history.find((attempt) => Number(attempt.attempt_number) === 1) || null;
  const second = history.find((attempt) => Number(attempt.attempt_number) === 2) || null;
  if (!creditFailure(first)) return NextResponse.json({ error: "The retained first attempt is not an eligible insufficient-credit runtime failure." }, { status: 409 });
  if (second) return NextResponse.json({ error: "The one permitted post-credit retry already exists.", attempt: second }, { status: 409 });

  const configuration = shotstackConfiguration();
  if (!configuration.configured) return NextResponse.json({ error: "Shotstack is not configured for this environment." }, { status: 503 });
  const estimate = estimateShotstackCredits(manifest, configuration.environment);
  if (estimate.estimatedTotal > SHOTSTACK_MAX_ESTIMATED_CREDITS_PER_RENDER) {
    return NextResponse.json({ error: "The exact Revision 5 retry exceeds the internal render credit cap.", estimate }, { status: 409 });
  }

  let edit: ReturnType<typeof buildShotstackEdit>;
  try { edit = buildShotstackEdit(manifest); }
  catch { return NextResponse.json({ error: "The exact Revision 5 provider payload no longer passes local validation." }, { status: 409 }); }

  if (!confirmed) {
    return NextResponse.json({
      ready: true,
      action: "Owner confirmation required",
      jobId: job.id,
      revision: job.revision,
      manifestChecksum: manifest.checksum,
      estimate,
      priorFailure: record(record(first?.evidence).runtimeDiagnostics).providerError || null,
      automaticRetry: false,
      externalPublishingDisabled: true,
      youtubePublishingDisabled: true,
      confirmUrl: `${url.origin}${url.pathname}?jobId=${encodeURIComponent(job.id)}&confirm=1`,
    }, { headers: { "cache-control": "private, no-store" } });
  }

  const idempotencyKey = `bmkt-shotstack-credit-retry:${job.id}:${job.revision}:${manifest.checksum}:2`;
  const now = new Date().toISOString();
  const { data: attempt, error: insertError } = await client.from("beast_marketing_video_attempts").insert({
    owner_id: user.id,
    job_id: job.id,
    attempt_number: 2,
    operation: "composition",
    provider_id: SHOTSTACK_PROVIDER_ID,
    idempotency_key: idempotencyKey,
    status: "planned",
    retryable: false,
    evidence: {
      environment: configuration.environment,
      manifestChecksum: manifest.checksum,
      estimate,
      providerEdit: edit,
      automaticRetry: false,
      ownerConfirmedCreditRetry: true,
      retryReason: "Prior provider runtime failure was insufficient Shotstack credits; Owner replenished credits and explicitly confirmed one exact-candidate retry.",
      previousAttemptId: first?.id || null,
      youtubeDestination: false,
      ...shotstackWatermarkPolicy(configuration.environment),
    },
    started_at: now,
    updated_at: now,
  }).select("*").single();
  if (insertError || !attempt) return NextResponse.json({ error: "The bounded retry attempt could not be created." }, { status: 503 });

  try {
    const submitted = await submitShotstackRender({ apiKey: configuration.apiKey, environment: configuration.environment, edit });
    const submittedAt = new Date().toISOString();
    await client.from("beast_marketing_video_attempts").update({ status: "submitted", provider_request_id: submitted.providerRequestId, retryable: true, updated_at: submittedAt }).eq("id", attempt.id).eq("owner_id", user.id);
    await client.from("beast_marketing_video_jobs").update({
      state: "generating",
      production: { ...production, providerState: "submitted", providerId: SHOTSTACK_PROVIDER_ID, providerEnvironment: configuration.environment, attemptId: attempt.id, externalActionPerformed: true, estimatedCredits: estimate, renderAuthorizationRequired: false },
      quality: { ...quality, renderReady: false, internalRenderStatus: "submitted", warnings: ["Owner-confirmed exact Revision 5 retry submitted after Shotstack credit replenishment. External publishing remains disabled."] },
      provenance: { ...provenance, waitingForOwnerApproval: true, renderAuthorizationRequired: false, creditRetryAuthorized: true, creditRetryAttemptsConsumed: 1, externallyPublished: false, externalPublishingDisabled: true, youtubePublishingDisabled: true },
      last_error: null,
      updated_at: submittedAt,
    }).eq("id", job.id).eq("owner_id", user.id);
    return NextResponse.json({ status: "submitted", jobId: job.id, revision: job.revision, attemptNumber: 2, providerRequestId: submitted.providerRequestId, estimate, automaticRetry: false, externalPublishingDisabled: true, youtubePublishingDisabled: true }, { status: 202, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const failure = providerFailure(error);
    await client.from("beast_marketing_video_attempts").update({
      status: "failed",
      retryable: failure.retryable,
      error_category: failure.category,
      evidence: { ...record(attempt.evidence), providerHttpStatus: failure.httpStatus, providerErrorCode: failure.providerCode, providerErrorMessage: failure.providerMessage, providerRequestId: failure.providerRequestId, providerValidationPath: failure.providerValidationPath, sanitizedProviderResponseBody: failure.sanitizedResponseBody, providerErrorAt: failure.occurredAt },
      completed_at: failure.occurredAt,
      updated_at: failure.occurredAt,
    }).eq("id", attempt.id).eq("owner_id", user.id);
    await client.from("beast_marketing_video_jobs").update({ state: "failed", last_error: failure.providerMessage || "The Owner-confirmed Shotstack credit retry failed.", updated_at: failure.occurredAt }).eq("id", job.id).eq("owner_id", user.id);
    return NextResponse.json({ error: "The Owner-confirmed Shotstack credit retry failed. No automatic retry was made.", category: failure.category, retryable: failure.retryable }, { status: 503 });
  }
}
