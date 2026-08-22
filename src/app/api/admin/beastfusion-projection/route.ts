import { NextResponse } from "next/server";
import { buildBeastAdminCanonicalReadModel, type BeastFusionStoredSnapshot } from "@/lib/beastAdminCanonicalProjection";
import { beastFusionProjectionMaxBytes, validateBeastFusionCommandProjection, verifyBeastFusionProjectionFreshness } from "@/lib/beastFusionCommandProjection";
import { verifyBeastFusionWorkflowOidc } from "@/lib/server/beastFusionOidc";
import { createRouteClient } from "@/lib/supabase/server";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = { "cache-control": "private, no-cache, no-store, must-revalidate" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

function publicationConfigured() {
  return Boolean(process.env.BEASTFUSION_OIDC_AUDIENCE?.trim() && process.env.BEASTFUSION_OIDC_WORKFLOW_REF?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function storedSnapshot(value: unknown): BeastFusionStoredSnapshot | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const payload = record.payload;
  const validation = validateBeastFusionCommandProjection(payload);
  if (!validation.ok) return null;
  if (record.payload_hash !== validation.payloadHash || record.projection_id !== validation.projection.projectionId || record.projection_version !== validation.projection.projectionVersion || record.canonical_input_digest !== validation.canonicalInputDigest || record.source_commit !== validation.projection.source.commit) return null;
  if (typeof record.accepted_at !== "string" || typeof record.last_confirmed_at !== "string") return null;
  return {
    projectionId: validation.projection.projectionId,
    projectionVersion: validation.projection.projectionVersion,
    payloadHash: validation.payloadHash,
    canonicalInputDigest: validation.canonicalInputDigest,
    sourceCommit: validation.projection.source.commit,
    generatedAt: validation.projection.generatedAt,
    acceptedAt: record.accepted_at,
    lastConfirmedAt: record.last_confirmed_at,
    payload: validation.projection,
  };
}

export async function GET() {
  try {
    const client = createRouteClient();
    const { data: { user }, error: authenticationError } = await client.auth.getUser();
    if (authenticationError || !user) return json({ error: "Authentication required." }, 401);
    const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) return json({ error: "BeastAdmin could not verify owner access." }, 503);
    if (profile?.role !== "admin") return json({ error: "BeastAdmin owner access required." }, 403);
    const service = createBeastFusionPublicationClient();
    const result = await service.rpc("get_beastfusion_command_current");
    if (result.error) return json({ provider: { status: "error", detail: "The canonical projection read model is unavailable." }, canonical: null }, 503);
    if (!result.data) return json({ provider: { status: publicationConfigured() ? "no_snapshot" : "not_configured", detail: publicationConfigured() ? "No valid canonical BeastFusion projection has been accepted." : "The server-only BeastFusion publication boundary is not configured." }, canonical: null });
    const snapshot = storedSnapshot(result.data);
    if (!snapshot) {
      const history = await service.from("beastfusion_command_snapshots").select("projection_id,projection_version,payload_hash,canonical_input_digest,source_commit,generated_at,accepted_at,payload").order("accepted_at", { ascending: false }).limit(10);
      const lastValid = Array.isArray(history.data)
        ? history.data.map((row) => storedSnapshot({ ...row, last_confirmed_at: row.accepted_at })).find((candidate): candidate is BeastFusionStoredSnapshot => Boolean(candidate))
        : null;
      if (!lastValid) return json({ provider: { status: "drift_detected", detail: "The current stored snapshot failed identity validation and no prior valid snapshot is available." }, canonical: null }, 503);
      const canonical = buildBeastAdminCanonicalReadModel(lastValid, { configured: true });
      canonical.provider = { ...canonical.provider, status: "drift_detected", detail: "The current pointer failed validation; the last known valid immutable snapshot is retained." };
      return json({ provider: canonical.provider, canonical }, 503);
    }
    const canonical = buildBeastAdminCanonicalReadModel(snapshot, { configured: publicationConfigured() });
    return json({ provider: canonical.provider, canonical });
  } catch {
    return json({ provider: { status: publicationConfigured() ? "error" : "not_configured", detail: "The canonical projection provider could not be loaded." }, canonical: null }, 503);
  }
}

export async function POST(request: Request) {
  if (!publicationConfigured()) return json({ status: "Not Configured" }, 503);
  if (request.headers.get("content-type")?.toLowerCase() !== "application/vnd.beastfusion.command-center+json;version=1") return json({ status: "Rejected", reason: "Unsupported projection content type." }, 415);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > beastFusionProjectionMaxBytes) return json({ status: "Rejected", reason: "Projection exceeds the maximum size." }, 413);
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > beastFusionProjectionMaxBytes) return json({ status: "Rejected", reason: "Projection exceeds the maximum size." }, 413);
  const machineIdentity = await verifyBeastFusionWorkflowOidc({
    authorization: request.headers.get("authorization"),
    expectedAudience: process.env.BEASTFUSION_OIDC_AUDIENCE?.trim() || "",
    expectedWorkflowRef: process.env.BEASTFUSION_OIDC_WORKFLOW_REF?.trim() || "",
  });
  if (!machineIdentity.ok) return json({ status: "Rejected", reason: machineIdentity.reason }, 401);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return json({ status: "Rejected", reason: "Projection must be valid JSON." }, 400);
  }
  const validation = validateBeastFusionCommandProjection(parsed);
  if (!validation.ok) return json({ status: "Rejected", reason: "Projection validation failed.", errors: validation.errors.slice(0, 10) }, 400);
  if (validation.projection.source.commit !== machineIdentity.identity.sourceCommit) return json({ status: "Rejected", reason: "Projection source commit does not match the trusted workflow identity." }, 409);
  const freshness = verifyBeastFusionProjectionFreshness(validation.projection.generatedAt);
  if (!freshness.ok) return json({ status: "Rejected", reason: freshness.reason }, 409);
  try {
    const client = createBeastFusionPublicationClient();
    const result = await client.rpc("publish_beastfusion_command_snapshot", {
      selected_projection_id: validation.projection.projectionId,
      selected_projection_version: validation.projection.projectionVersion,
      selected_payload_hash: validation.payloadHash,
      selected_canonical_input_digest: validation.canonicalInputDigest,
      selected_source_commit: validation.projection.source.commit,
      selected_generated_at: validation.projection.generatedAt,
      selected_payload: validation.projection,
      selected_oidc_issuer: machineIdentity.identity.issuer,
      selected_oidc_subject: machineIdentity.identity.subject,
      selected_oidc_audience: machineIdentity.identity.audience,
      selected_repository: machineIdentity.identity.repository,
      selected_workflow_ref: machineIdentity.identity.workflowRef,
      selected_git_ref: machineIdentity.identity.ref,
      selected_workflow_run_number: machineIdentity.identity.runNumber,
      selected_workflow_run_attempt: machineIdentity.identity.runAttempt,
      selected_token_digest: machineIdentity.identity.tokenDigest,
    });
    if (result.error) return json({ status: "Rejected", reason: "The immutable canonical snapshot could not be accepted." }, 409);
    const response = result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
    return json({ status: response.status || "Accepted", projectionId: validation.projection.projectionId, payloadHash: validation.payloadHash }, response.status === "Already Current" ? 200 : 201);
  } catch {
    return json({ status: "Error", reason: "The publication service is unavailable; the last valid snapshot remains current." }, 503);
  }
}
