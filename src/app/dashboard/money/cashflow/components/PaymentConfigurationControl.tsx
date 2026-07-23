"use client";

import {
  assessPaymentConfiguration,
  normalizePaymentConfiguration,
  parseFundingAccount,
  paymentFundingStrategies,
  serializeFundingAccount,
  type PaymentConfigurationRecord,
} from "@/lib/paymentConfiguration";
import { OverlayPopover } from "./OverlayPopover";

type PaymentConfigurationControlProps = {
  label: string;
  record: PaymentConfigurationRecord;
  accounts: readonly { id: string; name: string; type?: string }[];
  incomePots: readonly { date: string; dropdownLabel: string }[];
  onChange: (patch: {
    payment_account_id?: string | null;
    funding_account_type?: "account" | "income_pot" | null;
    funding_account_id?: string | null;
    funding_strategy_id?: string;
  }) => void;
};

export function PaymentConfigurationControl({
  label,
  record,
  accounts,
  incomePots,
  onChange,
}: PaymentConfigurationControlProps) {
  const configuration = normalizePaymentConfiguration(record);
  const paymentAccount =
    accounts.find((account) => account.id === configuration.paymentAccountId)
      ?.name || "Payment account";
  const strategy =
    paymentFundingStrategies.find(
      (item) => item.id === configuration.strategyId
    )?.label || "Payment setup";
  const accountTypes = Object.fromEntries(
    accounts.map((account) => [account.id, account.type || ""])
  );
  const issues = assessPaymentConfiguration(record, accountTypes);

  return (
    <OverlayPopover
      label={`${paymentAccount} · ${strategy}`}
      width={300}
      testId="payment-configuration"
    >
      {() => (
        <fieldset className="grid min-w-0 gap-3 text-left">
          <legend className="sr-only">{label}</legend>
          <p className="text-xs leading-5 text-slate-400">
            Choose where the draft leaves, where its money originated, and how
            that money reached the draft account.
          </p>
          <label className="grid gap-1 text-xs font-bold text-slate-300">
            Payment Account
            <select
              aria-label={`${label} payment account`}
              className="beast-input min-h-11"
              value={configuration.paymentAccountId || ""}
              onChange={(event) =>
                onChange({ payment_account_id: event.target.value || null })
              }
            >
              <option value="">Select draft account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-bold text-slate-300">
            Funding Account
            <select
              aria-label={`${label} funding account`}
              className="beast-input min-h-11"
              value={serializeFundingAccount(
                configuration.fundingAccountType,
                configuration.fundingAccountId
              )}
              onChange={(event) => {
                const funding = parseFundingAccount(event.target.value);
                onChange({
                  funding_account_type: funding.type,
                  funding_account_id: funding.id,
                });
              }}
            >
              <option value="">Select origin account</option>
              <optgroup label="Accounts">
                {accounts.map((account) => (
                  <option key={account.id} value={`account:${account.id}`}>
                    {account.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Income Pots">
                {incomePots.map((pot) => (
                  <option key={pot.date} value={`income_pot:${pot.date}`}>
                    {pot.dropdownLabel}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-bold text-slate-300">
            Funding Strategy
            <select
              aria-label={`${label} funding strategy`}
              className="beast-input min-h-11"
              value={configuration.strategyId}
              onChange={(event) =>
                onChange({ funding_strategy_id: event.target.value })
              }
            >
              {paymentFundingStrategies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {issues.length ? (
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3">
              <p className="text-xs font-bold text-amber-100">Configuration review</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-300">
                {issues.map((issue) => (
                  <li key={issue.code}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-emerald-300">
              Payment workflow is fully identified.
            </p>
          )}
        </fieldset>
      )}
    </OverlayPopover>
  );
}
