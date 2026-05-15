import { addDays } from "date-fns";

export type CashEvent = {
  date: Date;
  type: "income" | "bill" | "debt";
  name: string;
  amount: number;
};

export type SimulatedCashEvent = CashEvent & {
  balance: number;
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
  const endDate = addDays(startDate, days);

  incomes.forEach((inc) => {
    let current = new Date(inc.next_date);

    while (current <= endDate) {
      if (current >= startDate) {
        timeline.push({
          date: new Date(current),
          type: "income",
          name: inc.name,
          amount: Number(inc.amount),
        });
      }

      current = advanceByFrequency(current, inc.frequency);
    }
  });

  bills.forEach((bill) => {
    let current = getFirstDueDateFromDay(
      startDate,
      Number(bill.due_date || 1)
    );

    while (current <= endDate) {
      timeline.push({
        date: new Date(current),
        type: "bill",
        name: bill.name,
        amount: -Number(bill.amount),
      });

      current = advanceByFrequency(current, bill.frequency || "monthly");
    }
  });

  debts.forEach((debt) => {
    let current = getFirstDueDateFromDay(
      startDate,
      Number(debt.due_date || 1)
    );

    while (current <= endDate) {
      timeline.push({
        date: new Date(current),
        type: "debt",
        name: `${debt.name} (Min)`,
        amount: -Number(debt.minimum_payment),
      });

      current = advanceByFrequency(current, "monthly");
    }
  });

  return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
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
  let balance = Number(startingBalance);

  return timeline.map((event) => {
    balance += Number(event.amount);

    return {
      ...event,
      balance,
      belowBuffer: balance < Number(buffer),
    };
  });
}

export function calculateRequiredCash(timeline: CashEvent[]) {
  let running = 0;
  let minBalance = 0;

  timeline.forEach((event) => {
    running += Number(event.amount);

    if (running < minBalance) {
      minBalance = running;
    }
  });

  return Math.abs(minBalance);
}

export function calculateBillsDue(timeline: CashEvent[]) {
  return timeline
    .filter((event) => event.type === "bill" || event.type === "debt")
    .reduce((total, event) => total + Math.abs(Number(event.amount)), 0);
}

export function calculateIncomeExpected(timeline: CashEvent[]) {
  return timeline
    .filter((event) => event.type === "income")
    .reduce((total, event) => total + Number(event.amount), 0);
}