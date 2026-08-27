import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { runStandingObservation } from "@/lib/server/standingObservationRunner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-cache, no-store, must-revalidate" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function ownerContext() {
  const client = createRouteClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { client, user: null };
  const profile = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { client, user: profile.data?.role === "admin" ? user : null };
}

export async function GET() {
  const { client, user } = await ownerContext();
  if (!user) return json({ error: "BeastAdmin owner access required." }, 403);
  const [schedule, runs] = await Promise.all([
    client.from("beast_admin_staff_schedules").select("id,enabled,cadence,cron_expression,next_run_at,last_run_at,paused_at,updated_at").eq("owner_id", user.id).eq("assignment_key", "orchestrator_3_standing_observation").maybeSingle(),
    client.from("beast_admin_staff_observation_runs").select("id,trigger_type,status,started_at,completed_at,checked_sources,unavailable_sources,changes,suppressed_signals,findings,confidence,impact,next_step,finding_count,investigation_count,proposal_count,retry_count,error_category").eq("owner_id", user.id).order("started_at", { ascending: false }).limit(20),
  ]);
  if (schedule.error || runs.error) return json({ error: "Standing staff evidence is unavailable." }, 503);
  const latest = runs.data?.[0] || null;
  const state = !latest ? "never_run" : latest.status === "failed" ? "failed" : latest.status === "clean" || latest.status === "duplicate_skipped" ? "clean" : "findings";
  return json({ schedule: schedule.data, runs: runs.data || [], state, authority: "Observation and proposals are non-executable; owner approval and separate BeastFusion authorization are required." });
}

export async function POST(request: Request) {
  const { client, user } = await ownerContext();
  if (!user) return json({ error: "BeastAdmin owner access required." }, 403);
  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (!body || !["pause", "resume", "simulate_clean", "simulate_material", "simulate_failure"].includes(body.action || "")) return json({ error: "Unknown owner staff action." }, 400);
  const [existing, authorization] = await Promise.all([
    client.from("beast_admin_staff_schedules").select("id").eq("owner_id", user.id).eq("assignment_key", "orchestrator_3_standing_observation").maybeSingle(),
    client.from("beast_admin_standing_authorizations").select("id,revoked_at").eq("owner_id", user.id).eq("authorization_key", "orchestrator_3_standing_observation").maybeSingle(),
  ]);
  if (existing.error) return json({ error: "The standing assignment could not be checked." }, 503);
  if (body.action === "pause" || body.action === "resume") {
    if (!existing.data || authorization.error || !authorization.data || authorization.data.revoked_at) return json({ error: "Canonical standing observation authorization is unavailable." }, 409);
    const enabled = body.action === "resume";
    const values = { enabled, paused_at: enabled ? null : new Date().toISOString(), updated_at: new Date().toISOString(), next_run_at: enabled ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null };
    const write = client.from("beast_admin_staff_schedules").update(values).eq("id", existing.data.id);
    const result = await write.select().single();
    if (result.error) return json({ error: "The standing assignment could not be updated." }, 503);
    return json({ schedule: result.data, executionAuthorized: false });
  }
  if (process.env.VERCEL_ENV === "production") return json({ error: "Controlled simulations are disabled in Production." }, 403);
  try {
    const mode = body.action === "simulate_clean" ? "clean" : body.action === "simulate_material" ? "material" : "failure";
    const result = await runStandingObservation(user.id, existing.data?.id || null, mode);
    if (result.error) return json({ error: "The controlled observation could not be recorded." }, 503);
    return json({ run: result.data, executionAuthorized: false }, 201);
  } catch {
    return json({ error: "Canonical BF-AGT-011 authorization is unavailable; simulation stopped fail-closed." }, 503);
  }
}
