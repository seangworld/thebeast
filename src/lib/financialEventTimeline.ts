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
