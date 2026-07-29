type ArchivedItemsSectionProps = {
  showArchivedBills: boolean;
  setShowArchivedBills: (value: boolean) => void;
  archivedBills: any[];
  getFrequencyLabel: (value: string) => string;
  getIncomeBucketLabel: (value: string) => string;
  getPaymentConfigurationLabel: (record: any) => string;
  unarchiveBill: (id: string) => void;
};

export default function ArchivedItemsSection({
  showArchivedBills,
  setShowArchivedBills,
  archivedBills,
  getFrequencyLabel,
  getIncomeBucketLabel,
  getPaymentConfigurationLabel,
  unarchiveBill,
}: ArchivedItemsSectionProps) {
  return (
    <section className="beast-panel overflow-hidden">
        <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="money-section-title">Archived Bills</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Hidden from planning and income-date calculations.
            </p>
          </div>

          <button
            onClick={() => setShowArchivedBills(!showArchivedBills)}
            className="beast-button-secondary"
          >
            {showArchivedBills ? "Hide" : `Show (${archivedBills.length})`}
          </button>
        </div>

        {showArchivedBills && (
          <div className="beast-table-wrap" tabIndex={0} role="region" aria-label="Archived bills table">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-right">Amount</th>
                  <th className="text-center">Frequency</th>
                  <th className="text-center">Income Date</th>
                  <th className="text-center">Payment Configuration</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {archivedBills.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No archived bills.</td>
                  </tr>
                ) : (
                  archivedBills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="text-left">{bill.name}</td>
                      <td className="text-right">
                        ${Number(bill.remaining || 0).toFixed(2)}
                      </td>
                      <td className="text-center">
                        {getFrequencyLabel(bill.frequency)}
                      </td>
                      <td className="text-center">
                        {getIncomeBucketLabel(bill.assigned_income_date)}
                      </td>
                      <td className="text-center">
                        {getPaymentConfigurationLabel(bill)}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => unarchiveBill(bill.id)}
                          className="beast-button"
                        >
                          Unarchive
                        </button>
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
