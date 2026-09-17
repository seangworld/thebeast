import { runUnifiedStrategyEngine, type PayoffDebt, type PayoffResult } from "./unifiedStrategyEngine";
import { roundMoney } from "./formatters";
import { normalizeCustomDebtOrder } from "./customDebtOrder";

export type ScenarioStrategy = "snowball" | "avalanche" | "custom";
export type ScenarioProjection = Pick<PayoffResult, "payoff_complete" | "total_interest" | "total_paid" | "debt_payment_schedule"> & { months_to_payoff: number | null };

export function normalizeScenarioOrder(debts: PayoffDebt[], order: string[]) {
  return normalizeCustomDebtOrder(debts, order);
}

export function comparePayoffScenarios(input: {
  debts: PayoffDebt[];
  current: ScenarioProjection;
  extraMonthly: number;
  lumpSum: number;
  customOrder: string[];
  recoveredMinimums?: number;
}) {
  const values = [input.extraMonthly, input.lumpSum, input.recoveredMinimums ?? 0];
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 1_000_000_000)) {
    throw new Error("Enter non-negative amounts no greater than $1 billion.");
  }
  if (input.debts.some(debt => [debt.balance, debt.minimum_payment, debt.interest_rate].some(value => !Number.isFinite(value) || value < 0))) {
    throw new Error("Correct invalid balances, minimums, or APRs in Debts before comparing.");
  }
  const order = normalizeScenarioOrder(input.debts, input.customOrder);
  return (["snowball", "avalanche", "custom"] as const).map(strategy => {
    const result = runUnifiedStrategyEngine({
      debts: input.debts, strategy, extraPayment: roundMoney(input.extraMonthly),
      lumpSumPayment: roundMoney(input.lumpSum), customDebtOrder: order,
      recoveredMinimums: input.recoveredMinimums ?? 0,
    });
    const comparable = result.payoff_complete && input.current.payoff_complete && input.current.months_to_payoff !== null;
    return {
      strategy, result,
      interestSaved: comparable ? roundMoney(input.current.total_interest - result.total_interest) : null,
      monthsSaved: comparable ? input.current.months_to_payoff! - result.months_to_payoff : null,
    };
  });
}
