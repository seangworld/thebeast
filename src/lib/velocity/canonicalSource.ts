import type { VelocityPageSettingsInput } from "./adapter";
import type { FinancialEvent, FinancialMemoryRecord } from "../moneyIntelligence/types";

export type CanonicalVelocityDebt = {
  id: string;
  user_id?: string | null;
  name: string;
  balance: number | string | null;
  credit_limit?: number | string | null;
  available_credit?: number | string | null;
  interest_rate: number | string | null;
  minimum_payment: number | string | null;
  due_date?: number | string | null;
  auto_pay_enabled?: boolean | null;
  reminder_enabled?: boolean | null;
  is_archived?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type VelocitySourceResolution =
  | { status: "unselected"; source: null; message: string }
  | { status: "missing" | "archived" | "ineligible"; source: CanonicalVelocityDebt | null; message: string }
  | { status: "ready"; source: CanonicalVelocityDebt; message: string };

export function isEligibleVelocityDebt(debt: CanonicalVelocityDebt) {
  return !debt.is_archived && Number(debt.credit_limit || 0) > 0;
}

export function resolveCanonicalVelocitySource(
  selectedDebtId: string | null | undefined,
  ownerId: string,
  debts: readonly CanonicalVelocityDebt[]
): VelocitySourceResolution {
  if (!selectedDebtId) return { status: "unselected", source: null, message: "Select an eligible HELOC from BeastMoney Debts." };
  const debt = debts.find((item) => item.id === selectedDebtId && item.user_id === ownerId);
  if (!debt) return { status: "missing", source: null, message: "The selected HELOC is no longer available. Choose another account; your planning settings are preserved." };
  if (debt.is_archived) return { status: "archived", source: debt, message: "The selected HELOC is archived. Restore it or choose another eligible account." };
  if (!isEligibleVelocityDebt(debt)) return { status: "ineligible", source: debt, message: "The selected debt is not currently eligible as a Velocity credit source." };
  return { status: "ready", source: debt, message: "Current account values loaded from BeastMoney Debts." };
}

export function canonicalDebtToVelocitySettings(
  debt: CanonicalVelocityDebt,
  planning: Pick<VelocityPageSettingsInput, "max_utilization_percent" | "recovery_months" | "emergency_reserve_amount" | "allow_super_velocity">
): VelocityPageSettingsInput {
  return {
    source_debt_id: debt.id,
    source_name: debt.name,
    velocity_source_type: "heloc",
    credit_limit: debt.credit_limit ?? 0,
    current_balance: debt.balance,
    source_apr: debt.interest_rate,
    ...planning,
  };
}

export function deriveCanonicalAvailableCredit(debt: CanonicalVelocityDebt) {
  return Math.max(Number(debt.credit_limit || 0) - Number(debt.balance || 0), 0);
}

export function buildCanonicalVelocityChangeEvidence(
  ownerId: string,
  before: CanonicalVelocityDebt,
  after: CanonicalVelocityDebt,
  observedAt = new Date().toISOString()
): { event: FinancialEvent; memory: FinancialMemoryRecord; explanation: string } | null {
  if (!ownerId || before.user_id !== ownerId || after.user_id !== ownerId || before.id !== after.id) {
    throw new Error("Canonical Velocity change evidence must remain owner scoped to one debt.");
  }
  const labels: string[] = [];
  if (Number(before.balance) !== Number(after.balance)) labels.push(`balance changed from $${Number(before.balance).toFixed(2)} to $${Number(after.balance).toFixed(2)}`);
  if (Number(before.credit_limit) !== Number(after.credit_limit)) labels.push(`credit limit changed from $${Number(before.credit_limit || 0).toFixed(2)} to $${Number(after.credit_limit || 0).toFixed(2)}`);
  if (Number(before.interest_rate) !== Number(after.interest_rate)) labels.push(`APR changed from ${Number(before.interest_rate).toFixed(2)}% to ${Number(after.interest_rate).toFixed(2)}%`);
  if (!labels.length) return null;
  const id = `account.synced:velocity:${after.id}:${observedAt}`;
  const explanation = `Your ${after.name} ${labels.join("; ")}. Available credit and the current Velocity projection were recalculated.`;
  const event: FinancialEvent = { id, ownerId, type: "account.synced", occurredAt: observedAt, observedAt, source: { providerId: "beastmoney-debts", accountId: after.id }, payload: { debtId: after.id, changes: labels, paymentConfirmed: false } };
  const memory: FinancialMemoryRecord = { id: `memory:${id}`, ownerId, kind: "explanation", summary: explanation, evidenceEventIds: [id], confidence: "high", createdAt: observedAt, updatedAt: observedAt };
  return { event, memory, explanation };
}
