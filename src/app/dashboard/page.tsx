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
import {
  AlertCard,
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
  type DashboardAlertSeverity,
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
};

type MoneyBill = {
  id: string;
  name?: string | null;
  amount?: number | null;
  frequency?: string | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  next_due_date_after_payment?: string | null;
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
};

type CurrentUser = {
  name: string;
};

type Recommendation = {
  priority: string;
  recommendation: string;
  reason: string;
  estimatedBenefit: string;
  module: ModuleKey;
  confidence: string;
};

type TimelineItem = {
  id: string;
  date: Date;
  title: string;
  detail: string;
  module: ModuleKey;
  href?: string;
};

type ActivityItem = {
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
};

const futureBriefingModules: {
  label: string;
  module: ModuleKey;
  detail: string;
}[] = [
  {
    label: "Learning",
    module: "beastos",
    detail: "Course progress and study blocks will land here.",
  },
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

const moduleStatusCards: {
  label: string;
  module: ModuleKey;
  href?: string;
  summary: string;
}[] = [
  {
    label: "Money",
    module: "money",
    href: "/dashboard/money",
    summary: "Live cashflow, debt, bills, income, and Velocity workspace.",
  },
  {
    label: "Health",
    module: "health",
    summary: "Wellness signals, routines, and medical context will connect here.",
  },
  {
    label: "Learning",
    module: "beastos",
    summary: "Courses, reading plans, and study momentum are reserved.",
  },
  {
    label: "Home",
    module: "home",
    summary: "Maintenance, chores, spaces, and household inventory will appear here.",
  },
  {
    label: "Projects",
    module: "projects",
    summary: "Workstreams, milestones, and blockers will become visible here.",
  },
  {
    label: "Vehicles",
    module: "vehicles",
    summary: "Service dates, costs, registrations, and reminders are staged.",
  },
  {
    label: "Family",
    module: "family",
    summary: "Family schedules, needs, and shared context are planned.",
  },
  {
    label: "Goals",
    module: "goals",
    summary: "Personal objectives and progress checkpoints are reserved.",
  },
  {
    label: "Documents",
    module: "documents",
    summary: "Uploads, records, policies, and searchable files will live here.",
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
    module: "beastos",
    description: "Study plans and knowledge tracking are coming soon.",
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

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
}: {
  label: string;
  module: ModuleKey;
  href?: string;
  summary: string;
  metric?: string;
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
  recommendation: Recommendation;
}) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ModuleBadge module={recommendation.module} />
        <span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-2.5 py-1 text-xs font-bold text-yellow-100">
          {recommendation.priority}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-black leading-tight text-white">
        {recommendation.recommendation}
      </h3>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div>
          <div className="text-xs font-bold uppercase text-[#7f8da3]">Reason</div>
          <p className="mt-1 leading-5 text-[#dbe3ef]">{recommendation.reason}</p>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-[#7f8da3]">
            Estimated Benefit
          </div>
          <p className="mt-1 leading-5 text-[#dbe3ef]">
            {recommendation.estimatedBenefit}
          </p>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-[#7f8da3]">
            Confidence
          </div>
          <p className="mt-1 leading-5 text-[#dbe3ef]">
            {recommendation.confidence}
          </p>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const accent = moduleAccents[item.module];
  const content = (
    <div className="flex gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:border-[#38bdf8]/50 hover:bg-[#202634]">
      <div className="flex w-20 shrink-0 flex-col items-center rounded-lg border border-[#2a3242] bg-[#0f1419] px-2 py-2 text-center">
        <span className="text-[11px] font-bold uppercase text-[#7f8da3]">
          {item.date.toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-2xl font-black leading-none text-white">
          {item.date.getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: accent.color }}
          />
          <ModuleBadge module={item.module} />
        </div>
        <h3 className="mt-2 font-bold text-white">{item.title}</h3>
        <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">{item.detail}</p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const accent = moduleAccents[item.module];
  const content = (
    <div className="flex items-start gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:bg-[#202634]">
      <span
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: accent.color }}
      />
      <div className="min-w-0">
        <div className="font-bold text-white">{item.title}</div>
        <p className="mt-1 text-sm leading-5 text-[#9aa7b8]">{item.detail}</p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
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
      ]);

    setUser({
      name: getProfileDisplayName(profileResult.data, authUser || null),
    });
    setState({
      debts: (debtsResult.data || []) as MoneyDebt[],
      bills: (billsResult.data || []) as MoneyBill[],
      incomes: (incomesResult.data || []) as MoneyIncome[],
      cashSettings: cashSettingsResult.data as MoneySettings | null,
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

  const alerts = useMemo(() => {
    const results: {
      title: string;
      message: string;
      severity: DashboardAlertSeverity;
      href?: string;
    }[] = [];

    if (snapshot.billsDueSoon.length > 0) {
      results.push({
        title: "Bills due soon",
        message: `${snapshot.billsDueSoon.length} Money bill${
          snapshot.billsDueSoon.length === 1 ? "" : "s"
        } due in the next 7 days.`,
        severity: "warning",
        href: "/dashboard/money/cashflow#bills",
      });
    }

    if (snapshot.startingCash < snapshot.buffer) {
      results.push({
        title: "Cash buffer below target",
        message: "Tracked cash is below the configured Money buffer.",
        severity: "critical",
        href: "/dashboard/money/cashflow",
      });
    }

    if (snapshot.monthlyIncome > 0 && snapshot.monthlyBills > snapshot.monthlyIncome) {
      results.push({
        title: "Bills exceed tracked income",
        message: "Known monthly bills are higher than tracked monthly income.",
        severity: "critical",
        href: "/dashboard/money/cashflow",
      });
    }

    if (results.length === 0) {
      results.push({
        title: "No urgent BeastOS alerts",
        message:
          "Money does not currently report an urgent alert. Future module signals are reserved.",
        severity: "info",
      });
    }

    return results;
  }, [snapshot]);

  const primaryRecommendation = useMemo<Recommendation>(() => {
    if (snapshot.billsDueSoon.length > 0) {
      return {
        priority: "High",
        recommendation: "Confirm funding for this week's bills.",
        reason: "Money has bills due in the next 7 days.",
        estimatedBenefit: "Avoid missed or rushed payments.",
        module: "money",
        confidence: "Reserved",
      };
    }

    if (snapshot.startingCash < snapshot.buffer) {
      return {
        priority: "High",
        recommendation: "Restore your checking buffer before optional spending.",
        reason: "Tracked cash is below the configured Money buffer.",
        estimatedBenefit: "Protect short-term operating cash.",
        module: "money",
        confidence: "Reserved",
      };
    }

    if (snapshot.totalDebt > 0) {
      return {
        priority: "Medium",
        recommendation: "Review your next debt or Velocity move.",
        reason: "Active debt is present in Money.",
        estimatedBenefit: "Keep payoff strategy visible today.",
        module: "money",
        confidence: "Reserved",
      };
    }

    return {
      priority: "Normal",
      recommendation: "Keep Money records fresh and scan upcoming income timing.",
      reason: "No urgent Money alert is visible from current records.",
      estimatedBenefit: "Maintain a clean daily operating picture.",
      module: "money",
      confidence: "Reserved",
    };
  }, [snapshot]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const billItems = snapshot.activeBills.slice(0, 4).map((bill) => {
      const date = bill.next_due_date_after_payment
        ? new Date(bill.next_due_date_after_payment)
        : nextDueDateFromDay(bill.due_date);

      return {
        id: `bill-${bill.id}`,
        date,
        title: bill.name || "Upcoming bill",
        detail: `${formatCurrency(numberValue(bill.amount))} due ${formatDateLabel(
          date
        )}`,
        module: "money" as ModuleKey,
        href: "/dashboard/money/cashflow",
      };
    });
    const incomeItems = snapshot.activeIncomes.slice(0, 3).map((income) => {
      const date = income.next_date ? new Date(income.next_date) : new Date();

      return {
        id: `income-${income.id}`,
        date,
        title: income.name || "Upcoming income",
        detail: `${formatCurrency(numberValue(income.amount))} expected ${formatDateLabel(
          date
        )}`,
        module: "money" as ModuleKey,
        href: "/dashboard/money/cashflow",
      };
    });
    const debtItems = snapshot.activeDebts.slice(0, 3).map((debt) => {
      const date = nextDueDateFromDay(debt.due_date);

      return {
        id: `debt-${debt.id}`,
        date,
        title: `${debt.name || "Debt"} payment`,
        detail: `${formatCurrency(numberValue(debt.minimum_payment))} minimum payment`,
        module: "money" as ModuleKey,
        href: "/dashboard/money/debts",
      };
    });
    const futureItems: TimelineItem[] = [
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
        detail: "Study blocks and course milestones are reserved.",
        module: "beastos",
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

    return [...billItems, ...incomeItems, ...debtItems, ...futureItems]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 9);
  }, [snapshot.activeBills, snapshot.activeDebts, snapshot.activeIncomes, today]);

  const activityItems = useMemo<ActivityItem[]>(() => {
    const moneyActivities: ActivityItem[] = [
      {
        id: "money-cash",
        title: "Money snapshot refreshed",
        detail: `${snapshot.activeBills.length} bills, ${snapshot.activeIncomes.length} active income sources, and ${snapshot.activeDebts.length} debts are available.`,
        module: "money",
        href: "/dashboard/money",
      },
      {
        id: "money-alerts",
        title: "Alert scan completed",
        detail: `${alerts.length} notification${alerts.length === 1 ? "" : "s"} ready for review.`,
        module: "notifications",
        href: "/dashboard/notifications",
      },
    ];
    const futureActivities: ActivityItem[] = [
      {
        id: "uploads-future",
        title: "Uploads",
        detail: "Future document and media uploads will appear in this activity stream.",
        module: "documents",
      },
      {
        id: "learning-future",
        title: "Learning sessions",
        detail: "Completed lessons and study notes will appear here.",
        module: "beastos",
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

    return [...moneyActivities, ...futureActivities];
  }, [alerts.length, snapshot]);

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
                  {primaryRecommendation.recommendation}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#dbe3ef]">
                  {primaryRecommendation.reason} The rest of BeastOS is staged
                  around this daily command pattern.
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
              title="Next best move"
              description="Structured for future AI guidance without changing financial logic."
            />
            <div className="mt-5">
              <RecommendationRow recommendation={primaryRecommendation} />
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
            {moduleStatusCards.map((card) => (
              <ModuleStatusCard
                key={card.label}
                label={card.label}
                module={card.module}
                href={card.href}
                summary={card.summary}
                metric={
                  card.module === "money"
                    ? `${snapshot.activeBills.length} bills, ${snapshot.activeDebts.length} debts`
                    : undefined
                }
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
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.title}
                    severity={alert.severity}
                    title={alert.title}
                    message={alert.message}
                    href={alert.href}
                  />
                ))}
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
