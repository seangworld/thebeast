import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMobileMoneyBillCards,
  buildMobileMoneyDebtCards,
  buildRecentMoneyTransactions,
  getMobileMoneyBillStatus,
} from "../src/lib/mobileMoney";

test("BF-MOB-004 mobile Money builds bill cards with visible payment actions", () => {
  const page = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");
  const cards = buildMobileMoneyBillCards({
    asOfDate: new Date("2026-07-17T12:00:00.000Z"),
    bills: [
      { id: "rent", name: "Very long rent and utilities account name", amount: 1200, due_date: 17 },
      { id: "internet", name: "Internet", amount: 90, due_date: 20 },
    ],
  });

  assert.equal(cards[0].status, "Due Today");
  assert.equal(cards[0].actionHref, "/dashboard/money/cashflow#bills");
  assert.match(page, /data-mobile-money-bill-cards="true"/);
  assert.match(page, /Pay or record payment/);
  assert.match(page, /break-words text-base font-black/);
});

test("BF-MOB-004 mobile Money builds debt cards with visible minimum payment actions", () => {
  const page = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");
  const cards = buildMobileMoneyDebtCards({
    asOfDate: new Date("2026-07-17T12:00:00.000Z"),
    debts: [
      {
        id: "card",
        name: "Rewards card",
        balance: 3200,
        minimum_payment: 110,
        interest_rate: 22.5,
        due_date: 21,
      },
    ],
  });

  assert.equal(cards[0].minimumPayment, 110);
  assert.equal(cards[0].actionHref, "/dashboard/money/debts");
  assert.match(page, /data-mobile-money-debt-cards="true"/);
  assert.match(page, /Minimum/);
  assert.match(page, /Pay or record payment/);
});

test("BF-MOB-004 mobile Money includes transaction quick-add without a desktop table dependency", () => {
  const page = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");
  const transactions = buildRecentMoneyTransactions({
    billPayments: [
      { id: "bill-1", amount_paid: 75, payment_date: "2026-07-16" },
    ],
    debtPayments: [
      { id: "debt-1", amount: 120, payment_date: "2026-07-17" },
    ],
  });

  assert.deepEqual(
    transactions.map((transaction) => transaction.source),
    ["debt", "bill"]
  );
  assert.match(page, /data-mobile-money-quick-add-transaction="true"/);
  assert.match(page, /Add Bill Pay/);
  assert.match(page, /Add Debt Pay/);
  assert.doesNotMatch(page, /data-mobile-money-quick-add-transaction="true"[\s\S]*<table/);
});

test("BF-MOB-004 mobile Money prevents horizontal overflow and preserves desktop Money", () => {
  const page = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");
  const shell = readFileSync("src/app/dashboard/money/BeastMoneyShell.tsx", "utf8");
  const globalStyles = readFileSync("src/app/globals.css", "utf8");

  assert.match(page, /data-mobile-money-experience="true"/);
  assert.match(page, /className="hidden space-y-8 md:block"/);
  assert.match(page, /Money Cockpit/);
  assert.doesNotMatch(shell, /beast-module-tabs/);
  assert.doesNotMatch(shell, /aria-label="BeastMoney sections"/);
  assert.match(globalStyles, /width: 100%;/);
  assert.match(globalStyles, /min-width: 0;/);
  assert.doesNotMatch(globalStyles, /overflow-x: (?:clip|hidden)/);
});

test("BF-MOB-004 payment forms fit mobile widths and shared business logic stays source-owned", () => {
  const billControls = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillPaymentControls.tsx",
    "utf8"
  );
  const debtControls = readFileSync(
    "src/app/dashboard/money/cashflow/components/DebtPaymentControls.tsx",
    "utf8"
  );
  const page = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");

  assert.match(billControls, /data-mobile-money-payment-form="bill"/);
  assert.match(debtControls, /data-mobile-money-payment-form="debt"/);
  assert.match(billControls, /grid-cols-1/);
  assert.match(debtControls, /grid-cols-1/);
  assert.match(page, /buildCashIntelligence/);
  assert.match(page, /buildDailyFinancialAdvisor/);
  assert.match(page, /buildFinancialDecision/);
  assert.match(page, /buildFinancialForecast/);
});

test("BF-MOB-004 bill status handles overdue due today due soon and upcoming", () => {
  const asOfDate = new Date("2026-07-17T12:00:00.000Z");

  assert.equal(getMobileMoneyBillStatus(new Date("2026-07-16T12:00:00.000Z"), asOfDate), "Overdue");
  assert.equal(getMobileMoneyBillStatus(new Date("2026-07-17T12:00:00.000Z"), asOfDate), "Due Today");
  assert.equal(getMobileMoneyBillStatus(new Date("2026-07-20T12:00:00.000Z"), asOfDate), "Due Soon");
  assert.equal(getMobileMoneyBillStatus(new Date("2026-08-02T12:00:00.000Z"), asOfDate), "Upcoming");
});
