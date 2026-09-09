import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { runStandingObservation } from "@/lib/server/standingObservationRunner";

import { assessOperatingOutcomes, unpackObservationEvidence } from "@/lib/standingObservationOutcomes";

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
  const [schedule, runs, history] = await Promise.all([
    client.from("beast_admin_staff_schedules").select("id,enabled,cadence,cron_expression,next_run_at,last_run_at,paused_at,updated_at").eq("owner_id", user.id).eq("assignment_key", "orchestrator_3_standing_observation").maybeSingle(),
    client.from("beast_admin_staff_observation_runs").select("id,trigger_type,status,started_at,completed_at,checked_sources,unavailable_sources,changes,suppressed_signals,findings,confidence,impact,next_step,finding_count,investigation_count,proposal_count,retry_count,error_category").eq("owner_id", user.id).eq("trigger_type", "schedule").order("started_at", { ascending: false }).limit(20),
    client.from("beast_admin_staff_observation_runs").select("status,started_at,completed_at,findings").eq("owner_id", user.id).eq("trigger_type", "schedule").gte("started_at", new Date(Date.now() - 35 * 86400000).toISOString()).order("started_at", { ascending: false }).limit(121),
  ]);
  if (schedule.error || runs.error || !runs.data || history.error || !history.data || history.data.length > 120) return json({ error: "Standing staff evidence is unavailable." }, 503);
  const latest = runs.data?.[0] || null;
  if (latest && unpackObservationEvidence(latest.findings).findings === null) return json({ error: "Standing staff evidence is unavailable." }, 503);
  const snapshot = latest && ["clean", "findings", "duplicate_skipped"].includes(latest.status) && latest.completed_at && Date.parse(latest.completed_at) >= Date.parse(latest.started_at) && Date.parse(latest.completed_at) <= Date.now() ? unpackObservationEvidence(latest.findings).snapshot : null;
  const outcomes = snapshot && Date.parse(snapshot.observedAt) === Date.parse(latest!.started_at) ? assessOperatingOutcomes(snapshot, history.data) : null;
  const state = !latest ? "never_run" : latest.status === "failed" ? "failed" : latest.status === "running" ? "running" : latest.finding_count > 0 ? "findings" : "clean";
  return json({ schedule: schedule.data, runs: runs.data.slice(0, 20).map((run) => ({ ...run, findings: unpackObservationEvidence(run.findings).findings || [] })), outcomes, state, authority: "Observation and proposals are non-executable; owner approval and separate BeastFusion authorization are required." });
}

export async function POST(request: Request) {
  const { client, user } = await ownerContext();
  if (!user) return json({ error: "BeastAdmin owner access required." }, 403);
  const body = await request.json().catch(() => null) as { action?: string } | null;
  if (!body || !["pause", "resume", "simulate_clean"].includes(body.action || "")) return json({ error: "Unknown owner staff action." }, 400);
  if (body.action === "simulate_clean") {
    if (process.env.VERCEL_ENV === "production") return json({ error: "Controlled simulations are disabled in Production." }, 403);
    try {
      const result = await runStandingObservation(user.id, null, "clean");
      if (result.error) return json({ error: "The controlled observation could not be recorded." }, 503);
      return json({ run: result.data, executionAuthorized: false }, 201);
    } catch {
      return json({ error: "Canonical BF-AGT-011 authorization is unavailable; simulation stopped fail-closed." }, 503);
    }
  }
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
  return json({ error: "Unknown owner staff action." }, 400);
}
