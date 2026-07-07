import type {
  CashIntelligenceFundingSource,
  CashIntelligenceGuardrails,
  CashIntelligenceResult,
} from "./cashIntelligence";
import type {
  FinancialDecisionGuardrails,
  FinancialDecisionResult,
} from "./financialDecisionEngine";
import { runVelocityEngine } from "./velocity/engine";
import type { VelocityEngineResult, VelocityInputSnapshot } from "./velocity/types";
import type { DebtStrategy } from "./debtStrategies";
import { roundMoney } from "./formatters";

export type UnifiedStrategy = DebtStrategy | "custom";

export type PayoffStrategy = UnifiedStrategy;

export type UnifiedStrategyDebt = {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
};

export type PayoffDebt = UnifiedStrategyDebt;

export type UnifiedPaymentScheduleRow = {
  month: number;
  target: string;
  starting_balance: number;
  interest_paid: number;
  principal_paid: number;
  total_payment: number;
  remaining_debt: number;
  debt_starting_balance: number;
  required_minimum: number;
  monthly_interest: number;
  principal_reduction: number;
  recommended_minimum: number;
  extra_attack: number;
  debt_ending_balance: number;
  recovered_minimum: number;
  paid_off: boolean;
  warning: string;
  velocity_chunk_applied?: number;
  velocity_source_interest?: number;
  velocity_source_payment?: number;
  velocity_source_balance?: number;
};

export type PayoffMonth = UnifiedPaymentScheduleRow;

export type UnifiedStrategyResult = {
  strategy: UnifiedStrategy;
  months_to_payoff: number;
  total_interest: number;
  total_paid: number;
  first_target: string;
  payoff_months: UnifiedPaymentScheduleRow[];
  payment_schedule: UnifiedPaymentScheduleRow[];
  recommended_extra_payment: number;
  recommended_action: string;
  safety_rating: FinancialDecisionResult["safetyRating"] | "not_evaluated";
  confidence_score: number;
  guardrail_violations: string[];
  velocity_chunk_applied?: number;
  velocity_source_interest?: number;
  velocity_source_paid?: number;
};

export type PayoffResult = UnifiedStrategyResult;

export type UnifiedStrategyEngineInput = {
  debts: UnifiedStrategyDebt[];
  strategy: UnifiedStrategy;
  cashIntelligence?: CashIntelligenceResult | null;
  financialDecision?: FinancialDecisionResult | null;
  fundingSources?: CashIntelligenceFundingSource[];
  guardrails?: CashIntelligenceGuardrails & FinancialDecisionGuardrails;
  extraPayment?: number;
  recoveredMinimums?: number;
  velocityInputSnapshot?: VelocityInputSnapshot;
  velocityEngineResult?: VelocityEngineResult;
  velocityTargetDebtId?: string;
  customDebtOrder?: string[];
};

function money(value: number) {
  return roundMoney(value);
}

function getRecommendedExtraPayment(input: UnifiedStrategyEngineInput) {
  if (input.strategy === "minimum") return 0;
  if (input.financialDecision) {
    return money(Math.max(input.financialDecision.suggestedExtraPayment || 0, 0));
  }

  return money(Math.max(Number(input.extraPayment || 0), 0));
}

function chooseTarget({
  debts,
  strategy,
  velocityTargetDebtId,
  customDebtOrder,
}: {
  debts: UnifiedStrategyDebt[];
  strategy: UnifiedStrategy;
  velocityTargetDebtId?: string;
  customDebtOrder?: string[];
}) {
  const active = debts.filter((debt) => debt.balance > 0);

  if (active.length === 0) return null;
  if (strategy === "minimum") return null;

  if (strategy === "custom" && customDebtOrder?.length) {
    const customTarget = customDebtOrder
      .map((debtId) => active.find((debt) => debt.id === debtId))
      .find(Boolean);

    if (customTarget) return customTarget;
  }

  if (strategy === "velocity") {
    const velocityTarget = active.find((debt) => debt.id === velocityTargetDebtId);

    if (velocityTarget) return velocityTarget;
  }

  if (strategy === "snowball") {
    return [...active].sort(
      (a, b) => Number(a.balance || 0) - Number(b.balance || 0)
    )[0];
  }

  return [...active].sort(
    (a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
  )[0];
}

function getDecisionSafety(input: UnifiedStrategyEngineInput) {
  return {
    recommended_action:
      input.financialDecision?.recommendedAction || "Use configured payoff strategy.",
    safety_rating: input.financialDecision?.safetyRating || "not_evaluated",
    confidence_score: input.financialDecision?.confidenceScore || 0,
    guardrail_violations: input.financialDecision?.guardrailViolations || [],
  } satisfies Pick<
    UnifiedStrategyResult,
    | "recommended_action"
    | "safety_rating"
    | "confidence_score"
    | "guardrail_violations"
  >;
}

export function runUnifiedStrategyEngine(
  input: UnifiedStrategyEngineInput
): UnifiedStrategyResult {
  const workingDebts: UnifiedStrategyDebt[] = input.debts.map((debt) => ({
    ...debt,
    balance: money(Number(debt.balance || 0)),
    minimum_payment: money(Number(debt.minimum_payment || 0)),
    interest_rate: Number(debt.interest_rate || 0),
  }));
  const recommendedExtraPayment = getRecommendedExtraPayment(input);
  const baseMonthlyPayment = money(
    workingDebts.reduce((sum, debt) => sum + debt.minimum_payment, 0) +
      recommendedExtraPayment +
      Number(input.recoveredMinimums || 0)
  );
  const velocityEngineResult =
    input.strategy === "velocity" && input.velocityInputSnapshot
      ? input.velocityEngineResult || runVelocityEngine(input.velocityInputSnapshot)
      : input.velocityEngineResult || null;
  const selectedVelocityTargetDebtId =
    input.velocityTargetDebtId ||
    velocityEngineResult?.recommendation?.debt_id ||
    velocityEngineResult?.target_debt?.id;
  const firstTarget = chooseTarget({
    debts: workingDebts,
    strategy: input.strategy,
    velocityTargetDebtId: selectedVelocityTargetDebtId,
    customDebtOrder: input.customDebtOrder,
  });
  const velocityChunk =
    input.strategy === "velocity"
      ? money(
          Math.max(
            Math.min(
              velocityEngineResult?.chunk_recommendation?.recommended_chunk || 0,
              input.financialDecision?.suggestedExtraPayment ||
                velocityEngineResult?.chunk_recommendation?.recommended_chunk ||
                0
            ),
            0
          )
        )
      : 0;
  const sourceApr = Math.max(velocityEngineResult?.interest_savings?.source_apr || 0, 0);
  const monthlySourceRecovery = money(
    Math.max(velocityEngineResult?.recovery_timeline?.monthly_recovery_capacity || 0, 0)
  );
  const safety = getDecisionSafety(input);
  let sourceBalance = 0;
  let velocityChunkApplied = 0;
  let velocitySourceInterest = 0;
  let velocitySourcePaid = 0;

  if (input.strategy === "velocity" && velocityChunk > 0 && selectedVelocityTargetDebtId) {
    const velocityTarget = workingDebts.find(
      (debt) => debt.id === selectedVelocityTargetDebtId
    );

    if (velocityTarget) {
      velocityChunkApplied = money(Math.min(velocityChunk, velocityTarget.balance));
      velocityTarget.balance = money(velocityTarget.balance - velocityChunkApplied);
      sourceBalance = velocityChunkApplied;
    }
  }

  if (!firstTarget || (baseMonthlyPayment <= 0 && sourceBalance <= 0)) {
    return {
      strategy: input.strategy,
      months_to_payoff: 0,
      total_interest: 0,
      total_paid: 0,
      first_target: "—",
      payoff_months: [],
      payment_schedule: [],
      recommended_extra_payment: recommendedExtraPayment,
      ...safety,
      velocity_chunk_applied: velocityChunkApplied,
      velocity_source_interest: 0,
      velocity_source_paid: 0,
    };
  }

  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const payoffMonths: UnifiedPaymentScheduleRow[] = [];

  while (
    (workingDebts.some((debt) => debt.balance > 0) || sourceBalance > 0) &&
    month < 600
  ) {
    month += 1;

    const startingBalance = money(
      workingDebts.reduce((sum, debt) => sum + debt.balance, 0)
    );
    const startingBalances: Record<string, number> = {};
    const interestByDebt: Record<string, number> = {};
    const attackPaidByDebt: Record<string, number> = {};
    let monthlyInterest = 0;
    let monthlySourceInterest = 0;
    let monthlySourcePayment = 0;

    if (sourceBalance > 0) {
      monthlySourceInterest = money((sourceBalance * sourceApr) / 100 / 12);
      sourceBalance = money(sourceBalance + monthlySourceInterest);
      velocitySourceInterest = money(velocitySourceInterest + monthlySourceInterest);
      monthlyInterest = money(monthlyInterest + monthlySourceInterest);
    }

    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue;

      startingBalances[debt.id] = money(debt.balance);
      const monthlyRate = Number(debt.interest_rate || 0) / 100 / 12;
      const interest = money(debt.balance * monthlyRate);

      interestByDebt[debt.id] = interest;
      debt.balance = money(debt.balance + interest);
      monthlyInterest = money(monthlyInterest + interest);
    }

    const targetAtMonthStart = chooseTarget({
      debts: workingDebts,
      strategy: input.strategy,
      velocityTargetDebtId: selectedVelocityTargetDebtId,
      customDebtOrder: input.customDebtOrder,
    });
    let paymentPool = baseMonthlyPayment;
    let monthlyPaid = 0;

    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue;

      const payment = Math.min(debt.minimum_payment, debt.balance);

      debt.balance = money(debt.balance - payment);
      paymentPool = money(paymentPool - payment);
      monthlyPaid = money(monthlyPaid + payment);
    }

    if (sourceBalance > 0) {
      monthlySourcePayment = money(
        Math.min(monthlySourceRecovery, sourceBalance, Math.max(paymentPool, 0))
      );
      sourceBalance = money(sourceBalance - monthlySourcePayment);
      velocitySourcePaid = money(velocitySourcePaid + monthlySourcePayment);
      paymentPool = money(paymentPool - monthlySourcePayment);
    }

    const target = chooseTarget({
      debts: workingDebts,
      strategy: input.strategy,
      velocityTargetDebtId: selectedVelocityTargetDebtId,
      customDebtOrder: input.customDebtOrder,
    });
    const targetPayment = target
      ? money(Math.min(Math.max(paymentPool, 0), target.balance))
      : 0;

    if (target) {
      target.balance = money(target.balance - targetPayment);
      attackPaidByDebt[target.id] = money(
        (attackPaidByDebt[target.id] || 0) + targetPayment
      );
    }
    monthlyPaid = money(monthlyPaid + targetPayment);

    const targetForRow =
      targetAtMonthStart ||
      chooseTarget({
        debts: workingDebts,
        strategy: input.strategy,
        velocityTargetDebtId: selectedVelocityTargetDebtId,
        customDebtOrder: input.customDebtOrder,
      });
    const targetStartingBalance = money(
      targetForRow
        ? startingBalances[targetForRow.id] ?? Number(targetForRow.balance || 0)
        : 0
    );
    const targetInterest = money(
      targetForRow ? interestByDebt[targetForRow.id] || 0 : 0
    );
    const targetRequiredMinimum = money(
      targetForRow ? Number(targetForRow.minimum_payment || 0) : 0
    );
    const targetAttackPaid = money(
      targetForRow ? attackPaidByDebt[targetForRow.id] || 0 : 0
    );
    const targetEndingBalance = money(Number(targetForRow?.balance || 0));
    const targetTotalPayment = money(
      targetRequiredMinimum + targetAttackPaid + monthlySourcePayment
    );
    const targetPrincipalReduction = money(
      targetTotalPayment - targetInterest - monthlySourceInterest
    );
    const paidOffThisMonth =
      targetStartingBalance > 0 && targetEndingBalance <= 0;
    const recoveredMinimum = paidOffThisMonth ? targetRequiredMinimum : 0;
    const recommendedMinimum =
      targetInterest >= targetRequiredMinimum
        ? money(targetInterest + 1)
        : targetRequiredMinimum;
    const paymentTooLow = targetTotalPayment < targetInterest;
    const remainingDebt = money(
      workingDebts.reduce((sum, debt) => sum + debt.balance, 0)
    );

    totalInterest = money(totalInterest + monthlyInterest);
    totalPaid = money(totalPaid + monthlyPaid + monthlySourcePayment);

    payoffMonths.push({
      month,
      target: targetForRow?.name || "Velocity Source Recovery",
      starting_balance: startingBalance,
      interest_paid: monthlyInterest,
      principal_paid: money(monthlyPaid + monthlySourcePayment - monthlyInterest),
      total_payment: money(monthlyPaid + monthlySourcePayment),
      remaining_debt: remainingDebt,
      debt_starting_balance: targetStartingBalance,
      required_minimum: targetRequiredMinimum,
      monthly_interest: money(targetInterest + monthlySourceInterest),
      principal_reduction: targetPrincipalReduction,
      recommended_minimum: recommendedMinimum,
      extra_attack: targetAttackPaid,
      debt_ending_balance: targetEndingBalance,
      recovered_minimum: recoveredMinimum,
      paid_off: paidOffThisMonth,
      warning: paymentTooLow ? "Payment too low" : "",
      velocity_chunk_applied: month === 1 ? velocityChunkApplied : 0,
      velocity_source_interest: monthlySourceInterest,
      velocity_source_payment: monthlySourcePayment,
      velocity_source_balance: sourceBalance,
    });
  }

  return {
    strategy: input.strategy,
    months_to_payoff: payoffMonths.length,
    total_interest: totalInterest,
    total_paid: totalPaid,
    first_target: firstTarget.name,
    payoff_months: payoffMonths,
    payment_schedule: payoffMonths,
    recommended_extra_payment: recommendedExtraPayment,
    ...safety,
    velocity_chunk_applied: velocityChunkApplied,
    velocity_source_interest: velocitySourceInterest,
    velocity_source_paid: velocitySourcePaid,
  };
}
