import type { CashIntelligenceResult } from "./cashIntelligence";
import type { FinancialDecisionResult } from "./financialDecisionEngine";
import { roundMoney } from "./formatters";
import {
  runUnifiedStrategyEngine,
  type UnifiedStrategy,
  type UnifiedStrategyDebt,
  type UnifiedStrategyResult,
} from "./unifiedStrategyEngine";

export type FinancialScenarioKind =
  | "minimum"
  | "snowball"
  | "avalanche"
  | "velocity"
  | "custom"
  | "extra_payment"
  | "payoff_by_date"
  | "cash_assumption";

export type FinancialScenarioDefinition = {
  id: string;
  label: string;
  kind: FinancialScenarioKind;
  strategy: UnifiedStrategy;
  extraPayment?: number;
  targetMonths?: number;
  reducedSpending?: number;
  increasedIncome?: number;
  customDebtOrder?: string[];
};

export type FinancialScenarioResult = {
  id: string;
  label: string;
  kind: FinancialScenarioKind;
  strategy: UnifiedStrategy;
  debtFreeDate: string;
  monthsToPayoff: number;
  totalInterest: number;
  interestSaved: number;
  timeSavedMonths: number;
  monthlyCashStrain: number;
  riskLevel: "low" | "medium" | "high";
  recommendedExtraPayment: number;
  plan: UnifiedStrategyResult;
};

export type FinancialScenarioComparisonInput = {
  asOfDate?: Date;
  debts: UnifiedStrategyDebt[];
  cashIntelligence: CashIntelligenceResult;
  financialDecision: FinancialDecisionResult;
  velocityEngineResult?: Parameters<typeof runUnifiedStrategyEngine>[0]["velocityEngineResult"];
  velocityInputSnapshot?: Parameters<typeof runUnifiedStrategyEngine>[0]["velocityInputSnapshot"];
  customDebtOrder?: string[];
  scenarios?: FinancialScenarioDefinition[];
};

export type FinancialScenarioComparisonResult = {
  baseline: FinancialScenarioResult;
  scenarios: FinancialScenarioResult[];
  bestByInterest: FinancialScenarioResult;
  bestBySpeed: FinancialScenarioResult;
};

function money(value: number) {
  return roundMoney(value);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDebtFreeDate(asOfDate: Date, months: number) {
  if (months <= 0) return "Not projected";
  return addMonths(asOfDate, months).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function defaultScenarios(input: FinancialScenarioComparisonInput): FinancialScenarioDefinition[] {
  const safeExtra = Math.max(input.financialDecision.suggestedExtraPayment || 0, 0);

  return [
    { id: "minimum", label: "Minimum", kind: "minimum", strategy: "avalanche", extraPayment: 0 },
    { id: "snowball", label: "Snowball", kind: "snowball", strategy: "snowball" },
    { id: "avalanche", label: "Avalanche", kind: "avalanche", strategy: "avalanche" },
    { id: "velocity", label: "Velocity", kind: "velocity", strategy: "velocity" },
    { id: "custom", label: "Custom", kind: "custom", strategy: "custom", customDebtOrder: input.customDebtOrder },
    {
      id: "extra-payment",
      label: `Extra ${money(safeExtra + 100)}/mo`,
      kind: "extra_payment",
      strategy: "avalanche",
      extraPayment: safeExtra + 100,
    },
    {
      id: "payoff-by-date",
      label: "Payoff target",
      kind: "payoff_by_date",
      strategy: "avalanche",
      targetMonths: 12,
    },
    {
      id: "cash-assumption",
      label: "Spend less / earn more",
      kind: "cash_assumption",
      strategy: "avalanche",
      reducedSpending: 150,
      increasedIncome: 100,
    },
  ];
}

function getScenarioExtraPayment(
  scenario: FinancialScenarioDefinition,
  input: FinancialScenarioComparisonInput
) {
  if (scenario.extraPayment != null) return Math.max(scenario.extraPayment, 0);

  if (scenario.kind === "minimum") return 0;

  if (scenario.kind === "payoff_by_date" && scenario.targetMonths) {
    const totalDebt = input.debts.reduce((sum, debt) => sum + Number(debt.balance || 0), 0);
    const minimums = input.debts.reduce((sum, debt) => sum + Number(debt.minimum_payment || 0), 0);
    return money(Math.max(totalDebt / scenario.targetMonths - minimums, 0));
  }

  if (scenario.kind === "cash_assumption") {
    return money(
      Math.max(input.financialDecision.suggestedExtraPayment || 0, 0) +
        Number(scenario.reducedSpending || 0) +
        Number(scenario.increasedIncome || 0)
    );
  }

  return Math.max(input.financialDecision.suggestedExtraPayment || 0, 0);
}

function getRiskLevel(monthlyCashStrain: number, input: FinancialScenarioComparisonInput) {
  if (monthlyCashStrain > input.cashIntelligence.monthlyAvailableCash) return "high";
  if (monthlyCashStrain > input.cashIntelligence.monthlyAvailableCash * 0.75) return "medium";
  return "low";
}

function buildScenarioResult({
  scenario,
  input,
  baseline,
}: {
  scenario: FinancialScenarioDefinition;
  input: FinancialScenarioComparisonInput;
  baseline?: UnifiedStrategyResult;
}): FinancialScenarioResult {
  const asOfDate = input.asOfDate || new Date();
  const extraPayment = getScenarioExtraPayment(scenario, input);
  const plan = runUnifiedStrategyEngine({
    debts: input.debts,
    strategy: scenario.strategy,
    cashIntelligence: input.cashIntelligence,
    extraPayment,
    velocityInputSnapshot: scenario.strategy === "velocity" ? input.velocityInputSnapshot : undefined,
    velocityEngineResult: scenario.strategy === "velocity" ? input.velocityEngineResult : undefined,
    customDebtOrder: scenario.customDebtOrder,
  });
  const baselineMonths = baseline?.months_to_payoff || plan.months_to_payoff;
  const baselineInterest = baseline?.total_interest ?? plan.total_interest;
  const monthlyCashStrain = money(
    input.debts.reduce((sum, debt) => sum + Number(debt.minimum_payment || 0), 0) +
      extraPayment
  );

  return {
    id: scenario.id,
    label: scenario.label,
    kind: scenario.kind,
    strategy: scenario.strategy,
    debtFreeDate: formatDebtFreeDate(asOfDate, plan.months_to_payoff),
    monthsToPayoff: plan.months_to_payoff,
    totalInterest: plan.total_interest,
    interestSaved: money(Math.max(baselineInterest - plan.total_interest, 0)),
    timeSavedMonths: Math.max(baselineMonths - plan.months_to_payoff, 0),
    monthlyCashStrain,
    riskLevel: getRiskLevel(monthlyCashStrain, input),
    recommendedExtraPayment: extraPayment,
    plan,
  };
}

export function compareFinancialScenarios(
  input: FinancialScenarioComparisonInput
): FinancialScenarioComparisonResult {
  const baselinePlan = runUnifiedStrategyEngine({
    debts: input.debts,
    strategy: "avalanche",
    cashIntelligence: input.cashIntelligence,
    extraPayment: 0,
  });
  const baselineScenario: FinancialScenarioDefinition = {
    id: "baseline",
    label: "Minimum Baseline",
    kind: "minimum",
    strategy: "avalanche",
    extraPayment: 0,
  };
  const baseline = buildScenarioResult({
    scenario: baselineScenario,
    input,
    baseline: baselinePlan,
  });
  const scenarios = (input.scenarios || defaultScenarios(input)).map((scenario) =>
    buildScenarioResult({ scenario, input, baseline: baselinePlan })
  );
  const comparable = scenarios.filter((scenario) => scenario.monthsToPayoff > 0);
  const bestByInterest =
    [...comparable].sort((a, b) => b.interestSaved - a.interestSaved)[0] ||
    scenarios[0] ||
    baseline;
  const bestBySpeed =
    [...comparable].sort((a, b) => b.timeSavedMonths - a.timeSavedMonths)[0] ||
    scenarios[0] ||
    baseline;

  return {
    baseline,
    scenarios,
    bestByInterest,
    bestBySpeed,
  };
}
