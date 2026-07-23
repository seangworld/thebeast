export type FinancialHealthDimensionId =
  | "cash-flow"
  | "debt"
  | "savings"
  | "emergency-fund"
  | "retirement-progress"
  | "goal-progress"
  | "consistency"
  | "planning-completeness";

export type FinancialHealthScoreComponent = {
  id: FinancialHealthDimensionId;
  label: string;
  weight: number;
  available: boolean;
  score?: number;
  weightedPoints: number;
  calculation: string;
  evidence: readonly string[];
  improvement: string;
};

export type FinancialHealthScoreResult = {
  score: number;
  band: "excellent" | "stable" | "watch" | "risk";
  formula: string;
  disclaimer: string;
  availableWeight: number;
  components: readonly FinancialHealthScoreComponent[];
  strongest: FinancialHealthScoreComponent;
  improvementPriority: FinancialHealthScoreComponent;
  change: {
    direction: "increased" | "decreased" | "unchanged" | "unavailable";
    points?: number;
    explanation: string;
    drivers: readonly string[];
  };
};

export type FinancialHealthScoreInput = {
  monthlyIncome: number;
  monthlyOutflow: number;
  projectedSurplus: number;
  currentCash: number;
  cashBuffer: number;
  totalDebt: number;
  debtMinimums?: number;
  creditUtilization?: number;
  retirementProgressPercent?: number;
  goalProgressPercent?: number;
  consistencyPercent?: number;
  planningCompletenessPercent?: number;
  previous?: Pick<FinancialHealthScoreResult, "score" | "components">;
};

const weights: Record<FinancialHealthDimensionId, number> = {
  "cash-flow": 20,
  debt: 20,
  savings: 15,
  "emergency-fund": 15,
  "retirement-progress": 10,
  "goal-progress": 8,
  consistency: 7,
  "planning-completeness": 5,
};

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function component(
  id: FinancialHealthDimensionId,
  label: string,
  score: number | undefined,
  calculation: string,
  evidence: readonly string[],
  improvement: string
): FinancialHealthScoreComponent {
  const available = score !== undefined && Number.isFinite(score);
  return {
    id,
    label,
    weight: weights[id],
    available,
    score: available ? percent(score) : undefined,
    weightedPoints: available ? Math.round(percent(score) * weights[id]) / 100 : 0,
    calculation,
    evidence,
    improvement,
  };
}

function band(score: number): FinancialHealthScoreResult["band"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "stable";
  if (score >= 50) return "watch";
  return "risk";
}

export function buildFinancialHealthScore(
  input: FinancialHealthScoreInput
): FinancialHealthScoreResult {
  const income = Math.max(0, input.monthlyIncome);
  const outflow = Math.max(0, input.monthlyOutflow);
  const surplus = input.projectedSurplus;
  const savingsRate = income > 0 ? surplus / income : undefined;
  const cashFlowScore =
    savingsRate === undefined ? undefined : percent(50 + savingsRate * 250);
  const savingsScore =
    savingsRate === undefined ? undefined : percent((Math.max(savingsRate, 0) / 0.2) * 100);
  const emergencyMonths = outflow > 0 ? Math.max(0, input.currentCash) / outflow : undefined;
  const emergencyScore =
    emergencyMonths === undefined ? undefined : percent((emergencyMonths / 3) * 100);
  const hasDebt = input.totalDebt > 0;
  const utilizationScore =
    input.creditUtilization === undefined
      ? undefined
      : percent(100 - Math.max(0, input.creditUtilization));
  const debtServiceScore =
    income > 0 && input.debtMinimums !== undefined
      ? percent(100 - (Math.max(0, input.debtMinimums) / income) * 250)
      : undefined;
  const debtScore = !hasDebt
    ? 100
    : utilizationScore !== undefined && debtServiceScore !== undefined
      ? percent(utilizationScore * 0.6 + debtServiceScore * 0.4)
      : utilizationScore ?? debtServiceScore;
  const inferredCompleteness = percent(
    ([
      income > 0,
      outflow > 0,
      input.cashBuffer >= 0,
      input.creditUtilization !== undefined,
      input.retirementProgressPercent !== undefined,
      input.goalProgressPercent !== undefined,
      input.consistencyPercent !== undefined,
    ].filter(Boolean).length /
      7) *
      100
  );

  const components = [
    component(
      "cash-flow",
      "Cash Flow",
      cashFlowScore,
      "50 + (monthly surplus ÷ monthly income × 250), capped from 0 to 100",
      income > 0
        ? [`Monthly income: ${currency(income)}`, `Monthly outflow: ${currency(outflow)}`, `Monthly surplus: ${currency(surplus)}`]
        : ["No recurring monthly income is available."],
      "Increase reliable income or reduce recurring outflow so more income remains each month."
    ),
    component(
      "debt",
      "Debt",
      debtScore,
      hasDebt
        ? "60% utilization score + 40% debt-service score; each score is capped from 0 to 100"
        : "No active debt = 100",
      [
        `Active debt: ${currency(input.totalDebt)}`,
        input.creditUtilization === undefined ? "Credit utilization unavailable" : `Credit utilization: ${input.creditUtilization.toFixed(1)}%`,
        input.debtMinimums === undefined ? "Debt minimums unavailable" : `Monthly debt minimums: ${currency(input.debtMinimums)}`,
      ],
      "Reduce high-cost balances and required monthly debt payments without weakening the protected cash reserve."
    ),
    component(
      "savings",
      "Savings",
      savingsScore,
      "Positive monthly savings rate ÷ 20% target × 100, capped from 0 to 100",
      savingsRate === undefined ? ["Savings rate unavailable without income."] : [`Current modeled savings rate: ${(savingsRate * 100).toFixed(1)}%`],
      "Direct part of a reliable monthly surplus toward savings; a 20% modeled rate receives full points."
    ),
    component(
      "emergency-fund",
      "Emergency Fund",
      emergencyScore,
      "Months of current outflow covered ÷ 3-month reference × 100, capped from 0 to 100",
      emergencyMonths === undefined
        ? ["Monthly outflow is unavailable."]
        : [`Current cash: ${currency(input.currentCash)}`, `Current outflow coverage: ${emergencyMonths.toFixed(1)} months`, `Protected reserve: ${currency(input.cashBuffer)}`],
      "Build cash coverage toward three months of currently tracked outflow while preserving the configured reserve."
    ),
    component(
      "retirement-progress",
      "Retirement Progress",
      input.retirementProgressPercent,
      "Current retirement progress percentage supplied by the retirement engine",
      input.retirementProgressPercent === undefined ? ["Retirement progress is not configured."] : [`Retirement progress: ${percent(input.retirementProgressPercent)}%`],
      "Add current retirement balances, contributions, goal, and assumptions before relying on this dimension."
    ),
    component(
      "goal-progress",
      "Goal Progress",
      input.goalProgressPercent,
      "Current verified financial-goal progress percentage",
      input.goalProgressPercent === undefined ? ["No verified financial-goal progress is available."] : [`Goal progress: ${percent(input.goalProgressPercent)}%`],
      "Create or update a measurable financial goal with a target and current progress."
    ),
    component(
      "consistency",
      "Consistency",
      input.consistencyPercent,
      "Verified completion rate for expected financial actions during the measured period",
      input.consistencyPercent === undefined ? ["Not enough dated history exists to score consistency."] : [`Verified consistency: ${percent(input.consistencyPercent)}%`],
      "Keep income, obligations, and completed payments current so consistency can be measured from outcomes."
    ),
    component(
      "planning-completeness",
      "Planning Completeness",
      input.planningCompletenessPercent ?? inferredCompleteness,
      "Completed core planning inputs ÷ 7 required input groups × 100",
      [`Available core planning inputs: ${Math.round(((input.planningCompletenessPercent ?? inferredCompleteness) / 100) * 7)} of 7`],
      "Complete missing income, outflow, reserve, debt, retirement, goal, and historical outcome records."
    ),
  ] as const;

  const available = components.filter((item) => item.available);
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const score = availableWeight
    ? percent(
        available.reduce((sum, item) => sum + item.weightedPoints, 0) /
          availableWeight *
          100
      )
    : 0;
  const ranked = [...available].sort((a, b) => (b.score || 0) - (a.score || 0));
  const strongest = ranked[0] || components[components.length - 1];
  const improvementPriority = [...available].sort((a, b) => (a.score || 0) - (b.score || 0))[0] || components[components.length - 1];
  const previous = input.previous;
  const points = previous ? score - previous.score : undefined;
  const direction = points === undefined ? "unavailable" : points > 0 ? "increased" : points < 0 ? "decreased" : "unchanged";
  const drivers = previous
    ? components
        .map((item) => {
          const prior = previous.components.find((candidate) => candidate.id === item.id);
          if (!item.available || !prior?.available || item.score === prior.score) return undefined;
          const weightedChange = item.weightedPoints - prior.weightedPoints;
          return `${item.label} ${Number(item.score) > Number(prior.score) ? "rose" : "fell"} from ${prior.score} to ${item.score}, ${weightedChange >= 0 ? "adding" : "subtracting"} ${Math.abs(weightedChange).toFixed(1)} weighted point${Math.abs(weightedChange) === 1 ? "" : "s"}.`;
        })
        .filter((value): value is string => Boolean(value))
    : [];

  return {
    score,
    band: band(score),
    formula: "Score = sum(component score × component weight) ÷ sum(weights for available components). Unavailable dimensions are disclosed and excluded, not guessed.",
    disclaimer: "This is a BeastMoney financial wellness measure, not a credit score and not a guarantee of financial outcomes.",
    availableWeight,
    components,
    strongest,
    improvementPriority,
    change: {
      direction,
      points,
      explanation:
        direction === "unavailable"
          ? "No prior versioned Financial Health Score is available, so BeastMoney will not claim that the score changed."
          : direction === "unchanged"
            ? "The score is unchanged because no available weighted component changed enough to move the rounded total."
            : `The score ${direction} by ${Math.abs(points || 0)} point${Math.abs(points || 0) === 1 ? "" : "s"}. The factor changes below show exactly which weighted components moved the total.`,
      drivers,
    },
  };
}
