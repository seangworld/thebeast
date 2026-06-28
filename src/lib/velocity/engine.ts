import type {
  VelocityAlternative,
  VelocityConfidence,
  VelocityDebtSnapshot,
  VelocityEngineResult,
  VelocityInputSnapshot,
  VelocityRecommendation,
  VelocityRiskLevel,
} from "./types";

function money(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function positiveNumber(value: number) {
  return Number.isFinite(value) && value > 0;
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

function getRiskLevel(paymentAmount: number, availableCash: number): VelocityRiskLevel {
  if (!positiveNumber(paymentAmount) || !positiveNumber(availableCash)) return "high";

  const ratio = paymentAmount / availableCash;
  if (ratio <= 0.35) return "low";
  if (ratio <= 0.7) return "medium";
  return "high";
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

function getRecommendedPayment(input: VelocityInputSnapshot, availableCash: number) {
  const configuredMax = input.settings.max_recommended_payment;
  const minimumCashAfterPayment = input.settings.minimum_cash_after_payment ?? 0;
  const cashLimitedAmount = Math.max(availableCash - minimumCashAfterPayment, 0);
  const strategyMultiplier =
    input.settings.strategy === "aggressive"
      ? 0.75
      : input.settings.strategy === "conservative"
        ? 0.35
        : 0.5;

  const strategyLimitedAmount = availableCash * strategyMultiplier;
  const maxAllowed =
    configuredMax != null && Number.isFinite(configuredMax)
      ? Math.min(configuredMax, cashLimitedAmount, strategyLimitedAmount)
      : Math.min(cashLimitedAmount, strategyLimitedAmount);

  return money(Math.max(maxAllowed, 0));
}

function buildRecommendation(
  targetDebt: VelocityDebtSnapshot | undefined,
  paymentAmount: number,
  confidence: VelocityConfidence
): VelocityRecommendation | undefined {
  if (!targetDebt || paymentAmount <= 0) return undefined;

  return {
    id: "highest-apr-payment",
    label: "Pay highest APR eligible debt",
    debt_id: targetDebt.id,
    debt_name: targetDebt.name,
    payment_amount: money(Math.min(paymentAmount, targetDebt.balance)),
    reason: "Deterministic placeholder: targets the eligible debt with the highest APR.",
    confidence,
  };
}

function buildAlternatives(
  debts: VelocityDebtSnapshot[],
  targetDebt: VelocityDebtSnapshot | undefined,
  paymentAmount: number,
  availableCash: number
): VelocityAlternative[] {
  if (paymentAmount <= 0 || debts.length === 0) return [];

  const alternatives: VelocityAlternative[] = [];
  const bySmallestBalance = [...debts].sort(
    (a, b) => Number(a.balance || 0) - Number(b.balance || 0)
  )[0];
  const byLargestMinimum = [...debts].sort(
    (a, b) => Number(b.minimum_payment || 0) - Number(a.minimum_payment || 0)
  )[0];

  const addAlternative = (
    id: string,
    label: string,
    debt: VelocityDebtSnapshot | undefined,
    amount: number,
    reason: string
  ) => {
    if (!debt || alternatives.some((item) => item.debt_id === debt.id && item.id !== id)) {
      return;
    }

    alternatives.push({
      id,
      label,
      debt_id: debt.id,
      debt_name: debt.name,
      payment_amount: money(Math.min(amount, debt.balance)),
      reason,
      risk_level: getRiskLevel(amount, availableCash),
    });
  };

  addAlternative(
    "smallest-balance-payment",
    "Pay smallest eligible balance",
    bySmallestBalance,
    paymentAmount,
    "Placeholder alternative: favors faster account payoff momentum."
  );
  addAlternative(
    "largest-minimum-payment",
    "Pay largest minimum-payment debt",
    byLargestMinimum,
    paymentAmount,
    "Placeholder alternative: favors freeing future monthly minimum-payment pressure."
  );

  if (targetDebt && paymentAmount > targetDebt.minimum_payment) {
    addAlternative(
      "minimum-plus-payment",
      "Pay minimum plus safe extra",
      targetDebt,
      Math.max(targetDebt.minimum_payment, paymentAmount * 0.5),
      "Placeholder alternative: reduces payment size while still attacking the recommended target."
    );
  }

  return alternatives.slice(0, 3);
}

export function runVelocityEngine(input: VelocityInputSnapshot): VelocityEngineResult {
  const validationErrors = validateInput(input);
  const isValid = validationErrors.length === 0;

  const cashBalance = isValid ? getCashBalance(input) : 0;
  const cashBuffer = isValid ? Number(input.settings.cash_buffer || 0) : 0;
  const availableCashAboveBuffer = money(Math.max(cashBalance - cashBuffer, 0));
  const eligibleDebts = isValid ? getEligibleDebts(input.debts) : [];

  // Future full calculation: cashflow projection will model income and bill timing.
  // Future full calculation: constraint filtering will account for due dates, liquidity, and guardrails.
  const targetDebt = getHighestAprDebt(eligibleDebts);
  const basePaymentAmount = targetDebt
    ? Math.min(getRecommendedPayment(input, availableCashAboveBuffer), targetDebt.balance)
    : 0;

  // Future full calculation: candidate generation will build richer debt/source scenarios.
  const riskLevel = getRiskLevel(basePaymentAmount, availableCashAboveBuffer);
  const confidence = getConfidence(validationErrors, targetDebt, availableCashAboveBuffer);
  const recommendation = buildRecommendation(targetDebt, basePaymentAmount, confidence);

  // Future full calculation: scoring model will rank candidates by payoff speed, cash safety, and interest saved.
  const alternatives = buildAlternatives(
    eligibleDebts,
    targetDebt,
    basePaymentAmount,
    availableCashAboveBuffer
  );

  const warnings: string[] = [];
  if (availableCashAboveBuffer <= 0) {
    warnings.push("No cash above buffer is available for a velocity payment.");
  }
  if (!targetDebt) {
    warnings.push("No eligible debt target was found.");
  }
  if (riskLevel === "high" && basePaymentAmount > 0) {
    warnings.push("Recommended payment uses a large share of available cash above buffer.");
  }

  // Future full calculation: AI advisor formatting can translate engine output into coaching copy.
  return {
    is_valid: isValid,
    available_cash_above_buffer: availableCashAboveBuffer,
    target_debt: targetDebt,
    recommendation,
    alternatives,
    risk_summary: {
      risk_level: riskLevel,
      confidence,
      reasons: recommendation
        ? [recommendation.reason]
        : ["No payment recommendation produced by placeholder engine."],
      warnings,
    },
    validation_errors: validationErrors,
  };
}
