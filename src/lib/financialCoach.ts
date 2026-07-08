import type { DailyFinancialAdvisorResult } from "./dailyFinancialAdvisor";
import type { FinancialForecastResult } from "./financialForecasting";
import type { FinancialInsightsResult } from "./financialInsights";
import type { FinancialScenarioComparisonResult } from "./financialScenarios";

export type FinancialCoachResult = {
  title: string;
  whatChanged: string[];
  whatToDoToday: string;
  whatToAvoid: string[];
  upcomingRisks: string[];
  progressMade: string[];
  bestNextAction: string;
  disclaimer: string;
};

export type FinancialCoachInput = {
  advisor: DailyFinancialAdvisorResult;
  forecast: FinancialForecastResult;
  insights: FinancialInsightsResult;
  scenarios: FinancialScenarioComparisonResult;
};

export function buildFinancialCoach(input: FinancialCoachInput): FinancialCoachResult {
  const primary = input.advisor.primaryRecommendation;
  const forecast30 = input.forecast.periods.find((period) => period.key === "30d");
  const risks = Array.from(
    new Set([
      ...input.forecast.upcomingRisks,
      ...primary.explanation.risks,
    ])
  ).slice(0, 4);

  return {
    title: "BeastMoney Coach",
    whatChanged: [
      `Financial health is ${input.insights.financialHealthScore}.`,
      `Debt freedom countdown is ${input.insights.debtFreedomCountdown}.`,
      `Best interest scenario is ${input.scenarios.bestByInterest.label}.`,
    ],
    whatToDoToday: primary.action,
    whatToAvoid:
      primary.risk === "high"
        ? ["Avoid extra payments until the guardrails recover."]
        : ["Avoid changing the plan before income, bills, and debt records are current."],
    upcomingRisks: risks,
    progressMade: [
      `Projected 30-day debt reduction: ${input.insights.monthlyProgress.debtReduction}.`,
      `Projected interest saved: ${input.insights.interestSaved}.`,
      `Projected cash in 30 days: ${forecast30?.cash ?? 0}.`,
    ],
    bestNextAction: primary.title,
    disclaimer:
      "Planning guidance only. BeastMoney does not provide legal, tax, or investment advice.",
  };
}
