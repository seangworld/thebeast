import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { advanceDirectorObjective, authorizeDirectorCorrection, AssignmentBlocked, directorCapabilities, isDirectorCapability } from "@/lib/directorAssignments";
import { directorAssignmentAccess, directorAssignmentStore, publicAssignments } from "@/lib/directorAssignmentStore";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";

export const dynamic = "force-dynamic";
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

async function context(goalId: string | null) {
  const client = createRouteClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { response: json({ error: "Authentication required." }, 401) };
  if (!goalId || !uuid.test(goalId)) return { response: json({ error: "Select a saved BeastGoals objective." }, 400) };
  const goal = await client.from("beast_goals").select("id, title, description, category, status, current_step, updated_at").eq("owner_id", user.id).eq("id", goalId).is("deleted_at", null).is("archived_at", null).neq("status", "Archived").maybeSingle();
  if (goal.error) return { response: json({ error: "Objective unavailable." }, 503) };
  if (!goal.data) return { response: json({ error: "Objective not found." }, 404) };
  return { client, user, goal: goal.data, store: directorAssignmentStore(client), access: directorAssignmentAccess(client, user, goal.data.id, async (module) => (await requireMemberModuleEntitlement(module, { supabase: client, user })).ok) };
}

export async function GET(request: Request) {
  try {
    const goalId = new URL(request.url).searchParams.get("goalId");
    if (!goalId) {
      const client = createRouteClient();
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) return json({ error: "Authentication required." }, 401);
      const goals = await client.from("beast_goals").select("id, title, category, status").eq("owner_id", user.id).is("deleted_at", null).is("archived_at", null).neq("status", "Archived").order("updated_at", { ascending: false }).limit(100);
      if (goals.error) return json({ error: "Saved objectives unavailable." }, 503);
      return json({ goals: goals.data, capabilities: directorCapabilities });
    }
    const ctx = await context(goalId);
    if (ctx.response) return ctx.response;
    return json({ goal: ctx.goal, assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id), capabilities: directorCapabilities });
  } catch { return json({ error: "Saved assignments unavailable. No completion has been confirmed." }, 503); }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
    if (!body || typeof body !== "object") return json({ error: "Invalid assignment request." }, 400);
    const ctx = await context(typeof body.goalId === "string" ? body.goalId : null);
    if (ctx.response) return ctx.response;
    if (["Completed", "Paused"].includes(ctx.goal.status)) return json({ error: "Resume an active BeastGoals objective before assigning new reviews." }, 409);
    if (body.action === "plan") {
      if (!Array.isArray(body.capabilities) || !body.capabilities.length || body.capabilities.length > 2 || !body.capabilities.every(isDirectorCapability)) return json({ error: "Choose supported saved-record reviews. Other work needs specialist or owner review." }, 400);
      const capabilities = Array.from(new Set(body.capabilities)) as Array<keyof typeof directorCapabilities>;
      for (const capability of capabilities) {
        if (!await ctx.access.authorize(ctx.user.id, capability)) return json({ error: "Specialist permission unavailable." }, 403);
      }
      // Transactional deduplication also serializes competing plans before linking dependencies.
      const { error } = await ctx.client.rpc("plan_director_reviews", { p_goal_id: ctx.goal.id, p_capabilities: capabilities });
      if (error) throw new AssignmentBlocked("Plan could not be saved. No work was executed.");
    } else if (body.action === "correction" && typeof body.assignmentId === "string" && uuid.test(body.assignmentId)) {
      const saved = await authorizeDirectorCorrection({ store: ctx.store, access: ctx.access, ownerId: ctx.user.id, goalId: ctx.goal.id, taskId: body.assignmentId, now: new Date().toISOString() });
      if (!saved) return json({ error: "Another request changed the checkpoint. Refresh before retrying." }, 409);
    } else if (body.action === "resume") {
      const outcome = await advanceDirectorObjective({ store: ctx.store, access: ctx.access, ownerId: ctx.user.id, goalId: ctx.goal.id, now: new Date().toISOString(), leaseId: crypto.randomUUID() });
      return json({ outcome, assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id) });
    } else return json({ error: "Unsupported action. Spending, publication, record changes and production operations cannot be delegated here." }, 400);
    return json({ assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id) });
  } catch (error) {
    return json({ error: error instanceof AssignmentBlocked ? error.message : "Assignment request failed. No completion has been confirmed." }, 503);
  }
}
