import { runVelocityEngine } from "./velocity";
import type { VelocityEngineResult, VelocityInputSnapshot } from "./velocity";

export type PayoffStrategy = "minimum" | "snowball" | "avalanche" | "velocity";

export type PayoffDebt = {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
};

export type PayoffMonth = {
  month: number;
  target: string;
  starting_balance: number;
  interest_paid: number;
  principal_paid: number;
  total_payment: number;
  remaining_debt: number;
  velocity_chunk_applied?: number;
  velocity_source_interest?: number;
  velocity_source_payment?: number;
  velocity_source_balance?: number;
};

export type PayoffResult = {
  months_to_payoff: number;
  total_interest: number;
  total_paid: number;
  first_target: string;
  payoff_months: PayoffMonth[];
  velocity_chunk_applied?: number;
  velocity_source_interest?: number;
  velocity_source_paid?: number;
};

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function chooseTarget(
  debts: PayoffDebt[],
  strategy: PayoffStrategy,
  velocityTargetDebtId?: string
) {
  const active = debts.filter((d) => d.balance > 0);

  if (active.length === 0) return null;

  if (strategy === "minimum") return null;

  if (strategy === "velocity") {
    const velocityTarget = active.find((debt) => debt.id === velocityTargetDebtId);

    // Conservative first pass: Velocity influences payoff ordering through the
    // engine-selected target only. Payment cadence remains the existing payoff
    // simulator's monthly pool until the plan can model one-time Velocity chunks.
    if (velocityTarget) return velocityTarget;

    return [...active].sort(
      (a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
    )[0];
  }

  if (strategy === "avalanche") {
    return [...active].sort(
      (a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
    )[0];
  }

  return [...active].sort(
    (a, b) => Number(a.balance || 0) - Number(b.balance || 0)
  )[0];
}

export function simulatePayoffPlan({
  debts,
  strategy,
  extraPayment,
  velocityInputSnapshot,
  velocityEngineResult,
}: {
  debts: PayoffDebt[];
  strategy: PayoffStrategy;
  extraPayment: number;
  velocityInputSnapshot?: VelocityInputSnapshot;
  velocityEngineResult?: VelocityEngineResult;
}): PayoffResult {
  const workingDebts: PayoffDebt[] = debts.map((debt) => ({
    ...debt,
    balance: money(Number(debt.balance || 0)),
    minimum_payment: money(Number(debt.minimum_payment || 0)),
    interest_rate: Number(debt.interest_rate || 0),
  }));

  // TODO: Currently `minimum_payment` is treated as a static per-debt value
  // and applied every simulation cycle. In future we may want to support
  // dynamic per-cycle minimums (e.g., varying due dates, promotional periods,
  // or minimums calculated from account state). Any such change should
  // preserve the current recovered-minimums and attack-pool logic.

  const baseMonthlyPayment = money(
    workingDebts.reduce((sum, debt) => sum + debt.minimum_payment, 0) +
      Number(extraPayment || 0)
  );

  const engineResult =
    strategy === "velocity" && velocityInputSnapshot
      ? velocityEngineResult || runVelocityEngine(velocityInputSnapshot)
      : null;
  const velocityTargetDebtId =
    engineResult?.recommendation?.debt_id ||
    engineResult?.target_debt?.id;

  const firstTarget = chooseTarget(workingDebts, strategy, velocityTargetDebtId);
  const velocityChunk =
    strategy === "velocity"
      ? money(Math.max(engineResult?.chunk_recommendation?.recommended_chunk || 0, 0))
      : 0;
  const sourceApr = Math.max(engineResult?.interest_savings?.source_apr || 0, 0);
  const monthlySourceRecovery = money(
    Math.max(engineResult?.recovery_timeline?.monthly_recovery_capacity || 0, 0)
  );
  let sourceBalance = 0;
  let velocityChunkApplied = 0;
  let velocitySourceInterest = 0;
  let velocitySourcePaid = 0;

  if (strategy === "velocity" && velocityChunk > 0 && velocityTargetDebtId) {
    const velocityTarget = workingDebts.find(
      (debt) => debt.id === velocityTargetDebtId
    );

    if (velocityTarget) {
      velocityChunkApplied = money(Math.min(velocityChunk, velocityTarget.balance));
      velocityTarget.balance = money(velocityTarget.balance - velocityChunkApplied);
      sourceBalance = velocityChunkApplied;
    }
  }

  if (!firstTarget || (baseMonthlyPayment <= 0 && sourceBalance <= 0)) {
    return {
      months_to_payoff: 0,
      total_interest: 0,
      total_paid: 0,
      first_target: "—",
      payoff_months: [],
      velocity_chunk_applied: velocityChunkApplied,
      velocity_source_interest: 0,
      velocity_source_paid: 0,
    };
  }

  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const payoffMonths: PayoffMonth[] = [];

  while (
    (workingDebts.some((d) => d.balance > 0) || sourceBalance > 0) &&
    month < 600
  ) {
    month += 1;

    const startingBalance = money(
      workingDebts.reduce((sum, debt) => sum + debt.balance, 0)
    );

    let monthlyInterest = 0;
    let monthlySourceInterest = 0;
    let monthlySourcePayment = 0;

    if (sourceBalance > 0) {
      monthlySourceInterest = money((sourceBalance * sourceApr) / 100 / 12);
      sourceBalance = money(sourceBalance + monthlySourceInterest);
      monthlySourcePayment = money(
        Math.min(monthlySourceRecovery, sourceBalance)
      );
      sourceBalance = money(sourceBalance - monthlySourcePayment);
      velocitySourceInterest = money(velocitySourceInterest + monthlySourceInterest);
      velocitySourcePaid = money(velocitySourcePaid + monthlySourcePayment);
      monthlyInterest = money(monthlyInterest + monthlySourceInterest);
    }

    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue;

      const monthlyRate = Number(debt.interest_rate || 0) / 100 / 12;
      const interest = money(debt.balance * monthlyRate);

      debt.balance = money(debt.balance + interest);
      monthlyInterest = money(monthlyInterest + interest);
    }

    const target = chooseTarget(workingDebts, strategy, velocityTargetDebtId);

    let paymentPool = target ? baseMonthlyPayment : 0;
    let monthlyPaid = 0;

    for (const debt of workingDebts) {
      if (debt.balance <= 0) continue;
      if (target && debt.id === target.id) continue;

      const payment = Math.min(debt.minimum_payment, debt.balance);

      debt.balance = money(debt.balance - payment);
      paymentPool = money(paymentPool - payment);
      monthlyPaid = money(monthlyPaid + payment);
    }

    const targetPayment = target
      ? Math.min(Math.max(paymentPool, 0), target.balance)
      : 0;

    if (target) {
      target.balance = money(target.balance - targetPayment);
    }
    monthlyPaid = money(monthlyPaid + targetPayment);

    const remainingDebt = money(
      workingDebts.reduce((sum, debt) => sum + debt.balance, 0)
    );

    totalInterest = money(totalInterest + monthlyInterest);
    totalPaid = money(totalPaid + monthlyPaid + monthlySourcePayment);

    payoffMonths.push({
      month,
      target: target?.name || "Velocity Source Recovery",
      starting_balance: startingBalance,
      interest_paid: monthlyInterest,
      principal_paid: money(monthlyPaid + monthlySourcePayment - monthlyInterest),
      total_payment: money(monthlyPaid + monthlySourcePayment),
      remaining_debt: remainingDebt,
      velocity_chunk_applied: month === 1 ? velocityChunkApplied : 0,
      velocity_source_interest: monthlySourceInterest,
      velocity_source_payment: monthlySourcePayment,
      velocity_source_balance: sourceBalance,
    });
  }

  return {
    months_to_payoff: payoffMonths.length,
    total_interest: totalInterest,
    total_paid: totalPaid,
    first_target: firstTarget.name,
    payoff_months: payoffMonths,
    velocity_chunk_applied: velocityChunkApplied,
    velocity_source_interest: velocitySourceInterest,
    velocity_source_paid: velocitySourcePaid,
  };
}
