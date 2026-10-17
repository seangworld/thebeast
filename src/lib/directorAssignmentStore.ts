import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeHealthRecord, type HealthRecordRow } from "./health/foundation";
import { moneyCoachCashSettingsColumns, moneyCoachFundingSourceColumns } from "./digitalStaffRuntime/moneyContext";
import { AssignmentBlocked, directorCapabilities, verifySpecialistResult, type AssignmentAccess, type AssignmentStore, type DirectorAssignment, type DirectorCapability, type SpecialistSnapshot } from "./directorAssignments";

export function directorAssignmentStore(client: SupabaseClient): AssignmentStore {
  return {
    async list(ownerId, goalId) {
      const { data, error } = await client.from("beast_director_assignments").select("*").eq("owner_id", ownerId).eq("goal_id", goalId).order("created_at");
      if (error) throw new AssignmentBlocked("Saved assignments unavailable. The Director migration may not be installed.");
      return (data || []) as DirectorAssignment[];
    },
    async compareAndSwap(previous, next) {
      const { data, error } = await client.from("beast_director_assignments").update({
        status: next.status, revision: next.revision, attempts: next.attempts,
        lease_id: next.lease_id, lease_until: next.lease_until, result: next.result,
        events: next.events, blocker: next.blocker, updated_at: next.updated_at,
      }).eq("owner_id", previous.owner_id).eq("goal_id", previous.goal_id).eq("id", previous.id).eq("revision", previous.revision).select("id");
      if (error) throw new AssignmentBlocked("Assignment checkpoint could not be saved.");
      return data?.length === 1;
    },
  };
}

export function directorAssignmentAccess(client: SupabaseClient, user: User, goalId: string, authorizeModule: (module: "money" | "health") => Promise<boolean>): AssignmentAccess {
  return {
    async authorize(ownerId, capability) {
      if (ownerId !== user.id) return false;
      const override = await client.from("beast_admin_member_module_access").select("enabled").eq("member_id", ownerId).eq("module_id", directorCapabilities[capability].module).maybeSingle();
      if (override.error || override.data?.enabled === false) return false;
      return authorizeModule(directorCapabilities[capability].module);
    },
    async snapshot(ownerId, capability) {
      if (ownerId !== user.id) throw new AssignmentBlocked("Source ownership mismatch.");
      const goal = await client.from("beast_goals").select("id, title, description, category, status, current_step, updated_at").eq("owner_id", ownerId).eq("id", goalId).is("deleted_at", null).is("archived_at", null).maybeSingle();
      if (goal.error || !goal.data) throw new AssignmentBlocked("Objective unavailable or changed during execution.");
      if (["Paused", "Completed", "Archived"].includes(goal.data.status)) throw new AssignmentBlocked("Objective is no longer active; reviews cannot certify new progress.");
      return { ...await loadSpecialistSnapshot(client, ownerId, capability), objective: goal.data };
    },
  };
}

async function loadSpecialistSnapshot(client: SupabaseClient, ownerId: string, capability: DirectorCapability): Promise<SpecialistSnapshot> {
  if (capability === "health.preparation-review") {
    const { data, error } = await client.from("beast_health_records").select("id, owner_id, record_type, title, status, occurred_on, source, notes, details, created_at, updated_at").eq("owner_id", ownerId).neq("status", "archived").order("id").limit(201);
    const rows = (data || []) as HealthRecordRow[];
    const normalized = rows.map(normalizeHealthRecord).filter((row) => row !== null);
    return { ownerId, capability, complete: !error && rows.length <= 200 && normalized.length === rows.length && normalized.every((row) => row.ownerId === ownerId), health: normalized };
  }
  const results = await Promise.all([
    client.from("debts").select("id, name, balance, minimum_payment, interest_rate, due_date, next_due_date_after_payment, payment_behavior, lifecycle_status, paid_off_at, is_archived, created_at").eq("user_id", ownerId).order("id").limit(201),
    client.from("bill_events").select("id, name, amount, frequency, due_date, next_due_date_after_payment, assigned_income_date, is_archived, created_at").eq("user_id", ownerId).order("id").limit(201),
    client.from("income_events").select("id, name, amount, frequency, next_date, is_active, is_archived, created_at").eq("user_id", ownerId).order("id").limit(201),
    client.from("cash_settings").select(moneyCoachCashSettingsColumns).eq("user_id", ownerId).maybeSingle(),
    client.from("funding_sources").select(moneyCoachFundingSourceColumns).eq("user_id", ownerId).eq("is_active", true).order("id").limit(201),
    client.from("beast_goals").select("id, title, status, category, updated_at").eq("owner_id", ownerId).eq("category", "Money").is("deleted_at", null).neq("status", "Archived").order("id").limit(201),
    client.from("debt_settings").select("strategy, extra_payment, custom_debt_order").eq("user_id", ownerId).maybeSingle(),
    client.from("retirement_scenarios").select("id, name, assumptions, updated_at").eq("owner_id", ownerId).order("id").limit(201),
  ]);
  const rows = (index: number) => (results[index].data || []) as Record<string, unknown>[];
  return {
    ownerId, capability, complete: results.every((result) => !result.error && (!Array.isArray(result.data) || result.data.length <= 200)),
    money: { debts: rows(0), bills: rows(1), incomes: rows(2), cashSettings: results[3].data as Record<string, unknown> | null, fundingSources: rows(4), goals: rows(5), debtSettings: results[6].data as Record<string, unknown> | null, retirementScenarios: rows(7) },
  };
}

/** Gate reads too: saved evidence may contain private data after a permission change. */
export async function publicAssignments(store: AssignmentStore, access: AssignmentAccess, ownerId: string, goalId: string) {
  const tasks = await store.list(ownerId, goalId);
  return Promise.all(tasks.map(async (task) => {
    if (!await access.authorize(ownerId, task.capability)) return { id: task.id, capability: task.capability, status: "blocked", blocker: "Specialist permission unavailable.", dependencies: task.dependencies, attempts: task.attempts, events: [], result: null };
    // Raw snapshots contain source material and are never returned to the browser.
    const problem = task.status === "verified" ? verifySpecialistResult(task.result, await access.snapshot(ownerId, task.capability), new Date().toISOString()) : null;
    return { ...task, status: problem ? "needs_correction" : task.status, blocker: problem || task.blocker, result: task.status === "verified" && task.result && !problem ? { ...task.result, snapshot: undefined } : null };
  }));
}
