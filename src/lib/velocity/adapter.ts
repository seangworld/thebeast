import type {
  VelocityAccountSnapshot,
  VelocityBillSnapshot,
  VelocityDebtSnapshot,
  VelocityIncomeSnapshot,
  VelocityInputSnapshot,
} from "./types";
import { buildCashIntelligence } from "../cashIntelligence";
import { parseNumber } from "../formatters";
import type { VelocitySourceType } from "./settings";

export type VelocityPageDebtInput = {
  id?: string;
  name: string;
  balance: number | string | null;
  minimum_payment: number | string | null;
  interest_rate: number | string | null;
  due_date?: number | string | null;
  is_archived?: boolean | null;
  payment_behavior?: "fixed" | "revolving";
  minimum_payment_rate?: number | string | null;
  minimum_payment_floor?: number | string | null;
};

export type VelocityPageIncomeInput = {
  id?: string;
  name: string;
  amount: number | string | null;
  next_date?: string | null;
  frequency?: string | null;
};

export type VelocityPageBillInput = {
  id?: string;
  name: string;
  amount: number | string | null;
  due_date?: number | string | null;
  next_due_date_after_payment?: string | null;
  frequency?: string | null;
  is_archived?: boolean | null;
};

export type VelocityPageSettingsInput = {
  velocity_source_type: VelocitySourceType;
  credit_limit: number | string | null;
  current_balance: number | string | null;
  source_apr: number | string | null;
  max_utilization_percent: number | string | null;
  recovery_months: number | string | null;
  emergency_reserve_amount: number | string | null;
  allow_super_velocity: boolean;
};

export type BuildVelocityInputSnapshotInput = {
  as_of_date?: string;
  debts: VelocityPageDebtInput[];
  incomes?: VelocityPageIncomeInput[];
  bills?: VelocityPageBillInput[];
  velocity_settings: VelocityPageSettingsInput;
  starting_balance: number | string | null;
  cash_buffer: number | string | null;
  extra_attack: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  return parseNumber(value);
}

function toOptionalDueDay(value: number | string | null | undefined) {
  if (value == null || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapVelocitySourceType(type: VelocitySourceType): VelocityAccountSnapshot["type"] {
  if (type === "heloc" || type === "ploc" || type === "credit_card") {
    return type;
  }

  return "other";
}

function buildCashAccount(input: BuildVelocityInputSnapshotInput): VelocityAccountSnapshot {
  return {
    id: "velocity-ui-cash-position",
    name: "Current cash position",
    type: "checking",
    current_balance: toNumber(input.starting_balance),
  };
}

function buildCreditSourceAccount(
  settings: VelocityPageSettingsInput
): VelocityAccountSnapshot {
  const creditLimit = toNumber(settings.credit_limit);
  const currentBalance = toNumber(settings.current_balance);

  return {
    id: "velocity-ui-credit-source",
    name: "Velocity credit source",
    type: mapVelocitySourceType(settings.velocity_source_type),
    current_balance: currentBalance,
    credit_limit: creditLimit,
    available_credit: Math.max(creditLimit - currentBalance, 0),
    interest_rate: toNumber(settings.source_apr),
  };
}

function buildDebtSnapshot(debt: VelocityPageDebtInput): VelocityDebtSnapshot {
  const paymentBehavior =
    debt.payment_behavior === "fixed" || debt.payment_behavior === "revolving"
      ? debt.payment_behavior
      : undefined;

  return {
    id: debt.id,
    name: debt.name,
    balance: toNumber(debt.balance),
    minimum_payment: toNumber(debt.minimum_payment),
    interest_rate: toNumber(debt.interest_rate),
    due_date: toOptionalDueDay(debt.due_date),
    is_archived: debt.is_archived,
    ...(paymentBehavior ? { payment_behavior: paymentBehavior } : {}),
    ...(debt.minimum_payment_rate != null && debt.minimum_payment_rate !== ""
      ? { minimum_payment_rate: toNumber(debt.minimum_payment_rate) }
      : {}),
    ...(debt.minimum_payment_floor != null && debt.minimum_payment_floor !== ""
      ? { minimum_payment_floor: toNumber(debt.minimum_payment_floor) }
      : {}),
  };
}

function buildIncomeSnapshot(income: VelocityPageIncomeInput): VelocityIncomeSnapshot {
  return {
    id: income.id,
    name: income.name,
    amount: toNumber(income.amount),
    next_date: income.next_date,
    frequency: income.frequency,
  };
}

function buildBillSnapshot(bill: VelocityPageBillInput): VelocityBillSnapshot {
  return {
    id: bill.id,
    name: bill.name,
    amount: toNumber(bill.amount),
    due_date: toOptionalDueDay(bill.due_date),
    next_due_date: bill.next_due_date_after_payment,
    is_archived: bill.is_archived,
  };
}

export function buildVelocityInputSnapshot(
  input: BuildVelocityInputSnapshotInput
): VelocityInputSnapshot {
  const cashBuffer = toNumber(input.cash_buffer);
  const emergencyReserve = toNumber(
    input.velocity_settings.emergency_reserve_amount
  );
  const extraAttack = toNumber(input.extra_attack);
  const startingBalance = toNumber(input.starting_balance);
  const currentMonthlySurplus = startingBalance - cashBuffer;

  // UI mismatch: the current Velocity page has a single starting cash value,
  // not normalized cash accounts. Represent it as one checking account for now.
  const accounts = [
    buildCashAccount(input),
    buildCreditSourceAccount(input.velocity_settings),
  ];

  const maxUtilizationPercent = toNumber(
    input.velocity_settings.max_utilization_percent
  );
  const creditLimit = toNumber(input.velocity_settings.credit_limit);
  const currentBalance = toNumber(input.velocity_settings.current_balance);
  const cashIntelligence = buildCashIntelligence({
    asOfDate: input.as_of_date ? new Date(`${input.as_of_date}T00:00:00`) : undefined,
    income: input.incomes || [],
    bills: input.bills || [],
    debtMinimums: input.debts,
    fundingSources: [
      {
        id: "velocity-ui-credit-source",
        current_balance: currentBalance,
        credit_limit: creditLimit,
        max_utilization_percent: maxUtilizationPercent,
        is_active: true,
      },
    ],
    settings: {
      currentCash: startingBalance,
      cashBuffer,
      emergencyReserveAmount: emergencyReserve,
      lookaheadDays: 30,
    },
    guardrails: {
      minimumCashAfterPayment: emergencyReserve,
      maxSourceUtilizationPercent: maxUtilizationPercent,
    },
  });
  const monthlyRecoveryCapacity =
    currentMonthlySurplus > 0
      ? currentMonthlySurplus
      : extraAttack > 0
        ? extraAttack
        : 0;
  const maxRecommendedPayment = cashIntelligence.safeFundingSourceCapacity || null;

  return {
    as_of_date: input.as_of_date,
    accounts,
    incomes: (input.incomes || []).map(buildIncomeSnapshot),
    bills: (input.bills || []).map(buildBillSnapshot),
    debts: input.debts.map(buildDebtSnapshot),
    settings: {
      cash_buffer: cashBuffer,
      max_recommended_payment: maxRecommendedPayment,
      max_source_utilization_percent: maxUtilizationPercent,
      minimum_cash_after_payment: emergencyReserve,
      monthly_recovery_capacity: monthlyRecoveryCapacity,
      recovery_months: toNumber(input.velocity_settings.recovery_months),
      strategy: input.velocity_settings.allow_super_velocity
        ? "aggressive"
        : "conservative",
    },
  };
}
