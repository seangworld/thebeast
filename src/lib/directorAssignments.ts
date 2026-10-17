import { buildMoneyCoachStructuredRecords, type MoneyCoachContextRows } from "./digitalStaffRuntime/moneyContext";
import { buildHealthAdvisorModel } from "./health/healthAdvisor";
import type { HealthRecord } from "./health/foundation";

/** Closed capability registry: no arbitrary tool names, URLs, prompts or side effects. */
export const directorCapabilities = {
  "money.cash-review": { specialist: "beastmoney.money-coach", module: "money", label: "Calculate saved cash position", acceptance: "Recompute canonical cash intelligence from a complete current snapshot." },
  "health.preparation-review": { specialist: "beasthealth.health-advisor", module: "health", label: "Prepare saved health record review", acceptance: "Recompute the Health Advisor preparation model from current permitted records." },
} as const;
export type DirectorCapability = keyof typeof directorCapabilities;
export type AssignmentStatus = "planned" | "running" | "verified" | "needs_correction" | "blocked";
export type AssignmentEvent = { at: string; status: AssignmentStatus; detail: string };
export type DirectorAssignment = {
  id: string; owner_id: string; goal_id: string; capability: DirectorCapability;
  status: AssignmentStatus; dependencies: string[]; attempts: number; revision: number;
  lease_id: string | null; lease_until: string | null; result: SpecialistResult | null;
  events: AssignmentEvent[]; blocker: string | null; updated_at: string;
};
export type SpecialistSnapshot = {
  ownerId: string; capability: DirectorCapability; complete: boolean;
  objective?: unknown;
  money?: MoneyCoachContextRows; health?: HealthRecord[];
};
export type SpecialistResult = {
  capability: DirectorCapability; specialist: string; asOf: string;
  snapshot: string; output: unknown; limitations: string[];
};
export class AssignmentBlocked extends Error {}

export function isDirectorCapability(value: unknown): value is DirectorCapability {
  return typeof value === "string" && Object.hasOwn(directorCapabilities, value);
}

// Canonical serialization binds evidence to values, including settings without timestamps.
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** Actual integrated specialist calculations, also used by the existing specialists. No LLM success messages. */
export function executeSpecialist(snapshot: SpecialistSnapshot, asOf: string): SpecialistResult {
  if (!snapshot.complete) throw new AssignmentBlocked("Source data unavailable, missing, or truncated. Review cannot be verified.");
  if (!Number.isFinite(Date.parse(asOf))) throw new AssignmentBlocked("Invalid checkpoint date.");
  let output: unknown;
  if (snapshot.capability === "money.cash-review" && snapshot.money) {
    const numeric = (value: unknown) => (typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number.isFinite(Number(value));
    if (!snapshot.money.cashSettings || !snapshot.money.incomes.some((row) => row.is_active !== false && row.is_archived !== true)) throw new AssignmentBlocked("Save cash settings and active income records before calculating a cash review.");
    if (![snapshot.money.cashSettings.starting_balance, snapshot.money.cashSettings.checking_buffer].every(numeric)
      || [...snapshot.money.incomes, ...snapshot.money.bills].some((row) => !numeric(row.amount))
      || snapshot.money.debts.some((row) => !numeric(row.balance) || !numeric(row.minimum_payment))) throw new AssignmentBlocked("Required saved financial amounts are missing or invalid; unknown values cannot be certified as zero.");
    output = buildMoneyCoachStructuredRecords(snapshot.money, new Date(asOf))[0].record;
  } else if (snapshot.capability === "health.preparation-review" && snapshot.health) {
    if (!snapshot.health.length) throw new AssignmentBlocked("No permitted saved health records to review.");
    output = buildHealthAdvisorModel({ records: snapshot.health, asOf: asOf.slice(0, 10) });
  } else throw new AssignmentBlocked("Specialist has no supported execution capability for this assignment.");
  return {
    capability: snapshot.capability, specialist: directorCapabilities[snapshot.capability].specialist,
    asOf, snapshot: canonical(snapshot), output,
    limitations: ["Saved-record review only; this does not complete the underlying life goal.", "No external research, medical judgment, transaction, publication or production action was performed."],
  };
}

/** Never accept specialist prose, persisted status, or self-reported success as proof. */
export function verifySpecialistResult(result: SpecialistResult | null, snapshot: SpecialistSnapshot, now: string): string | null {
  if (!result || result.capability !== snapshot.capability || result.specialist !== directorCapabilities[snapshot.capability].specialist) return "Missing or mismatched specialist evidence.";
  if (result.snapshot !== canonical(snapshot)) return "Source records changed; request correction using current records.";
  const age = Date.parse(now) - Date.parse(result.asOf);
  if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000 || now.slice(0, 10) !== result.asOf.slice(0, 10)) return "Evidence is stale; request a fresh review.";
  try {
    const expected = executeSpecialist(snapshot, result.asOf);
    if (canonical(expected.output) !== canonical(result.output)) return "Result does not match the specialist calculation; correction required.";
  } catch (error) { return error instanceof AssignmentBlocked ? error.message : "Verification failed."; }
  return null;
}

export interface AssignmentStore {
  list(ownerId: string, goalId: string): Promise<DirectorAssignment[]>;
  compareAndSwap(previous: DirectorAssignment, next: DirectorAssignment): Promise<boolean>;
}
export type AssignmentAccess = {
  authorize(ownerId: string, capability: DirectorCapability): Promise<boolean>;
  snapshot(ownerId: string, capability: DirectorCapability): Promise<SpecialistSnapshot>;
};

function transition(task: DirectorAssignment, status: AssignmentStatus, detail: string, now: string): DirectorAssignment {
  return { ...task, status, revision: task.revision + 1, updated_at: now, blocker: status === "verified" ? null : detail, events: [...task.events, { at: now, status, detail }] };
}

/** A new retry cycle needs an explicit member request; verified work cannot be reset. */
export async function authorizeDirectorCorrection(input: { store: AssignmentStore; access: AssignmentAccess; ownerId: string; goalId: string; taskId: string; now: string }) {
  const task = (await input.store.list(input.ownerId, input.goalId)).find((item) => item.id === input.taskId);
  if (!task || task.owner_id !== input.ownerId || task.goal_id !== input.goalId) throw new AssignmentBlocked("Assignment unavailable.");
  if (task.status === "running") throw new AssignmentBlocked("Resume the active or expired execution before requesting another correction cycle.");
  if (!await input.access.authorize(input.ownerId, task.capability)) throw new AssignmentBlocked("Specialist permission unavailable.");
  if (task.status === "verified" && !verifySpecialistResult(task.result, await input.access.snapshot(input.ownerId, task.capability), input.now)) throw new AssignmentBlocked("Current verified work will not be repeated.");
  const next = transition(task, "planned", "Member explicitly authorized a new correction cycle. Prior checkpoint history retained.", input.now);
  next.attempts = 0; next.result = null; next.lease_id = null; next.lease_until = null;
  return input.store.compareAndSwap(task, next);
}

/** One bounded checkpoint per explicit resume request. CAS lease prevents duplicate execution. */
export async function advanceDirectorObjective(input: {
  store: AssignmentStore; access: AssignmentAccess; ownerId: string; goalId: string;
  now: string; leaseId: string;
  execute?: typeof executeSpecialist;
}) {
  const { store, access, ownerId, goalId, now } = input;
  const tasks = await store.list(ownerId, goalId);
  if (tasks.some((task) => task.owner_id !== ownerId || task.goal_id !== goalId || !isDirectorCapability(task.capability))) throw new AssignmentBlocked("Invalid assignment ownership or capability.");
  // Revalidate completed checkpoints before satisfying dependencies or claiming completion.
  for (const task of tasks.filter((item) => item.status === "verified")) {
    const allowed = await access.authorize(ownerId, task.capability);
    const problem = !allowed ? "Specialist permission is no longer available." : verifySpecialistResult(task.result, await access.snapshot(ownerId, task.capability), now);
    if (problem) {
      const corrected = transition(task, "needs_correction", problem, now);
      corrected.result = null;
      if (!await store.compareAndSwap(task, corrected)) return { state: "busy" as const };
      return { state: "needs_correction" as const, taskId: task.id, detail: problem };
    }
  }
  if (tasks.length && tasks.every((task) => task.status === "verified")) return { state: "verified" as const, detail: "All approved saved-record reviews verified. The underlying goal is not marked complete." };
  const runnable = tasks.filter((item) => item.status !== "verified" && (item.status !== "running" || Date.parse(item.lease_until || "") <= Date.parse(now)) && item.dependencies.every((id) => tasks.some((dependency) => dependency.id === id && dependency.status === "verified")));
  let task: DirectorAssignment | undefined;
  let permissionBlocker: string | null = null;
  // A revoked independent assignment must not starve other approved work.
  // Keep denied rows blocked without reading their records or consuming attempts.
  for (const candidate of runnable) {
    if (candidate.attempts >= 3 || await access.authorize(ownerId, candidate.capability)) { task = candidate; break; }
    const blocked = transition(candidate, "blocked", "Specialist permission unavailable. No module records were read.", now);
    if (!await store.compareAndSwap(candidate, blocked)) return { state: "busy" as const };
    permissionBlocker = blocked.blocker;
  }
  if (!task) return { state: "blocked" as const, detail: permissionBlocker || "No runnable assignment. Check dependencies or an active execution lease." };
  if (task.attempts >= 3) {
    const detail = "Retry limit reached. Authorize a correction cycle on this existing checkpoint after resolving its blocker; do not create replacement work.";
    // Make an expired running row visible to the existing explicit-correction UI.
    const blocked = transition(task, "blocked", detail, now);
    blocked.lease_id = null; blocked.lease_until = null; blocked.result = null;
    if (task.status !== "blocked" && !await store.compareAndSwap(task, blocked)) return { state: "busy" as const };
    return { state: "blocked" as const, detail };
  }
  if (!await access.authorize(ownerId, task.capability)) {
    const blocked = transition(task, "blocked", "Specialist permission unavailable. No module records were read.", now);
    if (!await store.compareAndSwap(task, blocked)) return { state: "busy" as const };
    return { state: "blocked" as const, detail: blocked.blocker };
  }
  const claimed = transition(task, "running", "Specialist checkpoint claimed.", now);
  claimed.lease_id = input.leaseId;
  claimed.lease_until = new Date(Date.parse(now) + 60_000).toISOString();
  claimed.attempts++;
  if (!await store.compareAndSwap(task, claimed)) return { state: "busy" as const };
  let finished: DirectorAssignment;
  try {
    const snapshot = await access.snapshot(ownerId, task.capability);
    if (snapshot.ownerId !== ownerId || snapshot.capability !== task.capability) throw new AssignmentBlocked("Invalid source ownership or capability.");
    const result = (input.execute || executeSpecialist)(snapshot, now);
    // Independently reload source records and recheck access after execution.
    if (!await access.authorize(ownerId, task.capability)) throw new AssignmentBlocked("Permission changed during execution.");
    const problem = verifySpecialistResult(result, await access.snapshot(ownerId, task.capability), now);
    if (!await access.authorize(ownerId, task.capability)) throw new AssignmentBlocked("Permission changed during result verification.");
    finished = transition(claimed, problem ? "needs_correction" : "verified", problem || "Specialist result recomputed and source snapshot verified.", now);
    finished.result = problem ? null : result;
  } catch (error) {
    finished = transition(claimed, "blocked", error instanceof AssignmentBlocked ? error.message : "Specialist execution failed. Retry is available within the attempt limit.", now);
    finished.result = null;
  }
  finished.lease_id = null; finished.lease_until = null;
  if (!await store.compareAndSwap(claimed, finished)) return { state: "busy" as const };
  return { state: finished.status, taskId: task.id, detail: finished.events.at(-1)?.detail };
}
