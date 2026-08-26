import { NextResponse } from "next/server";
import { loadBeastFusionCanonicalReadModel } from "@/lib/server/beastFusionReadModel";
import { validateOwnerProposalDecision } from "@/lib/ownerProposalReview";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-cache, no-store, must-revalidate" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function context() {
  const client = createRouteClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { client, user: null, canonical: null };
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { client, user: null, canonical: null };
  const loaded = await loadBeastFusionCanonicalReadModel();
  return { client, user, canonical: loaded.canonical };
}

export async function GET() {
  const { client, user, canonical } = await context();
  if (!user) return json({ error: "BeastAdmin owner access required." }, 403);
  if (!canonical) return json({ error: "Canonical BeastFusion proposals are unavailable. No intake fallback was substituted." }, 503);
  const { data, error } = await client.from("beast_admin_roadmap_items").select("id,source_id,status,owner_notes,execution_payload,created_at").eq("user_id", user.id).eq("source_type", "orchestrator_3_proposal").order("created_at", { ascending: false }).limit(100);
  if (error) return json({ error: "Owner proposal decision history is unavailable." }, 503);
  return json({ proposals: canonical.proposals || [], decisions: data || [], projection: canonical.projection || null });
}

export async function POST(request: Request) {
  const { client, user, canonical } = await context();
  if (!user) return json({ error: "BeastAdmin owner access required." }, 403);
  if (!canonical) return json({ error: "Canonical BeastFusion proposals are unavailable." }, 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const proposal = (canonical.proposals || []).find((item) => item.id === body?.proposalId);
  const validation = validateOwnerProposalDecision({ proposal, action: body?.action, rationale: body?.rationale, detail: body?.detail });
  if (!validation.valid) return json({ error: validation.reason }, 400);
  const decision = validation.decision;
  const { data, error } = await client.from("beast_admin_roadmap_items").insert({
    user_id: user.id, product_id: proposal!.product, title: `Owner decision: ${proposal!.title}`, summary: decision.rationale, status: "planned", owner_notes: decision.detail || decision.rationale,
    source_type: "orchestrator_3_proposal", source_id: proposal!.id, governance_classification: "intake", execution_status: "candidate_intake",
    execution_payload: { decision, proposalProjectionId: canonical.projection?.projectionId || null, proposalUpdatedAt: proposal!.updatedAt }, is_next_build: false,
  }).select("id,source_id,status,owner_notes,execution_payload,created_at").single();
  if (error) return json({ error: "The owner decision request could not be recorded." }, 503);
  return json({ decision: data, warning: "Recorded for canonical BeastFusion reconciliation. This does not authorize execution.", executionAuthorized: false }, 201);
}
