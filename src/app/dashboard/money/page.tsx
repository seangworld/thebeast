"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildCashIntelligence } from "@/lib/cashIntelligence";
import { buildDailyFinancialAdvisor } from "@/lib/dailyFinancialAdvisor";
import { buildFinancialDecision } from "@/lib/financialDecisionEngine";
import { buildFinancialForecast } from "@/lib/financialForecasting";
import { buildFinancialInsights } from "@/lib/financialInsights";
import { compareFinancialScenarios } from "@/lib/financialScenarios";
import { buildFinancialSimulationState } from "@/lib/financialSimulation";
import { formatCurrency } from "@/lib/formatters";
import {
  isActiveRecurringSource,
  numberValue,
} from "@/lib/financialMetrics";
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

function nextDueDateFromDay(day: number | null | undefined, today = new Date()) {
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

function formatMonthsSaved(months: number) {
  if (months <= 0) return "0 months";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;

  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (remainder === 0) return `${years} year${years === 1 ? "" : "s"}`;

  return `${years}y ${remainder}m`;
}

export default function MoneyWorkspacePage() {
  const [state, setState] = useState<MoneyState>(initialMoneyState);
  const [loading, setLoading] = useState(true);
  const [simulationDate, setSimulationDate] = useState("");

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
    const simulation = buildFinancialSimulationState(simulationDate);
    const asOfDate = simulation.asOfDate;
    const activeDebts = state.debts.filter(
      (debt) => !debt.is_archived && numberValue(debt.balance) > 0
    );
    const forecastDebts = activeDebts.map((debt) => ({
      id: debt.id,
      name: debt.name || "Debt",
      balance: numberValue(debt.balance),
      minimum_payment: numberValue(debt.minimum_payment),
      interest_rate: numberValue(debt.interest_rate),
    }));
    const activeBills = state.bills.filter((bill) => !bill.is_archived);
    const activeIncomes = state.incomes.filter(isActiveRecurringSource);
    const startingCash = numberValue(state.cashSettings?.starting_balance);
    const buffer = numberValue(state.cashSettings?.checking_buffer);
    const extraPayment = numberValue(state.debtSettings?.extra_payment);
    const cashIntelligence = buildCashIntelligence({
      asOfDate,
      income: activeIncomes,
      bills: activeBills,
      debtMinimums: activeDebts,
      scheduledTransfers:
        extraPayment > 0
          ? [
              {
                id: "planned-extra-debt-attack",
                name: "Planned extra debt payment",
                amount: extraPayment,
                frequency: "monthly",
              },
            ]
          : [],
      fundingSources: state.fundingSources,
      settings: {
        currentCash: startingCash,
        cashBuffer: buffer,
        lookaheadDays: 30,
      },
    });
    const monthlyIncome = cashIntelligence.monthlyIncome;
    const monthlyBills = cashIntelligence.monthlyBills;
    const debtMinimums = cashIntelligence.monthlyDebtMinimums;
    const totalDebt = activeDebts.reduce(
      (sum, debt) => sum + numberValue(debt.balance),
      0
    );
    const monthlyOutflow =
      monthlyBills + debtMinimums + cashIntelligence.monthlyScheduledTransfers;
    const projectedSurplus = cashIntelligence.monthlyAvailableCash;
    const financialDecision = buildFinancialDecision({
      cashIntelligence,
      debts: forecastDebts,
      income: activeIncomes,
      bills: activeBills,
      fundingSources: state.fundingSources,
      strategy: "avalanche",
    });
    const financialForecast = buildFinancialForecast({
      asOfDate,
      cashIntelligence,
      financialDecision,
      debts: forecastDebts,
      income: activeIncomes,
      bills: activeBills,
      fundingSources: state.fundingSources,
      strategy: "avalanche",
      currentCash: startingCash,
      cashBuffer: buffer,
    });
    const dailyAdvisor = buildDailyFinancialAdvisor({
      cashIntelligence,
      financialDecision,
      financialForecast,
      debts: forecastDebts,
    });
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
        : nextDueDateFromDay(bill.due_date, asOfDate);
      const daysAway = Math.ceil(
        (dueDate.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysAway <= 7;
    });
    const financialInsights = buildFinancialInsights({
      cashIntelligence,
      financialDecision,
      financialForecast,
      debts: forecastDebts,
      strategy: "avalanche",
      creditUtilization: utilization,
      billsDueSoon: billsDueSoon.length,
      currentCash: startingCash,
      cashBuffer: buffer,
    });
    const scenarioComparison = compareFinancialScenarios({
      debts: forecastDebts,
      cashIntelligence,
      financialDecision,
      asOfDate,
    });

    return {
      simulation,
      activeDebts,
      activeBills,
      activeIncomes,
      startingCash,
      buffer,
      monthlyIncome,
      monthlyBills,
      debtMinimums,
      totalDebt,
      extraPayment,
      monthlyOutflow,
      projectedSurplus,
      financialDecision,
      financialForecast,
      dailyAdvisor,
      financialInsights,
      scenarioComparison,
      creditLimit,
      creditUsed,
      creditAvailable,
      utilization,
      billsDueSoon,
    };
  }, [simulationDate, state]);

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
        : nextDueDateFromDay(bill.due_date, snapshot.simulation.asOfDate);

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
    const incomeItems = snapshot.activeIncomes.slice(0, 4).map((income) => {
      const date = income.next_date
        ? new Date(income.next_date)
        : snapshot.simulation.asOfDate;

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
      date: nextDueDateFromDay(debt.due_date, snapshot.simulation.asOfDate).toISOString(),
      dateLabel: formatDateLabel(
        nextDueDateFromDay(debt.due_date, snapshot.simulation.asOfDate)
      ),
      title: `${debt.name || "Debt"} payment`,
      amountLabel: formatCurrency(numberValue(debt.minimum_payment)),
      type: "debt" as const,
      href: "/dashboard/money/debts",
    }));

    return [...billItems, ...incomeItems, ...debtItems].slice(0, 9);
  }, [
    snapshot.activeBills,
    snapshot.activeDebts,
    snapshot.activeIncomes,
    snapshot.simulation.asOfDate,
  ]);

  const recommendedAction = snapshot.financialDecision.recommendedAction;

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

        <DashboardCard accent={snapshot.simulation.enabled ? "yellow" : "money"}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="beast-kicker">Simulation Mode</p>
              <h2 className="mt-2 text-xl font-black">
                {snapshot.simulation.label}
              </h2>
              <p className="mt-2 text-sm text-[#c7cfdb]">
                Recalculate the dashboard, forecasting, advisor, insights, and
                Money calendar from a selected date without changing saved data.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                aria-label="Simulation date"
                type="date"
                value={simulationDate}
                onChange={(event) => setSimulationDate(event.target.value)}
                className="rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-semibold text-white"
              />
              {simulationDate ? (
                <button
                  type="button"
                  onClick={() => setSimulationDate("")}
                  className="beast-button-secondary"
                >
                  Return Live
                </button>
              ) : null}
            </div>
          </div>
        </DashboardCard>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Financial Snapshot"
            title="Command view"
            description="The high-signal summary of your current Money posture."
          />
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <HealthGauge score={snapshot.financialInsights.financialHealthScore} />
            <DashboardCard accent="purple" className="min-h-[270px]">
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <p className="beast-kicker">Recommended Next Action</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight">
                    {recommendedAction}
                  </h2>
                </div>
                <p className="text-sm leading-6 text-[#c7cfdb]">
                  {snapshot.financialDecision.reason}
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
              label="Monthly Bills"
              value={formatCurrency(snapshot.monthlyBills)}
              detail={`${snapshot.activeBills.length} active recurring bill records`}
            />
            <MetricTile
              icon="I"
              tone="blue"
              label="Monthly Income"
              value={formatCurrency(snapshot.monthlyIncome)}
              detail={`${snapshot.activeIncomes.length} active recurring income sources`}
            />
            <MetricTile
              icon="S"
              tone={
                snapshot.financialDecision.safetyRating === "safe"
                  ? "green"
                  : snapshot.financialDecision.safetyRating === "caution"
                  ? "yellow"
                  : "red"
              }
              label="Suggested Extra"
              value={formatCurrency(
                snapshot.financialDecision.suggestedExtraPayment
              )}
              detail={`Safety: ${snapshot.financialDecision.safetyRating}`}
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Scenarios"
            title="Compare payoff paths"
            description="Minimum, Snowball, Avalanche, Velocity, Custom, and assumption-based paths using the shared strategy engine."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {[snapshot.scenarioComparison.bestByInterest, snapshot.scenarioComparison.bestBySpeed].map((scenario) => (
              <DashboardCard key={`${scenario.id}-${scenario.kind}`} accent="purple">
                <div className="grid gap-3">
                  <div>
                    <p className="beast-kicker">
                      {scenario.id === snapshot.scenarioComparison.bestByInterest.id
                        ? "Best Interest Outcome"
                        : "Fastest Payoff Outcome"}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">{scenario.label}</h2>
                  </div>
                  <div className="grid gap-2 text-sm text-[#c7cfdb]">
                    <div>Debt-Free: {scenario.debtFreeDate}</div>
                    <div>Total Interest: {formatCurrency(scenario.totalInterest)}</div>
                    <div>Interest Saved: {formatCurrency(scenario.interestSaved)}</div>
                    <div>Time Saved: {formatMonthsSaved(scenario.timeSavedMonths)}</div>
                    <div>Monthly Cash Strain: {formatCurrency(scenario.monthlyCashStrain)}</div>
                    <div>Risk: {scenario.riskLevel}</div>
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Insights"
            title="Financial health and payoff progress"
            description="A shared-engine view of health, payoff acceleration, cash efficiency, and debt freedom timing."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon="H"
              tone={
                snapshot.financialInsights.healthBand === "excellent" ||
                snapshot.financialInsights.healthBand === "stable"
                  ? "green"
                  : snapshot.financialInsights.healthBand === "watch"
                  ? "yellow"
                  : "red"
              }
              label="Financial Health"
              value={`${snapshot.financialInsights.financialHealthScore}`}
              detail={snapshot.financialInsights.healthBand}
            />
            <MetricTile
              icon="IS"
              tone="green"
              label="Interest Saved"
              value={formatCurrency(snapshot.financialInsights.interestSaved)}
              detail="Compared with minimum payments"
            />
            <MetricTile
              icon="TS"
              tone="blue"
              label="Time Saved"
              value={formatMonthsSaved(snapshot.financialInsights.timeSavedMonths)}
              detail="Optimized plan improvement"
            />
            <MetricTile
              icon="DF"
              tone="purple"
              label="Debt Freedom"
              value={snapshot.financialInsights.debtFreedomCountdown}
              detail="Current optimized countdown"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.8fr_1fr]">
            <DashboardCard accent="green">
              <div className="grid gap-5">
                <div>
                  <p className="beast-kicker">Cash Efficiency</p>
                  <h2 className="mt-2 text-3xl font-black">
                    {snapshot.financialInsights.cashEfficiency}%
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    Percentage of monthly income remaining after bills, minimums,
                    scheduled transfers, and reserve guardrails.
                  </p>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 text-sm text-[#dbe3ef]">
                  {snapshot.financialInsights.summary}
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm text-[#c7cfdb]">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Why BeastMoney says this
                  </div>
                  <p className="mt-2 text-[#dbe3ef]">
                    {snapshot.financialInsights.explanation.reason}
                  </p>
                  <p className="mt-2">
                    {snapshot.financialInsights.explanation.impact}
                  </p>
                </div>
              </div>
            </DashboardCard>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                snapshot.financialInsights.monthlyProgress,
                snapshot.financialInsights.yearlyProgress,
              ].map((progress) => (
                <DashboardCard key={progress.label} accent="blue">
                  <div className="grid gap-4">
                    <div>
                      <p className="beast-kicker">{progress.label}</p>
                      <h2 className="mt-2 text-2xl font-black">
                        {progress.progressPercent}% progress
                      </h2>
                    </div>
                    <div className="grid gap-2 text-sm text-[#c7cfdb]">
                      <div>
                        Debt Reduction: {formatCurrency(progress.debtReduction)}
                      </div>
                      <div>
                        Interest Projected:{" "}
                        {formatCurrency(progress.interestProjected)}
                      </div>
                      <div>Cash Change: {formatCurrency(progress.cashChange)}</div>
                    </div>
                  </div>
                </DashboardCard>
              ))}
            </div>
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

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Forecast"
            title="Financial outlook"
            description="Projected cash, debt, interest, net worth, and risks from current Money records."
          />
          <div className="grid gap-4 xl:grid-cols-3">
            {snapshot.financialForecast.periods.map((period) => (
              <DashboardCard key={period.key} accent="green">
                <div className="flex h-full flex-col gap-4">
                  <div>
                    <p className="beast-kicker">{period.label}</p>
                    <h2 className="mt-2 text-2xl font-black">
                      {formatCurrency(period.netWorth)}
                    </h2>
                    <p className="mt-1 text-xs text-[#7f8da3]">
                      Projected net worth
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-[#c7cfdb]">
                    <div>Cash: {formatCurrency(period.cash)}</div>
                    <div>Debt: {formatCurrency(period.debt)}</div>
                    <div>Interest: {formatCurrency(period.interest)}</div>
                    <div>Debt-Free: {period.debtFreeDate}</div>
                    <div>
                      Cash Shortages:{" "}
                      <span
                        className={
                          period.cashShortages > 0
                            ? "font-bold text-red-200"
                            : "font-bold text-green-200"
                        }
                      >
                        {period.cashShortages}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Upcoming Risks
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-[#dbe3ef]">
                      {period.upcomingRisks.slice(0, 3).map((risk) => (
                        <li key={risk}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Today"
            title="Today's Recommendations"
            description="Actionable Money guidance from the current cash, debt, forecast, and guardrail engines."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {snapshot.dailyAdvisor.recommendations.slice(0, 3).map((recommendation) => (
              <DashboardCard
                key={recommendation.id}
                accent={
                  recommendation.risk === "high"
                    ? "red"
                    : recommendation.risk === "medium"
                    ? "yellow"
                    : "green"
                }
              >
                <div className="flex h-full flex-col gap-4">
                  <div>
                    <p className="beast-kicker">{recommendation.risk} risk</p>
                    <h2 className="mt-2 text-xl font-black">
                      {recommendation.title}
                    </h2>
                    <p className="mt-2 text-sm text-[#dbe3ef]">
                      {recommendation.action}
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm text-[#c7cfdb]">
                    <div>
                      <span className="font-bold text-white">Why:</span>{" "}
                      {recommendation.why}
                    </div>
                    <div>
                      <span className="font-bold text-white">Impact:</span>{" "}
                      {recommendation.impact}
                    </div>
                    <div>
                      <span className="font-bold text-white">Interest Saved:</span>{" "}
                      {formatCurrency(recommendation.interestSaved)}
                    </div>
                    <div>
                      <span className="font-bold text-white">
                        Payoff Improvement:
                      </span>{" "}
                      {recommendation.payoffImprovement}
                    </div>
                    <div className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                      <div className="text-xs font-bold uppercase text-[#7f8da3]">
                        Explanation
                      </div>
                      <p className="mt-2">{recommendation.explanation.reason}</p>
                      <p className="mt-2">{recommendation.explanation.impact}</p>
                      {recommendation.explanation.risks.length > 0 ? (
                        <p className="mt-2 text-yellow-100">
                          Risk: {recommendation.explanation.risks[0]}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </DashboardCard>
            ))}
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
              title="Financial decision"
              description="A guardrail-based recommendation from current Money records."
            />
            <DashboardCard accent="purple">
              <div className="grid gap-3 text-sm">
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Suggested Extra Payment
                  </div>
                  <div className="mt-1 font-bold text-white">
                    {formatCurrency(
                      snapshot.financialDecision.suggestedExtraPayment
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Recommended Next Action
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">{recommendedAction}</div>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Safety Indicator
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">
                    {snapshot.financialDecision.safetyRating}
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Reason
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">
                    {snapshot.financialDecision.reason}
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 text-[#dbe3ef]">
                  <div className="text-xs font-bold uppercase">
                    Confidence
                  </div>
                  <div className="mt-1 text-sm">
                    {snapshot.financialDecision.confidenceScore}%
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
