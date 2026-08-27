type BillPaymentOccurrenceRow = {
  bill_id?: unknown;
  cycle_due_date?: unknown;
  amount_paid?: unknown;
};

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function billPaymentOccurrenceKey(
  billId: string,
  cycleDueDate: Date | string
) {
  const dueDate =
    cycleDueDate instanceof Date ? localDateKey(cycleDueDate) : cycleDueDate;
  return `${billId}||${dueDate}`;
}

export function buildBillPaymentOccurrenceTotals(
  payments: BillPaymentOccurrenceRow[]
) {
  const totals: Record<string, number> = {};

  for (const payment of payments) {
    if (
      typeof payment.bill_id !== "string" ||
      typeof payment.cycle_due_date !== "string"
    ) {
      continue;
    }
    const key = billPaymentOccurrenceKey(
      payment.bill_id,
      payment.cycle_due_date
    );
    totals[key] = Number(totals[key] || 0) + Number(payment.amount_paid || 0);
  }

  return totals;
}
