export const BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE =
  "Payments are temporarily unavailable while BeastMoney is being updated.";

export type BeastMoneyPaymentWriteStatus = {
  restricted: boolean;
  paymentsAvailable: boolean;
  acceptanceException: boolean;
};

export type BeastMoneyPaymentWriteStatusClient = {
  rpc: (
    name: string,
    args?: Record<string, never>
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

const unavailableStatus: BeastMoneyPaymentWriteStatus = {
  restricted: true,
  paymentsAvailable: false,
  acceptanceException: false,
};

export function normalizeBeastMoneyPaymentWriteStatus(
  value: unknown
): BeastMoneyPaymentWriteStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return unavailableStatus;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.restricted !== "boolean" ||
    typeof record.payments_available !== "boolean" ||
    typeof record.acceptance_exception !== "boolean"
  ) {
    return unavailableStatus;
  }

  return {
    restricted: record.restricted,
    paymentsAvailable: record.payments_available,
    acceptanceException: record.acceptance_exception,
  };
}

export async function loadBeastMoneyPaymentWriteStatus(
  client: BeastMoneyPaymentWriteStatusClient
): Promise<BeastMoneyPaymentWriteStatus> {
  const { data, error } = await client.rpc(
    "get_beastmoney_payment_write_status"
  );
  if (error) return unavailableStatus;
  return normalizeBeastMoneyPaymentWriteStatus(data);
}
