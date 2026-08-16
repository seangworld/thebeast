export type DebtLifecycleStatus =
  | "active_balance"
  | "open_zero_balance"
  | "paid_off_closed"
  | "archived";

export type DebtLifecycleSource =
  | "beast_payment"
  | "outside_payment"
  | "reconciliation"
  | "manual_correction"
  | "scheduled_payment"
  | "payment_reversal"
  | "manual_archive"
  | "manual_restore";

export type DebtLifecycleInput = {
  balance: number | null | undefined;
  paymentBehavior?: "fixed" | "revolving" | null;
  isArchived?: boolean | null;
  currentStatus?: DebtLifecycleStatus | null;
  source: DebtLifecycleSource;
  effectiveDate: string;
  paymentPending?: boolean;
  reconciliationComplete?: boolean;
  reminderEnabled?: boolean | null;
  reminderEnabledBeforePayoff?: boolean | null;
  lifecycleAutoArchived?: boolean | null;
};

export type DebtLifecycleResolution = {
  status: DebtLifecycleStatus;
  changed: boolean;
  reason: string;
  update: Record<string, string | number | boolean | null>;
};

export type DebtLifecycleRecord = {
  balance?: number | string | null;
  payment_behavior?: "fixed" | "revolving" | null;
  is_archived?: boolean | null;
  lifecycle_status?: DebtLifecycleStatus | null;
};

export function getDebtLifecycleLabel(status: DebtLifecycleStatus) {
  if (status === "active_balance") return "Active Balance";
  if (status === "open_zero_balance") return "Open — Zero Balance";
  if (status === "paid_off_closed") return "Paid Off / Closed";
  return "Archived";
}

export function getDebtLifecycleStatus(debt: DebtLifecycleRecord): DebtLifecycleStatus {
  if (debt.lifecycle_status === "archived") return "archived";
  if (
    debt.is_archived &&
    !(
      debt.lifecycle_status === "paid_off_closed" &&
      debt.payment_behavior !== "revolving"
    )
  ) {
    return "archived";
  }

  const balanceKnown = debt.balance !== null && debt.balance !== undefined && Number.isFinite(Number(debt.balance));
  if (balanceKnown) {
    if (Number(debt.balance) > 0) return "active_balance";
    if (debt.payment_behavior === "revolving" || debt.lifecycle_status === "open_zero_balance") {
      return "open_zero_balance";
    }
    return "paid_off_closed";
  }

  return debt.lifecycle_status || "active_balance";
}

export function isDebtOpen(debt: DebtLifecycleRecord) {
  const status = getDebtLifecycleStatus(debt);
  return status === "active_balance" || status === "open_zero_balance";
}

export function isDebtPayoffEligible(debt: DebtLifecycleRecord) {
  return isDebtOpen(debt) && Number(debt.balance || 0) > 0;
}

export function isDebtArchivedOrClosed(debt: DebtLifecycleRecord) {
  return !isDebtOpen(debt);
}

export function resolveDebtLifecycle(input: DebtLifecycleInput): DebtLifecycleResolution {
  const current = input.currentStatus || (input.isArchived ? "archived" : "active_balance");
  if (input.balance == null || !Number.isFinite(Number(input.balance))) {
    return { status: current, changed: false, reason: "Balance is unknown.", update: {} };
  }
  if (input.paymentPending) {
    return { status: current, changed: false, reason: "Payment is still pending.", update: {} };
  }
  if (input.source === "reconciliation" && input.reconciliationComplete === false) {
    return { status: current, changed: false, reason: "Reconciliation is incomplete.", update: {} };
  }

  const balance = Math.max(Number(input.balance), 0);
  if (input.source === "manual_archive") {
    return { status: "archived", changed: current !== "archived", reason: "Member archived the account.", update: { lifecycle_status: "archived", is_archived: true, archived_at: input.effectiveDate, lifecycle_auto_archived: false } };
  }
  if (input.source === "manual_restore") {
    const status = balance > 0 ? "active_balance" : input.paymentBehavior === "revolving" ? "open_zero_balance" : "paid_off_closed";
    return { status, changed: status !== current, reason: "Member restored the account.", update: { lifecycle_status: status, is_archived: false, archived_at: null, lifecycle_auto_archived: false } };
  }
  if (balance > 0) {
    const reopening = current === "paid_off_closed" || current === "open_zero_balance" || Boolean(input.lifecycleAutoArchived);
    const update: DebtLifecycleResolution["update"] = {
      lifecycle_status: "active_balance",
      is_archived: reopening ? false : Boolean(input.isArchived),
      paid_off_at: null,
      closed_at: null,
      lifecycle_auto_archived: false,
      reminder_enabled: input.reminderEnabledBeforePayoff ?? input.reminderEnabled ?? true,
      reminder_enabled_before_payoff: null,
    };
    if (reopening) update.archived_at = null;
    return {
      status: "active_balance",
      changed: current !== "active_balance" || Boolean(input.isArchived),
      reason: input.source === "payment_reversal" ? "A reversed payment restored an outstanding balance." : "Canonical balance is above zero.",
      update,
    };
  }
  if (input.paymentBehavior === "revolving") {
    return {
      status: "open_zero_balance",
      changed: current !== "open_zero_balance" || Boolean(input.isArchived),
      reason: "The revolving account is open with a zero balance.",
      update: { lifecycle_status: "open_zero_balance", is_archived: false, paid_off_at: input.effectiveDate, closed_at: null, archived_at: null, lifecycle_auto_archived: false, next_due_date_after_payment: null, assigned_income_date: null },
    };
  }
  return {
    status: "paid_off_closed",
    changed: current !== "paid_off_closed" || !input.isArchived,
    reason: "The fixed debt reached a confirmed zero balance.",
    update: { lifecycle_status: "paid_off_closed", is_archived: true, paid_off_at: input.effectiveDate, closed_at: input.effectiveDate, archived_at: input.effectiveDate, lifecycle_auto_archived: true, reminder_enabled: false, reminder_enabled_before_payoff: input.reminderEnabled ?? true, next_due_date_after_payment: null, assigned_income_date: null },
  };
}
