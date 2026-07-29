import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isLocalWorkspaceNavigationActive,
} from "../src/lib/localWorkspaceNavigation";
import {
  beastMoneyCoreNavigation,
  moneyManagementWorkspaces,
} from "../src/lib/moneyNavigation";

const source = (path: string) => readFileSync(path, "utf8");

test("BP-401 highlights exactly one active local financial workspace", () => {
  for (const activeItem of moneyManagementWorkspaces) {
    const activeItems = moneyManagementWorkspaces.filter((item) =>
      isLocalWorkspaceNavigationActive(item, activeItem.href)
    );
    assert.deepEqual(activeItems, [activeItem]);
  }

  assert.equal(
    moneyManagementWorkspaces.some((item) =>
      isLocalWorkspaceNavigationActive(item, "/dashboard/money/cashflow")
    ),
    false
  );
});

test("BP-401 gives Bills, Debts, and Payoff Plan unique focused routes", () => {
  assert.deepEqual(moneyManagementWorkspaces, [
    { label: "Bills", href: "/dashboard/money/bills" },
    { label: "Debts", href: "/dashboard/money/debts" },
    { label: "Payoff Plan", href: "/dashboard/money/payoff-plan" },
  ]);
  assert.equal(
    new Set(moneyManagementWorkspaces.map((item) => item.href)).size,
    moneyManagementWorkspaces.length
  );

  for (const workspace of moneyManagementWorkspaces) {
    assert.ok(
      beastMoneyCoreNavigation.some(
        (item) =>
          item.label === workspace.label && item.href === workspace.href
      )
    );
  }
});

test("BP-401 shared navigation is accessible and responsive without page overflow", () => {
  const navigation = source(
    "src/app/components/navigation/LocalWorkspaceNavigation.tsx"
  );

  assert.match(navigation, /aria-label=\{label\}/);
  assert.match(navigation, /aria-current=\{active \? "page"/);
  assert.match(navigation, /ArrowRight/);
  assert.match(navigation, /ArrowLeft/);
  assert.match(navigation, /event\.preventDefault\(\)/);
  assert.match(navigation, /focus-visible:outline/);
  assert.match(navigation, /max-w-full overflow-x-auto overscroll-x-contain/);
  assert.match(navigation, /flex min-w-max/);
  assert.doesNotMatch(navigation, /overflow-x-hidden/);
});

test("BP-401 places the shared navigation on every focused workspace", () => {
  const cashFlow = source("src/app/dashboard/money/cashflow/page.tsx");
  const debts = source("src/app/dashboard/money/debts/page.tsx");
  const billsRoute = source("src/app/dashboard/money/bills/page.tsx");
  const payoffRoute = source(
    "src/app/dashboard/money/payoff-plan/page.tsx"
  );

  assert.match(cashFlow, /view === "bills"[\s\S]*<MoneyManagementNavigation/);
  assert.match(debts, /<MoneyManagementNavigation/);
  assert.match(debts, /view === "debts"/);
  assert.match(debts, /view === "payoff-plan"/);
  assert.match(billsRoute, /export \{ default \} from "\.\.\/cashflow\/page"/);
  assert.match(payoffRoute, /export \{ default \} from "\.\.\/debts\/page"/);
});

test("BP-401 preserves legacy Bills and Payoff Plan deep links", () => {
  const cashFlow = source("src/app/dashboard/money/cashflow/page.tsx");
  const debts = source("src/app/dashboard/money/debts/page.tsx");

  assert.match(cashFlow, /window\.location\.hash === "#bills"/);
  assert.match(cashFlow, /router\.replace\("\/dashboard\/money\/bills"\)/);
  assert.match(debts, /legacyHash === "#strategy-comparison"/);
  assert.match(debts, /legacyHash === "#payoff-plan"/);
  assert.match(
    debts,
    /router\.replace\(`\/dashboard\/money\/payoff-plan\$\{legacyHash\}`\)/
  );
});

test("BP-401 keeps financial workspace ownership focused", () => {
  const cashFlow = source("src/app/dashboard/money/cashflow/page.tsx");
  const debts = source("src/app/dashboard/money/debts/page.tsx");
  const archivedBills = source(
    "src/app/dashboard/money/cashflow/components/ArchivedItemsSection.tsx"
  );

  assert.match(cashFlow, /view === "bills"[\s\S]*<BillsSection/);
  assert.match(cashFlow, /view === "bills"[\s\S]*<ArchivedItemsSection/);
  assert.doesNotMatch(archivedBills, /Archived Debts/);
  assert.match(debts, /view === "debts"[\s\S]*Add Debt/);
  assert.match(debts, /view === "debts"[\s\S]*Debt List/);
  assert.match(debts, /view === "payoff-plan"[\s\S]*Strategy Comparison/);
  assert.match(debts, /view === "payoff-plan"[\s\S]*Payoff Plan/);
});
