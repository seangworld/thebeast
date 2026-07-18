import type {
  CashIntelligenceFundingSource,
  CashIntelligenceIncome,
  CashIntelligenceBill,
  CashIntelligenceResult,
} from "./cashIntelligence";
import type { DebtStrategy } from "./debtStrategies";
import { numberValue } from "./financialMetrics";
import { fundingTrace } from "./fundingRules";

export type FinancialDecisionDebt = {
  id?: string;
  name?: string | null;
  balance?: number | string | null;
  minimum_payment?: number | string | null;
  interest_rate?: number | string | null;
  is_archived?: boolean | null;
};

export type FinancialDecisionGuardrails = {
  minimumCashAfterPayment?: number | string | null;
  maxExtraPayment?: number | string | null;
};

export type FinancialDecisionInput = {
  cashIntelligence: CashIntelligenceResult;
  debts?: FinancialDecisionDebt[];
  income?: CashIntelligenceIncome[];
  bills?: CashIntelligenceBill[];
  fundingSources?: CashIntelligenceFundingSource[];
  guardrails?: FinancialDecisionGuardrails;
  strategy?: DebtStrategy;
};

export type FinancialDecisionAction =
  | "make_extra_payment"
  | "wait"
  | "restore_buffer"
  | "review_bills"
  | "maintain";

export type FinancialDecisionSafetyRating = "safe" | "caution" | "unsafe";

export type FinancialDecisionResult = {
  recommendedAction: string;
  suggestedExtraPayment: number;
  safetyRating: FinancialDecisionSafetyRating;
  confidenceScore: number;
  reason: string;
  reasoning: string[];
  action: FinancialDecisionAction;
  shouldWait: boolean;
  guardrailViolations: string[];
  targetDebt: FinancialDecisionDebt | null;
  fundingTrace?: ReturnType<typeof fundingTrace>;
};

function money(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getActiveDebts(debts: FinancialDecisionDebt[]) {
  return debts.filter(
    (debt) => !debt.is_archived && numberValue(debt.balance) > 0
  );
}

function chooseDebtTarget(
  debts: FinancialDecisionDebt[],
  strategy: DebtStrategy | undefined
) {
  const activeDebts = getActiveDebts(debts);
  if (activeDebts.length === 0) return null;

  if (strategy === "snowball") {
    return [...activeDebts].sort(
      (a, b) => numberValue(a.balance) - numberValue(b.balance)
    )[0];
  }

  return [...activeDebts].sort((a, b) => {
    const aprSort = numberValue(b.interest_rate) - numberValue(a.interest_rate);
    if (aprSort !== 0) return aprSort;
    return numberValue(b.balance) - numberValue(a.balance);
  })[0];
}

function getConfidenceScore({
  hasIncome,
  hasBills,
  hasFundingSources,
  targetDebt,
  violations,
}: {
  hasIncome: boolean;
  hasBills: boolean;
  hasFundingSources: boolean;
  targetDebt: FinancialDecisionDebt | null;
  violations: string[];
}) {
  let score = 50;

  if (hasIncome) score += 15;
  if (hasBills) score += 10;
  if (hasFundingSources) score += 5;
  if (targetDebt) score += 10;
  score -= violations.length * 15;

  return Math.max(0, Math.min(100, score));
}

function getSafetyRating(
  violations: string[],
  suggestedExtraPayment: number,
  cash: CashIntelligenceResult
): FinancialDecisionSafetyRating {
  if (violations.length > 0) return "unsafe";
  if (suggestedExtraPayment <= 0) return "caution";
  if (cash.projectedAvailableCash < suggestedExtraPayment * 0.25) return "caution";
  return "safe";
}

export function buildFinancialDecision(
  input: FinancialDecisionInput
): FinancialDecisionResult {
  const cash = input.cashIntelligence;
  const debts = input.debts || [];
  const income = input.income || [];
  const bills = input.bills || [];
  const fundingSources = input.fundingSources || [];
  const activeDebts = getActiveDebts(debts);
  const targetDebt = chooseDebtTarget(debts, input.strategy);
  const guardrailViolations: string[] = [];
  const reasoning: string[] = [];
  const maxExtraPayment = numberValue(input.guardrails?.maxExtraPayment);

  if (cash.currentAvailableCash <= 0 && cash.safeFundingSourceCapacity <= 0) {
    guardrailViolations.push("No safe cash or funding-source capacity is available.");
  }

  if (cash.projectedAvailableCash <= 0) {
    guardrailViolations.push("Projected cash would fall below the reserve guardrail.");
  }

  if (cash.monthlyAvailableCash < 0) {
    guardrailViolations.push("Monthly obligations are projected to exceed monthly income.");
  }

  if (cash.billsDue > cash.incomeExpected + cash.projectedAvailableCash) {
    guardrailViolations.push("Upcoming bills and minimums consume the current planning window.");
  }

  if (activeDebts.length === 0) {
    reasoning.push("No active debt balance is available for an extra payment.");

    return {
      recommendedAction: "Maintain your cash plan and keep records current.",
      suggestedExtraPayment: 0,
      safetyRating: "safe",
      confidenceScore: getConfidenceScore({
        hasIncome: income.length > 0,
        hasBills: bills.length > 0,
        hasFundingSources: fundingSources.length > 0,
        targetDebt,
        violations: [],
      }),
      reason: "There are no active debts requiring an extra payment.",
      reasoning,
      action: "maintain",
      shouldWait: false,
      guardrailViolations: [],
      targetDebt: null,
    };
  }

  const cashOnlyCapacity = Math.min(
    Math.max(cash.currentAvailableCash, 0),
    Math.max(cash.projectedAvailableCash, 0),
    Math.max(cash.safeAttackAmount - cash.safeFundingSourceCapacity, 0)
  );
  const uncappedPayment = Math.min(
    cashOnlyCapacity,
    numberValue(targetDebt?.balance)
  );
  const suggestedExtraPayment = money(
    maxExtraPayment > 0 ? Math.min(uncappedPayment, maxExtraPayment) : uncappedPayment
  );
  const trace = fundingTrace(fundingSources, numberValue(targetDebt?.interest_rate), suggestedExtraPayment);

  reasoning.push(
    `Safe cash attack capacity is ${money(cashOnlyCapacity)} after cash, reserve, and projection guardrails. Borrowing is evaluated separately and is never combined into this recommendation.`
  );

  if (targetDebt) {
    reasoning.push(
      `Recommended target is ${targetDebt.name || "the selected debt"} based on the active payoff strategy.`
    );
  }

  const safetyRating = getSafetyRating(
    guardrailViolations,
    suggestedExtraPayment,
    cash
  );
  const confidenceScore = getConfidenceScore({
    hasIncome: income.length > 0,
    hasBills: bills.length > 0,
    hasFundingSources: fundingSources.length > 0,
    targetDebt,
    violations: guardrailViolations,
  });

  if (guardrailViolations.length > 0) {
    return {
      recommendedAction: "Wait before making another payment.",
      suggestedExtraPayment: 0,
      safetyRating,
      confidenceScore,
      reason: guardrailViolations[0],
      reasoning,
      action:
        cash.currentAvailableCash <= 0 || cash.projectedAvailableCash <= 0
          ? "restore_buffer"
          : "wait",
      shouldWait: true,
      guardrailViolations,
      targetDebt,
      fundingTrace: trace,
    };
  }

  if (suggestedExtraPayment <= 0) {
    return {
      recommendedAction: "Wait and review upcoming cash timing.",
      suggestedExtraPayment: 0,
      safetyRating,
      confidenceScore,
      reason: "The engine did not find enough safe capacity for another extra payment.",
      reasoning,
      action: "wait",
      shouldWait: true,
      guardrailViolations,
      targetDebt,
      fundingTrace: trace,
    };
  }

  return {
    recommendedAction: `Pay ${money(suggestedExtraPayment)} toward ${
      targetDebt?.name || "the recommended debt"
    }.`,
    suggestedExtraPayment,
    safetyRating,
    confidenceScore,
    reason: "This payment preserves the cash reserve and current planning guardrails.",
    reasoning,
    action: "make_extra_payment",
    shouldWait: false,
    guardrailViolations,
    targetDebt,
    fundingTrace: trace,
  };
}
