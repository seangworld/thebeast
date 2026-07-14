import { buildCashTimeline, type CashEvent } from "./cashflow";

export type MoneyTodayItem = {
  id: string;
  title: string;
  date: string;
  kind: CashEvent["type"];
  amount: number;
  priority: "today" | "upcoming";
  calendarSource: "BeastMoney";
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function buildMoneyTodayItems({
  incomes = [],
  bills = [],
  debts = [],
  asOfDate = new Date(),
  days = 14,
}: {
  incomes?: any[];
  bills?: any[];
  debts?: any[];
  asOfDate?: Date;
  days?: number;
}): MoneyTodayItem[] {
  const todayKey = dateKey(asOfDate);
  const timeline = buildCashTimeline({
    incomes,
    bills,
    debts,
    startDate: asOfDate,
    days,
  });

  return timeline.map((event, index) => {
    const eventKey = dateKey(event.date);
    return {
      id: `beastmoney-${event.type}-${eventKey}-${index}`,
      title:
        event.type === "income"
          ? `${event.name} expected`
          : `${event.name} due`,
      date: eventKey,
      kind: event.type,
      amount: Math.abs(event.amount),
      priority: eventKey === todayKey ? "today" : "upcoming",
      calendarSource: "BeastMoney",
    };
  });
}
