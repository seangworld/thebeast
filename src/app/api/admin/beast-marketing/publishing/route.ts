import { NextResponse } from "next/server";
import { scoreKdpOpportunity, type KdpFormat, type KdpOpportunityInput } from "@/lib/kdpPublishingFactory";
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
