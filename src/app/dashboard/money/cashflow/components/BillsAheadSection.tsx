import type { buildExpensesAhead } from "@/lib/expensesAhead";

type ExpensesAheadSectionProps = {
  expensesAhead: ReturnType<typeof buildExpensesAhead>;
  getFrequencyLabel: (value: string) => string;
  getIncomeBucketLabel: (value: string) => string;
  getPaymentConfigurationLabel: (record: any) => string;
};

export default function ExpensesAheadSection({
  expensesAhead,
  getFrequencyLabel,
  getIncomeBucketLabel,
  getPaymentConfigurationLabel,
}: ExpensesAheadSectionProps) {
  return (
    <section className="beast-card space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="money-section-title">Expenses Ahead</h2>
          <p className="mt-1 text-sm text-[#7f8da3]">
            Bills and debt minimum payments due in the next 30 days, ordered by due date, with
            payment configuration and income pot assignments.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
          <div className="beast-panel p-4">
            <div className="text-sm text-[#c7cfdb]">Expenses Due</div>
            <div className="mt-2 break-words text-2xl font-bold">
              {expensesAhead.expenses.length}
            </div>
          </div>

          <div className="beast-panel p-4">
            <div className="text-sm text-[#c7cfdb]">
              Upcoming Expense Amount
            </div>
            <div className="mt-2 break-words text-2xl font-bold text-yellow-300">
              ${expensesAhead.total.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="beast-panel p-3">
          <div className="text-xs text-[#7f8da3]">
            Total Upcoming Expenses
          </div>
          <div className="mt-1 text-lg font-bold">
            {expensesAhead.expenses.length}
          </div>
        </div>

        <div className="beast-panel p-3">
          <div className="text-xs text-[#7f8da3]">Total Due Amount</div>
          <div className="mt-1 text-lg font-bold">
            ${expensesAhead.total.toFixed(2)}
          </div>
        </div>

        <div className="beast-panel p-3">
          <div className="text-xs text-[#7f8da3]">
            Unassigned Income Pots
          </div>
          <div
            className={`mt-1 text-lg font-bold ${
              expensesAhead.unassignedIncomePots > 0
                ? "text-yellow-300"
                : "text-green-300"
            }`}
          >
            {expensesAhead.unassignedIncomePots}
          </div>
        </div>

        <div className="beast-panel p-3">
          <div className="text-xs text-[#7f8da3]">
            Incomplete Payment Setups
          </div>
          <div
            className={`mt-1 text-lg font-bold ${
              expensesAhead.unassignedFundingSources > 0
                ? "text-yellow-300"
                : "text-green-300"
            }`}
          >
            {expensesAhead.unassignedFundingSources}
          </div>
        </div>
      </div>

      <div className="beast-table-wrap" tabIndex={0} role="region" aria-label="Upcoming expenses table">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              <th className="text-left">Expense</th>
              <th className="text-right">Remaining</th>
              <th className="text-center" aria-sort="ascending">Due Date</th>
              <th className="text-center">Income Pot</th>
              <th className="text-center">Payment Configuration</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>

          <tbody>
            {expensesAhead.expenses.length === 0 ? (
              <tr>
                <td colSpan={6}>No expenses due in the next 30 days.</td>
              </tr>
            ) : (
              expensesAhead.expenses.map((bill) => (
                <tr
                  key={`ahead-${bill.id}`}
                  className={
                    bill.status === "Late"
                      ? "border-l-4 border-l-red-400"
                      : bill.status === "Due Soon"
                      ? "border-l-4 border-l-yellow-300"
                      : undefined
                  }
                >
                  <td className="text-left">
                    <div className="font-semibold">{bill.name}</div>
                    <div className="mt-1 text-xs text-[#7f8da3]">
                      {bill.kind === "debt" ? "Debt minimum" : "Bill"} · {getFrequencyLabel(bill.frequency)}
                    </div>
                  </td>
                  <td className="text-right font-semibold">
                    ${Number(bill.remaining || 0).toFixed(2)}
                  </td>
                  <td className="text-center">
                    {bill.nextDueDateDisplay}
                  </td>
                  <td className="text-center">
                    {getIncomeBucketLabel(bill.assigned_income_date)}
                  </td>
                  <td className="text-center">
                    {getPaymentConfigurationLabel(bill)}
                  </td>
                  <td className="text-center">
                    <span
                      className={
                        bill.status === "Paid"
                          ? "text-green-300"
                          : bill.status === "Partial" ||
                            bill.status === "Due Soon"
                          ? "text-yellow-300"
                          : bill.status === "Late"
                          ? "text-red-300"
                          : "text-[#c7cfdb]"
                      }
                    >
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
