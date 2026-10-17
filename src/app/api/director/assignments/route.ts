import { NextResponse } from "next/server";
import { createAsyncRouteClient } from "@/lib/supabase/server";
import { canonical, advanceDirectorObjective, authorizeDirectorCorrection, AssignmentBlocked, directorCapabilities, isDirectorCapability } from "@/lib/directorAssignments";
import { directorAssignmentAccess, directorAssignmentStore, publicAssignments } from "@/lib/directorAssignmentStore";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import { approveDirectorReasoning } from "@/lib/directorReasoning";
import { directorEvidenceSelection } from "@/lib/directorEvidenceAccess";
import { directorModelConfig, type DirectorModelReceipt } from "@/lib/directorModelConfig";
import { loadDirectorReasoningContext as reasoningContext } from "@/lib/directorReasoningContext";
import { directorReasoningAvailable, reasonAboutDirectorObjective } from "@/lib/directorReasoningProvider";

export const dynamic = "force-dynamic";
export const maxDuration = 90;
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}


async function refreshObjectiveHistory(ctx: Exclude<Awaited<ReturnType<typeof context>>, { response: unknown }>) {
  const conversationId = `director-objective-${ctx.goal.id}`;
  const count = await ctx.client.from("agent_conversation_messages").select("id", { count: "exact", head: true }).eq("owner_id", ctx.user.id).eq("conversation_id", conversationId);
  if (count.error) throw new AssignmentBlocked("Saved plan history is unavailable. Refresh before continuing.");
  const updated = await ctx.client.from("agent_conversations").update({ message_count: count.count || 0, updated_at: new Date().toISOString() }).eq("owner_id", ctx.user.id).eq("agent_id", "beastfusion.fusion-director").eq("id", conversationId);
  if (updated.error) throw new AssignmentBlocked("Saved plan history could not be refreshed.");
}
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

async function context(goalId: string | null) {
  const client = await createAsyncRouteClient();
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
      const client = await createAsyncRouteClient();
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) return json({ error: "Authentication required." }, 401);
      const goals = await client.from("beast_goals").select("id, title, category, status").eq("owner_id", user.id).is("deleted_at", null).is("archived_at", null).neq("status", "Archived").order("updated_at", { ascending: false }).limit(100);
      if (goals.error) return json({ error: "Saved objectives unavailable." }, 503);
      return json({ goals: goals.data, capabilities: directorCapabilities, reasoningAvailable: directorReasoningAvailable(), modelConfiguration: directorModelConfig });
    }
    const ctx = await context(goalId);
    if (ctx.response) return ctx.response;
    const proposal = await ctx.client.from("agent_conversation_messages").select("id, content").eq("owner_id", ctx.user.id).eq("conversation_id", `director-objective-${ctx.goal.id}`).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const saved = proposal.data?.content?.directorPlan;
    let permitted = Boolean(saved);
    for (const capability of saved?.context?.availableCapabilities || []) if (!isDirectorCapability(capability) || !await ctx.access.authorize(ctx.user.id, capability)) permitted = false;
    const evidenceOptions = [];
    for (const task of await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id)) {
      if (task.status !== "verified" || !task.result) continue;
      const source = await ctx.access.snapshot(ctx.user.id, task.capability);
      const records = task.capability === "money.cash-review" ? source.money!.incomes.map(row => ({ id: String(row.id), label: String(row.name).slice(0, 120) })) : source.health!.filter(row => row.recordType === "appointment").map(row => ({ id: row.id, label: row.title.slice(0, 120) }));
      evidenceOptions.push({ taskId: task.id, capability: task.capability, records });
    }
    const cancellation = await ctx.client.from("beast_director_cancellations").select("cancelled_at").eq("owner_id", ctx.user.id).eq("goal_id", ctx.goal.id).maybeSingle();
    if (cancellation.error) throw new AssignmentBlocked("Cancellation state unavailable.");
    return json({ evidenceOptions, cancellation: cancellation.data, goal: ctx.goal, assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id), capabilities: directorCapabilities, proposal: proposal.error || !permitted ? null : { id: proposal.data?.id, content: { directorPlan: { plan: saved.plan } } } });
  } catch { return json({ error: "Saved assignments unavailable. No completion has been confirmed." }, 503); }
}

export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
    if (!body || typeof body !== "object") return json({ error: "Invalid assignment request." }, 400);
    const ctx = await context(typeof body.goalId === "string" ? body.goalId : null);
    if (ctx.response) return ctx.response;
    if (["Completed", "Paused"].includes(ctx.goal.status) && body.action !== "cancel") return json({ error: "Resume an active BeastGoals objective before assigning new reviews." }, 409);
    const cancellation = await ctx.client.from("beast_director_cancellations").select("cancelled_at").eq("owner_id", ctx.user.id).eq("goal_id", ctx.goal.id).maybeSingle();
    if (cancellation.error) throw new AssignmentBlocked("Cancellation state unavailable.");
    if (cancellation.data && !["reason", "cancel"].includes(body.action)) return json({ error: "Owner cancelled remaining work on this objective. Existing approvals cannot resume it." }, 409);
    if (body.action === "reason") {
      if (!directorReasoningAvailable()) return json({ error: "AI planning is not enabled. No model call or specialist assignment was made." }, 503);
      if (body.ownerMessage !== undefined && (typeof body.ownerMessage !== "string" || body.ownerMessage.length > 2000)) return json({ error: "Current review message must be at most 2000 characters." }, 400);
      const evidence = await reasoningContext(ctx, directorEvidenceSelection(body.evidenceSelection), body.ownerMessage?.trim());
      let runtime: DirectorModelReceipt | undefined;
      const plan = await reasonAboutDirectorObjective(ctx.user.id, evidence, request.signal, undefined, value => { runtime = value; console.info("Director inference receipt", value); });
      const fresh = await context(ctx.goal.id);
      if (fresh.response || canonical(evidence) !== canonical(await reasoningContext(fresh, evidence.sharedEvidence?.selections, evidence.ownerMessage))) return json({ error: "Objective, permissions, cancellation or evidence changed during planning. No plan saved." }, 409);
      const conversationId = `director-objective-${ctx.goal.id}`;
      const conversation = await ctx.client.from("agent_conversations").upsert({ id: conversationId, owner_id: ctx.user.id, agent_id: "beastfusion.fusion-director", title: ctx.goal.title.slice(0, 80), tags: ["director", "objective-plan"] }, { onConflict: "id", ignoreDuplicates: true });
      if (conversation.error) throw new AssignmentBlocked("Reasoned plan could not be saved. Nothing was assigned.");
      const proposalId = crypto.randomUUID();
      const saved = await ctx.client.from("agent_conversation_messages").insert({ id: proposalId, owner_id: ctx.user.id, conversation_id: conversationId, sender: { kind: "agent", id: "beastfusion.fusion-director" }, recipient: { kind: "user", id: ctx.user.id }, content: { text: plan.interpretation, directorPlan: { plan, context: evidence, runtime, version: 2 } } });
      if (saved.error) throw new AssignmentBlocked("Reasoned plan could not be saved. Nothing was assigned.");
      await refreshObjectiveHistory(ctx);
      return json({ proposal: { id: proposalId, content: { directorPlan: { plan } } }, assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id) });
    } else if (body.action === "approve_reasoned_plan" && typeof body.proposalId === "string" && uuid.test(body.proposalId)) {
      const proposal = await ctx.client.from("agent_conversation_messages").select("content, sender").eq("owner_id", ctx.user.id).eq("conversation_id", `director-objective-${ctx.goal.id}`).eq("id", body.proposalId).maybeSingle();
      const saved = proposal.data?.content?.directorPlan;
      if (proposal.error || !saved || proposal.data?.sender?.id !== "beastfusion.fusion-director") return json({ error: "Saved Director plan unavailable." }, 404);
      let capabilities;
      try { capabilities = approveDirectorReasoning(saved.plan, saved.context, await reasoningContext(ctx, saved.context?.sharedEvidence?.selections, saved.context?.ownerMessage)); }
      catch (error) { return json({ error: error instanceof Error ? error.message : "Plan requires review." }, 409); }
      const planned = await ctx.client.rpc("approve_director_scoped_plan", { p_goal_id: ctx.goal.id, p_goal_updated_at: ctx.goal.updated_at, p_steps: saved.plan.steps.filter((step: { capability: string }) => capabilities.some(capability => capability === step.capability)).map((step: { capability: string; dependsOn?: string[] }) => ({ capability: step.capability, dependsOn: step.dependsOn || [] })) });
      if (planned.error?.code === "PT409") return json({ error: "Objective changed before approval. Request a current plan." }, 409);
      if (planned.error) throw new AssignmentBlocked("Plan approval could not be saved. No specialist work was executed.");
      const recorded = await ctx.client.from("agent_conversation_messages").insert({ id: crypto.randomUUID(), owner_id: ctx.user.id, conversation_id: `director-objective-${ctx.goal.id}`, sender: { kind: "user", id: ctx.user.id }, recipient: { kind: "agent", id: "beastfusion.fusion-director" }, content: { text: "Authorized the supported saved-record review plan.", approvedDirectorProposalId: body.proposalId } });
      if (recorded.error) throw new AssignmentBlocked("Assignments saved, but the approval history could not be saved. Refresh before continuing.");
      await refreshObjectiveHistory(ctx);
    } else if (body.action === "cancel") {
      const cancelled = await ctx.client.rpc("record_director_cancellation", { p_goal_id: ctx.goal.id, p_goal_updated_at: ctx.goal.updated_at });
      if (cancelled.error) throw new AssignmentBlocked("Cancellation could not be recorded. No cancellation is confirmed.");
      return json({ assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id), notice: "Remaining work cancelled, including currently inaccessible modules. Verified reviews retained. Restoring permissions does not restore cancelled authorization." });
    } else if (body.action === "plan") {
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
    } else if (body.action === "supervise") {
      const outcomes = [];
      for (let step = 0; step < 2; step++) {
        const outcome = await advanceDirectorObjective({ store: ctx.store, access: ctx.access, ownerId: ctx.user.id, goalId: ctx.goal.id, now: new Date().toISOString(), leaseId: crypto.randomUUID() });
        outcomes.push(outcome);
        if (outcome.state !== "verified" || !("taskId" in outcome)) break;
      }
      return json({ outcomes, assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id) });
    } else if (body.action === "resume") {
      const outcome = await advanceDirectorObjective({ store: ctx.store, access: ctx.access, ownerId: ctx.user.id, goalId: ctx.goal.id, now: new Date().toISOString(), leaseId: crypto.randomUUID() });
      return json({ outcome, assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id) });
    } else return json({ error: "Unsupported action. Spending, publication, record changes and production operations cannot be delegated here." }, 400);
    return json({ assignments: await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id) });
  } catch (error) {
    return json({ error: error instanceof AssignmentBlocked ? error.message : "Assignment request failed. No completion has been confirmed." }, 503);
  }
}
