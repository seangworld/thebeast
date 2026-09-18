import type { User } from "@supabase/supabase-js";
import type { createRouteClient } from "./supabase/server";
import { requireMemberModuleEntitlement } from "./memberAgeServer";
import type { DirectorContext, DirectorSignal } from "./director";
import { getDebtLifecycleLabel, getDebtLifecycleStatus } from "./debtLifecycle";

function goalSignals(rows: Record<string, unknown>[]): DirectorSignal[] {
  return rows.map((row) => ({
    id: String(row.id),
    domain:
      row.category === "Money"
        ? "money"
        : row.category === "Education" || row.category === "Career"
          ? "education"
          : row.category === "Health"
            ? "health"
            : "goals",
    label: String(row.title),
    status: String(row.status),
    date: typeof row.target_date === "string" ? row.target_date : null,
    detail:
      typeof row.current_step === "string" && row.current_step
        ? `Member goal, not an achieved fact. Current step: ${row.current_step}`
        : "Member goal, not an achieved fact. Review the saved goal and choose its next step.",
    href: "/dashboard/goals",
    source: "BeastGoals",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  }));
}

export async function loadDirectorContext(
  supabase: ReturnType<typeof createRouteClient>,
  user: User,
): Promise<DirectorContext> {
  const ownerId = user.id;
  const [moneyAccess, healthAccess] = await Promise.all([
    requireMemberModuleEntitlement("money", { supabase, user }),
    requireMemberModuleEntitlement("health", { supabase, user }),
  ]);
  const empty = { data: [], error: null };
  const allowedSpecialists = [
    "beasteducation.guidance-counselor",
    ...(moneyAccess.ok ? ["beastmoney.money-coach"] : []),
    ...(healthAccess.ok ? ["beasthealth.health-advisor"] : []),
  ];
  const [goals, debts, health, roadmaps, documents, conversations] =
    await Promise.all([
      supabase
        .from("beast_goals")
        .select(
          "id, title, category, status, target_date, current_step, updated_at",
        )
        .eq("owner_id", ownerId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .neq("status", "Archived")
        .order("updated_at", { ascending: false })
        .limit(20),
      moneyAccess.ok
        ? supabase
            .from("debts")
            .select(
              "id, name, balance, minimum_payment, next_due_date_after_payment, payment_behavior, lifecycle_status, is_archived",
            )
            .eq("user_id", ownerId)
            .eq("is_archived", false)
            .limit(20)
        : empty,
      healthAccess.ok
        ? supabase
            .from("beast_health_records")
            .select("id, record_type, title, status, occurred_on, updated_at")
            .eq("owner_id", ownerId)
            .neq("status", "archived")
            .order("updated_at", { ascending: false })
            .limit(20)
        : empty,
      supabase
        .from("education_career_roadmaps")
        .select("id, title, status, progress, updated_at")
        .eq("owner_id", ownerId)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("beast_documents")
        .select("id, title, category, status, updated_at")
        .eq("owner_id", ownerId)
        .neq("status", "Deleted")
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("agent_conversations")
        .select("agent_id, summary, updated_at")
        .eq("owner_id", ownerId)
        .in("agent_id", allowedSpecialists)
        .eq("archived", false)
        .order("updated_at", { ascending: false })
        .limit(12),
    ]);

  const signals: DirectorSignal[] = [
    ...(goals.error
      ? []
      : goalSignals((goals.data || []) as Record<string, unknown>[])),
    ...(debts.error
      ? []
      : ((debts.data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          domain: "money" as const,
          label: String(row.name),
          status: getDebtLifecycleLabel(getDebtLifecycleStatus(row)),
          date:
            typeof row.next_due_date_after_payment === "string"
              ? row.next_due_date_after_payment
              : null,
          detail:
            "Balance and minimum payment are available in BeastMoney. Review the current record before acting.",
          href: "/dashboard/money/debts",
          source: "BeastMoney debt record",
          updatedAt: null,
        }))),
    ...(health.error
      ? []
      : ((health.data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          domain: "health" as const,
          label: String(row.title),
          status: String(row.status),
          date: typeof row.occurred_on === "string" ? row.occurred_on : null,
          detail: `Saved ${String(row.record_type).replaceAll("_", " ")} record. Medical meaning must remain with a qualified clinician.`,
          href: "/dashboard/health",
          source: "BeastHealth record",
          updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
        }))),
    ...(roadmaps.error
      ? []
      : ((roadmaps.data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          domain: "education" as const,
          label: String(row.title),
          status: String(row.status),
          date: null,
          detail: `Saved education or career plan at ${Number(row.progress || 0)}% progress.`,
          href: "/dashboard/education/education-planning",
          source: "BeastEducation roadmap",
          updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
        }))),
  ];
  const unavailableSources = [
    goals.error ? "BeastGoals" : "",
    debts.error || !moneyAccess.ok ? "BeastMoney" : "",
    health.error || !healthAccess.ok ? "BeastHealth" : "",
    roadmaps.error ? "BeastEducation" : "",
    documents.error ? "BeastDocuments" : "",
    conversations.error ? "specialist conversation summaries" : "",
  ].filter(Boolean);
  const specialistNames: Record<string, { name: string; href: string }> = {
    "beastmoney.money-coach": {
      name: "Money Coach",
      href: "/dashboard/money/coach",
    },
    "beasteducation.guidance-counselor": {
      name: "Guidance Counselor",
      href: "/dashboard/education/guidance-counselor",
    },
    "beasthealth.health-advisor": {
      name: "Health Advisor",
      href: "/dashboard/health/ai-advisor",
    },
  };
  const seen = new Set<string>();
  const specialistSummaries = conversations.error
    ? []
    : ((conversations.data || []) as Record<string, unknown>[]).flatMap(
        (row) => {
          const professionalId = String(row.agent_id);
          if (seen.has(professionalId)) return [];
          seen.add(professionalId);
          const overview =
            row.summary && typeof row.summary === "object"
              ? (row.summary as Record<string, unknown>).overview
              : null;
          const professional = specialistNames[professionalId];
          if (!professional || typeof overview !== "string" || !overview.trim())
            return [];
          return [
            {
              professionalId,
              professionalName: professional.name,
              summary: overview.trim(),
              updatedAt: String(row.updated_at),
              href: professional.href,
            },
          ];
        },
      );

  return { signals, specialistSummaries, unavailableSources };
}
