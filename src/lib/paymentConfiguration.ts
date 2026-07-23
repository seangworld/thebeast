export type PaymentFundingStrategyId =
  | "direct_payment"
  | "velocity_banking"
  | "automatic_transfer"
  | "split_funding"
  | "manual_transfer";

export type PaymentFundingStrategy = {
  id: PaymentFundingStrategyId | (string & {});
  label: string;
  description: string;
};

export const paymentFundingStrategies: readonly PaymentFundingStrategy[] = [
  {
    id: "direct_payment",
    label: "Direct Payment",
    description: "Funds are already in the account from which the payment drafts.",
  },
  {
    id: "velocity_banking",
    label: "Velocity Banking",
    description: "Funds originate from a credit line and move through the payment account.",
  },
  {
    id: "automatic_transfer",
    label: "Automatic Transfer",
    description: "An automatic transfer funds the payment account before the draft.",
  },
  {
    id: "split_funding",
    label: "Split Funding",
    description: "The payment is funded from more than one account or income pot.",
  },
  {
    id: "manual_transfer",
    label: "Manual Transfer",
    description: "The member manually moves funds into the payment account.",
  },
] as const;

export type PaymentConfigurationRecord = {
  payment_account_id?: string | null;
  funding_account_type?: "account" | "income_pot" | null;
  funding_account_id?: string | null;
  funding_strategy_id?: string | null;
  funding_source_id?: string | null;
};

export type PaymentConfiguration = {
  paymentAccountId: string | null;
  fundingAccountType: "account" | "income_pot" | null;
  fundingAccountId: string | null;
  strategyId: string;
  migratedFromLegacy: boolean;
};

export function normalizePaymentConfiguration(
  record: PaymentConfigurationRecord
): PaymentConfiguration {
  const legacyId = record.funding_source_id || null;
  return {
    paymentAccountId: record.payment_account_id ?? legacyId,
    fundingAccountType:
      record.funding_account_type ?? (legacyId ? "account" : null),
    fundingAccountId: record.funding_account_id ?? legacyId,
    strategyId:
      record.funding_strategy_id ??
      (legacyId ? "direct_payment" : "direct_payment"),
    migratedFromLegacy:
      Boolean(legacyId) &&
      !record.payment_account_id &&
      !record.funding_account_id &&
      !record.funding_strategy_id,
  };
}

export function getPaymentFundingStrategy(strategyId: string) {
  return (
    paymentFundingStrategies.find((strategy) => strategy.id === strategyId) || {
      id: strategyId,
      label: strategyId
        .split("_")
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
        .join(" "),
      description: "A configured payment funding workflow.",
    }
  );
}

export function describePaymentConfiguration({
  paymentAccountName,
  fundingAccountName,
  strategyId,
}: {
  paymentAccountName?: string | null;
  fundingAccountName?: string | null;
  strategyId: string;
}) {
  const strategy = getPaymentFundingStrategy(strategyId);
  if (paymentAccountName && fundingAccountName) {
    return `The payment drafts from ${paymentAccountName}, but the funds originate from ${fundingAccountName} using ${strategy.label}.`;
  }
  if (paymentAccountName) {
    return `The payment drafts from ${paymentAccountName} using ${strategy.label}.`;
  }
  if (fundingAccountName) {
    return `The funds originate from ${fundingAccountName} using ${strategy.label}; the payment account still needs to be identified.`;
  }
  return `This payment uses ${strategy.label}, but its payment and funding accounts are not fully configured.`;
}

export function serializeFundingAccount(
  type: PaymentConfiguration["fundingAccountType"],
  id: string | null
) {
  return type && id ? `${type}:${id}` : "";
}

export function parseFundingAccount(value: string) {
  const separator = value.indexOf(":");
  if (separator < 0) return { type: null, id: null } as const;
  const type = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if ((type !== "account" && type !== "income_pot") || !id) {
    return { type: null, id: null } as const;
  }
  return { type, id } as const;
}
