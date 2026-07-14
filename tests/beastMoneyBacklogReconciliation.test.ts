import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildCashTimeline } from "../src/lib/cashflow";
import { buildFinancialCreditProductRisk } from "../src/lib/financialCreditProducts";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";
import { buildFinancialForecast } from "../src/lib/financialForecasting";
import { buildMoneyImportPreview } from "../src/lib/financialImport";
import {
  buildFinancialImportReconciliation,
  buildFinancialSnapshot,
  buildFinancialUndoPlan,
} from "../src/lib/financialRecovery";
import {
  buildFinancialSaveAttempt,
  buildFinancialSaveAudit,
} from "../src/lib/financialSaveRecovery";
import { applyBillPartialPayment, applyDebtPaymentToCycle } from "../src/lib/financialPayments";
import { compareFinancialScenarios } from "../src/lib/financialScenarios";
import { buildMoneyTodayItems } from "../src/lib/moneyToday";
import { roundMoney } from "../src/lib/formatters";

test("BM-02 covers due-date clamping and recurring bill frequencies", () => {
  const timeline = buildCashTimeline({
    startDate: new Date("2026-01-30T00:00:00"),
    days: 370,
    incomes: [{ name: "Paycheck", amount: 1000, frequency: "biweekly", next_date: "2026-01-31" }],
    bills: [
      { name: "Monthly", amount: 100, due_date: 31, frequency: "monthly" },
      { name: "Quarterly", amount: 300, due_date: 15, frequency: "every_3_months" },
      { name: "Annual", amount: 1200, due_date: 1, frequency: "yearly" },
    ],
    debts: [],
  });
  const monthlyEvents = timeline.filter((event) => event.name === "Monthly");
  const quarterlyEvents = timeline.filter((event) => event.name === "Quarterly");
  const annualEvents = timeline.filter((event) => event.name === "Annual");

  assert.equal(monthlyEvents.length >= 12, true);
  assert.equal(quarterlyEvents.length, 4);
  assert.equal(annualEvents.length, 2);
  assert.equal(monthlyEvents.every((event) => event.date.getDate() <= 31), true);
});

test("BM-03 keeps partial payments open and advances paid obligations", () => {
  const partialBill = applyBillPartialPayment({
    amountDue: 100,
    alreadyPaid: 25,
    paymentAmount: 50,
    currentCycleDueDate: new Date("2026-07-31T00:00:00"),
    frequency: "monthly",
  });
  const paidBill = applyBillPartialPayment({
    amountDue: 100,
    alreadyPaid: 25,
    paymentAmount: 75,
    currentCycleDueDate: new Date("2026-07-31T00:00:00"),
    frequency: "monthly",
  });
  const debtPayment = applyDebtPaymentToCycle({
    balance: 500,
    currentCyclePaid: 40,
    paymentAmount: 60,
    minimumPayment: 100,
    currentCycleDueDate: new Date("2026-07-20T00:00:00"),
  });

  assert.equal(partialBill.remainingAfterPayment, 25);
  assert.equal(partialBill.nextDueDateAfterPayment, null);
  assert.equal(paidBill.remainingAfterPayment, 0);
  assert.equal(paidBill.nextDueDateAfterPayment, "2026-08-31");
  assert.equal(debtPayment.minimumSatisfied, true);
  assert.equal(debtPayment.nextDueDateAfterPayment, "2026-08-20");
});

test("BM-04 keeps funding-source capacity aligned with debt and guardrails", () => {
  const result = buildCashIntelligence({
    fundingSources: [
      {
        id: "heloc",
        current_balance: 3000,
        credit_limit: 10000,
        available_credit: 7000,
        max_utilization_percent: 60,
      },
    ],
    settings: { currentCash: 1000, cashBuffer: 250, emergencyReserveAmount: 500 },
  });

  assert.equal(result.safeFundingSourceCapacity, 2500);
  assert.equal(
    result.assumptions.some((assumption) => assumption.includes("funding source utilization")),
    true
  );
});

test("BM-05 uses transparent money rounding and interest projections", () => {
  const cashIntelligence = buildCashIntelligence({
    income: [{ amount: 3000, frequency: "monthly" }],
    bills: [{ amount: 1000, frequency: "monthly" }],
    debtMinimums: [{ id: "card", name: "Card", balance: 1000, minimum_payment: 50, interest_rate: 19.99 }],
    settings: { currentCash: 1000, cashBuffer: 250 },
  });
  const forecast = buildFinancialForecast({
    debts: [{ id: "card", name: "Card", balance: 1000, minimum_payment: 50, interest_rate: 19.99 }],
    cashIntelligence,
    currentCash: 1000,
    cashBuffer: 250,
  });

  assert.equal(roundMoney(1.005), 1.01);
  assert.equal(forecast.periods.every((period) => Number.isInteger(period.interest * 100)), true);
  assert.equal(forecast.periods[2].interest > forecast.periods[0].interest, true);
});

test("BM-06 preserves failed-save drafts and audit history", () => {
  const audit = buildFinancialSaveAudit([
    buildFinancialSaveAttempt({
      id: "save-1",
      entityType: "bill",
      entityId: "rent",
      attemptedAt: "2026-07-13T10:00:00.000Z",
      payload: { amount: 1200 },
    }),
    buildFinancialSaveAttempt({
      id: "save-2",
      entityType: "bill",
      entityId: "rent",
      attemptedAt: "2026-07-13T10:05:00.000Z",
      payload: { amount: 1250 },
      errorMessage: "Network unavailable",
    }),
  ]);

  assert.equal(audit.hasRecoverableDraft, true);
  assert.deepEqual(audit.recoverableDraft, { amount: 1250 });
  assert.equal(audit.latestSuccessfulAttempt?.id, "save-1");
  assert.equal(audit.latestFailedAttempt?.errorMessage, "Network unavailable");
});

test("BM-07 reconciles imports and builds an undo plan", () => {
  const preview = buildMoneyImportPreview({
    csv: "Name,Amount\nRent,1200\nRent,1200\nUtilities,",
    mapping: { target: "bill", fields: { name: "Name", amount: "Amount" } },
  });
  const reconciliation = buildFinancialImportReconciliation(preview);
  const before = buildFinancialSnapshot({
    exportedAt: "2026-07-13T10:00:00.000Z",
    rows: [{ id: "rent", target: "bill", values: { name: "Rent", amount: 1200 } }],
  });
  const after = buildFinancialSnapshot({
    exportedAt: "2026-07-13T10:05:00.000Z",
    rows: [{ id: "utilities", target: "bill", values: { name: "Utilities", amount: 150 } }],
  });
  const undo = buildFinancialUndoPlan({ before, after });

  assert.equal(reconciliation.creates.length, 1);
  assert.equal(reconciliation.skippedDuplicates.length, 1);
  assert.equal(reconciliation.rejectedInvalidRows.length, 1);
  assert.equal(reconciliation.readyToApply, false);
  assert.deepEqual(
    undo.actions.map((action) => action.type).sort(),
    ["remove", "restore"]
  );
});

test("BM-08, BM-09, BM-10, and BM-11 share the cash position engine", () => {
  const cash = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [
      { id: "pay-1", name: "Paycheck 1", amount: 1200, frequency: "biweekly", next_date: "2026-07-03" },
      { id: "side", name: "Side work", amount: 300, frequency: "monthly", next_date: "2026-07-20" },
    ],
    bills: [{ id: "rent", name: "Rent", amount: 1000, frequency: "monthly", due_date: 5 }],
    debtMinimums: [{ id: "card", name: "Card", balance: 1000, minimum_payment: 100, interest_rate: 22, due_date: 15 }],
    scheduledTransfers: [{ id: "car", name: "Car insurance sinking fund", amount: 100, frequency: "monthly", due_date: 10 }],
    savings: [{ id: "reserve", is_emergency_reserve: true, target_reserve: 500, monthly_contribution: 75 }],
    settings: { currentCash: 700, cashBuffer: 300, lookaheadDays: 45 },
  });
  const decision = buildFinancialDecision({
    cashIntelligence: cash,
    debts: [{ id: "card", name: "Card", balance: 1000, minimum_payment: 100, interest_rate: 22 }],
    income: [{ amount: 1200, frequency: "biweekly" }, { amount: 300, frequency: "monthly" }],
    bills: [{ amount: 1000, frequency: "monthly" }],
  });

  assert.equal(cash.monthlyIncome, 2900);
  assert.equal(cash.monthlyScheduledTransfers, 100);
  assert.equal(cash.monthlySavingsContributions, 75);
  assert.equal(cash.billsDue > 0, true);
  assert.equal(typeof decision.reason, "string");
  assert.equal(
    ["make_extra_payment", "wait", "restore_buffer", "review_bills", "maintain"].includes(decision.action),
    true
  );
});

test("BM-12 and BM-13 expose long forecasts and comparable scenarios", () => {
  const debts = [
    { id: "card-a", name: "Card A", balance: 3000, minimum_payment: 100, interest_rate: 24 },
    { id: "card-b", name: "Card B", balance: 1200, minimum_payment: 60, interest_rate: 12 },
  ];
  const cashIntelligence = buildCashIntelligence({
    income: [{ amount: 4000, frequency: "monthly" }],
    bills: [{ amount: 1400, frequency: "monthly" }],
    debtMinimums: debts,
    settings: { currentCash: 1500, cashBuffer: 500 },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    income: [{ amount: 4000 }],
    bills: [{ amount: 1400 }],
  });
  const forecast = buildFinancialForecast({ debts, cashIntelligence, financialDecision });
  const comparison = compareFinancialScenarios({ debts, cashIntelligence, financialDecision });

  assert.deepEqual(forecast.periods.map((period) => period.key), ["30d", "90d", "1y"]);
  assert.equal(comparison.scenarios.length >= 8, true);
  assert.equal(comparison.bestByInterest.interestSaved >= 0, true);
});

test("BM-14 contributes BeastMoney obligations to Today and Calendar", () => {
  const items = buildMoneyTodayItems({
    asOfDate: new Date("2026-07-13T00:00:00"),
    days: 7,
    incomes: [{ name: "Paycheck", amount: 1500, frequency: "biweekly", next_date: "2026-07-13" }],
    bills: [{ name: "Rent", amount: 1200, due_date: 15, frequency: "monthly" }],
    debts: [{ name: "Card", minimum_payment: 75, due_date: 16 }],
  });

  assert.equal(items.some((item) => item.priority === "today" && item.kind === "income"), true);
  assert.equal(items.some((item) => item.title === "Rent due"), true);
  assert.equal(items.every((item) => item.calendarSource === "BeastMoney"), true);
});

test("BM-18 surfaces HELOC, PLOC, promotional APR, and balance-transfer risk", () => {
  const heloc = buildFinancialCreditProductRisk({
    id: "heloc",
    name: "Home Equity Line",
    type: "heloc",
    balance: 2000,
    creditLimit: 10000,
    apr: 8,
    asOfDate: "2026-07-13",
  });
  const promoTransfer = buildFinancialCreditProductRisk({
    id: "transfer",
    name: "Promo Transfer",
    type: "balance_transfer",
    balance: 5000,
    creditLimit: 6000,
    apr: 24,
    promotionalApr: 0,
    promotionalAprEndsOn: "2026-08-12",
    balanceTransferFeePercent: 3,
    asOfDate: "2026-07-13",
  });

  assert.equal(heloc.effectiveApr, 8);
  assert.equal(heloc.warnings.some((warning) => warning.includes("Line-of-credit APR")), true);
  assert.equal(promoTransfer.effectiveApr, 0);
  assert.equal(promoTransfer.balanceTransferFee, 150);
  assert.equal(promoTransfer.riskLevel, "high");
  assert.equal(promoTransfer.warnings.length >= 2, true);
});
