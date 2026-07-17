"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { APP_VERSION } from "@/lib/appVersion";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { useRuntimeToday } from "@/lib/hooks/useRuntimeToday";
import { getProfileDisplayName } from "@/lib/profile";
import {
  formatBeastFullDate,
  getBeastGreeting,
  getBeastRuntimeToday,
} from "@/lib/runtimeDate";
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
import { buildMobileModuleCards } from "@/lib/mobileFoundation";
import { buildMobileHouseholdAlertCards } from "@/lib/mobilePersonalHub";

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
  role?: string | null;
};

type MoneyPayment = {
  id: string;
  amount?: number | null;
  amount_paid?: number | null;
  payment_date?: string | null;
  created_at?: string | null;
};

const initialMoneyState: MoneyState = {
  debts: [],
  bills: [],
  incomes: [],
  cashSettings: null,
  billPayments: [],
  debtPayments: [],
};

function nextDueDateFromDay(day: number | null | undefined, today = getBeastRuntimeToday()) {
  const safeDay = Math.min(Math.max(Number(day || 1), 1), 28);
  const candidate = new Date(today.getFullYear(), today.getMonth(), safeDay);

  if (candidate < today) {
    return new Date(today.getFullYear(), today.getMonth() + 1, safeDay);
  }

  return candidate;
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

function TimelineRow({ item }: { item: PlatformTimelineEvent }) {
  const moduleKey = item.module as ModuleKey;
  const date = new Date(item.timestamp);
  const detail = item.summary;
  const href = item.actionUrl;
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

function ActivityRow({ item }: { item: PlatformActivity }) {
  const moduleKey = item.module as ModuleKey;
  const detail = item.summary;
  const href = item.actionUrl;
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

function MobileLaunchCard({
  title,
  detail,
  href,
  module,
  action,
}: {
  title: string;
  detail: string;
  href: string;
  module: ModuleKey;
  action: string;
}) {
  const accent = moduleAccents[module];

  return (
    <Link
      href={href}
      className="block rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8]/60"
      style={{ borderColor: `${accent.color}44` }}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-black text-white">{title}</div>
          <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">{detail}</p>
        </div>
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: accent.color }}
        />
      </div>
      <div className="mt-4 flex min-h-[44px] items-center justify-center rounded-lg bg-[#38bdf8] px-3 py-2 text-sm font-black text-black">
        {action}
      </div>
    </Link>
  );
}

export default function TodayPage() {
  const [state, setState] = useState<MoneyState>(initialMoneyState);
  const [user, setUser] = useState<CurrentUser>({ name: "" });
  const [loading, setLoading] = useState(true);
  const { now, today } = useRuntimeToday();

  const loadTodaySources = useCallback(async () => {
    setLoading(true);
    let supabase: ReturnType<typeof createClient>;

    try {
      supabase = createClient();
    } catch {
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData?.user;
    const userId = authUser?.id;

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
      role:
        profileResult.data && "role" in profileResult.data
          ? String(profileResult.data.role)
          : null,
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
        : nextDueDateFromDay(bill.due_date, today);
      const daysAway = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
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
  }, [state, today]);

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
        now,
      }),
    [now, snapshot, state.billPayments, state.debtPayments]
  );

  const primaryRecommendation = intelligence.recommendations[0] || null;

  const timelineItems = useMemo<PlatformTimelineEvent[]>(() => {
    return intelligence.timelineEvents
      .sort((a, b) => {
        const aDate = new Date(a.timestamp);
        const bDate = new Date(b.timestamp);
        return aDate.getTime() - bDate.getTime();
      })
      .slice(0, 9);
  }, [intelligence.timelineEvents]);

  const activityItems = useMemo<PlatformActivity[]>(
    () => intelligence.activities,
    [intelligence.activities]
  );
  const activeMemberModuleSummaries = intelligence.moduleSummaries.filter((card) =>
    ["beastos", "money", "learning"].includes(card.module)
  );
  const mobileModuleCards = buildMobileModuleCards({
    subject: { role: user.role },
    intelligence,
  });
  const mobileNotification = intelligence.notifications[0] || null;
  const mobileCalendarItem = timelineItems.find(
    (item) => item.module === "calendar"
  ) || timelineItems[0] || null;
  const mobileHouseholdAlerts = buildMobileHouseholdAlertCards();

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="space-y-4 md:hidden" data-beast-mobile-shell="home">
          <div className="rounded-2xl border border-[#2a3242] bg-[#1a1f2b] p-4">
            <ModuleBadge module="beastos" label="Mobile Beast" />
            <h1 className="mt-3 text-2xl font-black leading-tight text-white">
              {user.name ? `${getBeastGreeting(now)}, ${user.name}` : "Today at a glance"}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-5 text-[#c7cfdb]">
              {formatBeastFullDate(now)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/dashboard/today" className="beast-button min-h-[44px]">
                Today
              </Link>
              <Link
                href="/dashboard/search#shared-ai"
                className="beast-button-secondary min-h-[44px]"
              >
                Ask AI
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="h-4 w-32 animate-pulse rounded bg-[#2a3242]" />
              <div className="mt-3 h-8 w-full animate-pulse rounded bg-[#2a3242]" />
            </div>
          ) : null}

          <div className="grid gap-3">
            <MobileLaunchCard
              title="Today summary"
              detail={
                primaryRecommendation
                  ? primaryRecommendation.title
                  : `${snapshot.billsDueSoon.length} bills due soon and ${activityItems.length} recent activity items.`
              }
              href="/dashboard/today"
              module="beastos"
              action="Open Today"
            />
            <MobileLaunchCard
              title="Notifications"
              detail={
                mobileNotification
                  ? mobileNotification.title
                  : "No urgent shared notifications right now."
              }
              href="/dashboard/notifications"
              module="notifications"
              action="Review alerts"
            />
            <MobileLaunchCard
              title="Calendar"
              detail={
                mobileCalendarItem
                  ? mobileCalendarItem.title
                  : "Open the shared calendar for today and tomorrow."
              }
              href="/dashboard/calendar"
              module="calendar"
              action="Open calendar"
            />
            <MobileLaunchCard
              title="Search"
              detail="Search across BeastOS, Money, Learning, documents, goals, and shared services."
              href="/dashboard/search"
              module="search"
              action="Search Beast"
            />
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">Quick access</h2>
              <ModuleBadge module="beastos" label="Permission aware" />
            </div>
            <div className="grid gap-3">
              {mobileModuleCards.map((card) => (
                <MobileLaunchCard
                  key={card.id}
                  title={card.label}
                  detail={`${card.summary} ${card.detail}.`}
                  href={card.href}
                  module={card.module}
                  action={card.primaryAction}
                />
              ))}
              <MobileLaunchCard
                title="Quick uploads"
                detail="Add documents to the shared BeastOS upload flow for later review."
                href="/dashboard/uploads"
                module="documents"
                action="Upload"
              />
              <MobileLaunchCard
                title="Goals"
                detail="Check active goals and the next small step without opening dense planning views."
                href="/dashboard/goals"
                module="goals"
                action="Open goals"
              />
              <div data-mobile-personal-hub="household-alerts">
                {mobileHouseholdAlerts.map((alert) => (
                  <MobileLaunchCard
                    key={alert.id}
                    title={alert.title}
                    detail={`${alert.summary} ${alert.metadata.join(", ")}.`}
                    href={alert.href}
                    module="beastos"
                    action={alert.actionLabel}
                  />
                ))}
              </div>
            </div>
          </section>
        </section>

        <div className="hidden space-y-8 md:block">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label={`BeastOS ${APP_VERSION}`} />
              <div>
                <h1 className="beast-title">
                  {user.name ? `${getBeastGreeting(now)}, ${user.name}` : "BeastOS Home"}
                </h1>
                <p className="mt-3 text-lg font-semibold text-[#dbe3ef]">
                  {formatBeastFullDate(now)}
                </p>
              </div>
              <p className="beast-subtitle">
                {"Today's Focus"} brings your learning, money, and calendar
                signals into one daily plan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/today" className="beast-button">
                {"View Today's Plan"}
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
              eyebrow="Today's Focus"
              title="Beast-wide plan"
              description="A cross-module summary of what needs attention today, without locking the day to one module."
              action={<ModuleBadge module="beastos" label="Daily Plan" />}
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border border-[#38bdf8]/25 bg-[#38bdf8]/10 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <ModuleBadge module="beastos" />
                  <span className="rounded-full border border-[#38bdf8]/30 px-2.5 py-1 text-xs font-bold text-[#bae6fd]">
                    {"Today's Plan"}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black leading-tight text-white">
                  Start with the clearest next action.
                </h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-[#bae6fd]/70">
                      Learning
                    </div>
                    <div className="mt-1 text-xl font-black">2 activities</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-[#bae6fd]/70">
                      Money
                    </div>
                    <div className="mt-1 text-xl font-black">
                      {snapshot.billsDueSoon.length} bills due soon
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {primaryRecommendation ? (
                  <RecommendationRow recommendation={primaryRecommendation} />
                ) : (
                  <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4">
                    <div className="font-black text-green-100">
                      No urgent recommendation
                    </div>
                    <p className="mt-2 text-sm leading-5 text-[#dbe3ef]">
                      Money and Learning are clear right now. Start with Today
                      when you want the next step.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard accent="purple">
            <SectionHeader
              eyebrow="Recommendation"
              title="Next best action"
              description="Current recommendations from active BeastOS modules."
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
                    ready when Money or Learning needs attention.
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
            description="Current active modules and their latest signals."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeMemberModuleSummaries.map((card) => (
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
              description="Severity-coded alerts from active modules."
            />
            <DashboardCard accent="red">
              <div className="space-y-3">
                {intelligence.notifications.length > 0 ? (
                  intelligence.notifications.map((notification) => (
                  <AlertCard
                   key={notification.id}
                   severity={notification.severity}
                   title={notification.title}
                    message={notification.summary || "No extra details provided yet."}
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
              </div>
            </DashboardCard>
          </div>

          <div className="space-y-4">
            <SectionHeader
              eyebrow="Timeline"
              title="Unified day stream"
              description="Money and Learning events appear here when they are available."
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
              description="Recent activity from active modules."
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
              eyebrow="Next Step"
              title="Where to go next"
              description="Start with Today, then use Timeline when you need the wider sequence."
            />
            <DashboardCard accent="beastos">
              <div className="grid gap-3">
                <Link
                  href="/dashboard/today"
                  className="group rounded-xl border border-[#38bdf8]/35 bg-[#38bdf8]/10 p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-[#38bdf8]/15"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-lg font-black text-white">{"Today's Plan"}</div>
                    <ModuleBadge module="beastos" label="Open" />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[#dbe3ef]">
                    See the next best action across BeastOS.
                  </p>
                </Link>
                <Link
                  href="/dashboard/timeline"
                  className="group rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:-translate-y-0.5 hover:bg-[#202634]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-lg font-black text-white">Timeline</div>
                    <ModuleBadge module="timeline" label="Open" />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                    Review what is coming next across modules.
                  </p>
                </Link>
              </div>
            </DashboardCard>
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
