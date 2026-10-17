export type ReasoningCheckpoint = {
  id: string; capability: string; status: string; blocker: string | null; result: unknown;
  attempts?: number; revision?: number; dependencies?: string[]; leaseUntil?: string | null;
};
export type CheckpointGuidance = {
  taskId: string;
  action: "retain_verified" | "resume_existing" | "wait_for_lease" | "wait_for_dependencies" | "owner_correction_required" | "permission_required" | "inspect_existing";
  dependencies: string[];
};

/** Call only after publicAssignments has reverified/redacted evidence and access. */
export function reasoningCheckpointMetadata(task: {
  id: string; capability: string; status: string; blocker: string | null;
  attempts: number; dependencies: string[]; lease_until?: string | null; revision?: number;
  result: { asOf: string; limitations: string[] } | null;
}): ReasoningCheckpoint {
  return {
    id: task.id, capability: task.capability, status: task.status, blocker: task.blocker,
    attempts: task.attempts, dependencies: task.dependencies, leaseUntil: task.lease_until ?? null,
    ...(task.revision !== undefined ? { revision: task.revision } : {}),
    result: task.status === "verified" && task.result ? {
      capability: task.capability, asOf: task.result.asOf, limitations: task.result.limitations,
    } : null,
  };
}

/** Operational metadata only: no financial/clinical values or new provider access. */
export function checkpointGuidance(tasks: ReasoningCheckpoint[], available: readonly string[], now = Date.now()): CheckpointGuidance[] {
  return tasks.map(task => {
    const dependencies = task.dependencies || [];
    let action: CheckpointGuidance["action"] = "inspect_existing";
    const lease = Date.parse(task.leaseUntil || "");
    if (!available.includes(task.capability)) action = "permission_required";
    else if (task.status === "verified" && task.result) action = "retain_verified";
    else if (task.status === "running" && (!Number.isFinite(lease) || lease > now)) action = Number.isFinite(lease) ? "wait_for_lease" : "inspect_existing";
    else if (!Number.isInteger(task.attempts) || task.attempts! < 0) action = "inspect_existing";
    else if (task.attempts! >= 3) action = "owner_correction_required";
    else if (dependencies.some(id => !tasks.some(parent => parent.id === id && parent.status === "verified" && parent.result && available.includes(parent.capability)))) action = "wait_for_dependencies";
    else if (["running", "planned", "blocked", "needs_correction"].includes(task.status)) action = "resume_existing";
    return { taskId: task.id, action, dependencies };
  });
}
