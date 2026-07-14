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
  assert.match(shell, /\/dashboard\/money\/debts/);
  assert.match(shell, /\/dashboard\/money\/velocity/);

  for (const page of pages) {
    const source = readFileSync(page, "utf8");

    assert.match(source, /BeastMoneyShell/);
  }
});
