import { NextResponse } from "next/server";
import { buildBeastAdminCanonicalReadModel, type BeastFusionStoredSnapshot } from "@/lib/beastAdminCanonicalProjection";
import { beastFusionProjectionMaxBytes, validateBeastFusionCommandProjection, verifyBeastFusionProjectionFreshness, verifyBeastFusionPublicationSignature } from "@/lib/beastFusionCommandProjection";
import { createRouteClient } from "@/lib/supabase/server";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = { "cache-control": "private, no-cache, no-store, must-revalidate" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

function publicationConfigured() {
  return Boolean(process.env.BEASTFUSION_PROJECTION_PUBLISH_SECRET?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function storedSnapshot(value: unknown): BeastFusionStoredSnapshot | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const payload = record.payload;
  const validation = validateBeastFusionCommandProjection(payload);
  if (!validation.ok) return null;
  if (record.payload_hash !== validation.payloadHash || record.projection_id !== validation.projection.projectionId || record.projection_version !== validation.projection.projectionVersion || record.canonical_input_digest !== validation.canonicalInputDigest || record.source_commit !== validation.projection.source.commit) return null;
  if (typeof record.published_at !== "string") return null;
  return {
    projectionId: validation.projection.projectionId,
    projectionVersion: validation.projection.projectionVersion,
    payloadHash: validation.payloadHash,
    canonicalInputDigest: validation.canonicalInputDigest,
    sourceCommit: validation.projection.source.commit,
    generatedAt: validation.projection.generatedAt,
    publishedAt: record.published_at,
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
    const result = await client.rpc("get_beastfusion_command_current");
    if (result.error) return json({ provider: { status: "error", detail: "The canonical projection read model is unavailable." }, canonical: null }, 503);
    if (!result.data) return json({ provider: { status: publicationConfigured() ? "no_snapshot" : "not_configured", detail: publicationConfigured() ? "No valid canonical BeastFusion projection has been accepted." : "The server-only BeastFusion publication boundary is not configured." }, canonical: null });
    const snapshot = storedSnapshot(result.data);
    if (!snapshot) return json({ provider: { status: "drift_detected", detail: "The current stored snapshot failed identity or payload validation." }, canonical: null }, 503);
    return json({ provider: buildBeastAdminCanonicalReadModel(snapshot, { configured: publicationConfigured() }).provider, canonical: buildBeastAdminCanonicalReadModel(snapshot, { configured: publicationConfigured() }) });
  } catch {
    return json({ provider: { status: publicationConfigured() ? "error" : "not_configured", detail: "The canonical projection provider could not be loaded." }, canonical: null }, 503);
  }
}

export async function POST(request: Request) {
  const secret = process.env.BEASTFUSION_PROJECTION_PUBLISH_SECRET?.trim() || "";
  if (!publicationConfigured()) return json({ status: "Not Configured" }, 503);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > beastFusionProjectionMaxBytes) return json({ status: "Rejected", reason: "Projection exceeds the maximum size." }, 413);
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > beastFusionProjectionMaxBytes) return json({ status: "Rejected", reason: "Projection exceeds the maximum size." }, 413);
  const signature = verifyBeastFusionPublicationSignature({ body, timestamp: request.headers.get("x-beastfusion-timestamp"), signature: request.headers.get("x-beastfusion-signature"), secret });
  if (!signature.ok) return json({ status: "Rejected", reason: signature.reason }, 401);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return json({ status: "Rejected", reason: "Projection must be valid JSON." }, 400);
  }
  const validation = validateBeastFusionCommandProjection(parsed);
  if (!validation.ok) return json({ status: "Rejected", reason: "Projection validation failed.", errors: validation.errors.slice(0, 10) }, 400);
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
    });
    if (result.error) return json({ status: "Rejected", reason: "The immutable canonical snapshot could not be accepted." }, 409);
    const response = result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
    return json({ status: response.status || "Accepted", projectionId: validation.projection.projectionId, payloadHash: validation.payloadHash }, response.status === "Already Current" ? 200 : 201);
  } catch {
    return json({ status: "Error", reason: "The publication service is unavailable; the last valid snapshot remains current." }, 503);
  }
}
