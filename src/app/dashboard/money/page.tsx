"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildCashIntelligence } from "@/lib/cashIntelligence";
import { buildDailyFinancialAdvisor } from "@/lib/dailyFinancialAdvisor";
import { buildFinancialDecision } from "@/lib/financialDecisionEngine";
import { buildFinancialForecast } from "@/lib/financialForecasting";
import { buildFinancialInsights } from "@/lib/financialInsights";
import { buildFinancialReports } from "@/lib/financialReports";
import { compareFinancialScenarios } from "@/lib/financialScenarios";
import { buildFinancialSimulationState } from "@/lib/financialSimulation";
import {
  appendFinancialCoachRecommendationHistory,
  buildFinancialCoach,
  type FinancialCoachRecommendationRecord,
  type FinancialCoachScenarioInput,
} from "@/lib/financialCoach";
import { buildPaymentAutomationContext } from "@/lib/paymentAutomation";
import { formatCurrency } from "@/lib/formatters";
import { getProfileDisplayName } from "@/lib/profile";
import { buildMoneyCoachExperience } from "@/lib/moneyCoachExperience";
import {
  isActiveRecurringSource,
  numberValue,
} from "@/lib/financialMetrics";
import {
  buildMobileMoneyBillCards,
  buildMobileMoneyDebtCards,
  buildRecentMoneyTransactions,
} from "@/lib/mobileMoney";
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
  QuickActionButton,
  SectionHeader,
  type DashboardAlertSeverity,
} from "@/app/dashboard/money/components/MoneyDashboardUI";
import { BeastMoneyShell } from "@/app/dashboard/money/BeastMoneyShell";
import { MoneyCoachExperience } from "@/app/dashboard/money/components/MoneyCoachExperience";

type MoneyDebt = {
  id: string;
  name?: string | null;
  balance?: number | null;
  minimum_payment?: number | null;
  interest_rate?: number | null;
  due_date?: number | null;
  credit_limit?: number | null;
  is_archived?: boolean | null;
  auto_pay_enabled?: boolean | null;
  reminder_enabled?: boolean | null;
  assigned_income_date?: string | null;
};

type MoneyBill = {
  id: string;
  name?: string | null;
  amount?: number | null;
  frequency?: string | null;
  due_date?: number | null;
  is_archived?: boolean | null;
  next_due_date_after_payment?: string | null;
  auto_pay_enabled?: boolean | null;
  reminder_enabled?: boolean | null;
  assigned_income_date?: string | null;
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

type MoneyPayment = {
  id: string;
  amount?: number | null;
  amount_paid?: number | null;
  payment_date?: string | null;
  created_at?: string | null;
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
  billPayments: MoneyPayment[];
  debtPayments: MoneyPayment[];
};

type CoachCorrections = Partial<Record<FinancialCoachScenarioInput, string>>;

const initialMoneyState: MoneyState = {
  debts: [],
  bills: [],
  incomes: [],
  fundingSources: [],
  cashSettings: null,
  debtSettings: null,
  billPayments: [],
  debtPayments: [],
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
  { label: "Retirement Planning", href: "/dashboard/money/retirement", icon: "R" },
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

function resolveCoachCorrection(value: string | undefined, fallback: number) {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatCoachTimestamp(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) return "Time unavailable";

  return timestamp.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function MobileMoneyCard({
  title,
  children,
  action,
  id,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-[#2a3242] bg-[#1a1f2b] p-4"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h2 className="min-w-0 text-lg font-black text-white">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

function MobileMoneyMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-3">
      <div className="text-xs font-bold uppercase text-[#7f8da3]">{label}</div>
      <div className="mt-1 break-words text-xl font-black text-white">{value}</div>
      <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">{detail}</p>
    </div>
  );
}

export default function MoneyWorkspacePage() {
  const [state, setState] = useState<MoneyState>(initialMoneyState);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [userName, setUserName] = useState("there");
  const [ownerId, setOwnerId] = useState("authenticated-owner");
  const [simulationDate, setSimulationDate] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [coachCorrections, setCoachCorrections] = useState<CoachCorrections>({});
  const [coachRecommendationHistory, setCoachRecommendationHistory] = useState<
    FinancialCoachRecommendationRecord[]
  >([]);

  const loadMoneySnapshot = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        setLoadError("Sign in again to load your Money workspace.");
        setLoading(false);
        return;
      }
      setOwnerId(userId);

      const profileResult = await supabase
        .from("profiles")
        .select("preferred_name, display_name, full_name, username")
        .eq("id", userId)
        .maybeSingle();
      setUserName(
        getProfileDisplayName(
          profileResult.error ? null : profileResult.data,
          userData.user
        )
      );

      const [
        debtsResult,
        billsResult,
        incomesResult,
        fundingResult,
        cashSettingsResult,
        debtSettingsResult,
        billPaymentsResult,
        debtPaymentsResult,
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
      const firstError =
        debtsResult.error ||
        billsResult.error ||
        incomesResult.error ||
        fundingResult.error ||
        cashSettingsResult.error ||
        debtSettingsResult.error ||
        billPaymentsResult.error ||
        debtPaymentsResult.error;

      if (firstError) throw firstError;

      setState({
        debts: (debtsResult.data || []) as MoneyDebt[],
        bills: (billsResult.data || []) as MoneyBill[],
        incomes: (incomesResult.data || []) as MoneyIncome[],
        fundingSources: (fundingResult.data || []) as FundingSource[],
        cashSettings: cashSettingsResult.data as MoneySettings | null,
        debtSettings: debtSettingsResult.data as DebtSettings | null,
        billPayments: (billPaymentsResult.data || []) as MoneyPayment[],
        debtPayments: (debtPaymentsResult.data || []) as MoneyPayment[],
      });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load your Money workspace."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMoneySnapshot();
  }, [loadMoneySnapshot]);

  useEffect(() => {
    function syncMoneyWorkspace() {
      setShowDashboard(window.location.hash === "#money-dashboard");
    }
    syncMoneyWorkspace();
    window.addEventListener("hashchange", syncMoneyWorkspace);
    return () => window.removeEventListener("hashchange", syncMoneyWorkspace);
  }, []);

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
    const startingCash = resolveCoachCorrection(
      coachCorrections.current_cash,
      numberValue(state.cashSettings?.starting_balance)
    );
    const buffer = resolveCoachCorrection(
      coachCorrections.cash_buffer,
      numberValue(state.cashSettings?.checking_buffer)
    );
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
    const utilization = Math.min(
      resolveCoachCorrection(
        coachCorrections.credit_utilization,
        creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0
      ),
      100
    );
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
    const financialCoach = buildFinancialCoach({
      advisor: dailyAdvisor,
      forecast: financialForecast,
      insights: financialInsights,
      scenarios: scenarioComparison,
      creditUtilization: utilization,
      currentCash: startingCash,
      cashBuffer: buffer,
      paymentAutomation: buildPaymentAutomationContext([...activeBills, ...activeDebts].map((item) => ({
        id: item.id,
        name: item.name || "Unnamed payment",
        auto_pay_enabled: item.auto_pay_enabled,
        reminder_enabled: item.reminder_enabled,
      }))),
    });
    const financialReports = buildFinancialReports({
      cashIntelligence,
      forecast: financialForecast,
      insights: financialInsights,
      advisor: dailyAdvisor,
      scenarios: scenarioComparison,
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
      financialCoach,
      financialReports,
      creditLimit,
      creditUsed,
      creditAvailable,
      utilization,
      billsDueSoon,
      safeFundingSourceCapacity: cashIntelligence.safeFundingSourceCapacity,
    };
  }, [coachCorrections, simulationDate, state]);

  useEffect(() => {
    if (loading || loadError) return;

    setCoachRecommendationHistory((current) =>
      appendFinancialCoachRecommendationHistory(
        current,
        snapshot.financialCoach.currentRecommendation
      )
    );
  }, [loadError, loading, snapshot.financialCoach.currentRecommendation]);

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
  const mobileBillCards = buildMobileMoneyBillCards({
    bills: snapshot.activeBills,
    asOfDate: snapshot.simulation.asOfDate,
  });
  const mobileDebtCards = buildMobileMoneyDebtCards({
    debts: snapshot.activeDebts,
    asOfDate: snapshot.simulation.asOfDate,
  });
  const mobileTransactions = buildRecentMoneyTransactions({
    billPayments: state.billPayments,
    debtPayments: state.debtPayments,
  });
  const overdueBills = mobileBillCards.filter(
    (bill) => bill.status === "Overdue"
  );
  const upcomingObligations = mobileBillCards.filter((bill) =>
    ["Overdue", "Due Today", "Due Soon"].includes(bill.status)
  );
  const moneyCoachExperience = buildMoneyCoachExperience({
    ownerId,
    userName,
    asOfDate: snapshot.simulation.asOfDate,
    activeBillCount: snapshot.activeBills.length,
    billsDueSoonCount: snapshot.billsDueSoon.length,
    monthlyBills: snapshot.monthlyBills,
    activeDebtCount: snapshot.activeDebts.length,
    totalDebt: snapshot.totalDebt,
    projectedDebtReduction:
      snapshot.financialInsights.monthlyProgress.debtReduction,
    debtProgressPercent:
      snapshot.financialInsights.monthlyProgress.progressPercent,
    monthlyIncome: snapshot.monthlyIncome,
    monthlyOutflow: snapshot.monthlyOutflow,
    projectedSurplus: snapshot.projectedSurplus,
    currentCash: snapshot.startingCash,
    cashBuffer: snapshot.buffer,
    utilization: snapshot.utilization,
    fundingSourceCount: state.fundingSources.filter(
      (source) => source.is_active !== false
    ).length,
    safeFundingSourceCapacity: snapshot.safeFundingSourceCapacity,
    assignedIncomePotCount: [
      ...snapshot.activeBills,
      ...snapshot.activeDebts,
    ].filter((item) => Boolean(item.assigned_income_date)).length,
    totalObligationCount:
      snapshot.activeBills.length + snapshot.activeDebts.length,
    recommendationTitle: snapshot.financialCoach.bestNextAction,
    recommendationAction: snapshot.financialCoach.whatToDoToday,
    recommendationWhy: snapshot.financialCoach.whyThisAction,
    recommendationHref:
      snapshot.financialCoach.warnings[0]?.href ||
      (snapshot.activeDebts.length > 0
        ? "/dashboard/money/debts"
        : "/dashboard/money/cashflow"),
    interestSaved: snapshot.financialInsights.interestSaved,
    timeSavedMonths: snapshot.financialInsights.timeSavedMonths,
    billsDueSoon: snapshot.billsDueSoon.map((bill) => {
      const dueDate = bill.next_due_date_after_payment
        ? new Date(bill.next_due_date_after_payment)
        : nextDueDateFromDay(bill.due_date, snapshot.simulation.asOfDate);
      const daysAway = Math.ceil((dueDate.getTime() - snapshot.simulation.asOfDate.getTime()) / 86400000);
      return { name: bill.name || "Upcoming bill", amount: numberValue(bill.amount), dueDate: formatDateLabel(dueDate), status: daysAway < 0 ? "Overdue" : daysAway === 0 ? "Due today" : `Due in ${daysAway} days`, incomePot: bill.assigned_income_date || undefined };
    }),
    upcomingIncome: snapshot.activeIncomes.map((income) => ({ name: income.name || "Income", amount: numberValue(income.amount), date: income.next_date ? formatDateLabel(new Date(income.next_date)) : undefined })),
    debts: snapshot.activeDebts.map((debt) => ({ name: debt.name || "Debt", balance: numberValue(debt.balance), minimumPayment: numberValue(debt.minimum_payment), interestRate: numberValue(debt.interest_rate) })),
    fundingSources: state.fundingSources.filter((source) => source.is_active !== false).map((source) => ({ name: source.name || "Funding source", type: source.type || "other", available: numberValue(source.available_credit) })),
    helocReserve: state.fundingSources.filter((source) => source.is_active !== false && source.type?.toLowerCase().includes("heloc")).reduce((sum, source) => sum + numberValue(source.available_credit), 0),
    activeDebtStrategy: "avalanche",
    strategyScenarios: snapshot.scenarioComparison.scenarios.filter((scenario) => ["avalanche", "snowball", "velocity"].includes(scenario.id)).map((scenario) => ({ id: scenario.id, label: scenario.label, monthsToPayoff: scenario.monthsToPayoff, totalInterest: scenario.totalInterest, monthlyCashStrain: scenario.monthlyCashStrain, riskLevel: scenario.riskLevel, debtFreeDate: scenario.debtFreeDate })),
    forecast: snapshot.financialForecast.periods.map((period) => ({ label: period.label, cash: period.cash, debt: period.debt, cashShortages: period.cashShortages })),
    retirementDataAvailable: false,
  });

  return (
    <BeastMoneyShell
      title="Money Coach"
      description="Money Coach leads your conversation-first experience, with the existing Money Cockpit grounded in current BeastMoney records and calculations below."
      showPageHeader={false}
    >
      {!showDashboard ? <MoneyCoachExperience
        model={moneyCoachExperience}
        loading={loading}
        error={loadError}
        onRetry={loadMoneySnapshot}
      /> : <>
        <header id="money-dashboard" className="scroll-mt-6 border-b border-white/10 pb-6">
          <p className="beast-kicker">Financial mission control</p>
          <h1 className="mt-2 text-3xl font-black text-white">BeastMoney Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c7cfdb]">Explore current balances, obligations, forecasts, risks, trends, scenarios, and reports. Money Coach remains available when you want help understanding why the numbers matter.</p>
        </header>

        <div className="space-y-4 md:hidden" data-mobile-money-experience="true">
          <MobileMoneyCard id="mobile-money-home" title="Money Home">
            <div className="grid gap-3">
              <MobileMoneyMetric
                label="Available Cash"
                value={formatCurrency(snapshot.startingCash)}
                detail={`Buffer target ${formatCurrency(snapshot.buffer)}`}
              />
              <MobileMoneyMetric
                label="Upcoming Obligations"
                value={String(upcomingObligations.length)}
                detail={`${overdueBills.length} overdue, ${snapshot.billsDueSoon.length} due soon`}
              />
              <MobileMoneyMetric
                label="Debt Summary"
                value={formatCurrency(snapshot.totalDebt)}
                detail={`${formatCurrency(snapshot.debtMinimums)} minimums`}
              />
            </div>

            <div className="mt-4 rounded-xl border border-purple-300/30 bg-purple-300/10 p-3">
              <div className="text-xs font-bold uppercase text-purple-100">
                Current Recommendation
              </div>
              <p className="mt-2 text-base font-black leading-6 text-white">
                {recommendedAction}
              </p>
              <p className="mt-2 text-sm leading-5 text-[#dbe3ef]">
                {snapshot.financialDecision.reason}
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              {alerts.slice(0, 2).map((alert) => (
                <Link
                  key={alert.title}
                  href={alert.href || "/dashboard/money"}
                  className="block rounded-xl border border-[#2a3242] bg-[#111827] p-3"
                >
                  <div className="text-sm font-black text-white">{alert.title}</div>
                  <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">
                    {alert.message}
                  </p>
                </Link>
              ))}
            </div>
          </MobileMoneyCard>

          <MobileMoneyCard
            id="mobile-money-bills"
            title="Bills"
            action={
              <Link href="/dashboard/money/cashflow#bills" className="text-sm font-black text-green-200">
                View all
              </Link>
            }
          >
            <div className="grid gap-3" data-mobile-money-bill-cards="true">
              {mobileBillCards.slice(0, 5).map((bill) => (
                <article
                  key={bill.id}
                  className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-3"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-black text-white">
                        {bill.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#7f8da3]">
                        Due {formatDateLabel(bill.dueDate)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-bold uppercase text-[#7f8da3]">
                        Amount
                      </div>
                      <div className="break-words font-black text-white">
                        {formatCurrency(bill.amountDue)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-bold text-[#dbe3ef]">
                    {bill.status}
                  </div>
                  <Link
                    href={bill.actionHref}
                    className="mt-3 flex min-h-[44px] items-center justify-center rounded-lg bg-[#22c55e] px-3 py-2 text-sm font-black text-black"
                  >
                    Pay or record payment
                  </Link>
                </article>
              ))}
              {mobileBillCards.length === 0 ? (
                <p className="text-sm text-[#c7cfdb]">No active bills yet.</p>
              ) : null}
            </div>
          </MobileMoneyCard>

          <MobileMoneyCard
            id="mobile-money-debts"
            title="Debts"
            action={
              <Link href="/dashboard/money/debts" className="text-sm font-black text-green-200">
                View all
              </Link>
            }
          >
            <div className="grid gap-3" data-mobile-money-debt-cards="true">
              {mobileDebtCards.slice(0, 5).map((debt) => (
                <article
                  key={debt.id}
                  className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-3"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-black text-white">
                      {debt.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#7f8da3]">
                      Due {formatDateLabel(debt.dueDate)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MobileMoneyMetric
                      label="Balance"
                      value={formatCurrency(debt.balance)}
                      detail={`${debt.interestRate.toFixed(2)}% APR`}
                    />
                    <MobileMoneyMetric
                      label="Minimum"
                      value={formatCurrency(debt.minimumPayment)}
                      detail="Next required payment"
                    />
                  </div>
                  <Link
                    href={debt.actionHref}
                    className="mt-3 flex min-h-[44px] items-center justify-center rounded-lg bg-[#22c55e] px-3 py-2 text-sm font-black text-black"
                  >
                    Pay or record payment
                  </Link>
                </article>
              ))}
              {mobileDebtCards.length === 0 ? (
                <p className="text-sm text-[#c7cfdb]">No active debts yet.</p>
              ) : null}
            </div>
          </MobileMoneyCard>

          <MobileMoneyCard id="mobile-money-transactions" title="Transactions">
            <form
              className="grid gap-2"
              data-mobile-money-quick-add-transaction="true"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase text-[#7f8da3]">
                  Quick-add type
                </span>
                <select className="beast-input">
                  <option>Bill payment</option>
                  <option>Debt payment</option>
                  <option>New transaction note</option>
                </select>
              </label>
              <input className="beast-input" inputMode="decimal" placeholder="Amount" />
              <input className="beast-input" placeholder="Name or note" />
              <div className="grid grid-cols-2 gap-2">
                <Link href="/dashboard/money/cashflow#bills" className="beast-button">
                  Add Bill Pay
                </Link>
                <Link href="/dashboard/money/debts" className="beast-button-secondary">
                  Add Debt Pay
                </Link>
              </div>
            </form>

            <div className="mt-4 grid gap-2">
              {mobileTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-3"
                >
                  <div className="flex min-w-0 justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-sm font-black text-white">
                        {transaction.label}
                      </div>
                      <div className="mt-1 text-xs text-[#7f8da3]">
                        {transaction.source} | {transaction.date}
                      </div>
                    </div>
                    <div className="shrink-0 font-black text-white">
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                </div>
              ))}
              {mobileTransactions.length === 0 ? (
                <p className="text-sm text-[#c7cfdb]">
                  Recent payments will appear here after Money records exist.
                </p>
              ) : null}
            </div>
          </MobileMoneyCard>

          <MobileMoneyCard id="mobile-money-advisor" title="Advisor">
            <div className="rounded-xl border border-purple-300/30 bg-purple-300/10 p-3">
              <div className="text-xs font-bold uppercase text-purple-100">
                Recommended action
              </div>
              <h3 className="mt-2 text-xl font-black leading-7 text-white">
                {snapshot.dailyAdvisor.primaryRecommendation.title}
              </h3>
              <p className="mt-2 text-sm leading-5 text-[#dbe3ef]">
                {snapshot.dailyAdvisor.primaryRecommendation.why}
              </p>
              <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                {snapshot.dailyAdvisor.primaryRecommendation.impact}
              </p>
              <Link
                href="/dashboard/money/velocity"
                className="mt-4 flex min-h-[44px] items-center justify-center rounded-lg border border-purple-300/40 px-3 py-2 text-sm font-black text-purple-100"
              >
                Open deeper analysis
              </Link>
            </div>
          </MobileMoneyCard>
        </div>

        <div className="hidden space-y-8 md:block">
        {loading ? (
          <DashboardCard>
            <div className="flex animate-pulse flex-col gap-3">
              <div className="h-4 w-40 rounded bg-[#2a3242]" />
              <div className="h-8 w-72 max-w-full rounded bg-[#2a3242]" />
              <div className="h-4 w-full max-w-xl rounded bg-[#2a3242]" />
            </div>
          </DashboardCard>
        ) : null}

        {loadError ? (
          <DashboardCard accent="red">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="beast-kicker">Money could not load</p>
                <p className="mt-2 text-sm font-semibold text-red-100">
                  {loadError}
                </p>
              </div>
              <button type="button" onClick={loadMoneySnapshot} className="beast-button">
                Try Again
              </button>
            </div>
          </DashboardCard>
        ) : null}

        {!loading &&
        !loadError &&
        snapshot.activeDebts.length === 0 &&
        snapshot.activeBills.length === 0 &&
        snapshot.activeIncomes.length === 0 ? (
          <DashboardCard accent="money">
            <SectionHeader
              eyebrow="Start here"
              title="Build your first Money plan"
              description="Add income, bills, and debts so BeastMoney can calculate safe cash, payoff strategy, forecasts, and recommendations."
              action={
                <Link href="/dashboard/money/cashflow" className="beast-button">
                  Add Money Records
                </Link>
              }
            />
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
            eyebrow="Decision Support"
            title={snapshot.financialCoach.title}
            description="Recommendations, risks, and assumptions generated from the current Money engines for analytical review."
          />
          <DashboardCard accent="blue">
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="beast-kicker">What to do today</p>
                <h2 className="mt-2 text-2xl font-black">
                  {snapshot.financialCoach.whatToDoToday}
                </h2>
                <p className="mt-3 text-sm text-[#c7cfdb]">
                  Best next action: {snapshot.financialCoach.bestNextAction}
                </p>
              </div>
              <div className="grid gap-3 text-sm text-[#dbe3ef]">
                <div>
                  <span className="font-bold text-white">What changed:</span>{" "}
                  {snapshot.financialCoach.whatChanged.join(" ")}
                </div>
                <div>
                  <span className="font-bold text-white">Avoid:</span>{" "}
                  {snapshot.financialCoach.whatToAvoid[0]}
                </div>
                <div>
                  <span className="font-bold text-white">Risk:</span>{" "}
                  {snapshot.financialCoach.upcomingRisks[0]}
                </div>
                <div>
                  <span className="font-bold text-white">Why this action:</span>{" "}
                  {snapshot.financialCoach.whyThisAction}
                </div>
                <div>
                  <span className="font-bold text-white">Assumption:</span>{" "}
                  {snapshot.financialCoach.assumptions[0]}
                </div>
                <div className="beast-surface p-3 text-xs text-[#9aa7b8]">
                  {snapshot.financialCoach.disclaimer}
                </div>
              </div>
            </div>
            {snapshot.financialCoach.warnings.length > 0 ? (
              <div className="mt-5 grid gap-3 border-t border-[#2a3242] pt-5 md:grid-cols-2">
                {snapshot.financialCoach.warnings.map((warning) => (
                  <div
                    key={warning.id}
                    className={`rounded-xl border p-4 ${
                      warning.severity === "critical"
                        ? "border-red-500/30 bg-red-500/10"
                        : "border-amber-400/30 bg-amber-400/10"
                    }`}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9aa7b8]">
                      {warning.category.replace("_", " ")} warning
                    </p>
                    <h3 className="mt-2 font-black text-white">{warning.title}</h3>
                    <p className="mt-2 text-sm text-[#c7cfdb]">{warning.message}</p>
                    <Link
                      href={warning.href}
                      className="mt-3 inline-flex text-sm font-bold text-blue-300 hover:text-blue-200"
                    >
                      {warning.action} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                No actionable Coach warnings in the current records.
              </div>
            )}
            <div className="mt-5 border-t border-[#2a3242] pt-5">
              <p className="beast-kicker">Safety boundaries</p>
              <h3 className="mt-2 text-xl font-black text-white">
                Before acting on a recommendation
              </h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {snapshot.financialCoach.safetyBoundaries.map((boundary) => (
                  <div key={boundary.id} className="beast-surface p-4">
                    <h4 className="font-black text-white">{boundary.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                      {boundary.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 border-t border-[#2a3242] pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="beast-kicker">Recommendation history</p>
                  <h3 className="mt-2 text-xl font-black text-white">
                    Changes during this session
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm text-[#9aa7b8]">
                    Coach records meaningful recommendation changes in this open dashboard session only. This history is not saved to your Money records.
                  </p>
                </div>
                {coachRecommendationHistory.length > 1 ? (
                  <button
                    type="button"
                    className="beast-button-secondary"
                    onClick={() =>
                      setCoachRecommendationHistory((current) => current.slice(0, 1))
                    }
                  >
                    Clear older history
                  </button>
                ) : null}
              </div>
              {coachRecommendationHistory.length > 0 ? (
                <ol className="mt-4 grid gap-3">
                  {coachRecommendationHistory.map((recommendation, index) => (
                    <li key={recommendation.id} className="beast-surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">
                          {index === 0 ? "Current" : "Earlier"} · {recommendation.risk} risk
                        </span>
                        <time
                          dateTime={recommendation.recordedAt}
                          className="text-xs text-[#9aa7b8]"
                        >
                          {formatCoachTimestamp(recommendation.recordedAt)}
                        </time>
                      </div>
                      <h4 className="mt-2 font-black text-white">{recommendation.title}</h4>
                      <p className="mt-2 text-sm text-[#dbe3ef]">{recommendation.action}</p>
                      <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
                        Why: {recommendation.why}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-4 beast-surface p-4 text-sm text-[#9aa7b8]">
                  The current recommendation will appear after Money records finish loading.
                </div>
              )}
            </div>
            <div className="mt-5 border-t border-[#2a3242] pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="beast-kicker">Scenario questions</p>
                  <h3 className="mt-2 text-xl font-black text-white">Correct the assumptions</h3>
                  <p className="mt-2 max-w-2xl text-sm text-[#9aa7b8]">
                    Changes recalculate this local scenario only. Saved Money records are not changed.
                  </p>
                </div>
                {Object.keys(coachCorrections).length > 0 ? (
                  <button
                    type="button"
                    className="beast-button-secondary"
                    onClick={() => setCoachCorrections({})}
                  >
                    Reset corrections
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {snapshot.financialCoach.scenarioQuestions.map((question) => (
                  <label key={question.id} className="beast-surface grid gap-2 p-4 text-sm">
                    <span className="font-bold text-white">{question.prompt}</span>
                    <span className="text-xs leading-5 text-[#9aa7b8]">{question.explanation}</span>
                    <span className="relative mt-1">
                      {question.unit === "currency" ? (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa7b8]">$</span>
                      ) : null}
                      <input
                        type="number"
                        inputMode="decimal"
                        min={question.min}
                        max={question.max}
                        step={question.unit === "currency" ? "0.01" : "1"}
                        value={coachCorrections[question.input] ?? question.currentValue}
                        onChange={(event) =>
                          setCoachCorrections((current) => ({
                            ...current,
                            [question.input]: event.target.value,
                          }))
                        }
                        className={`w-full rounded-lg border border-[#2a3242] bg-[#0f1419] py-2 pr-3 font-bold text-white ${
                          question.unit === "currency" ? "pl-7" : "pl-3"
                        }`}
                        aria-label={`${question.prompt} (${question.unit})`}
                      />
                      {question.unit === "percent" ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa7b8]">%</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </DashboardCard>
        </section>

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
                {snapshot.financialDecision.fundingTrace && (
                  <div className="rounded-lg border border-[#2a3242] p-3 text-xs text-[#c7cfdb]">
                    <strong className="text-white">Funding trace</strong>
                    <p className="mt-1">Cash used: {formatCurrency(snapshot.financialDecision.fundingTrace.cashAmount)} · Eligible borrowing: {formatCurrency(snapshot.financialDecision.fundingTrace.borrowedAmount)}</p>
                    <p className="mt-1">Borrowing is considered only when its rate is lower than the target debt and utilization limits permit it. Credit cards are never used to pay debt.</p>
                  </div>
                )}
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
            eyebrow="Reports"
            title="Printable reports"
            description="Monthly, debt progress, interest saved, net position, and Velocity reports from the shared Money engines."
            action={
              <button
                type="button"
                onClick={() => window.print()}
                className="beast-button-secondary"
                aria-label="Print BeastMoney reports"
              >
                Print Reports
              </button>
            }
          />
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {snapshot.financialReports.map((report) => (
              <DashboardCard key={report.id} accent="blue">
                <div className="flex h-full flex-col gap-4">
                  <div>
                    <p className="beast-kicker">{report.kind.replace(/_/g, " ")}</p>
                    <h2 className="mt-2 text-xl font-black">{report.title}</h2>
                    <p className="mt-2 text-sm text-[#c7cfdb]">
                      {report.subtitle}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-[#dbe3ef]">
                    {report.sections[0]?.rows.slice(0, 3).map((row) => (
                      <div
                        key={`${report.id}-${row.label}`}
                        className="beast-surface flex items-center justify-between gap-4 px-3 py-2"
                      >
                        <span className="text-[#9aa7b8]">{row.label}</span>
                        <span className="font-bold text-white">{row.value}</span>
                      </div>
                    ))}
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
                <div className="beast-surface p-4 text-sm text-[#dbe3ef]">
                  {snapshot.financialInsights.summary}
                </div>
                <div className="beast-surface p-4 text-sm text-[#c7cfdb]">
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
                  <div className="beast-surface p-3">
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
                    <div className="beast-surface p-3">
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
                <div className="beast-surface p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Suggested Extra Payment
                  </div>
                  <div className="mt-1 font-bold text-white">
                    {formatCurrency(
                      snapshot.financialDecision.suggestedExtraPayment
                    )}
                  </div>
                </div>
                <div className="beast-surface p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Recommended Next Action
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">{recommendedAction}</div>
                </div>
                <div className="beast-surface p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Safety Indicator
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">
                    {snapshot.financialDecision.safetyRating}
                  </div>
                </div>
                <div className="beast-surface p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Reason
                  </div>
                  <div className="mt-1 text-[#dbe3ef]">
                    {snapshot.financialDecision.reason}
                  </div>
                </div>
                <div className="beast-surface p-4 text-[#dbe3ef]">
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
      </>}
      </BeastMoneyShell>
  );
}
