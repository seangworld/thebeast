import {
  SharedBenchmarkIntelligence,
  type BenchmarkDefinition,
  type BenchmarkResult,
  type Observation,
} from "./platform/agents";
import type { MoneyObservationData } from "./moneyCoachObservations";

const specialistId = "beastmoney.money-coach";

export type MoneyBenchmarkConfiguration = {
  maximumDebtUtilization?: number;
  monthlyExpenseBudget?: number;
  emergencyFundGoal?: number;
  retirementBalanceGoal?: number;
};

function definition(values: Omit<BenchmarkDefinition, "domain" | "applicableSpecialists">): BenchmarkDefinition {
  return { ...values, domain: "money", applicableSpecialists: [specialistId] };
}

function average(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildMoneyCoachBenchmarks(
  data: MoneyObservationData,
  ownerId: string,
  asOf: string,
  observations: readonly Observation[] = [],
  configuration: MoneyBenchmarkConfiguration = {}
): BenchmarkResult[] {
  const engine = new SharedBenchmarkIntelligence(() => asOf);
  const results: BenchmarkResult[] = [];
  const current = data.current;
  const history = data.history;

  const evaluate = (benchmark: BenchmarkDefinition, currentValue: number, currentLabel: string, referenceValue: number, referenceLabel: string) => {
    engine.register(benchmark);
    results.push(engine.evaluate({
      ownerId,
      specialistId,
      benchmarkId: benchmark.id,
      current: { value: currentValue, label: currentLabel, measuredAt: current.capturedAt, supportingRecordIds: [] },
      reference: { value: referenceValue, label: referenceLabel, measuredAt: benchmark.sourceDate, supportingRecordIds: [] },
      conditionEvidence: Object.fromEntries(benchmark.applicableMemberConditions.requiredConditions.map((condition) => [condition, true])),
      authorizedScopes: ["member:read"],
      observations,
    }));
  };

  const currentSavingsRate = current.monthlyIncome > 0
    ? ((current.monthlyIncome - current.monthlyOutflow) / current.monthlyIncome) * 100
    : undefined;
  const historicalSavingsRates = history
    .filter((item) => item.monthlyIncome > 0)
    .map((item) => ((item.monthlyIncome - item.monthlyOutflow) / item.monthlyIncome) * 100);
  if (currentSavingsRate !== undefined && historicalSavingsRates.length) {
    evaluate(definition({
      id: "money.savings-rate.personal-history",
      name: "Savings rate compared with personal history",
      type: "personal-historical-baseline",
      source: { name: "Authenticated BeastMoney cash-flow snapshots", authority: "member-records", ownerScoped: true },
      sourceDate: history[0].capturedAt,
      calculation: {
        metric: "Savings rate",
        unit: "percent",
        formula: "(monthly income - monthly outflow) / monthly income × 100",
        direction: "higher-is-better",
      },
      applicableMemberConditions: {
        description: "Current income and at least one prior income and outflow snapshot exist.",
        requiredConditions: ["current-income", "historical-cash-flow"],
      },
      confidence: "high",
      strengthOfEvidence: historicalSavingsRates.length >= 3 ? "strong" : "moderate",
      notes: [`The reference uses ${historicalSavingsRates.length} available personal snapshot${historicalSavingsRates.length === 1 ? "" : "s"}, not a population comparison.`],
    }), currentSavingsRate, "Current savings rate", average(historicalSavingsRates), "Average available historical savings rate");
  }

  if (history.length) {
    const recentSurpluses = history.slice(0, 6).map((item) => item.projectedSurplus);
    evaluate(definition({
      id: "money.cash-flow.recent-trend",
      name: "Cash flow compared with recent trend",
      type: "recent-trend-baseline",
      source: { name: "Authenticated BeastMoney cash-flow snapshots", authority: "member-records", ownerScoped: true },
      sourceDate: history[0].capturedAt,
      calculation: {
        metric: "Projected monthly surplus",
        unit: "currency",
        formula: "current projected surplus compared with the mean of up to six prior snapshots",
        direction: "higher-is-better",
      },
      applicableMemberConditions: {
        description: "A current projected surplus and at least one prior snapshot exist.",
        requiredConditions: ["current-cash-flow", "recent-history"],
      },
      confidence: "high",
      strengthOfEvidence: recentSurpluses.length >= 3 ? "strong" : "moderate",
      notes: ["This comparison describes recent saved records and does not predict future cash flow."],
    }), current.projectedSurplus, "Current projected surplus", average(recentSurpluses), "Recent personal average");
  }

  if (current.cashBuffer > 0) {
    evaluate(definition({
      id: "money.cash-buffer.configuration",
      name: "Cash compared with configured buffer",
      type: "configuration-threshold",
      source: { name: "Member-configured BeastMoney cash buffer", authority: "configuration", ownerScoped: true },
      sourceDate: current.capturedAt,
      calculation: {
        metric: "Available cash",
        unit: "currency",
        formula: "current available cash compared with the configured protected cash buffer",
        direction: "higher-is-better",
      },
      applicableMemberConditions: {
        description: "The member configured a positive cash buffer.",
        requiredConditions: ["configured-cash-buffer"],
      },
      confidence: "high",
      strengthOfEvidence: "strong",
      notes: ["The configured cash buffer is a member setting, not a professional emergency-fund guideline."],
    }), current.currentCash, "Current available cash", current.cashBuffer, "Configured protected cash buffer");
  }

  if (current.utilization !== undefined && configuration.maximumDebtUtilization !== undefined) {
    evaluate(definition({
      id: "money.debt-utilization.configuration",
      name: "Debt utilization compared with configured threshold",
      type: "configuration-threshold",
      source: { name: "Member-configured utilization threshold", authority: "configuration", ownerScoped: true },
      sourceDate: current.capturedAt,
      calculation: {
        metric: "Debt utilization",
        unit: "percent",
        formula: "current utilization compared with the configured maximum utilization",
        direction: "lower-is-better",
      },
      applicableMemberConditions: {
        description: "Current utilization and an explicit maximum threshold exist.",
        requiredConditions: ["current-utilization", "configured-utilization-threshold"],
      },
      confidence: "high",
      strengthOfEvidence: "strong",
      notes: ["This is the member's configured guardrail, not a universal credit guideline."],
    }), current.utilization, "Current debt utilization", configuration.maximumDebtUtilization, "Configured maximum utilization");
  }

  if (configuration.monthlyExpenseBudget !== undefined) {
    evaluate(definition({
      id: "money.budget.goal",
      name: "Monthly expenses compared with budget",
      type: "goal-baseline",
      source: { name: "Member-stated monthly expense budget", authority: "member-goal", ownerScoped: true },
      sourceDate: current.capturedAt,
      calculation: {
        metric: "Monthly outflow",
        unit: "currency",
        formula: "current normalized monthly outflow compared with the member-stated budget",
        direction: "lower-is-better",
      },
      applicableMemberConditions: {
        description: "A member-stated monthly budget exists.",
        requiredConditions: ["monthly-expense-budget"],
      },
      confidence: "high",
      strengthOfEvidence: "strong",
      notes: ["Budget adherence depends on the completeness of current saved obligations."],
    }), current.monthlyOutflow, "Current monthly outflow", configuration.monthlyExpenseBudget, "Stated monthly expense budget");
  }

  if (configuration.emergencyFundGoal !== undefined) {
    evaluate(definition({
      id: "money.emergency-fund.goal",
      name: "Available cash compared with emergency-fund goal",
      type: "goal-baseline",
      source: { name: "Member-stated emergency-fund goal", authority: "member-goal", ownerScoped: true },
      sourceDate: current.capturedAt,
      calculation: {
        metric: "Available cash",
        unit: "currency",
        formula: "current available cash compared with the member-stated emergency-fund goal",
        direction: "higher-is-better",
      },
      applicableMemberConditions: {
        description: "A member-stated emergency-fund goal exists.",
        requiredConditions: ["emergency-fund-goal"],
      },
      confidence: "high",
      strengthOfEvidence: "strong",
      notes: ["The framework does not infer an emergency-fund target from external rules."],
    }), current.currentCash, "Current available cash", configuration.emergencyFundGoal, "Stated emergency-fund goal");
  }

  if (configuration.retirementBalanceGoal !== undefined && current.retirement?.balance !== undefined) {
    evaluate(definition({
      id: "money.retirement.goal",
      name: "Retirement balance compared with stated goal",
      type: "goal-baseline",
      source: { name: "Member-stated retirement balance goal", authority: "member-goal", ownerScoped: true },
      sourceDate: current.capturedAt,
      calculation: {
        metric: "Retirement balance",
        unit: "currency",
        formula: "current tracked retirement balance compared with the member-stated balance goal",
        direction: "higher-is-better",
      },
      applicableMemberConditions: {
        description: "Current retirement balance and a member-stated goal exist.",
        requiredConditions: ["retirement-balance", "retirement-goal"],
      },
      confidence: "high",
      strengthOfEvidence: "strong",
      notes: ["This balance comparison is not a retirement-readiness guarantee or projection."],
    }), current.retirement.balance, "Current retirement balance", configuration.retirementBalanceGoal, "Stated retirement balance goal");
  }

  if (history.length && current.totalDebt >= 0) {
    const priorDebt = history[0].totalDebt;
    evaluate(definition({
      id: "money.debt-payoff.personal-history",
      name: "Debt payoff progress compared with prior balance",
      type: "personal-historical-baseline",
      source: { name: "Authenticated BeastMoney debt snapshots", authority: "member-records", ownerScoped: true },
      sourceDate: history[0].capturedAt,
      calculation: {
        metric: "Total tracked debt",
        unit: "currency",
        formula: "current total tracked debt compared with the immediately prior total",
        direction: "lower-is-better",
      },
      applicableMemberConditions: {
        description: "Current and prior tracked debt totals exist.",
        requiredConditions: ["current-debt", "prior-debt"],
      },
      confidence: "high",
      strengthOfEvidence: "strong",
      notes: ["Balance movement does not by itself prove a payment, interest charge, or new purchase caused the change."],
    }), current.totalDebt, "Current total tracked debt", priorDebt, "Prior total tracked debt");
  }

  return results.sort((a, b) => a.benchmarkName.localeCompare(b.benchmarkName));
}
