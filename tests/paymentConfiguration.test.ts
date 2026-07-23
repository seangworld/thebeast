import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assessPaymentConfiguration,
  describePaymentConfiguration,
  isPaymentConfigurationComplete,
  normalizePaymentConfiguration,
  parseFundingAccount,
  paymentFundingStrategies,
  resolveFundingAccountId,
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

test("BM-309 validates direct Velocity and split workflows without hiding uncertainty", () => {
  const velocity = {
    payment_account_id: "checking",
    funding_account_type: "account" as const,
    funding_account_id: "heloc",
    funding_strategy_id: "velocity_banking",
  };
  assert.equal(isPaymentConfigurationComplete(velocity), true);
  assert.equal(resolveFundingAccountId(velocity), "heloc");
  assert.deepEqual(assessPaymentConfiguration(velocity, { heloc: "heloc" }), []);
  assert.equal(
    assessPaymentConfiguration(
      { ...velocity, funding_account_id: "savings" },
      { savings: "savings" }
    )[0]?.code,
    "velocity_requires_credit_origin"
  );
  assert.equal(
    assessPaymentConfiguration({
      ...velocity,
      funding_strategy_id: "split_funding",
    })[0]?.code,
    "split_funding_requires_details"
  );
  assert.equal(
    assessPaymentConfiguration({
      ...velocity,
      funding_strategy_id: "direct_payment",
    })[0]?.code,
    "direct_account_mismatch"
  );
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
  assert.match(control, /Configuration review/);
  assert.match(control, /Payment workflow is fully identified/);
  assert.match(bills, /PaymentConfigurationControl/);
  assert.match(debts, /PaymentConfigurationControl/);
  assert.match(bills, /lg:hidden/);
  assert.match(debts, /lg:hidden/);
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
  assert.match(coach, /Recommended improvements/);
  assert.match(coach, /reviewMessages/);
});

test("BM-309 integrates normalized workflows with Cash Flow Velocity Dashboard and observations", () => {
  const cashFlow = readFileSync(
    "src/app/dashboard/money/cashflow/page.tsx",
    "utf8"
  );
  const coverage = readFileSync(
    "src/app/dashboard/money/cashflow/components/PaymentSourceCoverage.tsx",
    "utf8"
  );
  const velocity = readFileSync(
    "src/app/dashboard/money/velocity/page.tsx",
    "utf8"
  );
  const dashboard = readFileSync(
    "src/app/dashboard/money/components/FinancialMissionControl.tsx",
    "utf8"
  );
  const observations = readFileSync(
    "src/lib/moneyCoachObservations.ts",
    "utf8"
  );

  assert.match(cashFlow, /normalizePaymentConfiguration\(record\)/);
  assert.match(cashFlow, /resolveFundingAccountId\(record\)/);
  assert.match(cashFlow, /isPaymentConfigurationComplete\(bill\)/);
  assert.match(coverage, /Funding Origin Coverage/);
  assert.match(coverage, /Income Pots Paid/);
  assert.match(velocity, /Velocity Funding Account/);
  assert.doesNotMatch(velocity, /label: "Funding Source"/);
  assert.match(dashboard, /Payment workflows/);
  assert.match(dashboard, /model\.paymentConfigurations\.velocity/);
  assert.match(observations, /money\.payment-configuration\.missing-inputs/);
  assert.match(observations, /money\.payment-configuration\.workflow-review/);
});

test("BM-309 keeps the Tool Registry and secondary obligation views aligned", () => {
  const tools = readFileSync("src/lib/platform/agents/tools.ts", "utf8");
  const ahead = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillsAheadSection.tsx",
    "utf8"
  );
  const archived = readFileSync(
    "src/app/dashboard/money/cashflow/components/ArchivedItemsSection.tsx",
    "utf8"
  );

  assert.match(tools, /Open Payment Configuration/);
  assert.match(ahead, /Payment Configuration/);
  assert.match(archived, /Payment Configuration/);
  assert.doesNotMatch(ahead, />Funding Source</);
  assert.doesNotMatch(archived, />Funding Source</);
});
