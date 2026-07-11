import type {
  VelocityAlternative,
  VelocityCandidateEvaluation,
  VelocityCandidateKind,
  VelocityConfidence,
  VelocityChunkConstraint,
  VelocityChunkRecommendation,
  VelocityConstraintResult,
  VelocityAccountSnapshot,
  VelocityCashflowProjection,
  VelocityDebtSnapshot,
  VelocityEngineResult,
  VelocityInputSnapshot,
  VelocityInterestSavings,
  VelocityRecommendation,
  VelocityRecoveryTimeline,
  VelocityRiskLevel,
  VelocityScoreBreakdown,
} from "./types";
import { buildCashIntelligence } from "../cashIntelligence";

function money(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function positiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
}

function finiteNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function validateInput(input: VelocityInputSnapshot) {
  const errors: string[] = [];

  if (!input) {
    return ["Velocity input is required."];
  }

  if (!Array.isArray(input.accounts)) errors.push("Accounts must be an array.");
  if (!Array.isArray(input.incomes)) errors.push("Incomes must be an array.");
  if (!Array.isArray(input.bills)) errors.push("Bills must be an array.");
  if (!Array.isArray(input.debts)) errors.push("Debts must be an array.");

  if (!input.settings) {
    errors.push("Velocity settings are required.");
  } else if (!Number.isFinite(input.settings.cash_buffer)) {
    errors.push("Cash buffer must be a valid number.");
  }

  return errors;
}

function getCashBalance(input: VelocityInputSnapshot) {
  return money(
    input.accounts
      .filter((account) =>
        ["checking", "savings", "cash"].includes(account.type || "checking")
      )
      .reduce((sum, account) => sum + Number(account.current_balance || 0), 0)
  );
}

function getEligibleDebts(debts: VelocityDebtSnapshot[]) {
  return debts.filter(
    (debt) => !debt.is_archived && positiveNumber(debt.balance)
  );
}

function getHighestAprDebt(debts: VelocityDebtSnapshot[]) {
  return [...debts].sort((a, b) => {
    const aprCompare = Number(b.interest_rate || 0) - Number(a.interest_rate || 0);
    if (aprCompare !== 0) return aprCompare;

    return Number(b.balance || 0) - Number(a.balance || 0);
  })[0];
}

function getEffectiveMinimumPayment(debt: VelocityDebtSnapshot, balance = debt.balance) {
  const currentBalance = Math.max(finiteNumber(balance), 0);
  if (currentBalance <= 0) return 0;

  if (debt.payment_behavior === "revolving") {
    const ratePayment = money(
      currentBalance * (Math.max(finiteNumber(debt.minimum_payment_rate), 0) / 100)
    );
    const floorPayment = money(Math.max(finiteNumber(debt.minimum_payment_floor), 0));
    const configuredMinimum = money(Math.max(finiteNumber(debt.minimum_payment), 0));
    const revolvingMinimum = Math.max(ratePayment, floorPayment, configuredMinimum);

    return money(Math.min(revolvingMinimum, currentBalance));
  }

  return money(Math.min(Math.max(finiteNumber(debt.minimum_payment), 0), currentBalance));
}

function getProjectionDebtMinimums(debts: VelocityDebtSnapshot[]) {
  return getEligibleDebts(debts).map((debt) => ({
    ...debt,
    minimum_payment: getEffectiveMinimumPayment(debt),
  }));
}

function getRiskLevel(paymentAmount: number, availableCash: number): VelocityRiskLevel {
  if (!positiveNumber(paymentAmount) || !positiveNumber(availableCash)) return "high";

  const ratio = paymentAmount / availableCash;
  if (ratio <= 0.35) return "low";
  if (ratio <= 0.7) return "medium";
  return "high";
}

function formatRecoveryCompletionDate(asOfDate: string | undefined, monthsRequired: number | null) {
  if (monthsRequired == null) return "Not Available";
  if (!asOfDate) return "Not Available";

  const baseDate = new Date(asOfDate);
  if (Number.isNaN(baseDate.getTime())) return "Not Available";

  const completionDate = new Date(baseDate);
  completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsRequired));

  return completionDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function buildRecoveryTimeline(
  input: VelocityInputSnapshot,
  paymentAmount: number
): VelocityRecoveryTimeline {
  const monthlyRecoveryCapacity = money(
    Math.max(finiteNumber(input.settings.monthly_recovery_capacity), 0)
  );
  const recoveryMonths = Math.max(finiteNumber(input.settings.recovery_months), 0);
  const monthsRequired =
    paymentAmount > 0 && monthlyRecoveryCapacity > 0
      ? paymentAmount / monthlyRecoveryCapacity
      : null;
  const status =
    monthsRequired == null
      ? "Not Available"
      : monthsRequired <= recoveryMonths
        ? "Within Guardrails"
        : "Exceeds Guardrails";

  return {
    months_required: monthsRequired == null ? null : money(monthsRequired),
    recovery_months: recoveryMonths,
    monthly_recovery_capacity: monthlyRecoveryCapacity,
    status,
    completion_date: formatRecoveryCompletionDate(
      input.as_of_date,
      monthsRequired
    ),
  };
}

function simulateMinimumPaymentInterest(debts: VelocityDebtSnapshot[]) {
  const maxMonths = 600;
  const workingDebts = debts.map((debt) => ({
    ...debt,
    balance: money(Math.max(finiteNumber(debt.balance), 0)),
    interest_rate: Math.max(finiteNumber(debt.interest_rate), 0),
  }));
  let totalInterest = 0;
  let months = 0;

  while (months < maxMonths && workingDebts.some((debt) => debt.balance > 0)) {
    months += 1;

    workingDebts.forEach((debt) => {
      if (debt.balance <= 0) return;

      const monthlyInterest = money((debt.balance * debt.interest_rate) / 100 / 12);
      totalInterest = money(totalInterest + monthlyInterest);
      debt.balance = money(debt.balance + monthlyInterest);
      debt.balance = money(
        Math.max(debt.balance - getEffectiveMinimumPayment(debt, debt.balance), 0)
      );
    });
  }

  return {
    total_interest: money(totalInterest),
    months,
    payoff_completed: workingDebts.every((debt) => debt.balance <= 0),
  };
}

function getVelocitySourceAccount(input: VelocityInputSnapshot) {
  return input.accounts.find((account) => {
    const accountType = account.type || "other";
    return !["checking", "savings", "cash"].includes(accountType);
  });
}

function getSourceInterestForMonths(
  principal: number,
  apr: number,
  months: number
) {
  let totalInterest = 0;

  for (let month = 0; month < months; month += 1) {
    totalInterest = money(totalInterest + money((principal * apr) / 100 / 12));
  }

  return money(totalInterest);
}

function simulateVelocitySourceCost(
  sourceAccount: VelocityAccountSnapshot | undefined,
  velocityPaymentAmount: number,
  monthlyRecoveryCapacity: number
)
 {
  const maxMonths = 600;
  const sourceApr = Math.max(finiteNumber(sourceAccount?.interest_rate), 0);
  const sourceStartingBalance = money(
    Math.max(finiteNumber(sourceAccount?.current_balance), 0)
  );
  const sourceBalanceAfterVelocityPayment = money(
    sourceStartingBalance + Math.max(velocityPaymentAmount, 0)
  );
  const monthlySourceRepayment = money(Math.max(monthlyRecoveryCapacity, 0));

  if (velocityPaymentAmount <= 0 || sourceApr <= 0 || monthlySourceRepayment <= 0) {
    const repaymentMonths =
      velocityPaymentAmount > 0 && monthlySourceRepayment > 0
        ? Math.ceil(velocityPaymentAmount / monthlySourceRepayment)
        : 0;

    return {
      source_apr: sourceApr,
      source_starting_balance: sourceStartingBalance,
      source_balance_after_velocity_payment: sourceBalanceAfterVelocityPayment,
      monthly_source_repayment: monthlySourceRepayment,
      source_interest_cost: 0,
      source_repayment_months: repaymentMonths,
      source_repayment_completed:
        velocityPaymentAmount <= 0 ||
        (sourceApr <= 0 && monthlySourceRepayment > 0),
    };
  }

  let sourceBalance = sourceBalanceAfterVelocityPayment;
  let grossSourceInterest = 0;
  let months = 0;

  while (months < maxMonths && sourceBalance > sourceStartingBalance) {
    months += 1;

    const monthlyInterest = money((sourceBalance * sourceApr) / 100 / 12);
    grossSourceInterest = money(grossSourceInterest + monthlyInterest);
    sourceBalance = money(sourceBalance + monthlyInterest);

    const repaymentAmount = Math.min(
      monthlySourceRepayment,
      Math.max(sourceBalance - sourceStartingBalance, 0)
    );
    sourceBalance = money(sourceBalance - repaymentAmount);
  }

  const baselineSourceInterest = getSourceInterestForMonths(
    sourceStartingBalance,
    sourceApr,
    months
  );

  return {
    source_apr: sourceApr,
    source_starting_balance: sourceStartingBalance,
    source_balance_after_velocity_payment: sourceBalanceAfterVelocityPayment,
    monthly_source_repayment: monthlySourceRepayment,
    source_interest_cost: money(
      Math.max(grossSourceInterest - baselineSourceInterest, 0)
    ),
    source_repayment_months: months,
    source_repayment_completed: sourceBalance <= sourceStartingBalance,
  };
}

function buildInterestSavings(
  input: VelocityInputSnapshot,
  debts: VelocityDebtSnapshot[],
  recommendation: VelocityRecommendation | undefined
): VelocityInterestSavings {
  const eligibleDebts = getEligibleDebts(debts);
  const velocityPaymentAmount = money(Math.max(recommendation?.payment_amount || 0, 0));
  const targetDebtId = recommendation?.debt_id;
  const targetDebt = eligibleDebts.find((debt) => debt.id === targetDebtId);
  const baseline = simulateMinimumPaymentInterest(eligibleDebts);
  const velocityDebts = eligibleDebts.map((debt) => {
    if (!targetDebtId || debt.id !== targetDebtId || velocityPaymentAmount <= 0) {
      return debt;
    }

    return {
      ...debt,
      balance: money(Math.max(debt.balance - velocityPaymentAmount, 0)),
    };
  });
  const velocity = simulateMinimumPaymentInterest(velocityDebts);
  const grossInterestSaved = money(
    Math.max(baseline.total_interest - velocity.total_interest, 0)
  );
  const sourceCost = simulateVelocitySourceCost(
    getVelocitySourceAccount(input),
    velocityPaymentAmount,
    finiteNumber(input.settings.monthly_recovery_capacity)
  );
  const netInterestSaved = money(
    grossInterestSaved - sourceCost.source_interest_cost
  );

  return {
    baseline_total_interest: baseline.total_interest,
    velocity_total_interest: velocity.total_interest,
    gross_interest_saved: grossInterestSaved,
    velocity_source_interest_cost: sourceCost.source_interest_cost,
    net_interest_saved: netInterestSaved,
    projected_interest_saved: netInterestSaved,
    months_compared: Math.max(baseline.months, velocity.months),
    baseline_payoff_completed: baseline.payoff_completed,
    velocity_payoff_completed: velocity.payoff_completed,
    target_debt_id: targetDebt?.id,
    target_debt_name: targetDebt?.name,
    velocity_payment_amount: velocityPaymentAmount,
    source_apr: sourceCost.source_apr,
    source_starting_balance: sourceCost.source_starting_balance,
    source_balance_after_velocity_payment:
      sourceCost.source_balance_after_velocity_payment,
    monthly_source_repayment: sourceCost.monthly_source_repayment,
    source_repayment_months: sourceCost.source_repayment_months,
    source_repayment_completed: sourceCost.source_repayment_completed,
    assumptions: [
      "Baseline scenario pays scheduled minimum payments only.",
      "Velocity scenario applies the selected Velocity payment before the first simulated interest cycle.",
      "Both scenarios use the same minimum payments, APRs, and active debt balances.",
      "Velocity source cost models the recommended payment added to the source balance and repaid with monthly recovery capacity.",
      "Simulation stops after 600 months if payoff is not completed.",
    ],
  };
}

function buildInterestSavingsForChunk(
  input: VelocityInputSnapshot,
  debts: VelocityDebtSnapshot[],
  targetDebt: VelocityDebtSnapshot,
  paymentAmount: number
) {
  return buildInterestSavings(input, debts, {
    id: "chunk-formula-preview",
    label: "Chunk formula preview",
    kind: "highest_apr",
    debt_id: targetDebt.id,
    debt_name: targetDebt.name,
    payment_amount: paymentAmount,
    reason: "Preview interest impact for deterministic chunk sizing.",
    confidence: "high",
  });
}

function getSourceCapacity(input: VelocityInputSnapshot) {
  const sourceAccount = getVelocitySourceAccount(input);
  const configuredMax = input.settings.max_recommended_payment;
  const configuredLimit =
    configuredMax != null && Number.isFinite(configuredMax)
      ? Math.max(Number(configuredMax), 0)
      : Number.POSITIVE_INFINITY;

  if (!sourceAccount) {
    return {
      safe_source_capacity:
        configuredLimit === Number.POSITIVE_INFINITY ? 0 : money(configuredLimit),
      available_credit:
        configuredLimit === Number.POSITIVE_INFINITY ? 0 : money(configuredLimit),
      utilization_capacity:
        configuredLimit === Number.POSITIVE_INFINITY ? 0 : money(configuredLimit),
    };
  }

  const creditLimit = Math.max(finiteNumber(sourceAccount.credit_limit), 0);
  const currentBalance = Math.max(finiteNumber(sourceAccount.current_balance), 0);
  const availableCredit =
    sourceAccount.available_credit != null &&
    Number.isFinite(sourceAccount.available_credit)
      ? Math.max(Number(sourceAccount.available_credit), 0)
      : Math.max(creditLimit - currentBalance, 0);
  const maxUtilizationPercent =
    input.settings.max_source_utilization_percent != null &&
    Number.isFinite(input.settings.max_source_utilization_percent)
      ? Math.max(Number(input.settings.max_source_utilization_percent), 0)
      : 100;
  const emergencyReserve = Math.max(
    finiteNumber(input.settings.minimum_cash_after_payment),
    0
  );
  const utilizationLimit = money(creditLimit * (maxUtilizationPercent / 100));
  const utilizationCapacity =
    creditLimit > 0
      ? Math.max(utilizationLimit - currentBalance - emergencyReserve, 0)
      : availableCredit;

  return {
    safe_source_capacity: money(
      Math.max(Math.min(availableCredit, utilizationCapacity, configuredLimit), 0)
    ),
    available_credit: money(availableCredit),
    utilization_capacity: money(utilizationCapacity),
  };
}

function makeChunkConstraint(
  id: VelocityChunkConstraint["id"],
  label: string,
  value: number,
  passed: boolean,
  detail: string
): VelocityChunkConstraint {
  return {
    id,
    label,
    value: money(value),
    passed,
    detail,
  };
}

function buildChunkRecommendation(
  input: VelocityInputSnapshot,
  debts: VelocityDebtSnapshot[],
  targetDebt: VelocityDebtSnapshot | undefined,
  cashflowProjection: VelocityCashflowProjection
): VelocityChunkRecommendation {
  const cashBuffer = Math.max(finiteNumber(input.settings.cash_buffer), 0);
  const emergencyReserve = Math.max(
    finiteNumber(input.settings.minimum_cash_after_payment ?? cashBuffer),
    0
  );
  const liquidityFloor = Math.max(cashBuffer, emergencyReserve);
  const projectedCashBeforePayment =
    cashflowProjection.projected_cash_before_velocity_payment;
  const liquiditySurplus = money(
    Math.max(projectedCashBeforePayment - liquidityFloor, 0)
  );
  const sourceCapacity = getSourceCapacity(input);
  const monthlyRecoveryCapacity = money(
    Math.max(finiteNumber(input.settings.monthly_recovery_capacity), 0)
  );
  const recoveryMonths = Math.max(finiteNumber(input.settings.recovery_months), 0);
  const recoveryWindowCapacity = money(monthlyRecoveryCapacity * recoveryMonths);
  const targetBalance = money(Math.max(finiteNumber(targetDebt?.balance), 0));
  const configuredMax =
    input.settings.max_recommended_payment != null &&
    Number.isFinite(input.settings.max_recommended_payment)
      ? Math.max(Number(input.settings.max_recommended_payment), 0)
      : Number.POSITIVE_INFINITY;

  const baseConstraints = [
    makeChunkConstraint(
      "liquidity_floor",
      "Liquidity floor",
      liquiditySurplus,
      projectedCashBeforePayment >= liquidityFloor,
      `Projected cash after income, bills, and minimum payments is ${money(projectedCashBeforePayment)} against a ${money(liquidityFloor)} liquidity floor.`
    ),
    makeChunkConstraint(
      "safe_source_capacity",
      "Safe source capacity",
      sourceCapacity.safe_source_capacity,
      sourceCapacity.safe_source_capacity > 0,
      `Safe source capacity is ${sourceCapacity.safe_source_capacity} after available credit, utilization, source balance, and emergency reserve guardrails.`
    ),
    makeChunkConstraint(
      "recovery_window",
      "Recovery window",
      recoveryWindowCapacity,
      monthlyRecoveryCapacity > 0 && recoveryMonths > 0,
      `Recovery capacity is ${monthlyRecoveryCapacity} per month over ${recoveryMonths} months.`
    ),
    makeChunkConstraint(
      "target_balance",
      "Target debt balance",
      targetBalance,
      Boolean(targetDebt) && targetBalance > 0,
      targetDebt
        ? `Target debt ${targetDebt.name} has ${targetBalance} remaining.`
        : "No eligible target debt is available."
    ),
    makeChunkConstraint(
      "max_recommended_payment",
      "Maximum recommended payment",
      configuredMax === Number.POSITIVE_INFINITY
        ? sourceCapacity.safe_source_capacity
        : configuredMax,
      configuredMax === Number.POSITIVE_INFINITY || configuredMax > 0,
      configuredMax === Number.POSITIVE_INFINITY
        ? "No separate max recommended payment is configured."
        : `Configured max recommended payment is ${money(configuredMax)}.`
    ),
  ];

  const failedBaseConstraint = baseConstraints.find(
    (constraint) => !constraint.passed
  );
  const candidateChunk = money(
    Math.min(
      sourceCapacity.safe_source_capacity,
      recoveryWindowCapacity,
      targetBalance,
      configuredMax
    )
  );

  let interestSavings: VelocityInterestSavings | null = null;
  if (!failedBaseConstraint && targetDebt && candidateChunk > 0) {
    interestSavings = buildInterestSavingsForChunk(
      input,
      debts,
      targetDebt,
      candidateChunk
    );
  }

  const recoveryIsSafe =
    !interestSavings ||
    interestSavings.source_repayment_completed === true &&
      interestSavings.source_repayment_months <= recoveryMonths;
  const projectedNetSavings = money(interestSavings?.net_interest_saved || 0);
  const positiveNetSavingsConstraint = makeChunkConstraint(
    "positive_net_savings",
    "Positive net savings",
    projectedNetSavings,
    projectedNetSavings > 0,
    `Projected net savings after Velocity source cost is ${projectedNetSavings}.`
  );
  const constraints = [...baseConstraints, positiveNetSavingsConstraint];
  const numericLimits = [
    {
      id: "safe_source_capacity" as const,
      label: "Safe source capacity",
      value: sourceCapacity.safe_source_capacity,
    },
    {
      id: "recovery_window" as const,
      label: "Recovery window",
      value: recoveryWindowCapacity,
    },
    {
      id: "target_balance" as const,
      label: "Target debt balance",
      value: targetBalance,
    },
    ...(configuredMax === Number.POSITIVE_INFINITY
      ? []
      : [
          {
            id: "max_recommended_payment" as const,
            label: "Maximum recommended payment",
            value: configuredMax,
          },
        ]),
  ];
  const limitingConstraint = numericLimits
    .filter((limit) => Number.isFinite(limit.value))
    .sort((a, b) => a.value - b.value)[0] || {
    id: "safe_source_capacity" as const,
    label: "Safe source capacity",
    value: 0,
  };
  const recoveryUnsafeConstraint = !failedBaseConstraint && !recoveryIsSafe
    ? baseConstraints.find((constraint) => constraint.id === "recovery_window")
    : undefined;
  const holdConstraint =
    failedBaseConstraint ||
    (candidateChunk <= 0
      ? constraints.find((constraint) => constraint.id === limitingConstraint.id)
      : undefined) ||
    (!positiveNetSavingsConstraint.passed
      ? positiveNetSavingsConstraint
      : undefined) ||
    recoveryUnsafeConstraint;

  if (holdConstraint) {
    return {
      recommended_chunk: 0,
      limiting_constraint_id: holdConstraint.id,
      limiting_constraint_label: holdConstraint.label,
      hold_reason: holdConstraint.id,
      projected_net_savings: projectedNetSavings,
      constraints,
      rationale: [
        `hold_reason:${holdConstraint.id}`,
        holdConstraint.detail,
        "Recommended chunk is 0 because the deterministic guardrails did not all pass.",
      ],
    };
  }

  return {
    recommended_chunk: candidateChunk,
    limiting_constraint_id: limitingConstraint.id,
    limiting_constraint_label: limitingConstraint.label,
    projected_net_savings: projectedNetSavings,
    constraints,
    rationale: [
      `limiting_constraint:${limitingConstraint.id}`,
      `Recommended chunk is ${candidateChunk}, limited by ${limitingConstraint.label}.`,
      `Projected net savings after source cost is ${projectedNetSavings}.`,
    ],
  };
}

function buildCashflowProjection(input: VelocityInputSnapshot, cashBalance: number) {
  const cashBuffer = finiteNumber(input.settings.cash_buffer);
  const projection = buildCashIntelligence({
    asOfDate: input.as_of_date ? new Date(`${input.as_of_date}T00:00:00`) : undefined,
    income: input.incomes,
    bills: input.bills.map((bill) => ({
      ...bill,
      nextDueDateOverride: bill.next_due_date,
    })),
    debtMinimums: getProjectionDebtMinimums(input.debts),
    settings: {
      currentCash: cashBalance,
      cashBuffer,
      emergencyReserveAmount: input.settings.minimum_cash_after_payment,
      lookaheadDays: 30,
    },
    guardrails: {
      minimumCashAfterPayment: input.settings.minimum_cash_after_payment,
    },
  });

  return {
    period_days: 30,
    starting_cash: cashBalance,
    projected_income: projection.monthlyIncome,
    projected_bills: projection.monthlyBills,
    projected_minimum_payments: projection.monthlyDebtMinimums,
    projected_cash_before_velocity_payment: money(
      cashBalance +
        projection.monthlyIncome -
        projection.monthlyBills -
        projection.monthlyDebtMinimums
    ),
    available_cash_above_buffer: money(
      Math.max(
        cashBalance +
          projection.monthlyIncome -
          projection.monthlyBills -
          projection.monthlyDebtMinimums -
          cashBuffer,
        0
      )
    ),
    assumptions: [
      "Projection uses a 30-day planning window.",
      "Income frequency is converted to a monthly estimate when provided.",
      "Bills and eligible debt minimum payments are treated as due within the projection window.",
    ],
  };
}

function buildConstraintResults(
  input: VelocityInputSnapshot,
  kind: VelocityCandidateKind,
  debt: VelocityDebtSnapshot | undefined,
  paymentAmount: number,
  projectedCashBeforePayment: number
): VelocityConstraintResult[] {
  const cashBuffer = finiteNumber(input.settings.cash_buffer);
  const minimumCashAfterPayment = finiteNumber(
    input.settings.minimum_cash_after_payment ?? cashBuffer
  );
  const maxRecommendedPayment = input.settings.max_recommended_payment;
  const projectedCashAfterPayment = money(projectedCashBeforePayment - paymentAmount);
  const configuredMax =
    maxRecommendedPayment != null && Number.isFinite(maxRecommendedPayment)
      ? Number(maxRecommendedPayment)
      : null;
  const requiresDebt = kind === "highest_apr" || kind === "lowest_balance";
  const hasEligibleDebt = Boolean(
    debt && !debt.is_archived && positiveNumber(debt.balance)
  );

  return [
    {
      id: "eligible_debt",
      label: "Eligible debt",
      passed: requiresDebt ? hasEligibleDebt : !debt || hasEligibleDebt,
      detail: !debt && !requiresDebt
        ? "No debt target is required for this candidate."
        : !debt
          ? "No eligible debt target is available for this payment candidate."
        : "Debt is active and has a positive balance.",
    },
    {
      id: "positive_velocity_payment",
      label: "Positive Velocity payment",
      passed: requiresDebt ? paymentAmount > 0 : true,
      detail: requiresDebt
        ? `Candidate payment is ${money(paymentAmount)}.`
        : "No positive velocity payment is required for this candidate.",
    },
    {
      id: "cash_buffer",
      label: "Cash buffer",
      passed: kind === "hold_cash" || projectedCashAfterPayment >= cashBuffer,
      detail: `Projected cash after payment is ${money(projectedCashAfterPayment)} against a ${money(cashBuffer)} buffer.`,
    },
    {
      id: "minimum_cash_after_payment",
      label: "Minimum cash after payment",
      passed:
        kind === "hold_cash" ||
        projectedCashAfterPayment >= minimumCashAfterPayment,
      detail: `Projected cash after payment is ${money(projectedCashAfterPayment)} against a ${money(minimumCashAfterPayment)} minimum.`,
    },
    {
      id: "max_recommended_payment",
      label: "Maximum recommended payment",
      passed: configuredMax == null || paymentAmount <= configuredMax,
      detail:
        configuredMax == null
          ? "No max recommended payment is configured."
          : `Candidate payment is ${money(paymentAmount)} against a ${money(configuredMax)} maximum.`,
    },
  ];
}

function getLowestBalanceDebt(debts: VelocityDebtSnapshot[]) {
  return [...debts].sort((a, b) => {
    const balanceCompare = finiteNumber(a.balance) - finiteNumber(b.balance);
    if (balanceCompare !== 0) return balanceCompare;

    return finiteNumber(b.interest_rate) - finiteNumber(a.interest_rate);
  })[0];
}

function getStrategyAlignment(
  kind: VelocityCandidateKind,
  strategy: VelocityInputSnapshot["settings"]["strategy"],
  paymentAmount: number,
  safePaymentCapacity: number
) {
  const paymentRatio =
    safePaymentCapacity > 0 ? Math.min(paymentAmount / safePaymentCapacity, 1) : 0;

  if (strategy === "aggressive") {
    if (kind === "highest_apr") return 25;
    if (kind === "lowest_balance") return 18;
    if (kind === "minimum_only") return 8;
    return safePaymentCapacity > 0 ? 4 : 22;
  }

  if (strategy === "balanced") {
    if (kind === "highest_apr") return 20;
    if (kind === "lowest_balance") return 20;
    if (kind === "minimum_only") return 14;
    return safePaymentCapacity > 0 ? 10 : 24;
  }

  if (kind === "highest_apr") return paymentRatio <= 0.6 ? 18 : 12;
  if (kind === "lowest_balance") return paymentRatio <= 0.6 ? 18 : 12;
  if (kind === "minimum_only") return 21;
  return safePaymentCapacity > 0 ? 15 : 25;
}

function scoreCandidate(
  kind: VelocityCandidateKind,
  debt: VelocityDebtSnapshot | undefined,
  paymentAmount: number,
  projectedCashAfterPayment: number,
  input: VelocityInputSnapshot,
  safePaymentCapacity: number
): VelocityScoreBreakdown {
  const cashBuffer = finiteNumber(input.settings.cash_buffer);
  const minimumCashAfterPayment = finiteNumber(
    input.settings.minimum_cash_after_payment ?? cashBuffer
  );
  const safetyFloor = Math.max(cashBuffer, minimumCashAfterPayment);
  const liquidityMargin = Math.max(projectedCashAfterPayment - safetyFloor, 0);
  const liquiditySafety = money(
    Math.min(30, 10 + (safePaymentCapacity > 0 ? (liquidityMargin / safePaymentCapacity) * 20 : 20))
  );
  const interestPriority = debt
    ? money(Math.min(25, (finiteNumber(debt.interest_rate) / 30) * 25))
    : kind === "hold_cash"
      ? 4
      : 0;
  const strategyAlignment = getStrategyAlignment(
    kind,
    input.settings.strategy || "balanced",
    paymentAmount,
    safePaymentCapacity
  );
  const riskReduction = debt
    ? money(Math.min(20, (paymentAmount / Math.max(finiteNumber(debt.balance), 1)) * 100))
    : kind === "hold_cash"
      ? safePaymentCapacity <= 0
        ? 18
        : 5
      : 8;
  const holdCashPenalty = kind === "hold_cash" && safePaymentCapacity > 0 ? 12 : 0;
  const total = money(
    interestPriority + liquiditySafety + strategyAlignment + riskReduction - holdCashPenalty
  );

  return {
    interest_priority: interestPriority,
    liquidity_safety: liquiditySafety,
    strategy_alignment: strategyAlignment,
    risk_reduction: riskReduction,
    total,
  };
}

function buildCandidate(
  input: VelocityInputSnapshot,
  id: string,
  label: string,
  kind: VelocityCandidateKind,
  debt: VelocityDebtSnapshot | undefined,
  paymentAmount: number,
  projectedCashBeforePayment: number,
  safePaymentCapacity: number,
  rationale: string[],
  assumptions: string[]
): VelocityCandidateEvaluation {
  const cappedPayment = money(Math.min(paymentAmount, debt?.balance ?? paymentAmount));
  const projectedCashAfterPayment = money(projectedCashBeforePayment - cappedPayment);
  const constraints = buildConstraintResults(
    input,
    kind,
    debt,
    cappedPayment,
    projectedCashBeforePayment
  );
  const isViable = constraints.every((constraint) => constraint.passed);
  const scoreBreakdown = isViable
    ? scoreCandidate(
        kind,
        debt,
        cappedPayment,
        projectedCashAfterPayment,
        input,
        safePaymentCapacity
      )
    : {
        interest_priority: 0,
        liquidity_safety: 0,
        strategy_alignment: 0,
        risk_reduction: 0,
        total: 0,
      };

  return {
    id,
    label,
    kind,
    debt_id: debt?.id,
    debt_name: debt?.name,
    payment_amount: cappedPayment,
    projected_cash_after_payment: projectedCashAfterPayment,
    risk_level: getRiskLevel(cappedPayment, safePaymentCapacity),
    is_viable: isViable,
    constraints,
    score: scoreBreakdown.total,
    score_breakdown: scoreBreakdown,
    rationale,
    assumptions,
  };
}

function generateCandidates(
  input: VelocityInputSnapshot,
  debts: VelocityDebtSnapshot[],
  targetDebt: VelocityDebtSnapshot | undefined,
  projectedCashBeforePayment: number,
  safePaymentCapacity: number
) {
  const lowestBalanceDebt = getLowestBalanceDebt(debts);
  const paymentAmount = safePaymentCapacity;
  const sharedAssumptions = [
    "Candidate payments are one-time velocity payments above scheduled minimums.",
    "Candidates are generated only from active debts with positive balances.",
  ];

  return [
    buildCandidate(
      input,
      "minimum-only",
      "Pay scheduled minimums only",
      "minimum_only",
      undefined,
      0,
      projectedCashBeforePayment,
      safePaymentCapacity,
      ["Preserves cash after projected bills and minimum debt payments."],
      sharedAssumptions
    ),
    buildCandidate(
      input,
      "highest-apr-payment",
      "Pay highest APR eligible debt",
      "highest_apr",
      targetDebt,
      paymentAmount,
      projectedCashBeforePayment,
      safePaymentCapacity,
      ["Prioritizes the eligible debt with the highest interest rate."],
      sharedAssumptions
    ),
    buildCandidate(
      input,
      "lowest-balance-payment",
      "Pay lowest balance eligible debt",
      "lowest_balance",
      lowestBalanceDebt,
      paymentAmount,
      projectedCashBeforePayment,
      safePaymentCapacity,
      ["Prioritizes reducing account count by attacking the lowest balance."],
      sharedAssumptions
    ),
    buildCandidate(
      input,
      "hold-cash",
      "Hold cash",
      "hold_cash",
      undefined,
      0,
      projectedCashBeforePayment,
      safePaymentCapacity,
      [
        safePaymentCapacity > 0
          ? "Keeps liquidity available instead of making a velocity payment."
          : "Avoids a velocity payment because cash constraints are not satisfied.",
      ],
      sharedAssumptions
    ),
  ];
}

function getConfidence(
  validationErrors: string[],
  targetDebt: VelocityDebtSnapshot | undefined,
  availableCash: number
): VelocityConfidence {
  if (validationErrors.length > 0 || !targetDebt || availableCash <= 0) return "low";
  if (targetDebt.interest_rate > 0 && targetDebt.minimum_payment > 0) return "high";
  return "medium";
}

function buildRecommendation(
  candidate: VelocityCandidateEvaluation | undefined,
  confidence: VelocityConfidence
): VelocityRecommendation | undefined {
  if (!candidate) return undefined;

  return {
    id: candidate.id,
    label: candidate.label,
    kind: candidate.kind,
    debt_id: candidate.debt_id,
    debt_name: candidate.debt_name,
    payment_amount: candidate.payment_amount,
    reason: candidate.rationale[0] || "Deterministic velocity candidate selected by score.",
    confidence,
    score: candidate.score,
    score_breakdown: candidate.score_breakdown,
    rationale: candidate.rationale,
    assumptions: candidate.assumptions,
    projected_cash_after_payment: candidate.projected_cash_after_payment,
  };
}

function buildAlternatives(
  candidates: VelocityCandidateEvaluation[],
  selectedCandidate: VelocityCandidateEvaluation | undefined
): VelocityAlternative[] {
  return candidates
    .filter((candidate) => candidate.is_viable && candidate.id !== selectedCandidate?.id)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      kind: candidate.kind,
      debt_id: candidate.debt_id,
      debt_name: candidate.debt_name,
      payment_amount: candidate.payment_amount,
      reason: candidate.rationale[0] || "Alternative deterministic velocity candidate.",
      risk_level: candidate.risk_level,
      score: candidate.score,
      score_breakdown: candidate.score_breakdown,
      rationale: candidate.rationale,
      assumptions: candidate.assumptions,
      projected_cash_after_payment: candidate.projected_cash_after_payment,
    }));
}

export function runVelocityEngine(input: VelocityInputSnapshot): VelocityEngineResult {
  const validationErrors = validateInput(input);
  const isValid = validationErrors.length === 0;

  const cashBalance = isValid ? getCashBalance(input) : 0;
  const cashflowProjection = isValid
    ? buildCashflowProjection(input, cashBalance)
    : {
        period_days: 30,
        starting_cash: 0,
        projected_income: 0,
        projected_bills: 0,
        projected_minimum_payments: 0,
        projected_cash_before_velocity_payment: 0,
        available_cash_above_buffer: 0,
        assumptions: ["Projection was skipped because validation failed."],
      };
  const availableCashAboveBuffer = cashflowProjection.available_cash_above_buffer;
  const eligibleDebts = isValid ? getEligibleDebts(input.debts) : [];
  const targetDebt = getHighestAprDebt(eligibleDebts);
  const chunkRecommendation = isValid
    ? buildChunkRecommendation(input, eligibleDebts, targetDebt, cashflowProjection)
    : undefined;
  const candidatePaymentCapacity = chunkRecommendation?.recommended_chunk || 0;
  const candidateEvaluations = isValid
    ? generateCandidates(
        input,
        eligibleDebts,
        targetDebt,
        cashflowProjection.projected_cash_before_velocity_payment,
        candidatePaymentCapacity
      )
    : [];
  const viableCandidates = candidateEvaluations.filter((candidate) => candidate.is_viable);
  const selectedCandidate = [...viableCandidates].sort((a, b) => {
    const scoreCompare = b.score - a.score;
    if (scoreCompare !== 0) return scoreCompare;

    return a.payment_amount - b.payment_amount;
  })[0];

  const riskLevel = selectedCandidate
    ? selectedCandidate.risk_level
    : getRiskLevel(0, availableCashAboveBuffer);
  const confidence = getConfidence(validationErrors, targetDebt, availableCashAboveBuffer);
  const recommendation = buildRecommendation(selectedCandidate, confidence);
  const alternatives = buildAlternatives(candidateEvaluations, selectedCandidate);
  const recoveryTimeline = isValid
    ? buildRecoveryTimeline(input, recommendation?.payment_amount || 0)
    : undefined;
  const interestSavings = isValid
    ? buildInterestSavings(input, eligibleDebts, recommendation)
    : undefined;
  const failedConstraints = candidateEvaluations.flatMap((candidate) =>
    candidate.constraints.filter((constraint) => !constraint.passed)
  );

  const warnings: string[] = [];
  if (availableCashAboveBuffer <= 0) {
    warnings.push("No cash above buffer is available for a velocity payment.");
  }
  if (!targetDebt) {
    warnings.push("No eligible debt target was found.");
  }
  if (riskLevel === "high" && selectedCandidate && selectedCandidate.payment_amount > 0) {
    warnings.push("Recommended payment uses a large share of available cash above buffer.");
  }
  if (selectedCandidate?.kind === "hold_cash") {
    warnings.push("Engine selected hold cash because payment candidates scored lower or were unsafe.");
  }

  const rationale = recommendation?.rationale || [
    "No viable velocity recommendation was selected.",
  ];
  const assumptions = [
    ...cashflowProjection.assumptions,
    "Scoring is deterministic and does not call AI services.",
    "Archived and paid debts are excluded from payment candidates.",
    "Debt interest simulations use monthly APR accrual.",
    "Revolving minimums use the greater of configured minimum, percentage of current balance, and floor where provided.",
  ];

  if (eligibleDebts.some((debt) => finiteNumber(debt.interest_rate) <= 0)) {
    warnings.push("One or more active debts has a missing or zero APR, so interest savings may be understated.");
  }
  if (eligibleDebts.some((debt) => getEffectiveMinimumPayment(debt) <= 0)) {
    warnings.push("One or more active debts has no usable minimum payment, so payoff timing may be incomplete.");
  }

  return {
    is_valid: isValid,
    available_cash_above_buffer: availableCashAboveBuffer,
    target_debt: targetDebt,
    recommendation,
    alternatives,
    cashflow_projection: cashflowProjection,
    chunk_recommendation: chunkRecommendation,
    recovery_timeline: recoveryTimeline,
    interest_savings: interestSavings,
    constraints: failedConstraints,
    candidate_evaluations: candidateEvaluations,
    rationale,
    assumptions,
    risk_summary: {
      risk_level: riskLevel,
      confidence,
      reasons: recommendation ? rationale : ["No viable velocity candidate was selected."],
      warnings,
      assumptions,
    },
    validation_errors: validationErrors,
  };
}
