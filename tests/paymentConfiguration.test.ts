import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  describePaymentConfiguration,
  normalizePaymentConfiguration,
  parseFundingAccount,
  paymentFundingStrategies,
  serializeFundingAccount,
} from "../src/lib/paymentConfiguration";

test("BM-309 keeps payment account funding account and strategy distinct", () => {
  const configuration = normalizePaymentConfiguration({
    payment_account_id: "checking",
    funding_account_type: "account",
    funding_account_id: "heloc",
    funding_strategy_id: "velocity_banking",
  });

  assert.deepEqual(configuration, {
    paymentAccountId: "checking",
    fundingAccountType: "account",
    fundingAccountId: "heloc",
    strategyId: "velocity_banking",
    migratedFromLegacy: false,
  });
  assert.equal(
    describePaymentConfiguration({
      paymentAccountName: "Checking",
      fundingAccountName: "HELOC",
      strategyId: configuration.strategyId,
    }),
    "The payment drafts from Checking, but the funds originate from HELOC using Velocity Banking."
  );
});

test("BM-309 maps legacy funding source assignments without losing their IDs", () => {
  assert.deepEqual(normalizePaymentConfiguration({ funding_source_id: "legacy" }), {
    paymentAccountId: "legacy",
    fundingAccountType: "account",
    fundingAccountId: "legacy",
    strategyId: "direct_payment",
    migratedFromLegacy: true,
  });
});

test("BM-309 strategies are configuration-driven and extensible", () => {
  assert.deepEqual(
    paymentFundingStrategies.map((strategy) => strategy.id),
    [
      "direct_payment",
      "velocity_banking",
      "automatic_transfer",
      "split_funding",
      "manual_transfer",
    ]
  );
  assert.equal(serializeFundingAccount("income_pot", "2026-08-01"), "income_pot:2026-08-01");
  assert.deepEqual(parseFundingAccount("income_pot:2026-08-01"), {
    type: "income_pot",
    id: "2026-08-01",
  });
});

test("BM-309 UI replaces the assignment field with an accessible payment setup", () => {
  const control = readFileSync(
    "src/app/dashboard/money/cashflow/components/PaymentConfigurationControl.tsx",
    "utf8"
  );
  const bills = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillsSection.tsx",
    "utf8"
  );
  const debts = readFileSync(
    "src/app/dashboard/money/cashflow/components/DebtsSection.tsx",
    "utf8"
  );

  for (const label of ["Payment Account", "Funding Account", "Funding Strategy"]) {
    assert.match(control, new RegExp(label));
  }
  assert.match(control, /paymentFundingStrategies\.map/);
  assert.match(control, /optgroup label="Income Pots"/);
  assert.match(bills, /PaymentConfigurationControl/);
  assert.match(debts, /PaymentConfigurationControl/);
  assert.doesNotMatch(bills, />Funding Source</);
  assert.doesNotMatch(debts, />Funding Source</);
});

test("BM-309 migration is additive and backfills every payment surface", () => {
  const migration = readFileSync(
    "supabase/migrations/20260723000100_add_payment_configuration.sql",
    "utf8"
  );

  for (const table of [
    "bill_events",
    "debts",
    "bill_payments",
    "debt_payments",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table}`));
    assert.match(migration, new RegExp(`update public\\.${table}`));
  }
  assert.match(migration, /add column if not exists payment_account_id/);
  assert.match(migration, /add column if not exists funding_account_type/);
  assert.match(migration, /add column if not exists funding_account_id/);
  assert.match(migration, /add column if not exists funding_strategy_id/);
  assert.match(migration, /coalesce\(funding_account_id, funding_source_id::text\)/);
  assert.doesNotMatch(migration, /drop column/i);
});

test("Money Coach consumes configured payment workflows", () => {
  const coach = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  const workspace = readFileSync(
    "src/app/dashboard/money/components/MoneyWorkspacePage.tsx",
    "utf8"
  );

  assert.match(coach, /Current payment workflows/);
  assert.match(coach, /context\.paymentConfigurations/);
  assert.match(coach, /payment account\|funding account\|funding strategy/);
  assert.match(workspace, /describePaymentConfiguration/);
  assert.match(workspace, /normalizePaymentConfiguration/);
});
