import { NextResponse } from "next/server";
import { shotstackConfiguration } from "@/lib/beastMarketingShotstack";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const clean = (value: unknown, maximum = 1000) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function owner() {
  const client = createRouteClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { client, user: null };
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { client, user: profile?.role === "admin" ? user : null };
}

function collectProviderErrors(value: unknown, depth = 0, output: string[] = []): string[] {
  if (depth > 8 || output.length >= 20 || value == null) return output;
  if (Array.isArray(value)) {
    value.slice(0, 50).forEach((item) => collectProviderErrors(item, depth + 1, output));
    return output;
  }
  if (typeof value !== "object") return output;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (output.length >= 20) break;
    if (/^(?:error|message)$/i.test(key) && typeof item === "string") {
      const message = clean(item, 1000);
      if (message && !output.includes(message)) output.push(message);
    }
    if (/^(?:metadata|data|clips|tracks|asset|response)$/i.test(key) || typeof item === "object") {
      collectProviderErrors(item, depth + 1, output);
    }
  }
  return output;
}

export async function GET(request: Request) {
  const { client, user } = await owner();
  if (!user) return NextResponse.json({ error: "BeastMarketing owner access required." }, { status: 403 });

  const jobId = clean(new URL(request.url).searchParams.get("jobId"), 80);
  if (!jobId) return NextResponse.json({ error: "A video job id is required." }, { status: 400 });

  const { data: job } = await client.from("beast_marketing_video_jobs").select("id, revision, production").eq("id", jobId).eq("owner_id", user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "The owner-scoped video job is unavailable." }, { status: 404 });

  const { data: attempt } = await client.from("beast_marketing_video_attempts").select("*").eq("owner_id", user.id).eq("job_id", job.id).eq("provider_id", "shotstack").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!attempt?.provider_request_id) return NextResponse.json({ error: "No submitted Shotstack render exists for this job." }, { status: 409 });

  const configuration = shotstackConfiguration();
  if (!configuration.configured) return NextResponse.json({ error: "Shotstack is not configured for this environment." }, { status: 503 });

  const providerUrl = `https://api.shotstack.io/edit/${configuration.environment}/render/${encodeURIComponent(attempt.provider_request_id)}?data=true&merged=true`;
  let response: Response;
  try {
    response = await fetch(providerUrl, {
      method: "GET",
      headers: { accept: "application/json", "x-api-key": configuration.apiKey },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Shotstack diagnostic lookup could not reach the provider." }, { status: 503 });
  }

  const body = await response.json().catch(() => null);
  const root = record(body);
  const provider = record(root.response);
  const providerStatus = clean(provider.status, 80) || null;
  const providerError = clean(provider.error, 1000) || null;
  const metadataErrors = collectProviderErrors(provider.data).filter((item) => item !== providerError).slice(0, 20);
  const observedAt = new Date().toISOString();
  const diagnostics = {
    providerHttpStatus: response.status,
    providerStatus,
    providerError,
    providerRequestId: clean(attempt.provider_request_id, 120),
    metadataErrors,
    observedAt,
  };

  const priorEvidence = record(attempt.evidence);
  await client.from("beast_marketing_video_attempts").update({
    evidence: { ...priorEvidence, runtimeDiagnostics: diagnostics, providerStatus: providerStatus || priorEvidence.providerStatus || null, providerErrorMessage: providerError || priorEvidence.providerErrorMessage || null },
    updated_at: observedAt,
  }).eq("id", attempt.id).eq("owner_id", user.id);

  if (providerStatus === "failed") {
    await client.from("beast_marketing_video_jobs").update({ last_error: providerError || "Shotstack reported a runtime render failure.", updated_at: observedAt }).eq("id", job.id).eq("owner_id", user.id);
  }

  return NextResponse.json({ jobId: job.id, revision: job.revision, diagnostics }, { headers: { "cache-control": "private, no-store" } });
}
