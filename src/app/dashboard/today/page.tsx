"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { useRuntimeToday } from "@/lib/hooks/useRuntimeToday";
import { getBeastGreeting } from "@/lib/runtimeDate";
import { createClient } from "@/lib/supabase/client";
import { getProfileDisplayName } from "@/lib/profile";
import { buildCurrentAuthLoginPath } from "@/lib/auth/experience";
import {
  calculateMonthlyRecurringTotal,
  isActiveRecurringSource,
  numberValue,
} from "@/lib/financialMetrics";
import { buildMobileTodayCards } from "@/lib/mobileSharedServices";
import { buildBeastOSIntelligence } from "@/lib/platform/recommendationEngine";
import type {
  PlatformActivity,
  PlatformTimelineEvent,
} from "@/lib/platform/types";
import {
  normalizeHealthRecord,
  type HealthRecord,
  type HealthRecordRow,
} from "@/lib/health/foundation";
import {
  getGoalProgressPercent,
  loadUserGoals,
  type BeastGoalDataClient,
  type Goal,
} from "@/lib/platform/goals";
import {
  assembleTodayDayPlan,
  buildManualTodayContribution,
  buildTodayItemActionRequest,
  getTodayContributionExplanation,
  getTodayItemActionAvailability,
  todayContributionSources,
  type TodayContribution,
  type TodayItemActionRequest,
  type TodayItemActionType,
} from "@/lib/platform/today";
import {
  buildEducationPlanningContributions,
  buildHealthTodayContributions,
  buildHealthUpcomingEvents,
  getTodayProfessionalLabel,
} from "@/lib/platform/todayGenerationOne";
import { rankGoalsForToday } from "@/lib/platform/lifePlanning";

type ProfileNameRow = {
  preferred_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
};

type MoneyDebt = {
  id: string;
  name?: string | null;
  balance?: number | null;
  minimum_payment?: number | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  assigned_income_date?: string | null;
  created_at?: string | null;
};

type MoneyBill = {
  id: string;
  name?: string | null;
  amount?: number | null;
  frequency?: string | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  next_due_date_after_payment?: string | null;
  assigned_income_date?: string | null;
  created_at?: string | null;
};

type MoneyIncome = {
  id: string;
  name?: string | null;
  amount?: number | null;
  frequency?: string | null;
  next_date?: string | null;
  is_active?: boolean | null;
  is_archived?: boolean | null;
};

type MoneySettings = {
  starting_balance?: number | null;
  checking_buffer?: number | null;
};

type MoneyPayment = {
  id: string;
  amount?: number | null;
  amount_paid?: number | null;
  payment_date?: string | null;
  created_at?: string | null;
};

type TodayState = {
  name: string;
  healthRecords: HealthRecord[];
  debts: MoneyDebt[];
  bills: MoneyBill[];
  incomes: MoneyIncome[];
  cashSettings: MoneySettings | null;
  billPayments: MoneyPayment[];
  debtPayments: MoneyPayment[];
  goals: Goal[];
};

const emptyState: TodayState = {
  name: "",
  healthRecords: [],
  debts: [],
  bills: [],
  incomes: [],
  cashSettings: null,
  billPayments: [],
  debtPayments: [],
  goals: [],
};

export default function TodayPage() {
  const router = useRouter();
  const [state, setState] = useState<TodayState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionRequest, setActionRequest] =
    useState<TodayItemActionRequest | null>(null);
  const [manualItemTitle, setManualItemTitle] = useState("");
  const [manualTodayItems, setManualTodayItems] = useState<TodayContribution[]>([]);
  const { now } = useRuntimeToday();
  const todayDate = now.toISOString().slice(0, 10);

  const loadToday = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (userError || !authUser) {
        router.replace(buildCurrentAuthLoginPath());
        return;
      }

      const [
        profileResult,
        healthRecordsResult,
        debtsResult,
        billsResult,
        incomesResult,
        cashSettingsResult,
        billPaymentsResult,
        debtPaymentsResult,
        goalsResult,
      ] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("preferred_name, display_name, full_name, username")
            .eq("id", authUser.id)
            .maybeSingle(),
          supabase
            .from("beast_health_records")
            .select(
              "id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at"
            )
            .eq("owner_id", authUser.id)
            .neq("status", "archived"),
          supabase.from("debts").select("*").eq("user_id", authUser.id),
          supabase
            .from("bill_events")
            .select("*")
            .eq("user_id", authUser.id)
            .order("due_date", { ascending: true }),
          supabase
            .from("income_events")
            .select("*")
            .eq("user_id", authUser.id)
            .order("next_date", { ascending: true }),
          supabase
            .from("cash_settings")
            .select("*")
            .eq("user_id", authUser.id)
            .maybeSingle(),
          supabase
            .from("bill_payments")
            .select("*")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("debt_payments")
            .select("*")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(8),
          loadUserGoals(supabase as unknown as BeastGoalDataClient),
        ]);

      if (profileResult.error) throw profileResult.error;

      setState({
        name: getProfileDisplayName(
          (profileResult.data as ProfileNameRow | null) || null,
          authUser
        ),
        healthRecords: healthRecordsResult.error
          ? []
          : ((healthRecordsResult.data || []) as HealthRecordRow[])
              .map(normalizeHealthRecord)
              .filter((record): record is HealthRecord => record !== null),
        debts: (debtsResult.data || []) as MoneyDebt[],
        bills: (billsResult.data || []) as MoneyBill[],
        incomes: (incomesResult.data || []) as MoneyIncome[],
        cashSettings: cashSettingsResult.data as MoneySettings | null,
        billPayments: (billPaymentsResult.data || []) as MoneyPayment[],
        debtPayments: (debtPaymentsResult.data || []) as MoneyPayment[],
        goals: goalsResult.goals,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "BeastOS had trouble opening Today. Try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const moneySnapshot = useMemo(() => {
    const activeDebts = state.debts.filter(
      (debt) => !debt.is_archived && numberValue(debt.balance) > 0
    );
    const activeBills = state.bills.filter((bill) => !bill.is_archived);

    return {
      activeDebts,
      activeBills,
      monthlyIncome: calculateMonthlyRecurringTotal(
        state.incomes.filter(isActiveRecurringSource)
      ),
      monthlyBills: calculateMonthlyRecurringTotal(activeBills),
      debtMinimums: activeDebts.reduce(
        (sum, debt) => sum + numberValue(debt.minimum_payment),
        0
      ),
      startingCash: numberValue(state.cashSettings?.starting_balance),
      buffer: numberValue(state.cashSettings?.checking_buffer),
    };
  }, [state]);
  const moneyIntelligence = useMemo(
    () =>
      buildBeastOSIntelligence({
        ...moneySnapshot,
        billPayments: state.billPayments,
        debtPayments: state.debtPayments,
        now,
      }),
    [
      moneySnapshot,
      now,
      state.billPayments,
      state.debtPayments,
    ]
  );
  const educationContributions = useMemo(
    () =>
      buildEducationPlanningContributions({
        goals: state.goals,
        today: todayDate,
      }),
    [state.goals, todayDate]
  );
  const healthContributions = useMemo(
    () =>
      buildHealthTodayContributions({
        records: state.healthRecords,
        today: todayDate,
      }),
    [state.healthRecords, todayDate]
  );
  const lifePlanningContributions = useMemo<TodayContribution[]>(
    () =>
      rankGoalsForToday(state.goals, now)
        .filter(
          ({ goal }) =>
            goal.category !== "Education" && goal.category !== "Career"
        )
        .slice(0, 5)
        .map(({ goal, overdueMilestones, score }) => ({
          id: `goal-${goal.id}`,
          source: goal.sourceModule || "goals",
          type: "Goal Action",
          title: goal.title,
          summary:
            goal.currentStep ||
            goal.description ||
            goal.summary ||
            "Review this goal and choose the next measurable step.",
          reason:
            overdueMilestones > 0
              ? `${overdueMilestones} milestone${overdueMilestones === 1 ? " is" : "s are"} overdue.`
              : `${goal.priority || "Medium"} priority shared goal in the Life Planning Hub.`,
          recommendedAction: goal.currentStep || "Review the goal",
          actionUrl: "/dashboard/goals",
          activeDate: todayDate,
          timing: "Active",
          priority: goal.priority || "Medium",
          importance: Math.min(10, Math.max(1, Math.round(score / 50))),
          urgency: overdueMilestones > 0 ? 10 : goal.targetDate ? 7 : 4,
          preferenceWeight: 6,
          estimatedMinutes: 10,
          relatedGoalId: goal.id,
          dismissible: true,
          status: "Active",
          sourceEvidenceIds: [goal.id],
        })),
    [now, state.goals, todayDate]
  );
  const moneyContributions = useMemo<TodayContribution[]>(
    () =>
      moneyIntelligence.recommendations.map((recommendation) => ({
        id: `today-${recommendation.id}`,
        source: "money",
        type: "Recommendation",
        title: recommendation.title,
        summary: recommendation.summary,
        reason: recommendation.reason,
        recommendedAction: recommendation.recommendedAction,
        actionUrl: recommendation.actionUrl || "/dashboard/money",
        activeDate: todayDate,
        timing: "Active",
        priority: recommendation.priority,
        importance:
          recommendation.priority === "Critical"
            ? 10
            : recommendation.priority === "High"
              ? 8
              : recommendation.priority === "Medium"
                ? 5
                : 2,
        urgency:
          recommendation.priority === "Critical"
            ? 10
            : recommendation.priority === "High"
              ? 8
              : recommendation.priority === "Medium"
                ? 5
                : 2,
        preferenceWeight: 5,
        estimatedMinutes: 10,
        dismissible: recommendation.dismissible,
        status: recommendation.completed ? "Completed" : "Active",
        sourceEvidenceIds: [recommendation.id],
      })),
    [moneyIntelligence.recommendations, todayDate]
  );
  const todayDayPlan = useMemo(
    () =>
      assembleTodayDayPlan({
        contributions: [
          ...educationContributions,
          ...healthContributions,
          ...moneyContributions,
          ...lifePlanningContributions,
          ...manualTodayItems,
        ],
        today: todayDate,
      }),
    [
      educationContributions,
      healthContributions,
      lifePlanningContributions,
      manualTodayItems,
      moneyContributions,
      todayDate,
    ]
  );
  const primaryPriority = todayDayPlan.active[0] || null;
  const primaryPriorityExplanation = primaryPriority
    ? getTodayContributionExplanation(primaryPriority)
    : null;
  const primaryActionAvailability = primaryPriority
    ? getTodayItemActionAvailability(primaryPriority)
    : null;
  const actionButtons: { action: TodayItemActionType; label: string }[] = [
    { action: "Dismiss", label: "Dismiss" },
    { action: "Snooze", label: "Snooze 1h" },
    { action: "Complete", label: "Complete" },
    { action: "Reschedule", label: "Tomorrow" },
  ];
  const mobileTodayCards = useMemo(
    () => buildMobileTodayCards(todayDayPlan.active, 3),
    [todayDayPlan.active]
  );
  const professionalRecommendations = useMemo(
    () =>
      todayDayPlan.active
        .filter((item) =>
          ["learning", "money", "health"].includes(item.source)
        )
        .slice(0, 4),
    [todayDayPlan.active]
  );
  const recentActivity = useMemo<PlatformActivity[]>(
    () =>
      [
        ...moneyIntelligence.activities,
        ...state.goals.map((goal) => ({
          id: `goal-update-${goal.id}`,
          module: "goals" as const,
          title: `${goal.title} updated`,
          summary: goal.currentStep || goal.description || goal.summary || "Goal details changed.",
          timestamp: goal.updatedAt,
          actionUrl: "/dashboard/goals",
        })),
      ]
      .filter((item) => item.timestamp.slice(0, 10) === todayDate)
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() -
          new Date(left.timestamp).getTime()
      )
      .slice(0, 5),
    [moneyIntelligence.activities, state.goals, todayDate]
  );
  const upcomingEvents = useMemo<PlatformTimelineEvent[]>(
    () =>
      [
        ...moneyIntelligence.timelineEvents,
        ...buildHealthUpcomingEvents({ records: state.healthRecords, now }),
        ...state.goals.flatMap((goal) => [
          ...(goal.targetDate
            ? [{
                id: `goal-deadline-${goal.id}`,
                module: "goals" as const,
                title: `${goal.title} target date`,
                summary: goal.currentStep || "Review the goal before its target date.",
                timestamp: `${goal.targetDate}T12:00:00.000Z`,
                actionUrl: "/dashboard/goals",
              }]
            : []),
          ...goal.milestones.filter((milestone) => milestone.targetDate && milestone.status !== "Completed" && milestone.status !== "Skipped").map((milestone) => ({
            id: `goal-milestone-${milestone.id}`,
            module: "goals" as const,
            title: milestone.title,
            summary: `Milestone for ${goal.title}`,
            timestamp: `${milestone.targetDate}T12:00:00.000Z`,
            actionUrl: "/dashboard/goals",
          })),
        ]),
      ]
        .filter((item) => new Date(item.timestamp).getTime() >= now.getTime())
        .sort(
          (left, right) =>
            new Date(left.timestamp).getTime() -
            new Date(right.timestamp).getTime()
        )
        .slice(0, 5),
    [moneyIntelligence.timelineEvents, now, state.goals, state.healthRecords]
  );
  const activeGoals = useMemo(
    () =>
      rankGoalsForToday(state.goals, now)
        .slice(0, 3)
        .map(({ goal }) => goal),
    [now, state.goals]
  );

  function handleTodayAction(
    contribution: TodayContribution,
    action: TodayItemActionType
  ) {
    const requestedAt = new Date().toISOString();
    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const rescheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
    rescheduledFor.setHours(9, 0, 0, 0);

    const request = buildTodayItemActionRequest({
      contribution,
      action,
      requestedAt,
      reason: `${action} requested from BeastOS Today for ${contribution.source}.`,
      snoozedUntil: action === "Snooze" ? snoozedUntil : undefined,
      rescheduledFor:
        action === "Reschedule" ? rescheduledFor.toISOString() : undefined,
    });

    setActionRequest(request);
    setMessage(
      `${action} request sent to ${request.source}.`
    );
  }

  function addManualTodayItem() {
    const title = manualItemTitle.trim();
    if (!title) {
      setMessage("Add a title before adding a manual Today item.");
      return;
    }

    const manualContribution = buildManualTodayContribution({
      id: `manual-${Date.now()}`,
      title,
      activeDate: todayDate,
      priority: "Medium",
      estimatedMinutes: 15,
    });

    setManualTodayItems((current) => [...current, manualContribution]);
    setManualItemTitle("");
    setMessage("Manual Today item added to the BeastOS daily plan.");
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-7">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label="BeastOS Command Center" />
              <h1 className="beast-title">
                {state.name ? `${getBeastGreeting(now)}, ${state.name}` : "Today"}
              </h1>
              <p className="beast-subtitle">
                BeastOS brings together what needs attention, what changed, and
                the clearest next action across your connected applications.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/timeline" className="beast-button-secondary">
                What changed
              </Link>
              <Link href="/dashboard/notifications" className="beast-button">
                Review alerts
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <DashboardCard accent="beastos">
            <p className="text-sm font-semibold text-[#dbe3ef]">{message}</p>
          </DashboardCard>
        ) : null}

        {loading ? (
          <DashboardCard accent="learning">
            <div className="grid animate-pulse gap-3">
              <div className="h-5 w-36 rounded bg-[#2a3242]" />
              <div className="h-10 w-full max-w-xl rounded bg-[#2a3242]" />
              <div className="h-16 rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : null}

        <section
          className="space-y-3 md:hidden"
          data-mobile-shared-service="today"
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Priorities", todayDayPlan.active.length],
              ["Changes", recentActivity.length],
              ["Upcoming", upcomingEvents.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-lg border border-[#2a3242] bg-[#111827] p-3"
              >
                <div className="truncate text-[10px] font-black uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-1 text-xl font-black text-white">{value}</div>
              </div>
            ))}
          </div>

          {mobileTodayCards.map((card) => (
            <div
              key={card.id}
              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ModuleBadge module={card.source} />
                {card.metadata.slice(0, 3).map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#2a3242] px-2.5 py-1 text-[11px] font-bold text-[#c7cfdb]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 break-words text-lg font-black text-white">
                {card.title}
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-[#c7cfdb]">
                {card.summary}
              </p>
              <p className="mt-2 break-words text-xs font-semibold leading-5 text-[#9aa7b8]">
                Why it matters:{" "}
                {
                  todayDayPlan.active.find((item) => item.id === card.id)
                    ?.reason
                }
              </p>
              <Link href={card.href} className="mt-4 flex w-full justify-center beast-button">
                {card.actionLabel}
              </Link>
            </div>
          ))}

          {primaryPriority && primaryActionAvailability ? (
            <div
              className="grid grid-cols-2 gap-2"
              data-mobile-today-source-actions="module-contract-event"
            >
              {actionButtons.map(({ action, label }) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleTodayAction(primaryPriority, action)}
                  disabled={!primaryActionAvailability[action]}
                  className="min-h-[44px] rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <DashboardCard accent="beastos" className="hidden md:block">
          <SectionHeader
            eyebrow="What needs my attention?"
            title="Today's Priorities"
            description={`${todayDayPlan.headline}. ${todayDayPlan.summary}`}
            action={
              <ModuleBadge
                module="beastos"
                label={`${todayDayPlan.active.length} active`}
              />
            }
          />
          <div className="mt-5 grid gap-3">
            {todayDayPlan.active.slice(0, 5).map((item, index) => {
              const explanation = getTodayContributionExplanation(item);
              const availability = getTodayItemActionAvailability(item);

              return (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    index === 0
                      ? "border-[#38bdf8]/45 bg-[#38bdf8]/10"
                      : "border-[#2a3242] bg-[#111827]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ModuleBadge
                      module={item.source === "plans" ? "beastos" : item.source}
                    />
                    <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">
                      {index === 0 ? "Start here" : item.priority}
                    </span>
                    {item.estimatedMinutes ? (
                      <span className="text-xs font-bold text-[#9aa7b8]">
                        About {item.estimatedMinutes} min
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                      <h2 className="text-xl font-black text-white">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                        {item.summary}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#dbe3ef]">
                        Why this matters: {item.reason}
                      </p>
                      <details className="mt-2 text-xs text-[#9aa7b8]">
                        <summary className="cursor-pointer font-bold">
                          Explain why shown
                        </summary>
                        <p className="mt-2 leading-5">
                          {explanation.displayReason}
                        </p>
                      </details>
                    </div>
                    <Link href={item.actionUrl} className="beast-button">
                      {item.recommendedAction}
                    </Link>
                  </div>
                  {index === 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {actionButtons.map(({ action, label }) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => handleTodayAction(item, action)}
                          disabled={!availability[action]}
                          className="rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
            {todayDayPlan.active.length === 0 ? (
              <div className="rounded-xl border border-green-400/25 bg-green-400/10 p-4">
                <h2 className="font-black text-green-100">
                  Nothing urgent needs your attention
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                  Your professionals have not supplied an active priority from
                  your current records.
                </p>
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="What are my professionals recommending?"
            title="Professional Recommendations"
            description="Only recommendations supported by your current module records appear here."
          />
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {professionalRecommendations.map((item) => (
              <article
                key={`professional-${item.id}`}
                className="flex h-full flex-col rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-[#9aa7b8]">
                    {getTodayProfessionalLabel(item.source)}
                  </div>
                  <ModuleBadge
                    module={item.source === "plans" ? "beastos" : item.source}
                  />
                </div>
                <h3 className="mt-3 text-lg font-black text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                  {item.summary}
                </p>
                <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-[#dbe3ef]">
                  Why it matters: {item.reason}
                </p>
                <Link href={item.actionUrl} className="mt-4 beast-button">
                  {item.recommendedAction}
                </Link>
              </article>
            ))}
            {professionalRecommendations.length === 0 ? (
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#c7cfdb] lg:col-span-2">
                No professional has raised a recommendation supported by your
                current records. Today will surface one when a module has
                something useful to say.
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardCard accent="timeline">
            <SectionHeader
              eyebrow="What changed today?"
              title="Recent Activity"
              description="Meaningful changes from your active modules."
            />
            <div className="mt-5 grid gap-3">
              {recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={item.actionUrl || "/dashboard/timeline"}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8]/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ModuleBadge module={item.module} />
                    <span className="text-xs font-bold text-[#9aa7b8]">
                      {new Date(item.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="mt-2 font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#c7cfdb]">
                    {item.summary}
                  </p>
                </Link>
              ))}
              {recentActivity.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <h3 className="font-black text-white">No new activity yet</h3>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    Meaningful changes recorded by your active modules will
                    appear here.
                  </p>
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard accent="calendar">
            <SectionHeader
              eyebrow="What is coming?"
              title="Upcoming Events"
              description="Source-owned dates that may affect your next decision."
            />
            <div className="mt-5 grid gap-3">
              {upcomingEvents.map((item) => (
                <Link
                  key={item.id}
                  href={item.actionUrl || "/dashboard/calendar"}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8]/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ModuleBadge module={item.module} />
                    <span className="text-xs font-bold text-[#9aa7b8]">
                      {new Date(item.timestamp).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="mt-2 font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#c7cfdb]">
                    {item.summary}
                  </p>
                </Link>
              ))}
              {upcomingEvents.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#c7cfdb]">
                  No upcoming module event is available from your current
                  records.
                </div>
              ) : null}
              <Link href="/dashboard/calendar" className="beast-button-secondary">
                Open Calendar
              </Link>
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardCard accent="goals">
            <SectionHeader
              eyebrow="Where am I making progress?"
              title="Goals Progress"
              description="Your active BeastOS goals and their next known step."
              action={<ModuleBadge module="goals" />}
            />
            <div className="mt-5 grid gap-3">
              {activeGoals.map((goal) => {
                const progress = getGoalProgressPercent(goal);

                return (
                  <Link
                    key={goal.id}
                    href="/dashboard/goals"
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8]/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-white">{goal.title}</h3>
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">
                        {goal.status}
                      </span>
                    </div>
                    {progress !== null ? (
                      <>
                        <div className="mt-3 h-2 rounded-full bg-[#0f1419]">
                          <div
                            className="h-full rounded-full bg-[#38bdf8]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs font-bold text-[#9aa7b8]">
                          {progress}% complete
                        </div>
                      </>
                    ) : null}
                    <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                      {goal.currentStep ||
                        goal.summary ||
                        "Open the goal to define the next measurable step."}
                    </p>
                  </Link>
                );
              })}
              {activeGoals.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#c7cfdb]">
                  No active BeastOS goal is available yet. Today will show
                  progress after you create a real goal.
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard accent="beastos">
            <SectionHeader
              eyebrow="What should I do next?"
              title="Quick Actions"
              description="Jump directly to the workspace that can move the day forward."
            />
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                ["Ask Money Coach", "/dashboard/money"],
                [
                  "Ask Guidance Counselor",
                  "/dashboard/education/guidance-counselor",
                ],
                ["Review Calendar", "/dashboard/calendar"],
                ["Check Goals", "/dashboard/goals"],
                ["Upload a Document", "/dashboard/uploads"],
                ["Search Beast", "/dashboard/search"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="beast-button-secondary min-h-[44px]"
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-5 border-t border-[#2a3242] pt-5">
              <label className="text-xs font-black uppercase text-[#9aa7b8]">
                Add my own priority
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={manualItemTitle}
                  onChange={(event) => setManualItemTitle(event.target.value)}
                  placeholder="Add a manual Today item"
                  className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm font-semibold text-white outline-none placeholder:text-[#7f8da3] focus:border-indigo-300"
                />
                <button
                  type="button"
                  onClick={addManualTodayItem}
                  className="beast-button"
                >
                  Add to Today
                </button>
              </div>
              {manualTodayItems.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {manualTodayItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#2a3242] bg-[#111827] p-3 text-sm font-bold text-white"
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </DashboardCard>
        </section>

        {actionRequest ? (
          <DashboardCard accent="beastos">
            <p className="text-sm font-semibold leading-6 text-[#dbe3ef]">
              {actionRequest.action} was sent to {actionRequest.source}.
            </p>
          </DashboardCard>
        ) : null}

        <details
          id="education-planning"
          className="scroll-mt-24 rounded-2xl border border-[#2a3242] bg-[#1a1f2b] p-5"
        >
          <summary className="cursor-pointer text-base font-black text-white">
            Education planning
          </summary>
          <div className="mt-5">
            <SectionHeader
              eyebrow="Guidance Counselor"
              title="Keep your education and career direction current"
              description="Review your roadmap or talk through the next useful planning decision with your Guidance Counselor."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/education/guidance-counselor"
                className="beast-button"
              >
                Talk with Guidance Counselor
              </Link>
              <Link
                href="/dashboard/education/education-planning"
                className="beast-button-secondary"
              >
                Review roadmap
              </Link>
            </div>
          </div>
        </details>

        <details className="rounded-2xl border border-[#2a3242] bg-[#111827] p-5">
          <summary className="cursor-pointer text-sm font-black text-[#c7cfdb]">
            How Today decides what to show
          </summary>
          <div className="mt-5">
            <SectionHeader
              eyebrow="Why this is prioritized"
              title="How Today chose your next step"
              description="Today shows only verified records and recommendations from capabilities available in your connected modules."
            />
            <div
              className="mt-4 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4"
              aria-label="Priority explanation"
            >
              <div className="text-xs font-black uppercase text-[#9aa7b8]">
                Why this appears
              </div>
              <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                {primaryPriorityExplanation
                  ? primaryPriorityExplanation.displayReason
                  : "No connected module has supplied an active, evidence-backed priority for today."}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {todayContributionSources.map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-[#2a3242] px-3 py-1 text-xs font-black uppercase text-[#9aa7b8]"
                >
                  {["learning", "money", "health"].includes(source)
                    ? getTodayProfessionalLabel(source)
                    : source}
                </span>
              ))}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-[#2a3242] p-3 text-sm text-[#c7cfdb]">
                Completed Day: {todayDayPlan.completed.length}
              </div>
              <div className="rounded-lg border border-[#2a3242] p-3 text-sm text-[#c7cfdb]">
                Tomorrow Preview: {todayDayPlan.tomorrow.length}
              </div>
              <div className="rounded-lg border border-[#2a3242] p-3 text-sm text-[#c7cfdb]">
                Weekly Outlook:{" "}
                {todayDayPlan.weeklyOutlook.reduce(
                  (sum, item) => sum + item.active,
                  0
                )}{" "}
                active
              </div>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
