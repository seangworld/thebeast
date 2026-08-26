import { NextResponse } from "next/server";
import { verifyCronAuthorization } from "@/lib/standingObservation";
import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { runStandingObservation } from "@/lib/server/standingObservationRunner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!verifyCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  const service = createBeastFusionPublicationClient();
  const schedules = await service.from("beast_admin_staff_schedules").select("id,owner_id").eq("assignment_key", "orchestrator_3_standing_observation").eq("enabled", true);
  if (schedules.error) return NextResponse.json({ error: "Standing assignments are unavailable." }, { status: 503 });
  const outcomes = [];
  for (const schedule of schedules.data || []) {
    try {
      const outcome = await runStandingObservation(schedule.owner_id, schedule.id);
      if (outcome.error) throw outcome.error;
      await service.from("beast_admin_staff_schedules").update({ last_run_at: new Date().toISOString(), next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", schedule.id);
      outcomes.push({ ownerId: schedule.owner_id, status: outcome.data?.status || "complete" });
    } catch (error) {
      await service.from("beast_admin_staff_observation_runs").insert({ owner_id: schedule.owner_id, schedule_id: schedule.id, trigger_type: "schedule", status: "failed", completed_at: new Date().toISOString(), unavailable_sources: ["standing_observation_cycle"], confidence: "unknown", impact: "none", next_step: "Inspect the categorized failure; no proposal was created.", error_category: error instanceof Error ? error.message.slice(0, 120) : "cycle_failed" });
      outcomes.push({ ownerId: schedule.owner_id, status: "failed" });
    }
  }
  return NextResponse.json({ ran: outcomes.length, outcomes, executionAuthorized: false });
}
