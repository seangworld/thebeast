import type { CashIntelligenceResult } from "./cashIntelligence";
import type { FinancialDecisionResult } from "./financialDecisionEngine";
import type { FinancialForecastResult } from "./financialForecasting";
import {
  buildFinancialExplanation,
  type FinancialExplanation,
} from "./financialExplanations";
import { roundMoney } from "./formatters";
import {
  runUnifiedStrategyEngine,
  type UnifiedStrategy,
  type UnifiedStrategyDebt,
  type UnifiedStrategyResult,
} from "./unifiedStrategyEngine";
import {
  buildFinancialHealthScore,
  type FinancialHealthScoreResult,
} from "./financialHealthScore";

export type FinancialHealthScoreBand = "excellent" | "stable" | "watch" | "risk";

export type FinancialProgressMetric = {
  label: string;
  debtReduction: number;
  interestProjected: number;
  cashChange: number;
  progressPercent: number;
};

export type FinancialInsightsResult = {
  generatedAt: string;
  financialHealthScore: number;
  financialHealth: FinancialHealthScoreResult;
  healthBand: FinancialHealthScoreBand;
  interestSaved: number;
  timeSavedMonths: number;
  debtReduction: number;
  cashEfficiency: number;
  debtFreedomCountdown: string;
  monthlyProgress: FinancialProgressMetric;
  yearlyProgress: FinancialProgressMetric;
  baselinePlan: UnifiedStrategyResult;
  optimizedPlan: UnifiedStrategyResult;
  explanation: FinancialExplanation;
  summary: string;
};

export type FinancialInsightsInput = {
  cashIntelligence: CashIntelligenceResult;
  financialDecision: FinancialDecisionResult;
  financialForecast: FinancialForecastResult;
  debts: UnifiedStrategyDebt[];
  strategy?: UnifiedStrategy;
  creditUtilization?: number;
  billsDueSoon?: number;
  currentCash?: number;
  cashBuffer?: number;
  debtMinimums?: number;
  retirementProgressPercent?: number;
  goalProgressPercent?: number;
  consistencyPercent?: number;
  planningCompletenessPercent?: number;
  previousFinancialHealth?: Pick<FinancialHealthScoreResult, "score" | "components">;
};

function money(value: number) {
  return roundMoney(value);
}

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function getTotalDebt(debts: UnifiedStrategyDebt[]) {
  return money(debts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0));
}

function findForecastPeriod(
  forecast: FinancialForecastResult,
  key: "30d" | "1y"
) {
  return forecast.periods.find((period) => period.key === key) || null;
}

function buildProgressMetric({
  label,
  startingDebt,
  projectedDebt,
  interestProjected,
  startingCash,
  projectedCash,
}: {
  label: string;
  startingDebt: number;
  projectedDebt: number;
  interestProjected: number;
  startingCash: number;
  projectedCash: number;
}): FinancialProgressMetric {
  const debtReduction = money(Math.max(startingDebt - projectedDebt, 0));
  const progressPercent =
    startingDebt > 0 ? percent((debtReduction / startingDebt) * 100) : 100;

  return {
    label,
    debtReduction,
    interestProjected: money(interestProjected),
    cashChange: money(projectedCash - startingCash),
    progressPercent,
  };
}

function buildCountdown(plan: UnifiedStrategyResult, totalDebt: number) {
  if (totalDebt <= 0) return "Already debt-free";
  if (plan.months_to_payoff <= 0) return "Not projected";
  if (plan.months_to_payoff === 1) return "1 month";
  if (plan.months_to_payoff < 12) return `${plan.months_to_payoff} months`;

  const years = Math.floor(plan.months_to_payoff / 12);
  const months = plan.months_to_payoff % 12;
  if (months === 0) return `${years} year${years === 1 ? "" : "s"}`;

  return `${years} year${years === 1 ? "" : "s"}, ${months} month${
    months === 1 ? "" : "s"
  }`;
}

function buildCashEfficiency(cash: CashIntelligenceResult) {
  if (cash.monthlyIncome <= 0) return 0;

  return percent((Math.max(cash.monthlyAvailableCash, 0) / cash.monthlyIncome) * 100);
}

export function buildFinancialInsights(
  input: FinancialInsightsInput
): FinancialInsightsResult {
  const totalDebt = getTotalDebt(input.debts);
  const strategy = input.strategy || "avalanche";
  const baselinePlan = runUnifiedStrategyEngine({
    debts: input.debts,
    strategy: strategy === "minimum" ? "avalanche" : strategy,
    cashIntelligence: input.cashIntelligence,
    extraPayment: 0,
  });
  const optimizedPlan = runUnifiedStrategyEngine({
    debts: input.debts,
    strategy,
    cashIntelligence: input.cashIntelligence,
    financialDecision: input.financialDecision,
    extraPayment: input.financialDecision.suggestedExtraPayment,
  });
  const forecast30 = findForecastPeriod(input.financialForecast, "30d");
  const forecast1y = findForecastPeriod(input.financialForecast, "1y");
  const startingCash = Number(input.currentCash ?? input.cashIntelligence.currentAvailableCash ?? 0);
  const financialHealth = buildFinancialHealthScore({
    monthlyIncome: input.cashIntelligence.monthlyIncome,
    monthlyOutflow:
      input.cashIntelligence.monthlyBills +
      input.cashIntelligence.monthlyDebtMinimums +
      input.cashIntelligence.monthlyScheduledTransfers +
      input.cashIntelligence.monthlySavingsContributions,
    projectedSurplus: input.cashIntelligence.monthlyAvailableCash,
    currentCash: startingCash,
    cashBuffer: Number(input.cashBuffer || 0),
    totalDebt,
    debtMinimums: input.debtMinimums,
    creditUtilization: input.creditUtilization,
    retirementProgressPercent: input.retirementProgressPercent,
    goalProgressPercent: input.goalProgressPercent,
    consistencyPercent: input.consistencyPercent,
    planningCompletenessPercent: input.planningCompletenessPercent,
    previous: input.previousFinancialHealth,
  });
  const healthScore = financialHealth.score;
  const interestSaved = money(
    Math.max(baselinePlan.total_interest - optimizedPlan.total_interest, 0)
  );
  const timeSavedMonths = Math.max(
    baselinePlan.months_to_payoff - optimizedPlan.months_to_payoff,
    0
  );
  const debtReduction = money(
    Math.max(totalDebt - Number(forecast1y?.debt ?? forecast30?.debt ?? totalDebt), 0)
  );
  const cashEfficiency = buildCashEfficiency(input.cashIntelligence);
  const debtFreedomCountdown = buildCountdown(optimizedPlan, totalDebt);
  const monthlyProgress = buildProgressMetric({
    label: "30 Days",
    startingDebt: totalDebt,
    projectedDebt: Number(forecast30?.debt ?? totalDebt),
    interestProjected: Number(forecast30?.interest || 0),
    startingCash,
    projectedCash: Number(forecast30?.cash ?? startingCash),
  });
  const yearlyProgress = buildProgressMetric({
    label: "1 Year",
    startingDebt: totalDebt,
    projectedDebt: Number(forecast1y?.debt ?? totalDebt),
    interestProjected: Number(forecast1y?.interest || 0),
    startingCash,
    projectedCash: Number(forecast1y?.cash ?? startingCash),
  });

  return {
    generatedAt: input.financialForecast.generatedAt,
    financialHealthScore: healthScore,
    financialHealth,
    healthBand: financialHealth.band,
    interestSaved,
    timeSavedMonths,
    debtReduction,
    cashEfficiency,
    debtFreedomCountdown,
    monthlyProgress,
    yearlyProgress,
    baselinePlan,
    optimizedPlan,
    explanation: buildFinancialExplanation({
      recommendation: "Follow the optimized payoff guidance.",
      reason:
        interestSaved > 0 || timeSavedMonths > 0
          ? "The optimized plan improves payoff outcomes versus a no-extra-payment baseline."
          : "Current guardrails favor protecting cash until more payoff capacity is available.",
      impact: `Projected interest saved is ${interestSaved}; projected time saved is ${timeSavedMonths} month(s).`,
      risks: input.financialForecast.upcomingRisks,
      assumptions: [
        "Health, progress, interest, and countdown metrics reuse cash intelligence, decision, forecast, and strategy outputs.",
      ],
      affectedEntities: [
        { name: "Cash plan", type: "cash" },
        { name: "Debt strategy", type: "strategy" },
        { name: "Forecast", type: "forecast" },
      ],
    }),
    summary:
      interestSaved > 0 || timeSavedMonths > 0
        ? "The optimized plan improves payoff outcomes versus minimum payments."
        : "The current plan protects cash flow while waiting for more payoff capacity.",
  };
}
