import { NextResponse } from "next/server";
import { executionHistoryStatuses } from "@/lib/platform/agents/executionHistory";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const client = createRouteClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return error("Authentication required.", 401);
  const { data: profile, error: profileError } = await client
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) return error("BeastAdmin could not verify owner access.", 503);
  if (profile?.role !== "admin") return error("BeastAdmin owner access required.", 403);

  const requestsResult = await client
    .from("execution_requests")
    .select("id, owner_id, professional_id, request_type, title, status, action_classification, limitations, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (requestsResult.error) {
    return error("Execution history is unavailable until its migration is applied.", 503);
  }
  const requestIds = (requestsResult.data || []).map((request) => request.id);
  const empty = { data: [] as Record<string, unknown>[], error: null };
  const [audit, approvals, results, outcomes, followUps, recommendations] =
    requestIds.length
      ? await Promise.all([
          client.from("execution_audit_events").select("request_id").in("request_id", requestIds),
          client.from("execution_approvals").select("request_id").in("request_id", requestIds),
          client.from("execution_results").select("request_id").in("request_id", requestIds),
          client.from("execution_outcomes").select("request_id").in("request_id", requestIds),
          client.from("execution_follow_ups").select("request_id").in("request_id", requestIds),
          client.from("execution_recommendations")
            .select("id, request_id, title, status, confidence, limitations, updated_at")
            .in("request_id", requestIds)
            .order("updated_at", { ascending: false }),
        ])
      : [empty, empty, empty, empty, empty, empty];

  if ([audit, approvals, results, outcomes, followUps, recommendations].some((result) => result.error)) {
    return error("BeastAdmin could not assemble complete execution history.", 503);
  }
  const count = (rows: Record<string, unknown>[], requestId: string) =>
    rows.filter((row) => row.request_id === requestId).length;
  const recommendationRows = recommendations.data || [];
  const requests = (requestsResult.data || []).map((request) => ({
    id: request.id,
    ownerId: request.owner_id,
    professionalId: request.professional_id,
    title: request.title,
    requestType: request.request_type,
    status: request.status,
    actionClassification: request.action_classification,
    limitations: request.limitations || [],
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    auditEvents: count(audit.data || [], request.id),
    approvals: count(approvals.data || [], request.id),
    results: count(results.data || [], request.id),
    outcomes: count(outcomes.data || [], request.id),
    followUps: count(followUps.data || [], request.id),
    recommendations: recommendationRows
      .filter((item) => item.request_id === request.id)
      .map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        confidence: item.confidence,
        limitations: item.limitations || [],
        updatedAt: item.updated_at,
      })),
  }));
  const counts = Object.fromEntries(
    executionHistoryStatuses.map((status) => [
      status,
      requests.filter((request) => request.status === status).length,
    ])
  );
  return NextResponse.json(
    { requests, counts, generatedAt: new Date().toISOString() },
    { headers: { "cache-control": "private, no-cache, no-store, must-revalidate" } }
  );
}
