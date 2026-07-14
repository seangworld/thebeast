import assert from "node:assert/strict";
import test from "node:test";
import {
  auditFinancialTimelineConsistency,
  buildFinancialEventTimeline,
  buildVelocityChunkEvents,
  createFinancialEvent,
  sortFinancialEvents,
} from "../src/lib/financialEventTimeline";

test("financial events sort chronologically with same-day priorities", () => {
  const events = sortFinancialEvents([
    createFinancialEvent({
      id: "bill",
      kind: "bill",
      date: "2026-07-03",
      label: "Bill",
      amount: 200,
      cashDelta: -200,
    }),
    createFinancialEvent({
      id: "income",
      kind: "income",
      date: "2026-07-03",
      label: "Paycheck",
      amount: 1000,
      cashDelta: 1000,
    }),
    createFinancialEvent({
      id: "debt",
      kind: "debt_minimum",
      date: "2026-07-04",
      label: "Debt minimum",
      amount: 100,
      cashDelta: -100,
      debtDelta: -100,
    }),
  ]);

  assert.deepEqual(
    events.map((event) => event.id),
    ["income", "bill", "debt"]
  );
});

test("financial timeline applies cash, debt, source, recovery, and shortage events", () => {
  const velocityEvents = buildVelocityChunkEvents({
    date: "2026-07-02",
    amount: 500,
    targetDebtId: "card-a",
    targetDebtName: "Card A",
    fundingSourceId: "heloc",
    fundingSourceName: "HELOC",
  });
  const timeline = buildFinancialEventTimeline({
    asOfDate: new Date("2026-07-01T12:00:00.000Z"),
    startingCash: 300,
    cashBuffer: 250,
    startingDebt: 2400,
    startingFundingSourceDebt: 1000,
    events: [
      createFinancialEvent({
        id: "paycheck",
        kind: "income",
        date: "2026-07-01",
        label: "Paycheck",
        amount: 1200,
        cashDelta: 1200,
      }),
      ...velocityEvents,
      createFinancialEvent({
        id: "rent",
        kind: "bill",
        date: "2026-07-03",
        label: "Rent",
        amount: 900,
        cashDelta: -900,
      }),
      createFinancialEvent({
        id: "minimum",
        kind: "debt_minimum",
        date: "2026-07-04",
        label: "Card minimum",
        amount: 100,
        cashDelta: -100,
        debtDelta: -100,
      }),
      createFinancialEvent({
        id: "recovery",
        kind: "funding_source_recovery",
        date: "2026-07-05",
        label: "HELOC recovery",
        amount: 250,
        cashDelta: -250,
        fundingSourceDelta: -250,
      }),
      createFinancialEvent({
        id: "savings",
        kind: "savings_transfer",
        date: "2026-07-06",
        label: "Savings transfer",
        amount: 400,
        cashDelta: -400,
      }),
    ],
  });

  assert.equal(timeline.events[0].kind, "income");
  assert.equal(timeline.events.find((event) => event.id === "paycheck")?.runningCash, 1500);
  assert.equal(timeline.events.find((event) => event.id === "rent")?.runningCash, 600);
  assert.equal(timeline.events.find((event) => event.id === "velocity-chunk-card-a")?.runningDebt, 1900);
  assert.equal(timeline.events.find((event) => event.id === "velocity-draw-heloc")?.runningFundingSourceDebt, 1500);
  assert.equal(timeline.events.find((event) => event.id === "recovery")?.runningFundingSourceDebt, 1250);
  assert.equal(timeline.endingNetDebt, 3050);
  assert.equal(timeline.shortageEvents.length > 0, true);
});

test("financial timeline consistency audit reconciles event deltas to balances", () => {
  const timeline = buildFinancialEventTimeline({
    asOfDate: new Date("2026-07-01T12:00:00.000Z"),
    startingCash: 500,
    startingDebt: 2000,
    startingFundingSourceDebt: 300,
    events: [
      createFinancialEvent({
        id: "income",
        kind: "income",
        date: "2026-07-01",
        label: "Paycheck",
        amount: 1000,
        cashDelta: 1000,
      }),
      createFinancialEvent({
        id: "bill",
        kind: "bill",
        date: "2026-07-02",
        label: "Utilities",
        amount: 150,
        cashDelta: -150,
      }),
      createFinancialEvent({
        id: "debt",
        kind: "debt_minimum",
        date: "2026-07-03",
        label: "Card minimum",
        amount: 125,
        cashDelta: -125,
        debtDelta: -125,
      }),
      createFinancialEvent({
        id: "source",
        kind: "funding_source_recovery",
        date: "2026-07-04",
        label: "Line recovery",
        amount: 75,
        cashDelta: -75,
        fundingSourceDelta: -75,
      }),
    ],
  });

  const audit = auditFinancialTimelineConsistency(timeline);

  assert.equal(audit.isConsistent, true);
  assert.deepEqual(audit.issues, []);
  assert.equal(audit.totals.cashDelta, 650);
  assert.equal(audit.totals.debtDelta, -125);
  assert.equal(audit.totals.fundingSourceDelta, -75);
  assert.equal(audit.totals.expectedEndingCash, timeline.endingCash);
  assert.equal(audit.totals.expectedEndingDebt, timeline.endingDebt);
  assert.equal(
    audit.totals.expectedEndingFundingSourceDebt,
    timeline.endingFundingSourceDebt
  );
  assert.equal(audit.totals.expectedEndingNetWorth, timeline.endingNetWorth);
});

test("financial timeline consistency audit reports balance drift", () => {
  const timeline = buildFinancialEventTimeline({
    startingCash: 100,
    startingDebt: 500,
    events: [
      createFinancialEvent({
        id: "payment",
        kind: "extra_payment",
        date: "2026-07-02",
        label: "Extra card payment",
        amount: 50,
        cashDelta: -50,
        debtDelta: -50,
      }),
    ],
  });
  const corrupted = {
    ...timeline,
    events: timeline.events.map((event) =>
      event.id === "payment"
        ? {
            ...event,
            runningCash: event.runningCash + 25,
            runningNetWorth: event.runningNetWorth + 25,
          }
        : event
    ),
    endingDebt: timeline.endingDebt + 10,
  };

  const audit = auditFinancialTimelineConsistency(corrupted);

  assert.equal(audit.isConsistent, false);
  assert.equal(
    audit.issues.some((issue) => issue.code === "running_cash_mismatch"),
    true
  );
  assert.equal(
    audit.issues.some((issue) => issue.code === "running_net_worth_mismatch"),
    true
  );
  assert.equal(
    audit.issues.some((issue) => issue.code === "ending_debt_mismatch"),
    true
  );
});
