import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Money cockpit includes first-run and load-failure guidance", () => {
  const source = readFileSync("src/app/dashboard/money/page.tsx", "utf8");

  assert.match(source, /Money could not load/);
  assert.match(source, /Build your first Money plan/);
  assert.match(source, /Add Money Records/);
  assert.match(source, /aria-label="Simulation date"/);
});

test("BeastMoney primary pages use the shared module shell", () => {
  const shell = readFileSync("src/app/dashboard/money/BeastMoneyShell.tsx", "utf8");
  const pages = [
    "src/app/dashboard/money/page.tsx",
    "src/app/dashboard/money/cashflow/page.tsx",
    "src/app/dashboard/money/debts/page.tsx",
    "src/app/dashboard/money/velocity/page.tsx",
    "src/app/dashboard/money/billing/page.tsx",
    "src/app/dashboard/money/settings/page.tsx",
  ];

  assert.match(shell, /beast-module-tabs/);
  assert.match(shell, /ModuleBadge module="money"/);
  assert.match(shell, /\/dashboard\/money\/cashflow/);
  assert.match(shell, /\/dashboard\/money\/cashflow#bills/);
  assert.match(shell, /\/dashboard\/money\/debts/);
  assert.match(shell, /\/dashboard\/money\/debts#payoff-plan/);
  assert.match(shell, /\/dashboard\/money\/velocity/);
  assert.match(shell, /money-page-stack/);

  for (const page of pages) {
    const source = readFileSync(page, "utf8");

    assert.match(source, /BeastMoneyShell/);
  }
});

test("BeastMoney internal pages use dashboard-aligned Money surfaces", () => {
  const globalStyles = readFileSync("src/app/globals.css", "utf8");
  const standardizedSources = [
    "src/app/dashboard/money/cashflow/page.tsx",
    "src/app/dashboard/money/cashflow/components/AddIncomeBillSection.tsx",
    "src/app/dashboard/money/cashflow/components/BillsSection.tsx",
    "src/app/dashboard/money/debts/page.tsx",
    "src/app/dashboard/money/velocity/page.tsx",
    "src/app/dashboard/money/billing/page.tsx",
    "src/app/dashboard/money/settings/page.tsx",
  ];

  for (const className of [
    "money-page-stack",
    "money-section-card",
    "money-section-panel",
    "money-section-header",
    "money-summary-grid",
    "money-field-grid",
  ]) {
    assert.match(globalStyles, new RegExp(`\\.${className}`));
  }

  assert.match(globalStyles, /\.money-section-card::before/);
  assert.match(globalStyles, /\.money-page-stack \.beast-card::before/);
  assert.match(globalStyles, /\.money-summary-grid > \.money-section-card/);

  for (const sourcePath of standardizedSources) {
    const source = readFileSync(sourcePath, "utf8");

    assert.match(source, /money-page-stack|money-section-card|money-section-panel/);
    assert.doesNotMatch(source, /beast-button-primary/);
    assert.doesNotMatch(source, /text-xl font-bold/);
  }

  const addBill = readFileSync(
    "src/app/dashboard/money/cashflow/components/AddIncomeBillSection.tsx",
    "utf8"
  );
  const bills = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillsSection.tsx",
    "utf8"
  );
  const debts = readFileSync("src/app/dashboard/money/debts/page.tsx", "utf8");

  assert.match(addBill, /id="add-bill" className="money-section-card"/);
  assert.match(bills, /id="bills" className="money-section-panel"/);
  assert.match(debts, /id="add-debt" className="money-section-card"/);
  assert.match(debts, /id="payoff-plan" className="money-section-panel"/);
});
