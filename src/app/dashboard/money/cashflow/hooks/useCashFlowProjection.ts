import { buildCashIntelligence } from "@/lib/cashIntelligence";
import { useCallback } from "react";
import { normalizeDebtStrategy } from "@/lib/debtStrategies";
import {
  addDays,
  addMonthsClamped,
  getCurrentBillCycleDueDate,
  getCurrentDebtCycleDueDate,
  getFrequencyMonthStep,
  getTargetDebt,
} from "../cashflowUtils";

type BuildProjectionInput = {
  userId: string;
  cycleMonth: string;
  incomeRows: any[] | null;
  billRows: any[] | null;
  paymentRows: any[] | null;
  debtPaymentRows: any[] | null;
  debtRows: any[] | null;
  cashSettings: any;
  debtSettings: any;
};

export function useCashFlowProjection() {
  const buildProjection = useCallback(function buildProjection({
    userId,
    cycleMonth,
    incomeRows,
    billRows,
    paymentRows,
    debtPaymentRows,
    debtRows,
    cashSettings,
    debtSettings,
  }: BuildProjectionInput) {
    const activeLookahead = Number(cashSettings?.lookahead_days ?? 30);
    const activeAssignmentHorizon = Number(
      cashSettings?.assignment_horizon_months ?? 6
    );
    const activeBuffer = Number(cashSettings?.checking_buffer ?? 500);
    const activeStartingBalance = Number(cashSettings?.starting_balance ?? 500);

    const activeStrategy = normalizeDebtStrategy(debtSettings?.strategy);
    const activeExtraPayment = Number(debtSettings?.extra_payment || 0);

    const activeDebtRows = (debtRows || []).filter(
      (debt) => !Boolean(debt.is_archived)
    );
    const targetDebt = getTargetDebt(activeDebtRows, activeStrategy);

    const activePayments = paymentRows || [];
    const activeDebtPayments = debtPaymentRows || [];

    const paymentTotals: Record<string, number> = {};
    for (const payment of activePayments) {
      paymentTotals[payment.bill_id] =
        Number(paymentTotals[payment.bill_id] || 0) +
        Number(payment.amount_paid || 0);
    }

    const debtPaymentTotals: Record<string, number> = {};
    for (const payment of activeDebtPayments) {
      const key = `${payment.debt_id}||${payment.cycle_due_date}`;
      debtPaymentTotals[key] =
        Number(debtPaymentTotals[key] || 0) + Number(payment.amount || 0);
    }

    const debtsForTimeline = (activeDebtRows || []).map((debt) => {
      const minimumPayment = Number(debt.minimum_payment || 0);
      const currentCycleDueDate = getCurrentDebtCycleDueDate(debt);
      const cycleKey = `${debt.id}||${currentCycleDueDate
        .toISOString()
        .slice(0, 10)}`;
      const isCurrentCyclePaid =
        Number(debtPaymentTotals[cycleKey] || 0) >= minimumPayment;

      return {
        ...debt,
        minimum_payment: minimumPayment,
        due_date: Number(debt.due_date || 1),
        frequency: "monthly",
        nextDueDateOverride: isCurrentCyclePaid
          ? addMonthsClamped(currentCycleDueDate, 1)
          : currentCycleDueDate,
      };
    });

    const billsForTimeline = (billRows || [])
      .filter((bill) => !Boolean(bill.is_archived))
      .map((bill) => {
        const amount = Number(bill.amount || 0);
        const paid = Number(paymentTotals[bill.id] || 0);
        const remaining = Math.max(amount - paid, 0);
        const frequency = bill.frequency || "monthly";
        const currentCycleDueDate = getCurrentBillCycleDueDate(
          bill,
          cycleMonth
        );
        let nextDueDateOverride = currentCycleDueDate;

        if (remaining <= 0 && !bill.next_due_date_after_payment) {
          nextDueDateOverride =
            frequency === "weekly"
              ? addDays(currentCycleDueDate, 7)
              : frequency === "biweekly"
              ? addDays(currentCycleDueDate, 14)
              : addMonthsClamped(
                  currentCycleDueDate,
                  getFrequencyMonthStep(frequency)
                );
        }

        return {
          ...bill,
          amount: remaining > 0 ? remaining : amount,
          frequency,
          nextDueDateOverride,
        };
      })
      .filter((bill) => Number(bill.amount || 0) > 0);

    const extraAttackBill =
      targetDebt && activeExtraPayment > 0
        ? [
            {
              id: "extra-debt-attack",
              user_id: userId,
              name: `Planned Extra Debt Payment ${targetDebt.name}`,
              amount: activeExtraPayment,
              due_date: Number(targetDebt.due_date || 1),
              frequency: "monthly",
              is_debt: true,
            },
          ]
        : [];

    const cashIntelligence = buildCashIntelligence({
      income: incomeRows || [],
      bills: [...billsForTimeline, ...extraAttackBill],
      debtMinimums: debtsForTimeline,
      settings: {
        currentCash: activeStartingBalance,
        cashBuffer: activeBuffer,
        lookaheadDays: activeLookahead,
      },
    });

    return {
      activeLookahead,
      activeAssignmentHorizon,
      activeBuffer,
      activeStartingBalance,
      activeStrategy,
      activeExtraPayment,
      targetDebt,
      activePayments,
      activeDebtPayments,
      cashIntelligence,
      builtTimeline: cashIntelligence.timeline,
      simulated: cashIntelligence.simulatedTimeline,
      requiredCash: cashIntelligence.requiredCash,
      billsDue: cashIntelligence.billsDue,
      incomeExpected: cashIntelligence.incomeExpected,
    };
  }, []);

  return { buildProjection };
}
