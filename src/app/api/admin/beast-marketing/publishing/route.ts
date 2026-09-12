import { NextResponse } from "next/server";
import {
  buildKdpPublicationBrief,
  canTransitionKdpPublication,
  evaluateKdpPackageReadiness,
  kdpPublicationStates,
  scoreKdpOpportunity,
  type KdpFormat,
  type KdpOpportunityInput,
  type KdpPackageEvidence,
  type KdpPublicationState,
} from "@/lib/kdpPublishingFactory";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
const clean = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

async function owner() {
  const client = createRouteClient();
  const auth = await client.auth.getUser();
  if (!auth.data.user || auth.error) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, id: auth.data.user.id } : null;
}

function formats(value: unknown): KdpFormat[] {
  if (!Array.isArray(value)) return ["ebook"];
  const supported = value.filter((item): item is KdpFormat => ["ebook", "paperback", "hardcover"].includes(String(item)));
  const unique = Array.from(new Set(supported)).slice(0, 3);
  return unique.length ? unique : ["ebook"];
}

function opportunity(value: unknown): KdpOpportunityInput | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const keys = ["buyerIntent", "differentiation", "evidenceReadiness", "seriesPotential", "timeToMarketDays", "estimatedCashCost"] as const;
  const parsed = Object.fromEntries(keys.map((key) => [key, Number(row[key])]));
  return keys.every((key) => Number.isFinite(parsed[key]) && parsed[key] >= 0) ? parsed as KdpOpportunityInput : null;
}

export async function GET() {
  const access = await owner();
  if (!access) return reply({ error: "KDP factory owner access required." }, 403);
  const result = await access.client.from("kdp_publications").select("*").eq("owner_id", access.id).order("updated_at", { ascending: false });
  if (result.error) return reply({ error: "The KDP factory is unavailable until its database migration is applied." }, 503);
  return reply({ publications: result.data || [], submissionAuthority: "owner_only", amazonConnection: "not_required_for_preparation" });
}

export async function POST(request: Request) {
  const access = await owner();
  if (!access) return reply({ error: "KDP factory owner access required." }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = clean(body?.title, 180), audience = clean(body?.audience, 500), topic = clean(body?.topic, 500);
  const inputs = opportunity(body?.opportunity);
  if (!title || !audience || !topic || !inputs) return reply({ error: "Title, audience, topic, and complete nonnegative opportunity inputs are required." }, 400);
  const scored = scoreKdpOpportunity(inputs);
  const result = await access.client.from("kdp_publications").insert({
    owner_id: access.id, title, audience, topic, formats: formats(body?.formats), state: "scored",
    opportunity_inputs: inputs, opportunity_score: scored.score, limitations: scored.limitations,
  }).select("*").single();
  if (result.error || !result.data) return reply({ error: "The publication candidate could not be confirmed as saved." }, 503);
  return reply({ publication: result.data, recommendation: scored.recommendation, submissionAuthority: "owner_only" }, 201);
}

const evidenceKeys: (keyof KdpPackageEvidence)[] = [
  "manuscript", "interior", "cover", "metadata", "pricing", "originalityReview",
  "rightsReview", "factualReview", "aiDisclosurePrepared",
];

function packageEvidence(value: unknown): KdpPackageEvidence | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return evidenceKeys.every((key) => typeof row[key] === "boolean")
    ? Object.fromEntries(evidenceKeys.map((key) => [key, row[key]])) as KdpPackageEvidence
    : null;
}

export async function PATCH(request: Request) {
  const access = await owner();
  if (!access) return reply({ error: "KDP factory owner access required." }, 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = clean(body?.id, 80), action = clean(body?.action, 40);
  if (!id || !action) return reply({ error: "Publication and lifecycle action are required." }, 400);

  const current = await access.client.from("kdp_publications").select("*").eq("id", id).eq("owner_id", access.id).maybeSingle();
  if (current.error || !current.data) return reply({ error: "Publication candidate was not found." }, 404);
  const state = String(current.data.state) as KdpPublicationState;
  if (!kdpPublicationStates.includes(state)) return reply({ error: "Publication state is invalid." }, 409);

  let next: KdpPublicationState;
  let updates: Record<string, unknown> = {};
  if (action === "prepare_brief") {
    next = "brief_ready";
    if ((current.data.opportunity_score ?? 0) < 55) return reply({ error: "A score of 55 or higher is required before brief preparation." }, 409);
    updates.brief = buildKdpPublicationBrief({ title: current.data.title, audience: current.data.audience, topic: current.data.topic, formats: current.data.formats });
  } else if (action === "approve_brief") next = "brief_approved";
  else if (action === "start_drafting") next = "drafting";
  else if (action === "send_to_quality_review") next = "quality_review";
  else if (action === "validate_package") {
    const evidence = packageEvidence(body?.packageEvidence);
    if (!evidence) return reply({ error: "Complete package evidence is required." }, 400);
    const readiness = evaluateKdpPackageReadiness(evidence);
    if (!readiness.readyForOwnerApproval) return reply({ error: `Package is missing: ${readiness.missing.join(", ")}.`, readiness }, 409);
    next = "package_ready";
    updates.package_evidence = evidence;
  } else if (action === "approve_package") next = "owner_approved";
  else return reply({ error: "Unsupported lifecycle action." }, 400);

  if (!canTransitionKdpPublication(state, next)) return reply({ error: `${state} cannot advance to ${next}.` }, 409);
  updates = { ...updates, state: next, updated_at: new Date().toISOString() };
  const result = await access.client.from("kdp_publications").update(updates).eq("id", id).eq("owner_id", access.id).select("*").single();
  if (result.error || !result.data) return reply({ error: "Lifecycle change could not be confirmed as saved." }, 503);
  return reply({ publication: result.data, submissionAuthority: "owner_only" });
}
