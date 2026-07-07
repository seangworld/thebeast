import {
  buildCashIntelligence,
  type CashIntelligenceBill,
  type CashIntelligenceFundingSource,
  type CashIntelligenceIncome,
  type CashIntelligenceResult,
} from "./cashIntelligence";
import type { FinancialDecisionResult } from "./financialDecisionEngine";
import { roundMoney } from "./formatters";
import {
  runUnifiedStrategyEngine,
  type UnifiedStrategy,
  type UnifiedStrategyDebt,
} from "./unifiedStrategyEngine";

export type ForecastPeriodKey = "30d" | "90d" | "1y";

export type FinancialForecastPeriod = {
  key: ForecastPeriodKey;
  label: string;
  days: number;
  months: number;
  cash: number;
  debt: number;
  interest: number;
  netWorth: number;
  debtFreeDate: string;
  cashShortages: number;
  upcomingRisks: string[];
};

export type FinancialForecastResult = {
  generatedAt: string;
  periods: FinancialForecastPeriod[];
  debtFreeDate: string;
  upcomingRisks: string[];
};

export type FinancialForecastInput = {
  asOfDate?: Date;
  cashIntelligence?: CashIntelligenceResult | null;
  financialDecision?: FinancialDecisionResult | null;
  debts?: UnifiedStrategyDebt[];
  income?: CashIntelligenceIncome[];
  bills?: CashIntelligenceBill[];
  fundingSources?: CashIntelligenceFundingSource[];
  strategy?: UnifiedStrategy;
  currentCash?: number;
  cashBuffer?: number;
};

const FORECAST_PERIODS: Array<{
  key: ForecastPeriodKey;
  label: string;
  days: number;
  months: number;
}> = [
  { key: "30d", label: "30 Days", days: 30, months: 1 },
  { key: "90d", label: "90 Days", days: 90, months: 3 },
  { key: "1y", label: "1 Year", days: 365, months: 12 },
];

function money(value: number) {
  return roundMoney(value);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDebtFreeDate(asOfDate: Date, monthsToPayoff: number) {
  if (monthsToPayoff <= 0) return "Already debt-free";

  return addMonths(asOfDate, monthsToPayoff).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getTotalDebt(debts: UnifiedStrategyDebt[]) {
  return money(debts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0));
}

function getCashShortages(cash: CashIntelligenceResult) {
  return cash.simulatedTimeline.filter((event) => event.belowBuffer).length;
}

function buildRisks({
  cash,
  debt,
  interest,
  decision,
}: {
  cash: CashIntelligenceResult;
  debt: number;
  interest: number;
  decision?: FinancialDecisionResult | null;
}) {
  const risks: string[] = [];

  if (getCashShortages(cash) > 0) {
    risks.push("Projected cash drops below the reserve guardrail.");
  }

  if (cash.monthlyAvailableCash < 0) {
    risks.push("Monthly obligations are projected to exceed monthly income.");
  }

  if (decision?.shouldWait) {
    risks.push(decision.reason);
  }

  if (debt > 0 && interest <= 0) {
    risks.push("Debt exists, but interest projection is limited by missing APR data.");
  }

  if (risks.length === 0) {
    risks.push("No major forecast risks detected from current records.");
  }

  return Array.from(new Set(risks));
}

export function buildFinancialForecast(
  input: FinancialForecastInput
): FinancialForecastResult {
  const asOfDate = input.asOfDate || new Date();
  const debts = input.debts || [];
  const totalDebt = getTotalDebt(debts);
  const baseCash =
    input.cashIntelligence?.projectedCashBalance ??
    Number(input.currentCash || 0);
  const strategyResult = runUnifiedStrategyEngine({
    debts,
    strategy: input.strategy || "avalanche",
    cashIntelligence: input.cashIntelligence || undefined,
    financialDecision: input.financialDecision || undefined,
    fundingSources: input.fundingSources,
    extraPayment: input.financialDecision?.suggestedExtraPayment || 0,
  });
  const debtFreeDate =
    strategyResult.months_to_payoff > 0
      ? formatDebtFreeDate(asOfDate, strategyResult.months_to_payoff)
      : totalDebt > 0
      ? "Not projected"
      : "Already debt-free";

  const periods = FORECAST_PERIODS.map((period) => {
    const cash = buildCashIntelligence({
      asOfDate,
      income: input.income || [],
      bills: input.bills || [],
      debtMinimums: debts,
      scheduledTransfers:
        input.financialDecision && input.financialDecision.suggestedExtraPayment > 0
          ? [
              {
                id: "forecast-extra-payment",
                name: "Recommended extra payment or recovery",
                amount: input.financialDecision.suggestedExtraPayment,
                frequency: "monthly",
              },
            ]
          : [],
      fundingSources: input.fundingSources || [],
      settings: {
        currentCash: input.currentCash ?? baseCash,
        cashBuffer: input.cashBuffer ?? 0,
        lookaheadDays: period.days,
      },
    });
    const scheduleRows = strategyResult.payment_schedule.filter(
      (row) => row.month <= period.months
    );
    const lastRow = scheduleRows[scheduleRows.length - 1];
    const projectedDebt =
      lastRow != null ? money(Number(lastRow.remaining_debt || 0)) : totalDebt;
    const projectedInterest = money(
      scheduleRows.reduce((sum, row) => sum + Number(row.interest_paid || 0), 0)
    );
    const netWorth = money(cash.projectedCashBalance - projectedDebt);
    const upcomingRisks = buildRisks({
      cash,
      debt: projectedDebt,
      interest: projectedInterest,
      decision: input.financialDecision,
    });

    return {
      key: period.key,
      label: period.label,
      days: period.days,
      months: period.months,
      cash: cash.projectedCashBalance,
      debt: projectedDebt,
      interest: projectedInterest,
      netWorth,
      debtFreeDate,
      cashShortages: getCashShortages(cash),
      upcomingRisks,
    };
  });

  return {
    generatedAt: asOfDate.toISOString(),
    periods,
    debtFreeDate,
    upcomingRisks: Array.from(
      new Set(periods.flatMap((period) => period.upcomingRisks))
    ),
  };
}
