import type { SupabaseClient } from "@supabase/supabase-js";
import { AssignmentBlocked, directorCapabilities, type AssignmentStore, type AssignmentAccess } from "./directorAssignments";
import { publicAssignments } from "./directorAssignmentStore";
import { sharedDirectorEvidence } from "./directorEvidenceAccess";
import { reasoningCheckpointMetadata } from "./directorReasoningEvidence";
import type { DirectorReasoningContext } from "./directorReasoning";

export async function loadDirectorReasoningContext(ctx: { client: SupabaseClient; user: { id: string }; goal: DirectorReasoningContext["goal"]; store: AssignmentStore; access: AssignmentAccess }, selection?: unknown, ownerMessage?: string): Promise<DirectorReasoningContext> {
  const availableCapabilities: DirectorReasoningContext["availableCapabilities"] = [];
  for (const capability of Object.keys(directorCapabilities) as Array<keyof typeof directorCapabilities>) if (await ctx.access.authorize(ctx.user.id, capability)) availableCapabilities.push(capability);
  const assignments = await publicAssignments(ctx.store, ctx.access, ctx.user.id, ctx.goal.id);
  const sharedEvidence = await sharedDirectorEvidence(ctx.store, ctx.access, ctx.user.id, ctx.goal.id, selection);
  const cancellation = await ctx.client.from("beast_director_cancellations").select("cancelled_at").eq("owner_id", ctx.user.id).eq("goal_id", ctx.goal.id).maybeSingle();
  if (cancellation.error) throw new AssignmentBlocked("Cancellation state unavailable.");
  return { ...(ownerMessage ? { ownerMessage } : {}), ...(cancellation.data ? { cancelledAt: cancellation.data.cancelled_at } : {}), goal: ctx.goal, availableCapabilities, checkpoints: assignments.map(reasoningCheckpointMetadata), ...(sharedEvidence ? { sharedEvidence } : {}) };
}

