import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { beastMoneyCoreNavigation, isBeastMoneyNavigationActive } from "../src/lib/moneyNavigation";

test("Funding Sources has a discoverable navigation destination", () => {
  const item = beastMoneyCoreNavigation.find((entry) => entry.label === "Funding Sources");
  assert.deepEqual(item, {
    label: "Funding Sources",
    href: "/dashboard/money/cashflow#funding-sources",
    parent: "Cash Flow",
  });
  assert.ok(isBeastMoneyNavigationActive(item!, "/dashboard/money/cashflow", "#funding-sources"));
  const component = readFileSync("src/app/dashboard/money/cashflow/components/FundingSourcesSection.tsx", "utf8");
  assert.match(component, /id="funding-sources"/);
  assert.match(component, /Payment &amp; Funding Accounts/);
});
test("Settings links to existing funding accounts and Velocity emergency reserve controls", () => {
  const settings = readFileSync("src/app/dashboard/money/settings/page.tsx", "utf8");
  const velocity = readFileSync("src/app/dashboard/money/velocity/page.tsx", "utf8");
  assert.match(settings, /href="\/dashboard\/money\/cashflow#funding-sources"/);
  assert.match(settings, /href="\/dashboard\/money\/velocity#velocity-guardrails"/);
  assert.match(velocity, /id="velocity-guardrails"/);
  assert.match(velocity, /velocitySettings\.emergency_reserve_amount/);
  assert.match(settings, /not a separate HELOC-specific buffer/);
  assert.match(settings, /checking_buffer: Number\(buffer\)/);
});

test("Velocity surfaces owner-scoped unlinked HELOC funding sources without treating them as debt", () => {
  const source = readFileSync("src/app/dashboard/money/velocity/page.tsx", "utf8");
  assert.match(source, /\.from\("funding_sources"\)/);
  assert.match(source, /\.eq\("user_id", userId\)/);
  assert.match(source, /\.in\("type", \["heloc", "ploc"\]\)/);
  assert.match(source, /unlinkedCreditSources\.map/);
  assert.match(source, /not used in Velocity calculations until the account records are reconciled/);
  assert.match(source, /Do not add a duplicate HELOC/);
  assert.match(source, /fundingSourceLoadError/);
  assert.match(source, /href="\/dashboard\/money\/cashflow#funding-sources"/);
});

test("Funding Sources can link HELOC balances to their canonical debt records", () => {
  const component = readFileSync("src/app/dashboard/money/cashflow/components/FundingSourcesSection.tsx", "utf8");
  const hook = readFileSync("src/app/dashboard/money/cashflow/useCashFlow.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20261127120000_sync_linked_funding_source_balance.sql", "utf8");

  assert.match(component, /aria-label="Link funding account to a debt"/);
  assert.match(component, /aria-label=\{`Balance source for \$\{source\.name\}`\}/);
  assert.match(hook, /linked_debt_id: linkedDebtId/);
  assert.match(hook, /\.eq\("user_id", userId\)/);
  assert.match(migration, /after update of balance on public\.debts/i);
  assert.match(migration, /available_credit = case/i);
  assert.match(migration, /where user_id = new\.user_id\s+and linked_debt_id = new\.id/i);
});

test("Velocity reloads saved balances when the page becomes visible again", () => {
  const velocity = readFileSync("src/app/dashboard/money/velocity/page.tsx", "utf8");
  assert.match(velocity, /addEventListener\("focus", refreshWhenVisible\)/);
  assert.match(velocity, /addEventListener\("visibilitychange", refreshWhenVisible\)/);
});
