import { getBeastDateKey, getBeastRuntimeToday } from "./runtimeDate";
import { roundMoney } from "./formatters";

export type FinancialEventKind =
  | "income"
  | "bill"
  | "debt_minimum"
  | "extra_payment"
  | "velocity_chunk"
  | "funding_source_draw"
  | "funding_source_recovery"
  | "savings_transfer"
  | "shortage_risk";

export type FinancialTimelineEntity = {
  id?: string;
  name: string;
  kind: "cash" | "bill" | "debt" | "funding_source" | "savings" | "risk";
};

export type FinancialTimelineEvent = {
  id: string;
  kind: FinancialEventKind;
  date: string;
  label: string;
  amount: number;
  cashDelta: number;
  debtDelta?: number;
  fundingSourceDelta?: number;
  target?: FinancialTimelineEntity;
  source?: FinancialTimelineEntity;
  risk?: "low" | "medium" | "high";
  assumptions?: string[];
};

export type FinancialTimelineInput = {
  asOfDate?: Date;
  startingCash?: number;
  cashBuffer?: number;
  startingDebt?: number;
  startingFundingSourceDebt?: number;
  events: FinancialTimelineEvent[];
};

export type FinancialTimelinePoint = FinancialTimelineEvent & {
  runningCash: number;
  runningDebt: number;
  runningFundingSourceDebt: number;
  runningNetDebt: number;
  runningNetWorth: number;
};

export type FinancialTimelineResult = {
  asOfDate: string;
  startingCash: number;
  startingDebt: number;
  startingFundingSourceDebt: number;
  endingCash: number;
  endingDebt: number;
  endingFundingSourceDebt: number;
  endingNetDebt: number;
  endingNetWorth: number;
  shortageEvents: FinancialTimelinePoint[];
  events: FinancialTimelinePoint[];
};

export type FinancialTimelineConsistencyIssue = {
  code:
    | "running_cash_mismatch"
    | "running_debt_mismatch"
    | "running_funding_source_mismatch"
    | "running_net_debt_mismatch"
    | "running_net_worth_mismatch"
    | "ending_cash_mismatch"
    | "ending_debt_mismatch"
    | "ending_funding_source_mismatch"
    | "ending_net_debt_mismatch"
    | "ending_net_worth_mismatch";
  severity: "error";
  message: string;
  eventId?: string;
  expected: number;
  actual: number;
};

export type FinancialTimelineConsistencyAudit = {
  isConsistent: boolean;
  tolerance: number;
  totals: {
    cashDelta: number;
    debtDelta: number;
    fundingSourceDelta: number;
    expectedEndingCash: number;
    expectedEndingDebt: number;
    expectedEndingFundingSourceDebt: number;
    expectedEndingNetDebt: number;
    expectedEndingNetWorth: number;
  };
  issues: FinancialTimelineConsistencyIssue[];
};

function money(value: number) {
  return roundMoney(value);
}

function dateKey(value: string | Date | undefined, fallback: Date) {
  if (!value) return getBeastDateKey(fallback);
  if (value instanceof Date) return getBeastDateKey(value);

  return value.slice(0, 10);
}

function eventPriority(kind: FinancialEventKind) {
  const priorities: Record<FinancialEventKind, number> = {
    income: 10,
    funding_source_draw: 20,
    velocity_chunk: 30,
    bill: 40,
    debt_minimum: 50,
    extra_payment: 60,
    funding_source_recovery: 70,
    savings_transfer: 80,
    shortage_risk: 90,
  };

  return priorities[kind];
}

export function sortFinancialEvents(events: FinancialTimelineEvent[]) {
  return [...events].sort((a, b) => {
    const dateSort = a.date.localeCompare(b.date);
    if (dateSort !== 0) return dateSort;

    const prioritySort = eventPriority(a.kind) - eventPriority(b.kind);
    if (prioritySort !== 0) return prioritySort;

    return a.id.localeCompare(b.id);
  });
}

export function createFinancialEvent(
  event: Omit<FinancialTimelineEvent, "amount" | "cashDelta"> & {
    amount: number;
    cashDelta?: number;
  }
): FinancialTimelineEvent {
  return {
    ...event,
    amount: money(event.amount),
    cashDelta: money(event.cashDelta ?? 0),
    debtDelta: event.debtDelta == null ? undefined : money(event.debtDelta),
    fundingSourceDelta:
      event.fundingSourceDelta == null
        ? undefined
        : money(event.fundingSourceDelta),
  };
}

export function buildFinancialEventTimeline(
  input: FinancialTimelineInput
): FinancialTimelineResult {
  const asOfDate = input.asOfDate || getBeastRuntimeToday();
  const cashBuffer = money(Number(input.cashBuffer || 0));
  let runningCash = money(Number(input.startingCash || 0));
  let runningDebt = money(Number(input.startingDebt || 0));
  let runningFundingSourceDebt = money(
    Number(input.startingFundingSourceDebt || 0)
  );
  const timelineEvents: FinancialTimelinePoint[] = [];

  for (const event of sortFinancialEvents(input.events)) {
    runningCash = money(runningCash + Number(event.cashDelta || 0));
    runningDebt = money(runningDebt + Number(event.debtDelta || 0));
    runningFundingSourceDebt = money(
      runningFundingSourceDebt + Number(event.fundingSourceDelta || 0)
    );

    const point: FinancialTimelinePoint = {
      ...event,
      runningCash,
      runningDebt,
      runningFundingSourceDebt,
      runningNetDebt: money(runningDebt + runningFundingSourceDebt),
      runningNetWorth: money(runningCash - runningDebt - runningFundingSourceDebt),
    };

    timelineEvents.push(point);

    if (runningCash < cashBuffer && event.kind !== "shortage_risk") {
      timelineEvents.push({
        id: `shortage-${event.id}`,
        kind: "shortage_risk",
        date: event.date,
        label: "Cash below guardrail",
        amount: money(cashBuffer - runningCash),
        cashDelta: 0,
        target: { kind: "risk", name: "Cash guardrail" },
        risk: "high",
        assumptions: [
          "Shortage risk is generated when running cash falls below the configured buffer.",
        ],
        runningCash,
        runningDebt,
        runningFundingSourceDebt,
        runningNetDebt: money(runningDebt + runningFundingSourceDebt),
        runningNetWorth: money(runningCash - runningDebt - runningFundingSourceDebt),
      });
    }
  }

  const finalPoint = timelineEvents[timelineEvents.length - 1];

  return {
    asOfDate: dateKey(asOfDate, asOfDate),
    startingCash: money(Number(input.startingCash || 0)),
    startingDebt: money(Number(input.startingDebt || 0)),
    startingFundingSourceDebt: money(Number(input.startingFundingSourceDebt || 0)),
    endingCash: money(finalPoint?.runningCash ?? runningCash),
    endingDebt: money(finalPoint?.runningDebt ?? runningDebt),
    endingFundingSourceDebt: money(
      finalPoint?.runningFundingSourceDebt ?? runningFundingSourceDebt
    ),
    endingNetDebt: money(finalPoint?.runningNetDebt ?? runningDebt + runningFundingSourceDebt),
    endingNetWorth: money(
      finalPoint?.runningNetWorth ?? runningCash - runningDebt - runningFundingSourceDebt
    ),
    shortageEvents: timelineEvents.filter((event) => event.kind === "shortage_risk"),
    events: timelineEvents,
  };
}

function isWithinTolerance(actual: number, expected: number, tolerance: number) {
  return Math.abs(money(actual) - money(expected)) <= tolerance;
}

function addConsistencyIssue(
  issues: FinancialTimelineConsistencyIssue[],
  issue: FinancialTimelineConsistencyIssue,
  tolerance: number
) {
  if (!isWithinTolerance(issue.actual, issue.expected, tolerance)) {
    issues.push({
      ...issue,
      actual: money(issue.actual),
      expected: money(issue.expected),
    });
  }
}

export function auditFinancialTimelineConsistency(
  timeline: FinancialTimelineResult,
  tolerance = 0.01
): FinancialTimelineConsistencyAudit {
  const issues: FinancialTimelineConsistencyIssue[] = [];
  let expectedCash = money(timeline.startingCash);
  let expectedDebt = money(timeline.startingDebt);
  let expectedFundingSourceDebt = money(timeline.startingFundingSourceDebt);
  let cashDelta = 0;
  let debtDelta = 0;
  let fundingSourceDelta = 0;

  for (const event of timeline.events) {
    const eventCashDelta = money(Number(event.cashDelta || 0));
    const eventDebtDelta = money(Number(event.debtDelta || 0));
    const eventFundingSourceDelta = money(Number(event.fundingSourceDelta || 0));

    cashDelta = money(cashDelta + eventCashDelta);
    debtDelta = money(debtDelta + eventDebtDelta);
    fundingSourceDelta = money(fundingSourceDelta + eventFundingSourceDelta);

    expectedCash = money(expectedCash + eventCashDelta);
    expectedDebt = money(expectedDebt + eventDebtDelta);
    expectedFundingSourceDebt = money(
      expectedFundingSourceDebt + eventFundingSourceDelta
    );
    const expectedNetDebt = money(expectedDebt + expectedFundingSourceDebt);
    const expectedNetWorth = money(
      expectedCash - expectedDebt - expectedFundingSourceDebt
    );

    addConsistencyIssue(
      issues,
      {
        code: "running_cash_mismatch",
        severity: "error",
        message: "Running cash does not match starting cash plus event cash deltas.",
        eventId: event.id,
        expected: expectedCash,
        actual: event.runningCash,
      },
      tolerance
    );
    addConsistencyIssue(
      issues,
      {
        code: "running_debt_mismatch",
        severity: "error",
        message: "Running debt does not match starting debt plus event debt deltas.",
        eventId: event.id,
        expected: expectedDebt,
        actual: event.runningDebt,
      },
      tolerance
    );
    addConsistencyIssue(
      issues,
      {
        code: "running_funding_source_mismatch",
        severity: "error",
        message:
          "Running funding-source debt does not match starting funding-source debt plus event deltas.",
        eventId: event.id,
        expected: expectedFundingSourceDebt,
        actual: event.runningFundingSourceDebt,
      },
      tolerance
    );
    addConsistencyIssue(
      issues,
      {
        code: "running_net_debt_mismatch",
        severity: "error",
        message: "Running net debt does not match debt plus funding-source debt.",
        eventId: event.id,
        expected: expectedNetDebt,
        actual: event.runningNetDebt,
      },
      tolerance
    );
    addConsistencyIssue(
      issues,
      {
        code: "running_net_worth_mismatch",
        severity: "error",
        message:
          "Running net worth does not match cash minus debt and funding-source debt.",
        eventId: event.id,
        expected: expectedNetWorth,
        actual: event.runningNetWorth,
      },
      tolerance
    );
  }

  const expectedEndingCash = money(timeline.startingCash + cashDelta);
  const expectedEndingDebt = money(timeline.startingDebt + debtDelta);
  const expectedEndingFundingSourceDebt = money(
    timeline.startingFundingSourceDebt + fundingSourceDelta
  );
  const expectedEndingNetDebt = money(
    expectedEndingDebt + expectedEndingFundingSourceDebt
  );
  const expectedEndingNetWorth = money(
    expectedEndingCash - expectedEndingDebt - expectedEndingFundingSourceDebt
  );

  addConsistencyIssue(
    issues,
    {
      code: "ending_cash_mismatch",
      severity: "error",
      message: "Ending cash does not match audited transaction cash deltas.",
      expected: expectedEndingCash,
      actual: timeline.endingCash,
    },
    tolerance
  );
  addConsistencyIssue(
    issues,
    {
      code: "ending_debt_mismatch",
      severity: "error",
      message: "Ending debt does not match audited transaction debt deltas.",
      expected: expectedEndingDebt,
      actual: timeline.endingDebt,
    },
    tolerance
  );
  addConsistencyIssue(
    issues,
    {
      code: "ending_funding_source_mismatch",
      severity: "error",
      message:
        "Ending funding-source debt does not match audited funding-source deltas.",
      expected: expectedEndingFundingSourceDebt,
      actual: timeline.endingFundingSourceDebt,
    },
    tolerance
  );
  addConsistencyIssue(
    issues,
    {
      code: "ending_net_debt_mismatch",
      severity: "error",
      message: "Ending net debt does not match audited debt totals.",
      expected: expectedEndingNetDebt,
      actual: timeline.endingNetDebt,
    },
    tolerance
  );
  addConsistencyIssue(
    issues,
    {
      code: "ending_net_worth_mismatch",
      severity: "error",
      message: "Ending net worth does not match audited balance totals.",
      expected: expectedEndingNetWorth,
      actual: timeline.endingNetWorth,
    },
    tolerance
  );

  return {
    isConsistent: issues.length === 0,
    tolerance,
    totals: {
      cashDelta: money(cashDelta),
      debtDelta: money(debtDelta),
      fundingSourceDelta: money(fundingSourceDelta),
      expectedEndingCash,
      expectedEndingDebt,
      expectedEndingFundingSourceDebt,
      expectedEndingNetDebt,
      expectedEndingNetWorth,
    },
    issues,
  };
}

export function buildVelocityChunkEvents({
  date,
  amount,
  targetDebtId,
  targetDebtName,
  fundingSourceId,
  fundingSourceName,
}: {
  date: string;
  amount: number;
  targetDebtId?: string;
  targetDebtName: string;
  fundingSourceId?: string;
  fundingSourceName: string;
}): FinancialTimelineEvent[] {
  const chunkAmount = money(amount);

  return [
    createFinancialEvent({
      id: `velocity-draw-${fundingSourceId || "source"}`,
      kind: "funding_source_draw",
      date,
      label: `Draw from ${fundingSourceName}`,
      amount: chunkAmount,
      fundingSourceDelta: chunkAmount,
      source: {
        id: fundingSourceId,
        name: fundingSourceName,
        kind: "funding_source",
      },
      assumptions: ["A Velocity draw increases funding source debt."],
    }),
    createFinancialEvent({
      id: `velocity-chunk-${targetDebtId || "target"}`,
      kind: "velocity_chunk",
      date,
      label: `Apply Velocity chunk to ${targetDebtName}`,
      amount: chunkAmount,
      debtDelta: -chunkAmount,
      target: {
        id: targetDebtId,
        name: targetDebtName,
        kind: "debt",
      },
      assumptions: ["A Velocity chunk reduces the selected target debt."],
    }),
  ];
}
