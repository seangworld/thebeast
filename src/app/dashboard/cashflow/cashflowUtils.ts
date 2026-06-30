export type PayoffStrategy = "minimum" | "snowball" | "avalanche" | "velocity";

export type BillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "every_2_months"
  | "every_3_months"
  | "every_6_months"
  | "yearly";

export type PaycheckAssignment = "unassigned" | "paycheck_1" | "paycheck_2";

export type FundingSource = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  current_balance: number;
  credit_limit: number | null;
  available_credit: number | null;
  interest_rate: number | null;
  is_active: boolean;
  linked_debt_id?: string | null;
  created_at: string;
};

export type PaymentSourceCoverageType = {
  checking: number;
  savings: number;
  credit_card: number;
  heloc: number;
  ploc: number;
  cash: number;
  unassigned: number;
};

export type OperationalAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
};

const billFrequencyOptions: { value: BillFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "every_2_months", label: "Every 2 Months" },
  { value: "every_3_months", label: "Every 3 Months" },
  { value: "every_6_months", label: "Every 6 Months" },
  { value: "yearly", label: "Yearly" },
];

const paycheckAssignmentOptions: {
  value: PaycheckAssignment;
  label: string;
}[] = [
  { value: "unassigned", label: "Unassigned" },
  { value: "paycheck_1", label: "Paycheck 1" },
  { value: "paycheck_2", label: "Paycheck 2" },
];

export function getFrequencyLabel(value: string) {
  return (
    billFrequencyOptions.find((option) => option.value === value)?.label ||
    "Monthly"
  );
}

export function getAssignmentLabel(value: string) {
  return (
    paycheckAssignmentOptions.find((option) => option.value === value)?.label ||
    "Unassigned"
  );
}

export function getTargetDebt(debts: any[], strategy: PayoffStrategy) {
  const active = debts.filter((d) => Number(d.balance || 0) > 0);

  if (active.length === 0) return null;

  if (strategy === "minimum" || strategy === "velocity") return null;

  if (strategy === "avalanche") {
    return [...active].sort(
      (a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
    )[0];
  }

  return [...active].sort(
    (a, b) => Number(a.balance || 0) - Number(b.balance || 0)
  )[0];
}

export function formatDate(value: any) {
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value || "");
}

export function getCycleMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function getFrequencyMonthStep(frequency: string) {
  if (frequency === "every_2_months") return 2;
  if (frequency === "every_3_months") return 3;
  if (frequency === "every_6_months") return 6;
  if (frequency === "yearly") return 12;
  return 1;
}

function getNextDueDate(dueDay: number, frequency = "monthly") {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let dueDate = new Date(year, month, dueDay);

  if (dueDate < new Date(year, month, today.getDate())) {
    dueDate = new Date(year, month + getFrequencyMonthStep(frequency), dueDay);
  }

  return dueDate;
}

export function getDebtCycleDueDate(dueDay: number) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const safeDueDay = Math.min(
    Math.max(Number(dueDay || 1), 1),
    new Date(year, month + 1, 0).getDate()
  );

  return new Date(year, month, safeDueDay);
}

export function getCurrentDebtCycleDueDate(debt: any) {
  if (debt?.next_due_date_after_payment) {
    const parsed = parseDateOnly(debt.next_due_date_after_payment);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return getDebtCycleDueDate(Number(debt.due_date || 1));
}

export function getBillCycleDueDate(dueDay: number, cycleMonth: string) {
  const [yearString, monthString] = cycleMonth.split("-");
  const year = Number(yearString);
  const month = Number(monthString) - 1;
  const safeDueDay = Math.min(
    Math.max(Number(dueDay || 1), 1),
    new Date(year, month + 1, 0).getDate()
  );

  return new Date(year, month, safeDueDay);
}

export function getCurrentBillCycleDueDate(bill: any, cycleMonth: string) {
  if (bill?.next_due_date_after_payment) {
    const parsed = parseDateOnly(bill.next_due_date_after_payment);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return getBillCycleDueDate(Number(bill.due_date || 1), cycleMonth);
}

export function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export function compareObligationsByNextDueDate(a: any, b: any) {
  const aTime =
    a?.nextDueDate instanceof Date && !Number.isNaN(a.nextDueDate.getTime())
      ? a.nextDueDate.getTime()
      : Number.POSITIVE_INFINITY;
  const bTime =
    b?.nextDueDate instanceof Date && !Number.isNaN(b.nextDueDate.getTime())
      ? b.nextDueDate.getTime()
      : Number.POSITIVE_INFINITY;

  if (aTime !== bTime) return aTime - bTime;

  const aName = String(a?.name || "");
  const bName = String(b?.name || "");
  const nameCompare = aName.localeCompare(bName);

  if (nameCompare !== 0) return nameCompare;

  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

export function sortObligationsByNextDueDate<T>(obligations: T[]) {
  return [...obligations].sort(compareObligationsByNextDueDate);
}

export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonthsClamped(date: Date, months: number) {
  const originalDay = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return next;
}

export function advanceIncomeDate(date: Date, frequency: string) {
  if (frequency === "weekly") return addDays(date, 7);
  if (frequency === "biweekly") return addDays(date, 14);
  if (frequency === "monthly") return addMonthsClamped(date, 1);
  return addMonthsClamped(date, 1);
}

/**
 * Get the effective balance for a funding source.
 * If the funding source is linked to a debt, returns the debt's balance.
 * Otherwise returns the funding source's current_balance.
 *
 * This ensures that debt/account balance is the single source of truth,
 * preventing balance drift between funding sources and their linked debts.
 */
export function getFundingSourceBalance(
  source: FundingSource,
  linkedDebt?: any
): number {
  if (source.linked_debt_id) {
    return Number(linkedDebt?.balance || 0);
  }
  return Number(source.current_balance || 0);
}

export function getFundingSourceAvailableCredit(
  source: FundingSource,
  linkedDebt?: any
): number | null {
  if (source.credit_limit == null) return null;

  const balance = getFundingSourceBalance(source, linkedDebt);
  return Math.max(Number(source.credit_limit || 0) - balance, 0);
}

export function getNextIncomeDateDisplay(nextDate: string, frequency: string) {
  if (!nextDate) return "—";

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  let date = parseDateOnly(nextDate);
  let safety = 0;

  while (date < todayOnly && safety < 120) {
    date = advanceIncomeDate(date, frequency || "monthly");
    safety += 1;
  }

  return formatShortDate(date);
}

export function buildIncomeBuckets(incomes: any[], days: number) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = addDays(start, Math.max(Number(days || 30), 1));
  const rawBuckets: any[] = [];

  for (const income of incomes) {
    if (!income?.next_date) continue;

    let payDate = parseDateOnly(income.next_date);
    const frequency = income.frequency || "monthly";
    let safety = 0;

    while (payDate < start && safety < 120) {
      payDate = advanceIncomeDate(payDate, frequency);
      safety += 1;
    }

    while (payDate <= end && safety < 240) {
      const dateValue = toDateInputValue(payDate);

      rawBuckets.push({
        id: `${income.id}-${dateValue}`,
        income_id: income.id,
        sourceName: income.name || "Income",
        amount: Number(income.amount || 0),
        frequency,
        date: dateValue,
      });

      payDate = advanceIncomeDate(payDate, frequency);
      safety += 1;
    }
  }

  const groupedByDate: Record<string, any> = {};

  for (const bucket of rawBuckets) {
    if (!groupedByDate[bucket.date]) {
      groupedByDate[bucket.date] = {
        id: `income-pot-${bucket.date}`,
        date: bucket.date,
        amount: 0,
        sources: [],
        sourceName: "Income Pot",
        frequency: "mixed",
      };
    }

    groupedByDate[bucket.date].amount += Number(bucket.amount || 0);
    groupedByDate[bucket.date].sources.push(bucket.sourceName || "Income");
  }

  return Object.values(groupedByDate)
    .map((bucket: any) => {
      const payDate = parseDateOnly(bucket.date);
      const sources = Array.from(new Set(bucket.sources || []));
      const sourceLabel =
        sources.length === 0
          ? "Income Pot"
          : sources.length === 1
          ? String(sources[0])
          : sources.map(String).join(" + ");

      return {
        ...bucket,
        sourceName: sourceLabel,
        label: `${formatShortDate(payDate)} - ${sourceLabel}`,
      };
    })
    .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
}

export function getBillStatus({
  amount,
  paid,
  nextDueDate,
}: {
  amount: number;
  paid: number;
  nextDueDate: Date;
}) {
  const remaining = Math.max(amount - paid, 0);
  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const daysUntilDue = Math.ceil(
    (nextDueDate.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (remaining <= 0) return "Paid";
  if (daysUntilDue < 0) return "Late";
  if (paid > 0) return "Partial";
  if (daysUntilDue <= 5) return "Due Soon";

  return "Upcoming";
}
