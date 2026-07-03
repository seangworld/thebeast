"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import {
  CashFlowTrendChart,
  CreditUtilizationChart,
  DebtPayoffProgressChart,
  IncomeVsExpensesChart,
  MonthlySpendingOverviewChart,
} from "@/app/dashboard/money/components/MoneyDashboardCharts";
import {
  MoneyTimeline,
  type MoneyTimelineItem,
} from "@/app/dashboard/money/components/MoneyTimeline";
import {
  AlertCard,
  DashboardCard,
  HealthGauge,
  MetricTile,
  ModuleBadge,
  QuickActionButton,
  SectionHeader,
  type DashboardAlertSeverity,
} from "@/app/dashboard/money/components/MoneyDashboardUI";

type MoneyDebt = {
  id: string;
  name?: string | null;
  balance?: number | null;
  minimum_payment?: number | null;
  interest_rate?: number | null;
  due_date?: number | null;
  credit_limit?: number | null;
  is_archived?: boolean | null;
};

type MoneyBill = {
  id: string;
  name?: string | null;
  amount?: number | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  next_due_date_after_payment?: string | null;
};

type MoneyIncome = {
  id: string;
  name?: string | null;
  amount?: number | null;
  next_date?: string | null;
};

type FundingSource = {
  id: string;
  name?: string | null;
  type?: string | null;
  current_balance?: number | null;
  credit_limit?: number | null;
  available_credit?: number | null;
  is_active?: boolean | null;
};

type MoneySettings = {
  starting_balance?: number | null;
  checking_buffer?: number | null;
};

type DebtSettings = {
  extra_payment?: number | null;
};

type MoneyState = {
  debts: MoneyDebt[];
  bills: MoneyBill[];
  incomes: MoneyIncome[];
  fundingSources: FundingSource[];
  cashSettings: MoneySettings | null;
  debtSettings: DebtSettings | null;
};

const initialMoneyState: MoneyState = {
  debts: [],
  bills: [],
  incomes: [],
  fundingSources: [],
  cashSettings: null,
  debtSettings: null,
};

const quickActions = [
  { label: "Add Bill", href: "/dashboard/money/cashflow", icon: "B" },
  { label: "Add Debt", href: "/dashboard/money/debts", icon: "D" },
  { label: "Add Income", href: "/dashboard/money/cashflow", icon: "I" },
  { label: "Transfer", href: "/dashboard/money/cashflow", icon: "T" },
  { label: "Make Payment", href: "/dashboard/money/cashflow", icon: "P" },
  { label: "Go to Cash Flow", href: "/dashboard/money/cashflow", icon: "CF" },
  { label: "Go to Bills", href: "/dashboard/money/cashflow", icon: "BL" },
  { label: "Go to Debts", href: "/dashboard/money/debts", icon: "DB" },
  { label: "Go to Velocity", href: "/dashboard/money/velocity", icon: "V" },
];

function numberValue(value: unknown) {
  return Number(value || 0);
}

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
    month: "short",
    day: "numeric",
  });
}

export default function MoneyWorkspacePage() {
  const [state, setState] = useState<MoneyState>(initialMoneyState);
  const [loading, setLoading] = useState(true);

  const loadMoneySnapshot = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      setLoading(false);
      return;
    }

    const [
      debtsResult,
      billsResult,
      incomesResult,
      fundingResult,
      cashSettingsResult,
      debtSettingsResult,
    ] = await Promise.all([
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
      supabase
        .from("funding_sources")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase.from("cash_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("debt_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    setState({
      debts: (debtsResult.data || []) as MoneyDebt[],
      bills: (billsResult.data || []) as MoneyBill[],
      incomes: (incomesResult.data || []) as MoneyIncome[],
      fundingSources: (fundingResult.data || []) as FundingSource[],
      cashSettings: cashSettingsResult.data as MoneySettings | null,
      debtSettings: debtSettingsResult.data as DebtSettings | null,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMoneySnapshot();
  }, [loadMoneySnapshot]);

  const snapshot = useMemo(() => {
    const activeDebts = state.debts.filter(
      (debt) => !debt.is_archived && numberValue(debt.balance) > 0
    );
    const activeBills = state.bills.filter((bill) => !bill.is_archived);
    const startingCash = numberValue(state.cashSettings?.starting_balance);
    const buffer = numberValue(state.cashSettings?.checking_buffer);
    const monthlyIncome = state.incomes.reduce(
      (sum, income) => sum + numberValue(income.amount),
      0
    );
    const monthlyBills = activeBills.reduce(
      (sum, bill) => sum + numberValue(bill.amount),
      0
    );
    const debtMinimums = activeDebts.reduce(
      (sum, debt) => sum + numberValue(debt.minimum_payment),
      0
    );
    const totalDebt = activeDebts.reduce(
      (sum, debt) => sum + numberValue(debt.balance),
      0
    );
    const extraPayment = numberValue(state.debtSettings?.extra_payment);
    const monthlyOutflow = monthlyBills + debtMinimums + extraPayment;
    const projectedSurplus = monthlyIncome - monthlyOutflow;
    const creditLimit = [
      ...activeDebts.map((debt) => numberValue(debt.credit_limit)),
      ...state.fundingSources.map((source) => numberValue(source.credit_limit)),
    ].reduce((sum, value) => sum + value, 0);
    const creditUsed = [
      ...activeDebts.map((debt) => numberValue(debt.balance)),
      ...state.fundingSources.map((source) => numberValue(source.current_balance)),
    ].reduce((sum, value) => sum + value, 0);
    const creditAvailable = Math.max(creditLimit - creditUsed, 0);
    const utilization = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;
    const billsDueSoon = activeBills.filter((bill) => {
      const dueDate = bill.next_due_date_after_payment
        ? new Date(bill.next_due_date_after_payment)
        : nextDueDateFromDay(bill.due_date);
      const daysAway = Math.ceil(
        (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysAway <= 7;
    });
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        55 +
          (startingCash >= buffer ? 15 : -10) +
          (projectedSurplus >= 0 ? 10 : -12) +
          (utilization <= 50 ? 10 : utilization <= 75 ? 0 : -12) +
          (billsDueSoon.length === 0 ? 5 : -5) +
          (activeDebts.length === 0 ? 5 : 0)
      )
    );

    return {
      activeDebts,
      activeBills,
      startingCash,
      buffer,
      monthlyIncome,
      monthlyBills,
      debtMinimums,
      totalDebt,
      extraPayment,
      monthlyOutflow,
      projectedSurplus,
      creditLimit,
      creditUsed,
      creditAvailable,
      utilization,
      billsDueSoon,
      healthScore,
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
        message: `${snapshot.billsDueSoon.length} bill${
          snapshot.billsDueSoon.length === 1 ? "" : "s"
        } due in the next 7 days.`,
        severity: "warning",
        href: "/dashboard/money/cashflow#bills",
      });
    }

    if (snapshot.startingCash < snapshot.buffer) {
      results.push({
        title: "Buffer warning",
        message: "Starting cash is below the configured checking buffer.",
        severity: "critical",
        href: "/dashboard/money/cashflow",
      });
    }

    if (snapshot.utilization > 75) {
      results.push({
        title: "High utilization",
        message: "Tracked credit utilization is above 75%.",
        severity: "critical",
        href: "/dashboard/money/debts",
      });
    }

    if (snapshot.monthlyOutflow > snapshot.monthlyIncome && snapshot.monthlyIncome > 0) {
      results.push({
        title: "Low cash warning",
        message: "Known monthly outflow is higher than tracked monthly income.",
        severity: "critical",
        href: "/dashboard/money/cashflow",
      });
    }

    if (results.length === 0) {
      results.push({
        title: "No critical alerts",
        message: "Current Money records do not show an urgent dashboard alert.",
        severity: "info",
      });
    }

    return results;
  }, [snapshot]);

  const timelineItems = useMemo<MoneyTimelineItem[]>(() => {
    const billItems = snapshot.activeBills.slice(0, 5).map((bill) => {
      const date = bill.next_due_date_after_payment
        ? new Date(bill.next_due_date_after_payment)
        : nextDueDateFromDay(bill.due_date);

      return {
        id: `bill-${bill.id}`,
        date: date.toISOString(),
        dateLabel: formatDateLabel(date),
        title: bill.name || "Upcoming bill",
        amountLabel: formatCurrency(numberValue(bill.amount)),
        type: "bill" as const,
        href: "/dashboard/money/cashflow",
      };
    });
    const incomeItems = state.incomes.slice(0, 4).map((income) => {
      const date = income.next_date ? new Date(income.next_date) : new Date();

      return {
        id: `income-${income.id}`,
        date: date.toISOString(),
        dateLabel: formatDateLabel(date),
        title: income.name || "Upcoming income",
        amountLabel: formatCurrency(numberValue(income.amount)),
        type: "payday" as const,
        href: "/dashboard/money/cashflow",
      };
    });
    const debtItems = snapshot.activeDebts.slice(0, 4).map((debt) => ({
      id: `debt-${debt.id}`,
      date: nextDueDateFromDay(debt.due_date).toISOString(),
      dateLabel: formatDateLabel(nextDueDateFromDay(debt.due_date)),
      title: `${debt.name || "Debt"} payment`,
      amountLabel: formatCurrency(numberValue(debt.minimum_payment)),
      type: "debt" as const,
      href: "/dashboard/money/debts",
    }));

    return [...billItems, ...incomeItems, ...debtItems].slice(0, 9);
  }, [snapshot.activeBills, snapshot.activeDebts, state.incomes]);

  const recommendedAction =
    snapshot.billsDueSoon.length > 0
      ? "Review bills due this week and confirm their funding source."
      : snapshot.startingCash < snapshot.buffer
      ? "Restore your checking buffer before adding new discretionary payments."
      : snapshot.totalDebt > 0
      ? "Review Velocity or Debt Strategy for your next payoff move."
      : "Keep Money records current and review upcoming income timing.";

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="money" label="Module #1" />
              <h1 className="beast-title">Money Cockpit</h1>
              <p className="beast-subtitle">
                A professional financial workspace for cash timing, debt payoff,
                credit visibility, and Velocity planning.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/money/cashflow" className="beast-button">
                Open Cash Flow
              </Link>
              <Link href="/dashboard/money/velocity" className="beast-button-secondary">
                Open Velocity
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <DashboardCard>
            <div className="flex animate-pulse flex-col gap-3">
              <div className="h-4 w-40 rounded bg-[#2a3242]" />
              <div className="h-8 w-72 max-w-full rounded bg-[#2a3242]" />
              <div className="h-4 w-full max-w-xl rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : null}

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Financial Snapshot"
            title="Command view"
            description="The high-signal summary of your current Money posture."
          />
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <HealthGauge score={snapshot.healthScore} />
            <DashboardCard accent="purple" className="min-h-[270px]">
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <p className="beast-kicker">Recommended Next Action</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight">
                    {recommendedAction}
                  </h2>
                </div>
                <p className="text-sm leading-6 text-[#c7cfdb]">
                  This dashboard-level recommendation uses current Money
                  records. Deeper AI guidance will plug into this panel in v2.2.
                </p>
              </div>
            </DashboardCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon="$"
              tone="green"
              label="Cash Position"
              value={formatCurrency(snapshot.startingCash)}
              detail={`Configured buffer: ${formatCurrency(snapshot.buffer)}`}
            />
            <MetricTile
              icon="B"
              tone="yellow"
              label="Upcoming Bills"
              value={formatCurrency(snapshot.monthlyBills)}
              detail={`${snapshot.activeBills.length} active bill records`}
            />
            <MetricTile
              icon="I"
              tone="blue"
              label="Upcoming Income"
              value={formatCurrency(snapshot.monthlyIncome)}
              detail={`${state.incomes.length} tracked income sources`}
            />
            <MetricTile
              icon="D"
              tone="red"
              label="Active Debt Summary"
              value={formatCurrency(snapshot.totalDebt)}
              detail={`${snapshot.activeDebts.length} active debts, ${formatCurrency(
                snapshot.debtMinimums
              )} minimums`}
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Trends"
            title="Financial motion"
            description="Current-value charts that are ready for historical trend data when it becomes available."
          />
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <CashFlowTrendChart
                data={[
                  { name: "Cash", value: snapshot.startingCash },
                  { name: "Income", value: snapshot.monthlyIncome },
                  { name: "Bills", value: snapshot.monthlyBills },
                  { name: "Debt Min", value: snapshot.debtMinimums },
                ]}
              />
            </div>
            <div className="xl:col-span-2">
              <DebtPayoffProgressChart remainingDebt={snapshot.totalDebt} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <IncomeVsExpensesChart
              data={[
                { name: "Income", value: snapshot.monthlyIncome },
                { name: "Bills", value: snapshot.monthlyBills },
                { name: "Debt", value: snapshot.debtMinimums },
                { name: "Extra", value: snapshot.extraPayment },
              ]}
            />
            <CreditUtilizationChart
              used={snapshot.creditUsed}
              available={snapshot.creditAvailable}
            />
            <MonthlySpendingOverviewChart
              data={[
                { name: "Bills", value: snapshot.monthlyBills },
                { name: "Debt Minimums", value: snapshot.debtMinimums },
                { name: "Extra Attack", value: snapshot.extraPayment },
              ]}
            />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Timeline"
              title="Money calendar"
              description="A grouped view of near-term financial events."
            />
            <MoneyTimeline items={timelineItems} />
          </div>

          <div className="space-y-4">
            <SectionHeader
              eyebrow="Alerts"
              title="Risk signals"
              description="Severity-coded signals from current records."
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
              </div>
            </DashboardCard>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1fr]">
          <div className="space-y-4">
            <SectionHeader
              eyebrow="Recommendations"
              title="Advisor preview"
              description="Placeholder language reserved for future AI explanations."
            />
            <DashboardCard accent="purple">
              <div className="grid gap-3 text-sm">
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Priority
                  </div>
                  <div className="mt-1 font-bold text-white">
                    {alerts.some((alert) => alert.title !== "No critical alerts")
                      ? "Review Today"
                      : "Maintain"}
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Recommendation
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">{recommendedAction}</div>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Estimated Benefit
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">
                    Reserved for future AI savings explanations.
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Reason
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">
                    Uses current Money records without generating new financial
                    projections.
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-[#2a3242] bg-[#0f1419] p-4 text-[#7f8da3]">
                  <div className="text-xs font-bold uppercase">
                    AI Confidence
                  </div>
                  <div className="mt-1 text-sm">
                    Reserved for the future recommendation engine.
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>

          <div className="space-y-4">
            <SectionHeader
              eyebrow="Quick Actions"
              title="Launch pad"
              description="Fast entry into existing Money workflows."
            />
            <DashboardCard>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions.map((action, index) => (
                  <QuickActionButton
                    key={action.label}
                    href={action.href}
                    label={action.label}
                    icon={action.icon}
                    primary={index < 5}
                  />
                ))}
              </div>
            </DashboardCard>
          </div>
        </section>
      </div>
    </main>
  );
}
