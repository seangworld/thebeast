import {
  buildCashTimeline,
  calculateBillsDue,
  calculateIncomeExpected,
  calculateRequiredCash,
  simulateCashFlow,
  type CashEvent,
  type SimulatedCashEvent,
} from "./cashflow";
import { normalizeRecurringAmountToMonthly, numberValue } from "./financialMetrics";

export type CashIntelligenceIncome = {
  id?: string;
  name?: string | null;
  amount?: number | string | null;
  frequency?: string | null;
  next_date?: string | null;
  is_active?: boolean | null;
  is_archived?: boolean | null;
};

export type CashIntelligenceBill = {
  id?: string;
  name?: string | null;
  amount?: number | string | null;
  frequency?: string | null;
  due_date?: number | string | null;
  nextDueDateOverride?: Date | string | null;
  is_archived?: boolean | null;
};

export type CashIntelligenceDebt = {
  id?: string;
  name?: string | null;
  balance?: number | string | null;
  minimum_payment?: number | string | null;
  due_date?: number | string | null;
  nextDueDateOverride?: Date | string | null;
  is_archived?: boolean | null;
};

export type CashIntelligenceScheduledTransfer = {
  id?: string;
  name?: string | null;
  amount?: number | string | null;
  frequency?: string | null;
  due_date?: number | string | null;
  next_date?: string | null;
  is_active?: boolean | null;
  is_archived?: boolean | null;
};

export type CashIntelligenceSavings = {
  id?: string;
  name?: string | null;
  balance?: number | string | null;
  monthly_contribution?: number | string | null;
  target_reserve?: number | string | null;
  reserve_amount?: number | string | null;
  is_emergency_reserve?: boolean | null;
  is_active?: boolean | null;
  is_archived?: boolean | null;
};

export type CashIntelligenceFundingSource = {
  id?: string;
  name?: string | null;
  current_balance?: number | string | null;
  credit_limit?: number | string | null;
  available_credit?: number | string | null;
  max_utilization_percent?: number | string | null;
  is_active?: boolean | null;
};

export type CashIntelligenceGuardrails = {
  minimumCashAfterPayment?: number | string | null;
  maxSourceUtilizationPercent?: number | string | null;
  maxAttackAmount?: number | string | null;
};

export type CashIntelligenceSettings = {
  currentCash?: number | string | null;
  cashBuffer?: number | string | null;
  emergencyReserveAmount?: number | string | null;
  lookaheadDays?: number | string | null;
};

export type CashIntelligenceInput = {
  asOfDate?: Date;
  income?: CashIntelligenceIncome[];
  bills?: CashIntelligenceBill[];
  debtMinimums?: CashIntelligenceDebt[];
  scheduledTransfers?: CashIntelligenceScheduledTransfer[];
  savings?: CashIntelligenceSavings[];
  fundingSources?: CashIntelligenceFundingSource[];
  guardrails?: CashIntelligenceGuardrails;
  settings?: CashIntelligenceSettings;
};

export type CashIntelligenceResult = {
  currentAvailableCash: number;
  nextPaydayCash: number;
  monthlyAvailableCash: number;
  emergencyReserve: number;
  safeAttackAmount: number;
  projectedAvailableCash: number;
  requiredCash: number;
  billsDue: number;
  incomeExpected: number;
  monthlyIncome: number;
  monthlyBills: number;
  monthlyDebtMinimums: number;
  monthlyScheduledTransfers: number;
  monthlySavingsContributions: number;
  projectedCashBalance: number;
  safeFundingSourceCapacity: number;
  timeline: CashEvent[];
  simulatedTimeline: SimulatedCashEvent[];
  assumptions: string[];
};

function money(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function isActive(row: { is_active?: boolean | null; is_archived?: boolean | null }) {
  return row.is_active !== false && row.is_archived !== true;
}

function getEmergencySavingsReserve(savings: CashIntelligenceSavings[]) {
  return savings.filter(isActive).reduce((total, item) => {
    if (!item.is_emergency_reserve) return total;

    return Math.max(
      total,
      numberValue(item.target_reserve ?? item.reserve_amount ?? item.balance)
    );
  }, 0);
}

function getMonthlySavingsContributions(savings: CashIntelligenceSavings[]) {
  return savings.filter(isActive).reduce((total, item) => {
    return total + numberValue(item.monthly_contribution);
  }, 0);
}

function getTransferBill(transfer: CashIntelligenceScheduledTransfer) {
  return {
    id: transfer.id,
    name: transfer.name || "Scheduled transfer",
    amount: numberValue(transfer.amount),
    frequency: transfer.frequency || "monthly",
    due_date: transfer.due_date,
    nextDueDateOverride: transfer.next_date || undefined,
  };
}

function getProjectedBalance(simulatedTimeline: SimulatedCashEvent[], currentCash: number) {
  return simulatedTimeline.length > 0
    ? numberValue(simulatedTimeline[simulatedTimeline.length - 1]?.runningBalance)
    : currentCash;
}

function getNextPaydayCash(
  timeline: CashEvent[],
  simulatedTimeline: SimulatedCashEvent[],
  currentCash: number,
  emergencyReserve: number
) {
  const nextIncome = timeline.find((event) => event.type === "income");
  if (!nextIncome) return money(Math.max(currentCash - emergencyReserve, 0));

  const incomeTimestamp = nextIncome.date.getTime();
  const eventsThroughPayday = simulatedTimeline.filter(
    (event) => event.date.getTime() <= incomeTimestamp
  );
  const paydayEvent = eventsThroughPayday[eventsThroughPayday.length - 1];

  return money(Math.max(numberValue(paydayEvent?.runningBalance ?? currentCash) - emergencyReserve, 0));
}

function getSafeFundingSourceCapacity(
  fundingSources: CashIntelligenceFundingSource[],
  guardrails: CashIntelligenceGuardrails,
  emergencyReserve: number
) {
  return money(
    fundingSources.filter(isActive).reduce((total, source) => {
      const creditLimit = numberValue(source.credit_limit);
      if (creditLimit <= 0) return total;

      const currentBalance = numberValue(source.current_balance);
      const availableCredit = Math.max(
        numberValue(source.available_credit || creditLimit - currentBalance),
        0
      );
      const sourceMaxUtilization =
        numberValue(source.max_utilization_percent) ||
        numberValue(guardrails.maxSourceUtilizationPercent) ||
        100;
      const utilizationLimit = creditLimit * (sourceMaxUtilization / 100);
      const utilizationCapacity = Math.max(utilizationLimit - currentBalance, 0);

      return total + Math.max(Math.min(availableCredit, utilizationCapacity) - emergencyReserve, 0);
    }, 0)
  );
}

export function buildCashIntelligence(
  input: CashIntelligenceInput
): CashIntelligenceResult {
  const asOfDate = input.asOfDate || new Date();
  const income = (input.income || []).filter(isActive);
  const bills = (input.bills || []).filter(isActive);
  const debtMinimums = (input.debtMinimums || []).filter(isActive);
  const scheduledTransfers = (input.scheduledTransfers || []).filter(isActive);
  const savings = input.savings || [];
  const settings = input.settings || {};
  const guardrails = input.guardrails || {};

  const currentCash = numberValue(settings.currentCash);
  const cashBuffer = numberValue(settings.cashBuffer);
  const emergencyReserve = money(
    Math.max(
      numberValue(settings.emergencyReserveAmount),
      numberValue(guardrails.minimumCashAfterPayment),
      getEmergencySavingsReserve(savings)
    )
  );
  const liquidityFloor = Math.max(cashBuffer, emergencyReserve);
  const lookaheadDays = Math.max(numberValue(settings.lookaheadDays) || 30, 1);
  const transferBills = scheduledTransfers.map(getTransferBill);

  const timeline = buildCashTimeline({
    incomes: income,
    bills: [...bills, ...transferBills],
    debts: debtMinimums,
    startDate: asOfDate,
    days: lookaheadDays,
  });
  const simulatedTimeline = simulateCashFlow({
    timeline,
    startingBalance: currentCash,
    buffer: liquidityFloor,
  });

  const monthlyIncome = money(
    income.reduce(
      (total, item) =>
        total + normalizeRecurringAmountToMonthly(item.amount, item.frequency),
      0
    )
  );
  const monthlyBills = money(
    bills.reduce(
      (total, item) =>
        total + normalizeRecurringAmountToMonthly(item.amount, item.frequency),
      0
    )
  );
  const monthlyDebtMinimums = money(
    debtMinimums.reduce((total, item) => total + numberValue(item.minimum_payment), 0)
  );
  const monthlyScheduledTransfers = money(
    scheduledTransfers.reduce(
      (total, item) =>
        total + normalizeRecurringAmountToMonthly(item.amount, item.frequency),
      0
    )
  );
  const monthlySavingsContributions = money(getMonthlySavingsContributions(savings));
  const monthlyAvailableCash = money(
    monthlyIncome -
      monthlyBills -
      monthlyDebtMinimums -
      monthlyScheduledTransfers -
      monthlySavingsContributions
  );
  const requiredCash = money(calculateRequiredCash(timeline));
  const projectedCashBalance = money(getProjectedBalance(simulatedTimeline, currentCash));
  const projectedAvailableCash = money(
    Math.max(projectedCashBalance - liquidityFloor, 0)
  );
  const currentAvailableCash = money(
    Math.max(currentCash - liquidityFloor - requiredCash, 0)
  );
  const nextPaydayCash = getNextPaydayCash(
    timeline,
    simulatedTimeline,
    currentCash,
    liquidityFloor
  );
  const safeFundingSourceCapacity = getSafeFundingSourceCapacity(
    input.fundingSources || [],
    guardrails,
    emergencyReserve
  );
  const safeCashAttack = Math.min(
    currentAvailableCash,
    projectedAvailableCash,
    Math.max(monthlyAvailableCash, 0)
  );
  const maxAttackAmount = numberValue(guardrails.maxAttackAmount);
  const uncappedSafeAttackAmount = Math.max(
    safeCashAttack,
    safeFundingSourceCapacity
  );

  return {
    currentAvailableCash,
    nextPaydayCash,
    monthlyAvailableCash,
    emergencyReserve,
    safeAttackAmount: money(
      maxAttackAmount > 0
        ? Math.min(uncappedSafeAttackAmount, maxAttackAmount)
        : uncappedSafeAttackAmount
    ),
    projectedAvailableCash,
    requiredCash,
    billsDue: money(calculateBillsDue(timeline)),
    incomeExpected: money(calculateIncomeExpected(timeline)),
    monthlyIncome,
    monthlyBills,
    monthlyDebtMinimums,
    monthlyScheduledTransfers,
    monthlySavingsContributions,
    projectedCashBalance,
    safeFundingSourceCapacity,
    timeline,
    simulatedTimeline,
    assumptions: [
      `${lookaheadDays}-day cash window.`,
      "Bills, debt minimums, scheduled transfers, savings contributions, and guardrails reduce available cash.",
      "Safe attack amount preserves the emergency reserve and funding source utilization guardrails.",
    ],
  };
}
