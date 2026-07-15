type IncomeSourcesSectionProps = {
  showIncomeEvents: boolean;
  setShowIncomeEvents: (value: boolean) => void;
  incomes: any[];
  editingIncomeId: string | null;
  editIncomeName: string;
  editIncomeAmount: string;
  editIncomeFrequency: string;
  editIncomeNextDate: string;
  setEditIncomeName: (value: string) => void;
  setEditIncomeAmount: (value: string) => void;
  setEditIncomeFrequency: (value: string) => void;
  setEditIncomeNextDate: (value: string) => void;
  getNextIncomeDateDisplay: (date: string, frequency: string) => string;
  startEditIncome: (income: any) => void;
  saveIncomeEdit: (id: string) => void;
  cancelEditIncome: () => void;
  deleteIncome: (id: string) => void;
};

export default function IncomeSourcesSection({
  showIncomeEvents,
  setShowIncomeEvents,
  incomes,
  editingIncomeId,
  editIncomeName,
  editIncomeAmount,
  editIncomeFrequency,
  editIncomeNextDate,
  setEditIncomeName,
  setEditIncomeAmount,
  setEditIncomeFrequency,
  setEditIncomeNextDate,
  getNextIncomeDateDisplay,
  startEditIncome,
  saveIncomeEdit,
  cancelEditIncome,
  deleteIncome,
}: IncomeSourcesSectionProps) {
  return (
    <section className="beast-panel overflow-hidden">
      <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="money-section-title">Income Sources / Schedule</h2>
          <p className="mt-1 text-sm text-[#7f8da3]">
            Manage recurring income sources. Income timing appears in the Income
            Date Planning section above.
          </p>
        </div>

        <button
          onClick={() => setShowIncomeEvents(!showIncomeEvents)}
          className="beast-button-secondary"
        >
          {showIncomeEvents ? "Hide" : `Show (${incomes.length})`}
        </button>
      </div>

      {showIncomeEvents && (
        <div className="beast-table-wrap">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-right">Amount</th>
                <th className="text-center">Frequency</th>
                <th className="text-center">Next Pay Date</th>
                <th className="text-right"></th>
              </tr>
            </thead>

            <tbody>
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan={5}>No income events added yet.</td>
                </tr>
              ) : (
                incomes.map((income) => (
                  <tr key={income.id}>
                    <td className="text-left">
                      {editingIncomeId === income.id ? (
                        <input
                          value={editIncomeName}
                          onChange={(e) => setEditIncomeName(e.target.value)}
                          className="beast-input"
                        />
                      ) : (
                        income.name
                      )}
                    </td>

                    <td className="text-right">
                      {editingIncomeId === income.id ? (
                        <input
                          type="number"
                          value={editIncomeAmount}
                          onChange={(e) => setEditIncomeAmount(e.target.value)}
                          className="beast-input"
                        />
                      ) : (
                        `$${Number(income.amount || 0).toFixed(2)}`
                      )}
                    </td>

                    <td className="text-center">
                      {editingIncomeId === income.id ? (
                        <select
                          value={editIncomeFrequency}
                          onChange={(e) => setEditIncomeFrequency(e.target.value)}
                          className="beast-input"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Biweekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      ) : (
                        income.frequency
                      )}
                    </td>

                    <td className="text-center">
                      {editingIncomeId === income.id ? (
                        <input
                          type="date"
                          value={editIncomeNextDate}
                          onChange={(e) => setEditIncomeNextDate(e.target.value)}
                          className="beast-input"
                        />
                      ) : (
                        getNextIncomeDateDisplay(
                          income.next_date,
                          income.frequency
                        )
                      )}
                    </td>

                    <td className="text-right">
                      {editingIncomeId === income.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveIncomeEdit(income.id)}
                            className="beast-button"
                          >
                            Save
                          </button>

                          <button
                            onClick={cancelEditIncome}
                            className="beast-button-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditIncome(income)}
                            className="beast-button-secondary"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteIncome(income.id)}
                            className="beast-button"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
