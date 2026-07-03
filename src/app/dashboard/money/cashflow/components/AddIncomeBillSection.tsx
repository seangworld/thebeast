import type { BillFrequency } from "../cashflowUtils";

type AddIncomeBillSectionProps = {
  showAddIncome: boolean;
  setShowAddIncome: (value: boolean) => void;
  incomeName: string;
  setIncomeName: (value: string) => void;
  incomeAmount: string;
  setIncomeAmount: (value: string) => void;
  incomeFrequency: string;
  setIncomeFrequency: (value: string) => void;
  incomeNextDate: string;
  setIncomeNextDate: (value: string) => void;
  addIncome: () => void;
  showAddBill: boolean;
  setShowAddBill: (value: boolean) => void;
  billName: string;
  setBillName: (value: string) => void;
  billAmount: string;
  setBillAmount: (value: string) => void;
  billDueDate: string;
  setBillDueDate: (value: string) => void;
  billFrequency: BillFrequency;
  setBillFrequency: (value: BillFrequency) => void;
  billFrequencyOptions: { value: BillFrequency; label: string }[];
  addBill: () => void;
};

export default function AddIncomeBillSection({
  showAddIncome,
  setShowAddIncome,
  incomeName,
  setIncomeName,
  incomeAmount,
  setIncomeAmount,
  incomeFrequency,
  setIncomeFrequency,
  incomeNextDate,
  setIncomeNextDate,
  addIncome,
  showAddBill,
  setShowAddBill,
  billName,
  setBillName,
  billAmount,
  setBillAmount,
  billDueDate,
  setBillDueDate,
  billFrequency,
  setBillFrequency,
  billFrequencyOptions,
  addBill,
}: AddIncomeBillSectionProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="beast-card">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Add Income</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Add or schedule a recurring income source.
            </p>
          </div>

          <button
            onClick={() => setShowAddIncome(!showAddIncome)}
            className="beast-button-secondary"
          >
            {showAddIncome ? "Hide" : "Show"}
          </button>
        </div>

        {showAddIncome && (
          <div className="mt-4 grid gap-3">
            <input
              value={incomeName}
              onChange={(e) => setIncomeName(e.target.value)}
              placeholder="Income name"
              className="beast-input"
            />

            <input
              type="number"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              placeholder="Amount"
              className="beast-input"
            />

            <select
              value={incomeFrequency}
              onChange={(e) => setIncomeFrequency(e.target.value)}
              className="beast-input"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>

            <input
              type="date"
              value={incomeNextDate}
              onChange={(e) => setIncomeNextDate(e.target.value)}
              className="beast-input"
            />

            <button onClick={addIncome} className="beast-button">
              Add Income
            </button>
          </div>
        )}
      </div>

      <div className="beast-card">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Add Bill</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Add a recurring bill or service-based obligation.
            </p>
          </div>

          <button
            onClick={() => setShowAddBill(!showAddBill)}
            className="beast-button-secondary"
          >
            {showAddBill ? "Hide" : "Show"}
          </button>
        </div>

        {showAddBill && (
          <div className="mt-4 grid gap-3">
            <input
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="Bill name"
              className="beast-input"
            />

            <input
              type="number"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              placeholder="Amount"
              className="beast-input"
            />

            <input
              type="number"
              min="1"
              max="31"
              value={billDueDate}
              onChange={(e) => setBillDueDate(e.target.value)}
              placeholder="Due day"
              className="beast-input"
            />

            <select
              value={billFrequency}
              onChange={(e) =>
                setBillFrequency(e.target.value as BillFrequency)
              }
              className="beast-input"
            >
              {billFrequencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button onClick={addBill} className="beast-button">
              Add Bill
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
