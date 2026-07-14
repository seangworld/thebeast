import { addMonthsClamped } from "./formatters";

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getFrequencyMonthStep(frequency: string) {
  if (frequency === "every_2_months") return 2;
  if (frequency === "every_3_months") return 3;
  if (frequency === "every_6_months") return 6;
  if (frequency === "yearly") return 12;
  return 1;
}

export function applyBillPartialPayment({
  amountDue,
  alreadyPaid = 0,
  remaining,
  paymentAmount,
  currentCycleDueDate,
  frequency = "monthly",
}: {
  amountDue: number;
  alreadyPaid?: number;
  remaining?: number | null;
  paymentAmount: number;
  currentCycleDueDate: Date;
  frequency?: string;
}) {
  const currentCycleRemaining = Math.max(
    Number(remaining ?? 0),
    Math.max(Number(amountDue || 0) - Number(alreadyPaid || 0), 0)
  );
  const remainingAfterPayment = Math.max(currentCycleRemaining - paymentAmount, 0);
  const shouldAdvanceNextDue = remainingAfterPayment <= 0;
  const nextDueDate =
    shouldAdvanceNextDue && frequency === "weekly"
      ? addDays(currentCycleDueDate, 7)
      : shouldAdvanceNextDue && frequency === "biweekly"
      ? addDays(currentCycleDueDate, 14)
      : shouldAdvanceNextDue
      ? addMonthsClamped(currentCycleDueDate, getFrequencyMonthStep(frequency))
      : null;

  return {
    currentCycleRemaining,
    remainingAfterPayment,
    paidInFull: shouldAdvanceNextDue,
    nextDueDateAfterPayment: nextDueDate ? toDateInputValue(nextDueDate) : null,
  };
}

export function applyDebtPaymentToCycle({
  balance,
  currentCyclePaid = 0,
  paymentAmount,
  minimumPayment,
  currentCycleDueDate,
}: {
  balance: number;
  currentCyclePaid?: number;
  paymentAmount: number;
  minimumPayment: number;
  currentCycleDueDate: Date;
}) {
  const newBalance = Math.max(Number(balance || 0) - paymentAmount, 0);
  const totalCyclePaid = Number(currentCyclePaid || 0) + paymentAmount;
  const shouldAdvanceDueDate =
    newBalance === 0 || totalCyclePaid >= Number(minimumPayment || 0);
  const nextDueDate = shouldAdvanceDueDate
    ? addMonthsClamped(currentCycleDueDate, 1)
    : null;

  return {
    newBalance,
    totalCyclePaid,
    paidInFull: newBalance === 0,
    minimumSatisfied: totalCyclePaid >= Number(minimumPayment || 0),
    nextDueDateAfterPayment: nextDueDate ? toDateInputValue(nextDueDate) : null,
  };
}
