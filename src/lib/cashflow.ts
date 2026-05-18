import { addDays } from "date-fns";

export type CashEvent = {
  date: Date;
  type: "income" | "bill" | "debt";
  name: string;
  amount: number;
};

export type SimulatedCashEvent = CashEvent & {
  balance: number;
  runningBalance: number;
  running_balance: number;
  belowBuffer: boolean;
};

function advanceByFrequency(date: Date, frequency?: string) {
  const next = new Date(date);

  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "biweekly") {
    next.setDate(next.getDate() + 14);
  } else if (frequency === "every_2_months") {
    next.setMonth(next.getMonth() + 2);
  } else if (frequency === "every_3_months") {
    next.setMonth(next.getMonth() + 3);
  } else if (frequency === "every_6_months") {
    next.setMonth(next.getMonth() + 6);
  } else if (frequency === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

function getFirstDueDateFromDay(startDate: Date, dueDay: number) {
  const safeDueDay = Math.min(Math.max(Number(dueDay || 1), 1), 31);

  let firstDue = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    safeDueDay
  );

  const startOnly = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );

  if (firstDue < startOnly) {
    firstDue.setMonth(firstDue.getMonth() + 1);
  }

  return firstDue;
}

export function buildCashTimeline({
  incomes,
  bills,
  debts,
  startDate,
  days,
}: {
  incomes: any[];
  bills: any[];
  debts: any[];
  startDate: Date;
  days: number;
}) {
  const timeline: CashEvent[] = [];
  const startOnly = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const endDate = addDays(startOnly, Number(days || 30));

  incomes.forEach((inc) => {
    if (!inc?.next_date) return;

    let current = new Date(`${inc.next_date}T00:00:00`);
    let safety = 0;

    while (current < startOnly && safety < 240) {
      current = advanceByFrequency(current, inc.frequency);
      safety += 1;
    }

    while (current <= endDate && safety < 480) {
      timeline.push({
        date: new Date(current),
        type: "income",
        name: inc.name || "Income",
        amount: Number(inc.amount || 0),
      });

      current = advanceByFrequency(current, inc.frequency);
      safety += 1;
    }
  });

  bills.forEach((bill) => {
    const billAmount = Number(bill.amount || 0);
    if (billAmount <= 0) return;

    let current = getFirstDueDateFromDay(
      startOnly,
      Number(bill.due_date || 1)
    );
    let safety = 0;

    while (current <= endDate && safety < 480) {
      timeline.push({
        date: new Date(current),
        type: "bill",
        name: bill.name || "Bill",
        amount: -billAmount,
      });

      current = advanceByFrequency(current, bill.frequency || "monthly");
      safety += 1;
    }
  });

  debts.forEach((debt) => {
    const minimumPayment = Number(debt.minimum_payment || 0);
    if (minimumPayment <= 0) return;

    let current = getFirstDueDateFromDay(
      startOnly,
      Number(debt.due_date || 1)
    );
    let safety = 0;

    while (current <= endDate && safety < 480) {
      timeline.push({
        date: new Date(current),
        type: "debt",
        name: `${debt.name || "Debt"} (Min)`,
        amount: -minimumPayment,
      });

      current = advanceByFrequency(current, "monthly");
      safety += 1;
    }
  });

  return timeline.sort((a, b) => {
    const dateSort = a.date.getTime() - b.date.getTime();
    if (dateSort !== 0) return dateSort;

    const typeOrder: Record<string, number> = { income: 0, bill: 1, debt: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
}

export function simulateCashFlow({
  timeline,
  startingBalance,
  buffer,
}: {
  timeline: CashEvent[];
  startingBalance: number;
  buffer: number;
}) {
  let balance = Number(startingBalance || 0);

  return timeline.map((event) => {
    balance += Number(event.amount || 0);

    return {
      ...event,
      balance,
      runningBalance: balance,
      running_balance: balance,
      belowBuffer: balance < Number(buffer || 0),
    };
  });
}

export function calculateRequiredCash(timeline: CashEvent[]) {
  let running = 0;
  let minBalance = 0;

  timeline.forEach((event) => {
    running += Number(event.amount || 0);

    if (running < minBalance) {
      minBalance = running;
    }
  });

  return Math.abs(minBalance);
}

export function calculateBillsDue(timeline: CashEvent[]) {
  return timeline
    .filter((event) => event.type === "bill" || event.type === "debt")
    .reduce((total, event) => total + Math.abs(Number(event.amount || 0)), 0);
}

export function calculateIncomeExpected(timeline: CashEvent[]) {
  return timeline
    .filter((event) => event.type === "income")
    .reduce((total, event) => total + Number(event.amount || 0), 0);
}
