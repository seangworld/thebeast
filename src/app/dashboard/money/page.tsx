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
  { label: "Add Bill", href: "/dashboard/money/cashflow" },
  { label: "Add Debt", href: "/dashboard/money/debts" },
  { label: "Add Income", href: "/dashboard/money/cashflow" },
  { label: "Transfer", href: "/dashboard/money/cashflow" },
  { label: "Make Payment", href: "/dashboard/money/cashflow" },
  { label: "Go to Cash Flow", href: "/dashboard/money/cashflow" },
  { label: "Go to Bills", href: "/dashboard/money/cashflow" },
  { label: "Go to Debts", href: "/dashboard/money/debts" },
  { label: "Go to Velocity", href: "/dashboard/money/velocity" },
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

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="beast-card">
      <div className="text-sm font-semibold text-[#7f8da3]">{label}</div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
      <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">{detail}</p>
    </section>
  );
}

function HealthScore({ score }: { score: number }) {
  return (
    <section className="beast-card">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="beast-kicker">Financial Health Score</p>
          <h2 className="mt-2 text-2xl font-bold">{score}/100</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#c7cfdb]">
            A dashboard readiness signal based on current cash buffer, debt
            load, tracked obligations, and utilization data.
          </p>
        </div>
        <div className="relative h-32 w-32 shrink-0 rounded-full bg-[#111827] p-3">
          <div
            className="h-full w-full rounded-full"
            style={{
              background: `conic-gradient(#38bdf8 ${score * 3.6}deg, #2a3242 0deg)`,
            }}
          />
          <div className="absolute inset-6 flex items-center justify-center rounded-full bg-[#1a1f2b] text-xl font-bold">
            {score}
          </div>
        </div>
      </div>
    </section>
  );
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
    const results: { title: string; message: string; tone: string }[] = [];

    if (snapshot.billsDueSoon.length > 0) {
      results.push({
        title: "Bills due soon",
        message: `${snapshot.billsDueSoon.length} bill${
          snapshot.billsDueSoon.length === 1 ? "" : "s"
        } due in the next 7 days.`,
        tone: "border-yellow-300/40 bg-yellow-300/10 text-yellow-100",
      });
    }

    if (snapshot.startingCash < snapshot.buffer) {
      results.push({
        title: "Buffer warning",
        message: "Starting cash is below the configured checking buffer.",
        tone: "border-red-400/40 bg-red-400/10 text-red-100",
      });
    }

    if (snapshot.utilization > 75) {
      results.push({
        title: "High utilization",
        message: "Tracked credit utilization is above 75%.",
        tone: "border-red-400/40 bg-red-400/10 text-red-100",
      });
    }

    if (snapshot.monthlyOutflow > snapshot.monthlyIncome && snapshot.monthlyIncome > 0) {
      results.push({
        title: "Low cash warning",
        message: "Known monthly outflow is higher than tracked monthly income.",
        tone: "border-red-400/40 bg-red-400/10 text-red-100",
      });
    }

    if (results.length === 0) {
      results.push({
        title: "No critical alerts",
        message: "Current Money records do not show an urgent dashboard alert.",
        tone: "border-green-400/40 bg-green-400/10 text-green-100",
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
        dateLabel: formatDateLabel(date),
        title: income.name || "Upcoming income",
        amountLabel: formatCurrency(numberValue(income.amount)),
        type: "income" as const,
        href: "/dashboard/money/cashflow",
      };
    });
    const debtItems = snapshot.activeDebts.slice(0, 4).map((debt) => ({
      id: `debt-${debt.id}`,
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
            <div>
              <p className="beast-kicker">BeastMoney</p>
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
          <section className="beast-card">
            <p className="text-sm text-[#7f8da3]">Loading Money cockpit...</p>
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <HealthScore score={snapshot.healthScore} />
          <section className="beast-card">
            <p className="beast-kicker">Recommended Next Action</p>
            <h2 className="mt-2 text-2xl font-bold">{recommendedAction}</h2>
            <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
              This is a dashboard-level recommendation using current Money
              records. Deeper AI guidance will plug into this panel in v2.2.
            </p>
          </section>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Cash Position"
            value={formatCurrency(snapshot.startingCash)}
            detail={`Configured buffer: ${formatCurrency(snapshot.buffer)}`}
          />
          <StatCard
            label="Upcoming Bills"
            value={formatCurrency(snapshot.monthlyBills)}
            detail={`${snapshot.activeBills.length} active bill records`}
          />
          <StatCard
            label="Upcoming Income"
            value={formatCurrency(snapshot.monthlyIncome)}
            detail={`${state.incomes.length} tracked income sources`}
          />
          <StatCard
            label="Active Debt Summary"
            value={formatCurrency(snapshot.totalDebt)}
            detail={`${snapshot.activeDebts.length} active debts, ${formatCurrency(
              snapshot.debtMinimums
            )} minimums`}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-5">
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
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
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
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <MoneyTimeline items={timelineItems} />

          <section className="beast-card">
            <h2 className="text-xl font-bold">Alerts</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Operational money alerts from current records.
            </p>
            <div className="mt-5 space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className={`rounded-lg border p-4 ${alert.tone}`}
                >
                  <div className="font-semibold">{alert.title}</div>
                  <p className="mt-1 text-sm opacity-90">{alert.message}</p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1fr]">
          <section className="beast-card">
            <p className="beast-kicker">AI Recommendations</p>
            <h2 className="mt-2 text-xl font-bold">Placeholder Advisor Panel</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-lg border border-[#2a3242] bg-[#111827] p-3">
                <span className="font-semibold text-[#7f8da3]">Recommended action: </span>
                {recommendedAction}
              </div>
              <div className="rounded-lg border border-[#2a3242] bg-[#111827] p-3">
                <span className="font-semibold text-[#7f8da3]">Estimated savings: </span>
                Connects to future AI explanation layer.
              </div>
              <div className="rounded-lg border border-[#2a3242] bg-[#111827] p-3">
                <span className="font-semibold text-[#7f8da3]">Priority: </span>
                {alerts.some((alert) => alert.title !== "No critical alerts")
                  ? "Review Today"
                  : "Maintain"}
              </div>
              <div className="rounded-lg border border-[#2a3242] bg-[#111827] p-3">
                <span className="font-semibold text-[#7f8da3]">Reason: </span>
                Uses current Money records without generating new financial
                projections.
              </div>
            </div>
          </section>

          <section className="beast-card">
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Jump into the existing Money workflows.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action, index) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={index < 5 ? "beast-button" : "beast-button-secondary"}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
