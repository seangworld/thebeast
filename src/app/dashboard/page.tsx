"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { APP_VERSION } from "@/lib/appVersion";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { getProfileDisplayName } from "@/lib/profile";
import {
  calculateMonthlyRecurringTotal,
  isActiveRecurringSource,
  numberValue,
} from "@/lib/financialMetrics";
import { buildBeastOSIntelligence } from "@/lib/platform/recommendationEngine";
import type {
  PlatformActivity,
  PlatformRecommendation,
  PlatformTimelineEvent,
} from "@/lib/platform/types";
import {
  AlertCard,
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";

type MoneyDebt = {
  id: string;
  name?: string | null;
  balance?: number | null;
  minimum_payment?: number | null;
  interest_rate?: number | null;
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

type MoneyState = {
  debts: MoneyDebt[];
  bills: MoneyBill[];
  incomes: MoneyIncome[];
  cashSettings: MoneySettings | null;
  billPayments: MoneyPayment[];
  debtPayments: MoneyPayment[];
};

type CurrentUser = {
  name: string;
};

type MoneyPayment = {
  id: string;
  amount?: number | null;
  amount_paid?: number | null;
  payment_date?: string | null;
  created_at?: string | null;
};

type FutureTimelineItem = {
  id: string;
  date: Date;
  title: string;
  detail: string;
  module: ModuleKey;
  href?: string;
};

type FutureActivityItem = {
  id: string;
  title: string;
  detail: string;
  module: ModuleKey;
  href?: string;
};

const initialMoneyState: MoneyState = {
  debts: [],
  bills: [],
  incomes: [],
  cashSettings: null,
  billPayments: [],
  debtPayments: [],
};

const futureBriefingModules: {
  label: string;
  module: ModuleKey;
  detail: string;
}[] = [
  {
    label: "Health",
    module: "health",
    detail: "Vitals, habits, and recovery signals are staged.",
  },
  {
    label: "Home",
    module: "home",
    detail: "Household tasks and maintenance windows are reserved.",
  },
  {
    label: "Projects",
    module: "projects",
    detail: "Active project focus and blockers are queued for future data.",
  },
];

const quickLaunchModules: {
  label: string;
  module: ModuleKey;
  href?: string;
  description: string;
}[] = [
  {
    label: "Money",
    module: "money",
    href: "/dashboard/money",
    description: "Open the active production workspace.",
  },
  {
    label: "Learning",
    module: "learning",
    href: "/dashboard/learning",
    description: "Open goals, courses, study rhythm, and progress.",
  },
  {
    label: "Health",
    module: "health",
    description: "Health routines and signals are coming soon.",
  },
  {
    label: "Home",
    module: "home",
    description: "Household command center is coming soon.",
  },
  {
    label: "Projects",
    module: "projects",
    description: "Project command center is coming soon.",
  },
];

function nextDueDateFromDay(day: number | null | undefined) {
  const today = new Date();
  const safeDay = Math.min(Math.max(Number(day || 1), 1), 28);
  const candidate = new Date(today.getFullYear(), today.getMonth(), safeDay);

  if (candidate < today) {
    return new Date(today.getFullYear(), today.getMonth() + 1, safeDay);
  }

  return candidate;
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function SoonModuleRow({
  label,
  module,
  detail,
}: {
  label: string;
  module: ModuleKey;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold text-white">{label}</div>
        <ModuleBadge module={module} label="Coming Soon" comingSoon />
      </div>
      <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">{detail}</p>
    </div>
  );
}

function ModuleStatusCard({
  label,
  module,
  href,
  summary,
  metric,
  health,
}: {
  label: string;
  module: ModuleKey;
  href?: string;
  summary: string;
  metric?: string;
  health?: string;
}) {
  const accent = moduleAccents[module];
  const content = (
    <div className="flex h-full min-h-[170px] flex-col justify-between gap-5 rounded-2xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-[#202634]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-white">{label}</div>
            <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">{summary}</p>
          </div>
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-full"
            style={{ background: accent.color }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ModuleBadge
          module={module}
          label={href ? "Active" : "Coming Soon"}
          comingSoon={!href}
        />
        {metric ? (
          <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]">
            {metric}
          </span>
        ) : null}
        {health ? (
          <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold uppercase text-[#9aa7b8]">
            {health}
          </span>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ borderColor: `${accent.color}44` }}>
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}

function RecommendationRow({
  recommendation,
}: {
  recommendation: PlatformRecommendation;
}) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ModuleBadge module={recommendation.module as ModuleKey} />
        <span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-2.5 py-1 text-xs font-bold text-yellow-100">
          {recommendation.priority}
        </span>
        <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold uppercase text-[#9aa7b8]">
          {recommendation.severity}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-black leading-tight text-white">
        {recommendation.title}
      </h3>
      <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
        {recommendation.summary}
      </p>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div>
          <div className="text-xs font-bold uppercase text-[#7f8da3]">Reason</div>
          <p className="mt-1 leading-5 text-[#dbe3ef]">{recommendation.reason}</p>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-[#7f8da3]">
            Recommended Action
          </div>
          <p className="mt-1 leading-5 text-[#dbe3ef]">
            {recommendation.recommendedAction}
          </p>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-[#7f8da3]">
            Estimated Benefit
          </div>
          <p className="mt-1 leading-5 text-[#dbe3ef]">
            {recommendation.estimatedBenefit || "Reserved for future scoring."}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase text-[#7f8da3]">
        <span>Confidence: {recommendation.confidence}</span>
        <span>{recommendation.dismissible ? "Dismissible" : "Persistent"}</span>
        <span>{recommendation.completed ? "Completed" : "Open"}</span>
      </div>
    </div>
  );
}

function TimelineRow({ item }: { item: PlatformTimelineEvent | FutureTimelineItem }) {
  const moduleKey = item.module as ModuleKey;
  const date = "timestamp" in item ? new Date(item.timestamp) : item.date;
  const detail = "summary" in item ? item.summary : item.detail;
  const href = "actionUrl" in item ? item.actionUrl : (item as FutureTimelineItem).href;
  const accent = moduleAccents[moduleKey];
  const content = (
    <div className="flex gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:border-[#38bdf8]/50 hover:bg-[#202634]">
      <div className="flex w-20 shrink-0 flex-col items-center rounded-lg border border-[#2a3242] bg-[#0f1419] px-2 py-2 text-center">
        <span className="text-[11px] font-bold uppercase text-[#7f8da3]">
          {date.toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-2xl font-black leading-none text-white">
          {date.getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: accent.color }}
          />
          <ModuleBadge module={moduleKey} />
        </div>
        <h3 className="mt-2 font-bold text-white">{item.title}</h3>
        <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">{detail}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function ActivityRow({ item }: { item: PlatformActivity | FutureActivityItem }) {
  const moduleKey = item.module as ModuleKey;
  const detail = "summary" in item ? item.summary : item.detail;
  const href = "actionUrl" in item ? item.actionUrl : (item as FutureActivityItem).href;
  const accent = moduleAccents[moduleKey];
  const content = (
    <div className="flex items-start gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:bg-[#202634]">
      <span
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: accent.color }}
      />
      <div className="min-w-0">
        <div className="font-bold text-white">{item.title}</div>
        <p className="mt-1 text-sm leading-5 text-[#9aa7b8]">{detail}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export default function TodayPage() {
  const [state, setState] = useState<MoneyState>(initialMoneyState);
  const [user, setUser] = useState<CurrentUser>({ name: "Commander" });
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => new Date(), []);

  const loadTodaySources = useCallback(async () => {
    setLoading(true);
    let supabase: ReturnType<typeof createClient>;

    try {
      supabase = createClient();
    } catch {
      setUser({ name: getProfileDisplayName(null, null) });
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData?.user;
    const userId = authUser?.id;

    setUser({ name: getProfileDisplayName(null, authUser || null) });

    if (!userId) {
      setLoading(false);
      return;
    }

    const [
      profileResult,
      debtsResult,
      billsResult,
      incomesResult,
      cashSettingsResult,
      billPaymentsResult,
      debtPaymentsResult,
    ] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("debts").select("*").eq("user_id", userId),
        supabase
          .from("bill_events")
          .select("*")
          .eq("user_id", userId)
          .order("due_date", { ascending: true }),
        supabase
          .from("income_events")
          .select("*")
          .eq("user_id", userId)
          .order("next_date", { ascending: true }),
        supabase.from("cash_settings").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("bill_payments")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("debt_payments")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    setUser({
      name: getProfileDisplayName(profileResult.data, authUser || null),
    });
    setState({
      debts: (debtsResult.data || []) as MoneyDebt[],
      bills: (billsResult.data || []) as MoneyBill[],
      incomes: (incomesResult.data || []) as MoneyIncome[],
      cashSettings: cashSettingsResult.data as MoneySettings | null,
      billPayments: (billPaymentsResult.data || []) as MoneyPayment[],
      debtPayments: (debtPaymentsResult.data || []) as MoneyPayment[],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTodaySources();
  }, [loadTodaySources]);

  const snapshot = useMemo(() => {
    const activeDebts = state.debts.filter(
      (debt) => !debt.is_archived && numberValue(debt.balance) > 0
    );
    const activeBills = state.bills.filter((bill) => !bill.is_archived);
    const activeIncomes = state.incomes.filter(isActiveRecurringSource);
    const startingCash = numberValue(state.cashSettings?.starting_balance);
    const buffer = numberValue(state.cashSettings?.checking_buffer);
    const monthlyIncome = calculateMonthlyRecurringTotal(state.incomes);
    const monthlyBills = calculateMonthlyRecurringTotal(activeBills);
    const totalDebt = activeDebts.reduce(
      (sum, debt) => sum + numberValue(debt.balance),
      0
    );
    const debtMinimums = activeDebts.reduce(
      (sum, debt) => sum + numberValue(debt.minimum_payment),
      0
    );
    const billsDueSoon = activeBills.filter((bill) => {
      const dueDate = bill.next_due_date_after_payment
        ? new Date(bill.next_due_date_after_payment)
        : nextDueDateFromDay(bill.due_date);
      const daysAway = Math.ceil(
        (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysAway <= 7;
    });

    return {
      activeDebts,
      activeBills,
      activeIncomes,
      startingCash,
      buffer,
      monthlyIncome,
      monthlyBills,
      totalDebt,
      debtMinimums,
      billsDueSoon,
    };
  }, [state]);

  const intelligence = useMemo(
    () =>
      buildBeastOSIntelligence({
        activeBills: snapshot.activeBills,
        activeDebts: snapshot.activeDebts,
        monthlyIncome: snapshot.monthlyIncome,
        monthlyBills: snapshot.monthlyBills,
        debtMinimums: snapshot.debtMinimums,
        startingCash: snapshot.startingCash,
        buffer: snapshot.buffer,
        billPayments: state.billPayments,
        debtPayments: state.debtPayments,
        now: today,
      }),
    [snapshot, state.billPayments, state.debtPayments, today]
  );

  const primaryRecommendation = intelligence.recommendations[0] || null;

  const timelineItems = useMemo<(PlatformTimelineEvent | FutureTimelineItem)[]>(() => {
    const futureItems: FutureTimelineItem[] = [
      {
        id: "calendar-future",
        date: today,
        title: "Calendar events",
        detail: "Shared schedule events will join the BeastOS timeline.",
        module: "calendar",
      },
      {
        id: "learning-future",
        date: today,
        title: "Learning sessions",
        detail: "Study blocks and course milestones are ready in BeastLearning.",
        module: "learning",
      },
      {
        id: "health-future",
        date: today,
        title: "Health entries",
        detail: "Routine, recovery, and wellness events are staged.",
        module: "health",
      },
      {
        id: "projects-future",
        date: today,
        title: "Project checkpoints",
        detail: "Milestones and blockers will flow into this view.",
        module: "projects",
      },
      {
        id: "home-future",
        date: today,
        title: "Home tasks",
        detail: "Maintenance and household reminders are reserved.",
        module: "home",
      },
    ];

    return [...intelligence.timelineEvents, ...futureItems]
      .sort((a, b) => {
        const aDate = "timestamp" in a ? new Date(a.timestamp) : a.date;
        const bDate = "timestamp" in b ? new Date(b.timestamp) : b.date;
        return aDate.getTime() - bDate.getTime();
      })
      .slice(0, 9);
  }, [intelligence.timelineEvents, today]);

  const activityItems = useMemo<(PlatformActivity | FutureActivityItem)[]>(() => {
    const futureActivities: FutureActivityItem[] = [
      {
        id: "uploads-future",
        title: "Uploads",
        detail: "Future document and media uploads will appear in this activity stream.",
        module: "documents",
      },
      {
        id: "learning-future",
        title: "Learning sessions",
        detail: "Completed lessons and study notes will appear here as BeastLearning expands.",
        module: "learning",
      },
      {
        id: "health-future",
        title: "Health entries",
        detail: "Check-ins, habits, and recovery logs will be listed here.",
        module: "health",
      },
      {
        id: "projects-future",
        title: "Projects",
        detail: "Project updates and completed actions will flow into Today.",
        module: "projects",
      },
    ];

    return [...intelligence.activities, ...futureActivities];
  }, [intelligence.activities]);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label={`BeastOS ${APP_VERSION}`} />
              <div>
                <h1 className="beast-title">
                  {getGreeting(today)}, {user.name}
                </h1>
                <p className="mt-3 text-lg font-semibold text-[#dbe3ef]">
                  {formatFullDate(today)}
                </p>
              </div>
              <p className="beast-subtitle">
                Your daily operating picture is assembled. Money is live today;
                every future module already has a permanent home.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/money" className="beast-button">
                Open Money
              </Link>
              <Link href="/dashboard/timeline" className="beast-button-secondary">
                View Timeline
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <DashboardCard accent="beastos">
            <div className="flex animate-pulse flex-col gap-3">
              <div className="h-4 w-40 rounded bg-[#2a3242]" />
              <div className="h-8 w-72 max-w-full rounded bg-[#2a3242]" />
              <div className="h-4 w-full max-w-xl rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <DashboardCard accent="beastos" className="min-h-[360px]">
            <SectionHeader
              eyebrow="Today's Briefing"
              title="Command center"
              description="A cross-module briefing for the day ahead. Money is the active production signal while future modules reserve their operating lanes."
              action={<ModuleBadge module="money" label="Live Signal" />}
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border border-green-400/25 bg-green-400/10 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <ModuleBadge module="money" />
                  <span className="rounded-full border border-green-400/30 px-2.5 py-1 text-xs font-bold text-green-100">
                    Production Data
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black leading-tight text-white">
                  {primaryRecommendation
                    ? primaryRecommendation.title
                    : "Everything looks good."}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#dbe3ef]">
                  {primaryRecommendation
                    ? `${primaryRecommendation.summary} ${primaryRecommendation.reason}`
                    : "No live Money recommendation needs attention right now."}{" "}
                  The rest of BeastOS is staged around this daily command pattern.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-bold uppercase text-green-100/70">
                      Cash
                    </div>
                    <div className="mt-1 text-xl font-black">
                      {formatCurrency(snapshot.startingCash)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-green-100/70">
                      Bills
                    </div>
                    <div className="mt-1 text-xl font-black">
                      {snapshot.activeBills.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-green-100/70">
                      Debt
                    </div>
                    <div className="mt-1 text-xl font-black">
                      {formatCurrency(snapshot.totalDebt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {futureBriefingModules.map((module) => (
                  <SoonModuleRow
                    key={module.label}
                    label={module.label}
                    module={module.module}
                    detail={module.detail}
                  />
                ))}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard accent="purple">
            <SectionHeader
              eyebrow="Recommendation"
              title="Orchestration queue"
              description="Live structured recommendations from the BeastOS engine. Future AI will populate the same contract."
            />
            <div className="mt-5 space-y-3">
              {intelligence.recommendations.length > 0 ? (
                intelligence.recommendations
                  .slice(0, 4)
                  .map((recommendation) => (
                    <RecommendationRow
                      key={recommendation.id}
                      recommendation={recommendation}
                    />
                  ))
              ) : (
                <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4">
                  <div className="font-black text-green-100">
                    Everything looks good
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[#dbe3ef]">
                    Money has no critical recommendations right now. BeastOS is
                    ready for future module-aware intelligence.
                  </p>
                </div>
              )}
            </div>
          </DashboardCard>
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Module Status"
            title="Life operating map"
            description="Every major life module has a visible place in Today. Money is active; the rest are ready for their data feeds."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {intelligence.moduleSummaries.map((card) => (
              <ModuleStatusCard
                key={`${card.module}-${card.label}`}
                label={card.label}
                module={card.module as ModuleKey}
                href={card.href}
                summary={card.summary}
                metric={`${card.recommendations} recs, ${card.alerts} alerts`}
                health={card.health}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon="$"
            tone="green"
            label="Money Cash"
            value={formatCurrency(snapshot.startingCash)}
            detail={`Buffer target: ${formatCurrency(snapshot.buffer)}`}
          />
          <MetricTile
            icon="B"
            tone="yellow"
            label="Bills Due Soon"
            value={String(snapshot.billsDueSoon.length)}
            detail={`${formatCurrency(snapshot.monthlyBills)} in normalized monthly bills`}
          />
          <MetricTile
            icon="I"
            tone="blue"
            label="Monthly Income"
            value={formatCurrency(snapshot.monthlyIncome)}
            detail={`${snapshot.activeIncomes.length} active recurring income sources`}
          />
          <MetricTile
            icon="D"
            tone="red"
            label="Debt Watch"
            value={formatCurrency(snapshot.totalDebt)}
            detail={`${formatCurrency(snapshot.debtMinimums)} minimum payments`}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Notifications"
              title="Signal center"
              description="Severity-coded alerts from active modules, with reserved space for future domains."
            />
            <DashboardCard accent="red">
              <div className="space-y-3">
                {intelligence.notifications.length > 0 ? (
                  intelligence.notifications.map((notification) => (
                  <AlertCard
                    key={notification.id}
                    severity={notification.severity}
                    title={notification.title}
                    message={notification.summary || "Notification reserved for future delivery."}
                    href={notification.actionUrl}
                  />
                  ))
                ) : (
                  <AlertCard
                    severity="info"
                    title="No live notifications"
                    message="Money has no urgent shared notifications right now."
                  />
                )}
                <AlertCard
                  severity="info"
                  title="Future module alerts reserved"
                  message="Health, Learning, Home, and Projects alerts will join this center as those modules come online."
                />
              </div>
            </DashboardCard>
          </div>

          <div className="space-y-4">
            <SectionHeader
              eyebrow="Timeline"
              title="Unified day stream"
              description="Money events appear now. Calendar, Learning, Health, Projects, and Home are already represented."
            />
            <DashboardCard accent="timeline">
              <div className="grid gap-3">
                {timelineItems.map((item) => (
                  <TimelineRow key={item.id} item={item} />
                ))}
              </div>
            </DashboardCard>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Recent Activity"
              title="System activity"
              description="A future cross-module feed for financial actions, uploads, learning, health, projects, and documents."
            />
            <DashboardCard accent="notifications">
              <div className="grid gap-3">
                {activityItems.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </div>
            </DashboardCard>
          </div>

          <div className="space-y-4">
            <SectionHeader
              eyebrow="Quick Launch"
              title="Module launchpad"
              description="Start in Money today, with future modules visible from the same command surface."
            />
            <DashboardCard accent="beastos">
              <div className="grid gap-3">
                {quickLaunchModules.map((module) =>
                  module.href ? (
                    <Link
                      key={module.label}
                      href={module.href}
                      className="group rounded-xl border border-green-400/35 bg-green-400/10 p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-green-400/15"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-lg font-black text-white">
                          {module.label}
                        </div>
                        <ModuleBadge module={module.module} label="Open" />
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[#dbe3ef]">
                        {module.description}
                      </p>
                    </Link>
                  ) : (
                    <div
                      key={module.label}
                      className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-lg font-black text-white">
                          {module.label}
                        </div>
                        <ModuleBadge
                          module={module.module}
                          label="Coming Soon"
                          comingSoon
                        />
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                        {module.description}
                      </p>
                    </div>
                  )
                )}
              </div>
            </DashboardCard>
          </div>
        </section>
      </div>
    </main>
  );
}
