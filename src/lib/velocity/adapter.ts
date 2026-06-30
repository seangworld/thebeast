import type {
  VelocityAccountSnapshot,
  VelocityBillSnapshot,
  VelocityDebtSnapshot,
  VelocityIncomeSnapshot,
  VelocityInputSnapshot,
} from "./types";

type VelocitySourceType = "heloc" | "ploc" | "credit_card" | "other";

export type VelocityPageDebtInput = {
  id?: string;
  name: string;
  balance: number | string | null;
  minimum_payment: number | string | null;
  interest_rate: number | string | null;
  due_date?: number | string | null;
  is_archived?: boolean | null;
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
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  return {
    id: debt.id,
    name: debt.name,
    balance: toNumber(debt.balance),
    minimum_payment: toNumber(debt.minimum_payment),
    interest_rate: toNumber(debt.interest_rate),
    due_date: toOptionalDueDay(debt.due_date),
    is_archived: debt.is_archived,
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

  // UI mismatch: the current Velocity page has a single starting cash value,
  // not normalized cash accounts. Represent it as one checking account for now.
  const accounts = [
    buildCashAccount(input),
    buildCreditSourceAccount(input.velocity_settings),
  ];

  // UI mismatch: max utilization and recovery months are page-level guardrails,
  // but the first engine skeleton only accepts generic payment constraints.
  const maxUtilizationPercent = toNumber(
    input.velocity_settings.max_utilization_percent
  );
  const creditLimit = toNumber(input.velocity_settings.credit_limit);
  const currentBalance = toNumber(input.velocity_settings.current_balance);
  const utilizationLimit = creditLimit * (maxUtilizationPercent / 100);
  const safeCreditAvailable = Math.max(
    utilizationLimit - currentBalance - emergencyReserve,
    0
  );

  // UI mismatch: extra attack is recovery capacity, not cash on hand. For now,
  // pass it as a conservative max payment cap rather than inventing income data.
  const maxRecommendedPayment =
    extraAttack > 0
      ? Math.min(extraAttack, safeCreditAvailable || extraAttack)
      : safeCreditAvailable || null;

  return {
    as_of_date: input.as_of_date,
    accounts,
    incomes: (input.incomes || []).map(buildIncomeSnapshot),
    bills: (input.bills || []).map(buildBillSnapshot),
    debts: input.debts.map(buildDebtSnapshot),
    settings: {
      cash_buffer: cashBuffer,
      max_recommended_payment: maxRecommendedPayment,
      minimum_cash_after_payment: emergencyReserve,
      strategy: input.velocity_settings.allow_super_velocity
        ? "aggressive"
        : "conservative",
    },
  };
}
