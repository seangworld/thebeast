import {
  classifyClientDiagnosticError,
  type ClientDiagnosticErrorCategory,
} from "./clientDiagnostics";
import type { DebtPaymentAction } from "./debtManagement";

type RpcResult = {
  data: unknown;
  error: unknown;
};

export type FinancialCommandClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
};

export type AtomicFinancialCommandResult = {
  status: "succeeded";
  operationId: string;
  paymentId: string;
  recordedAmount: number;
  balanceAfter?: number;
  nextDueDate: string | null;
  lifecycleStatus?: string;
  replayed: boolean;
};

export class AtomicFinancialCommandError extends Error {
  readonly category: ClientDiagnosticErrorCategory;

  constructor(category: ClientDiagnosticErrorCategory) {
    super("The financial command could not be completed.");
    this.name = "AtomicFinancialCommandError";
    this.category = category;
  }
}

function randomUuidFallback() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function createFinancialOperationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return randomUuidFallback();
}

function requiredString(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    throw new AtomicFinancialCommandError("unknown_error");
  }
  return value;
}

function optionalNumber(value: unknown) {
  if (value == null) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new AtomicFinancialCommandError("unknown_error");
  }
  return number;
}

function parseResult(data: unknown): AtomicFinancialCommandResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new AtomicFinancialCommandError("unknown_error");
  }

  const result = data as Record<string, unknown>;
  const recordedAmount = Number(result.recorded_amount);
  if (!Number.isFinite(recordedAmount)) {
    throw new AtomicFinancialCommandError("unknown_error");
  }

  return {
    status: "succeeded",
    operationId: requiredString(result.operation_id),
    paymentId: requiredString(result.payment_id),
    recordedAmount,
    balanceAfter: optionalNumber(result.balance_after),
    nextDueDate:
      typeof result.next_due_date === "string" ? result.next_due_date : null,
    lifecycleStatus:
      typeof result.lifecycle_status === "string"
        ? result.lifecycle_status
        : undefined,
    replayed: result.replayed === true,
  };
}

async function invoke(
  client: FinancialCommandClient,
  name: string,
  args: Record<string, unknown>
) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new AtomicFinancialCommandError(
      classifyClientDiagnosticError(error)
    );
  }
  return parseResult(data);
}

export function recordBillPaymentAtomic(
  client: FinancialCommandClient,
  input: {
    operationId: string;
    billId: string;
    amount: number;
    paymentDate: string;
    cycleMonth: string;
  }
) {
  return invoke(client, "record_bill_payment_atomic", {
    p_operation_id: input.operationId,
    p_bill_id: input.billId,
    p_amount: input.amount,
    p_payment_date: input.paymentDate,
    p_cycle_month: input.cycleMonth,
  });
}

export function recordDebtPaymentAtomic(
  client: FinancialCommandClient,
  input: {
    operationId: string;
    debtId: string;
    amount: number;
    paymentDate: string;
    cycleDueDate: string;
    fundingSourceId: string | null;
    notes: string;
    actionType: DebtPaymentAction;
  }
) {
  return invoke(client, "record_debt_payment_atomic", {
    p_operation_id: input.operationId,
    p_debt_id: input.debtId,
    p_amount: input.amount,
    p_payment_date: input.paymentDate,
    p_cycle_due_date: input.cycleDueDate,
    p_funding_source_id: input.fundingSourceId,
    p_notes: input.notes || null,
    p_action_type: input.actionType,
  });
}

export function reverseDebtPaymentAtomic(
  client: FinancialCommandClient,
  input: {
    operationId: string;
    paymentId: string;
    reason: string;
  }
) {
  return invoke(client, "reverse_debt_payment_atomic", {
    p_operation_id: input.operationId,
    p_payment_id: input.paymentId,
    p_reason: input.reason,
  });
}
