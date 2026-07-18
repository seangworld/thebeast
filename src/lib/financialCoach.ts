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
  whyThisAction: string;
  assumptions: string[];
  warnings: FinancialCoachWarning[];
  scenarioQuestions: FinancialCoachScenarioQuestion[];
  disclaimer: string;
};

export type FinancialCoachScenarioInput =
  | "current_cash"
  | "cash_buffer"
  | "credit_utilization";

export type FinancialCoachScenarioQuestion = {
  id: string;
  input: FinancialCoachScenarioInput;
  prompt: string;
  explanation: string;
  currentValue: number;
  unit: "currency" | "percent";
  min: number;
  max?: number;
};

export type FinancialCoachWarningCategory =
  | "cash_flow"
  | "debt"
  | "utilization"
  | "goal";

export type FinancialCoachWarning = {
  id: string;
  category: FinancialCoachWarningCategory;
  severity: "warning" | "critical";
  title: string;
  message: string;
  action: string;
  href: string;
};

export type FinancialCoachInput = {
  advisor: DailyFinancialAdvisorResult;
  forecast: FinancialForecastResult;
  insights: FinancialInsightsResult;
  scenarios: FinancialScenarioComparisonResult;
  creditUtilization?: number;
  currentCash?: number;
  cashBuffer?: number;
};

function safeNumber(value: number | undefined) {
  return Math.max(Number.isFinite(value) ? Number(value) : 0, 0);
}

function buildScenarioQuestions(input: FinancialCoachInput): FinancialCoachScenarioQuestion[] {
  return [
    {
      id: "confirm-current-cash",
      input: "current_cash",
      prompt: "How much cash is actually available right now?",
      explanation: "Correct this to test the recommendation against today's available cash.",
      currentValue: safeNumber(input.currentCash),
      unit: "currency",
      min: 0,
    },
    {
      id: "confirm-cash-buffer",
      input: "cash_buffer",
      prompt: "How much cash should the plan protect?",
      explanation: "Use the minimum reserve you do not want the scenario to spend.",
      currentValue: safeNumber(input.cashBuffer),
      unit: "currency",
      min: 0,
    },
    {
      id: "confirm-utilization",
      input: "credit_utilization",
      prompt: "Is the tracked credit utilization current?",
      explanation: "Correct the percentage to test utilization warnings against current information.",
      currentValue: safeNumber(input.creditUtilization),
      unit: "percent",
      min: 0,
      max: 100,
    },
  ];
}

function buildWarnings(input: FinancialCoachInput): FinancialCoachWarning[] {
  const warnings: FinancialCoachWarning[] = [];
  const forecast30 = input.forecast.periods.find((period) => period.key === "30d");
  const utilization = Math.max(Number(input.creditUtilization || 0), 0);
  const hasDebt = Number(forecast30?.debt || 0) > 0;

  if (Number(forecast30?.cashShortages || 0) > 0 || Number(forecast30?.cash || 0) < 0) {
    warnings.push({
      id: "cash-flow-shortage",
      category: "cash_flow",
      severity: "critical",
      title: "Cash-flow shortage projected",
      message: "The 30-day forecast includes a cash shortage or negative ending cash.",
      action: "Review upcoming income and bills before making an extra payment.",
      href: "/dashboard/money/cashflow",
    });
  }

  if (hasDebt && input.insights.monthlyProgress.debtReduction <= 0) {
    warnings.push({
      id: "debt-not-decreasing",
      category: "debt",
      severity: "warning",
      title: "Debt is not projected to decrease",
      message: "The current 30-day plan does not reduce tracked debt.",
      action: "Review minimum payments and the recommended payoff strategy.",
      href: "/dashboard/money/debts",
    });
  }

  if (utilization > 50) {
    warnings.push({
      id: "credit-utilization",
      category: "utilization",
      severity: utilization > 75 ? "critical" : "warning",
      title: utilization > 75 ? "Credit utilization is high" : "Credit utilization is elevated",
      message: `Tracked utilization is ${Math.round(utilization)}%, above the 50% Coach guardrail.`,
      action: "Reduce revolving balances before adding credit-funded spending.",
      href: "/dashboard/money/debts",
    });
  }

  if (hasDebt && input.insights.monthlyProgress.progressPercent <= 0) {
    warnings.push({
      id: "payoff-goal-stalled",
      category: "goal",
      severity: "warning",
      title: "Debt-payoff goal is stalled",
      message: "The current monthly plan shows no progress toward debt freedom.",
      action: "Review the plan and update records or safe extra-payment capacity.",
      href: "/dashboard/money/debts",
    });
  }

  return warnings;
}

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
    whyThisAction: primary.why,
    assumptions: Array.from(
      new Set([
        ...primary.explanation.assumptions,
        `Available cash assumption: ${safeNumber(input.currentCash)}.`,
        `Protected cash buffer assumption: ${safeNumber(input.cashBuffer)}.`,
        `Credit utilization assumption: ${Math.round(safeNumber(input.creditUtilization))}%.`,
        "Income, bills, debts, and available cash reflect the current records.",
      ])
    ).slice(0, 6),
    warnings: buildWarnings(input),
    scenarioQuestions: buildScenarioQuestions(input),
    disclaimer:
      "Planning guidance only. BeastMoney does not provide legal, tax, or investment advice.",
  };
}
