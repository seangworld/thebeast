import type { SupabaseClient } from "@supabase/supabase-js";
import { AssignmentBlocked, directorCapabilities, type AssignmentStore, type AssignmentAccess } from "./directorAssignments";
import { publicAssignments } from "./directorAssignmentStore";
import { sharedDirectorEvidence, directorEvidenceSelection, type DirectorSharedEvidence } from "./directorEvidenceAccess";
import { reasoningCheckpointMetadata } from "./directorReasoningEvidence";
import type { DirectorReasoningContext } from "./directorReasoning";

export async function loadDirectorReasoningContext(ctx: { client: SupabaseClient; user: { id: string }; goal: DirectorReasoningContext["goal"]; store: AssignmentStore; access: AssignmentAccess }, selection?: unknown, ownerMessage?: string): Promise<DirectorReasoningContext> {
  const availableCapabilities: DirectorReasoningContext["availableCapabilities"] = [];
  for (const capability of Object.keys(directorCapabilities) as Array<keyof typeof directorCapabilities>) if (await ctx.access.authorize(ctx.user.id, capability)) availableCapabilities.push(capability);
  const assignments = await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id);
  const selections = directorEvidenceSelection(selection);
  let previous: DirectorSharedEvidence | undefined;
  if (selections.length) {
    const history = await ctx.client.from("agent_conversation_messages").select("content, sender").eq("owner_id", ctx.user.id).eq("conversation_id", `director-objective-${ctx.goal.id}`).order("created_at", { ascending: false }).limit(10);
    if (history.error) throw new AssignmentBlocked("Prior review history unavailable; refresh before comparing corrections.");
    previous = { selections: [], findings: (history.data || []).filter(row => row.sender?.id === "beastfusion.fusion-director").flatMap(row => Array.isArray(row.content?.directorPlan?.context?.sharedEvidence?.findings) ? row.content.directorPlan.context.sharedEvidence.findings : []) };
  }
  const sharedEvidence = await sharedDirectorEvidence(ctx.store, ctx.access, ctx.user.id, ctx.goal.id, selections, new Date().toISOString(), previous);
  const cancellation = await ctx.client.from("beast_director_cancellations").select("cancelled_at").eq("owner_id", ctx.user.id).eq("goal_id", ctx.goal.id).maybeSingle();
  if (cancellation.error) throw new AssignmentBlocked("Cancellation state unavailable.");
  return { ...(ownerMessage ? { ownerMessage } : {}), ...(cancellation.data ? { cancelledAt: cancellation.data.cancelled_at } : {}), goal: ctx.goal, availableCapabilities, checkpoints: assignments.map(reasoningCheckpointMetadata), ...(sharedEvidence ? { sharedEvidence } : {}) };
}

