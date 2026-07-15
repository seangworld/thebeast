type CashTimelineSectionProps = {
  showCashTimeline: boolean;
  setShowCashTimeline: (value: boolean) => void;
  data: any[];
  loading: boolean;
  formatDate: (value: any) => string;
  buffer: number;
};

export default function CashTimelineSection({
  showCashTimeline,
  setShowCashTimeline,
  data,
  loading,
  formatDate,
  buffer,
}: CashTimelineSectionProps) {
  return (
    <section className="beast-panel overflow-hidden">
      <div className="flex flex-col items-start gap-4 border-b border-[#2a3242] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="money-section-title">Cash Timeline</h2>
          <p className="mt-1 text-sm text-[#7f8da3]">
            Detailed projected cashflow events and running balance.
          </p>
        </div>

        <button
          onClick={() => setShowCashTimeline(!showCashTimeline)}
          className="beast-button-secondary"
        >
          {showCashTimeline ? "Hide" : `Show (${data.length})`}
        </button>
      </div>

      {showCashTimeline && (
        <div className="beast-table-wrap">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Name</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Running Balance</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading cashflow...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6}>No cashflow events found.</td>
                </tr>
              ) : (
                data.map((row, index) => {
                  const runningBalance = Number(
                    row.runningBalance || row.running_balance || 0
                  );

                  return (
                    <tr key={`${formatDate(row.date)}-${row.name}-${index}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.type}</td>
                      <td>{row.name}</td>
                      <td className="text-right">
                        ${Number(row.amount || 0).toFixed(2)}
                      </td>
                      <td className="text-right">
                        ${runningBalance.toFixed(2)}
                      </td>
                      <td>
                        {runningBalance < buffer ? (
                          <span className="text-red-300">Risk</span>
                        ) : (
                          <span className="text-green-300">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
