import type { DirectorReasonedPlan, DirectorReasoningContext } from "./directorReasoning";

/** Pure shared UI/server selection. This never grants permission or owner approval. */
export function readyDirectorSteps(plan: DirectorReasonedPlan, context?: DirectorReasoningContext) {
  // Legacy free-form blockers retain their original fail-closed interpretation.
  if (plan.ownerDecisions.length || plan.contradictions.length || plan.missingInformation.length) return [];
  if (plan.contractVersion !== 2 && plan.assessments.some(a => ["request_correction", "investigate"].includes(a.disposition))) return [];
  const blocked = new Set<string>((plan.requirements || []).map(r => r.scope));
  if (blocked.has("all_new_work")) return [];
  for (const a of plan.assessments) if (["request_correction", "investigate"].includes(a.disposition)) {
    const capability = context?.checkpoints.find(t => t.id === a.taskId)?.capability;
    if (capability) blocked.add(capability);
    else if (plan.steps.some(s => s.dependsOn?.length)) return []; // UI has no checkpoint mapping: conservative.
  }
  const ready: typeof plan.steps = [];
  for (const step of plan.steps) {
    if (blocked.has(step.capability) || step.dependsOn?.some(c => blocked.has(c) || plan.steps.some(s => s.capability === c) && !ready.some(s => s.capability === c))) continue;
    ready.push(step);
  }
  return ready;
}
