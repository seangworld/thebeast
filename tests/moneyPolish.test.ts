import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Money cockpit includes first-run and load-failure guidance", () => {
  const source = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");

  assert.match(source, /Money could not load/);
  assert.match(source, /Build your first Money plan/);
  assert.match(source, /Add Money Records/);
  assert.match(source, /aria-label="Simulation date"/);
});

test("BeastMoney primary pages use the shared module shell", () => {
  const shell = readFileSync("src/app/dashboard/money/BeastMoneyShell.tsx", "utf8");
  const navigation = readFileSync("src/lib/moneyNavigation.ts", "utf8");
  const pages = [
    "src/app/dashboard/money/components/MoneyWorkspacePage.tsx",
    "src/app/dashboard/money/cashflow/page.tsx",
    "src/app/dashboard/money/debts/page.tsx",
    "src/app/dashboard/money/velocity/page.tsx",
    "src/app/dashboard/money/billing/page.tsx",
    "src/app/dashboard/money/settings/page.tsx",
  ];

  assert.match(shell, /beast-module-tabs/);
  assert.match(shell, /ModuleBadge module="money"/);
  assert.match(shell, /beastMoneyCoreNavigation/);
  assert.match(navigation, /\/dashboard\/money\/cashflow/);
  assert.match(navigation, /\/dashboard\/money\/cashflow#bills/);
  assert.match(navigation, /\/dashboard\/money\/debts/);
  assert.match(navigation, /\/dashboard\/money\/debts#payoff-plan/);
  assert.match(navigation, /\/dashboard\/money\/velocity/);
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
  assert.match(globalStyles, /\.money-section-panel > \.beast-table-wrap/);
  assert.match(globalStyles, /\.money-page-stack th/);
  assert.match(globalStyles, /\.money-page-stack td/);
  assert.match(globalStyles, /\.money-payoff-table tbody tr:nth-child\(odd\)/);
  assert.match(globalStyles, /\.money-payoff-table tbody tr:nth-child\(even\)/);

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
  assert.match(debts, /className="money-payoff-table w-full table-fixed text-sm"/);
  assert.doesNotMatch(debts, /money-payoff-table w-full min-w-/);
});

test("Income Date Planning is compact until the user expands details", () => {
  const source = readFileSync(
    "src/app/dashboard/money/cashflow/components/IncomeDatePlanningSection.tsx",
    "utf8"
  );
  const globalStyles = readFileSync("src/app/globals.css", "utf8");

  assert.match(source, /useState\(false\)/);
  assert.match(source, /aria-expanded=\{showIncomeTimeline\}/);
  assert.match(source, /aria-controls="income-date-planning-timeline"/);
  assert.match(source, /Show Income Timeline/);
  assert.match(source, /Expand and Review/);
  assert.match(source, /Action Required/);
  assert.match(source, /Healthy/);
  assert.match(source, /Unassigned item count/);
  assert.match(source, /Detailed income buckets are collapsed/);
  assert.match(source, /money-income-bucket-even/);
  assert.match(source, /money-income-bucket-odd/);
  assert.match(globalStyles, /\.money-income-bucket-even/);
  assert.match(globalStyles, /\.money-income-bucket-odd/);
});

test("Bills and Debts keep Pay actions reachable on mobile without replacing desktop tables", () => {
  const bills = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillsSection.tsx",
    "utf8"
  );
  const cashflowDebts = readFileSync(
    "src/app/dashboard/money/cashflow/components/DebtsSection.tsx",
    "utf8"
  );
  const billControls = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillPaymentControls.tsx",
    "utf8"
  );
  const debtControls = readFileSync(
    "src/app/dashboard/money/cashflow/components/DebtPaymentControls.tsx",
    "utf8"
  );
  const debtsPage = readFileSync("src/app/dashboard/money/debts/page.tsx", "utf8");
  const globalStyles = readFileSync("src/app/globals.css", "utf8");

  assert.match(bills, /data-mobile-bill-cards="true"/);
  assert.match(cashflowDebts, /data-mobile-debt-cards="true"/);
  assert.match(debtsPage, /data-mobile-debt-list-cards="true"/);
  assert.match(bills, /className="hidden lg:block"/);
  assert.match(cashflowDebts, /className="hidden lg:block"/);
  assert.match(debtsPage, /className="hidden lg:block"/);
  assert.match(bills, /break-words text-base font-black/);
  assert.match(cashflowDebts, /break-words text-base font-black/);
  assert.match(debtsPage, /break-words text-base font-black/);
  assert.match(bills, /<BillPaymentControls/);
  assert.match(cashflowDebts, /<DebtPaymentControls/);
  assert.match(billControls, />\s*Pay\s*</);
  assert.match(debtControls, /"Pay Minimum"/);
  assert.match(billControls, /data-action-menu-list="bill"/);
  assert.match(debtControls, /data-action-menu-list="debt"/);
  assert.match(globalStyles, /scrollbar-gutter: stable/);
  assert.doesNotMatch(globalStyles, /overflow-x: (?:clip|hidden)/);
});

test("Bills and Debts use viewport-bound overlay menus without changing row width", () => {
  const bills = readFileSync("src/app/dashboard/money/cashflow/components/BillsSection.tsx", "utf8");
  const debts = readFileSync("src/app/dashboard/money/cashflow/components/DebtsSection.tsx", "utf8");
  const overlay = readFileSync("src/app/dashboard/money/cashflow/components/OverlayPopover.tsx", "utf8");
  const assignments = readFileSync("src/app/dashboard/money/cashflow/components/CompactAssignmentSelect.tsx", "utf8");
  const paymentConfiguration = readFileSync("src/app/dashboard/money/cashflow/components/PaymentConfigurationControl.tsx", "utf8");
  const billControls = readFileSync("src/app/dashboard/money/cashflow/components/BillPaymentControls.tsx", "utf8");
  const debtControls = readFileSync("src/app/dashboard/money/cashflow/components/DebtPaymentControls.tsx", "utf8");

  for (const source of [bills, debts]) {
    assert.match(source, /<OverlayPopover label="Actions"/);
    assert.equal(source.match(/<OverlayPopover label="Actions" width=\{192\}/g)?.length, 2);
    assert.equal(source.match(/<PaymentConfigurationControl/g)?.length, 2);
    assert.doesNotMatch(source, /<summary[^>]*>Actions<\/summary>/);
    assert.doesNotMatch(source, /min-w-\[900px\]/);
  }
  assert.match(overlay, /createPortal/);
  assert.match(overlay, /className="fixed z-\[100\]/);
  assert.match(overlay, /money-popover-open/);
  assert.match(overlay, /event\.key === "Escape"/);
  assert.match(overlay, /document\.addEventListener\("pointerdown"/);
  assert.match(overlay, /window\.innerWidth - panelWidth/);
  assert.match(overlay, /maxHeight/);
  assert.match(overlay, /overflow-y-auto overflow-x-hidden/);
  assert.match(overlay, /whitespace-nowrap/);
  assert.match(overlay, /width = 240/);
  assert.match(assignments, /selected\?\.compactLabel \|\| "Unassigned"/);
  assert.match(assignments, /option\.detailLabel/);
  assert.match(assignments, /overlayWidth = 420/);
  assert.match(assignments, /width=\{overlayWidth\}/);
  assert.match(paymentConfiguration, /width=\{300\}/);
  assert.match(assignments, /triggerClassName="w-40"/);
  assert.match(assignments, /role="listbox"/);
  assert.match(billControls, /window\.confirm/);
  assert.match(debtControls, /window\.confirm/g);
  for (const controls of [billControls, debtControls]) {
    assert.match(controls, /w-full whitespace-nowrap px-4 text-sm/);
    assert.match(controls, /className="grid grid-cols-1 gap-2"/);
    assert.doesNotMatch(controls, /sm:grid-cols-4/);
    assert.doesNotMatch(controls, /break-all|break-words|whitespace-normal/);
  }
});
