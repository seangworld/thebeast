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

  // INCOME
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

      if (inc.frequency === "weekly") {
        current.setDate(current.getDate() + 7);
      } else if (inc.frequency === "biweekly") {
        current.setDate(current.getDate() + 14);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
  });

  // BILLS
  for (let i = 0; i <= days; i++) {
    const currentDate = addDays(startDate, i);

    bills.forEach((bill) => {
      if (currentDate.getDate() === Number(bill.due_date)) {
        timeline.push({
          date: currentDate,
          type: "bill",
          name: bill.name,
          amount: -Number(bill.amount),
        });
      }
    });

    // DEBT MIN PAYMENTS
    debts.forEach((debt) => {
      if (currentDate.getDate() === Number(debt.due_date)) {
        timeline.push({
          date: currentDate,
          type: "debt",
          name: `${debt.name} (Min)`,
          amount: -Number(debt.minimum_payment),
        });
      }
    });
  }

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