type IncomeDatePlanningSectionProps = {
  incomeBucketPlans: any[];
  unassignedBills: any[];
  unassignedDebts: any[];
  unassignedObligationsTotal: number;
  lookaheadDays: number;
};

export default function IncomeDatePlanningSection({
  incomeBucketPlans,
  unassignedBills,
  unassignedDebts,
  unassignedObligationsTotal,
  lookaheadDays,
}: IncomeDatePlanningSectionProps) {
  return (
    <section className="beast-card space-y-5">
      <div>
        <h2 className="money-section-title">Income Date Planning</h2>
        <p className="mt-1 text-sm text-[#7f8da3]">
          Assign bills and debt minimums to the real income date that should
          cover them.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">
            Upcoming Income Buckets
          </div>
          <div className="mt-2 break-words text-2xl font-bold">
            {incomeBucketPlans.length}
          </div>
          <p className="mt-2 text-sm text-[#7f8da3]">
            Generated from your income schedule.
          </p>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Unassigned Items</div>
          <div className="mt-2 break-words text-2xl font-bold">
            {unassignedBills.length + unassignedDebts.length}
          </div>
          <p className="mt-2 text-sm text-[#7f8da3]">
            Assign these in the Bills and Debt Minimums tables below.
          </p>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">
            Unassigned Obligations
          </div>
          <div
            className={`mt-2 break-words text-2xl font-bold ${
              unassignedObligationsTotal > 0
                ? "text-yellow-300"
                : "text-green-300"
            }`}
          >
            ${unassignedObligationsTotal.toFixed(2)}
          </div>
          <p className="mt-2 text-sm text-[#7f8da3]">
            Money not assigned to an income pot yet.
          </p>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Planning Window</div>
          <div className="mt-2 break-words text-2xl font-bold">
            {Number(lookaheadDays || 30)} Days
          </div>
          <p className="mt-2 text-sm text-[#7f8da3]">
            Income buckets are generated from today forward.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {incomeBucketPlans.length === 0 ? (
          <div className="beast-panel p-4 text-sm text-[#c7cfdb]">
            No upcoming income buckets found. Add income events or update
            next pay dates.
          </div>
        ) : (
          incomeBucketPlans.slice(0, 8).map((bucket) => (
            <div key={bucket.id} className="beast-panel overflow-hidden">
              <div className="border-b border-[#2a3242] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold">{bucket.label}</h3>
                    <p className="text-sm text-[#7f8da3]">
                      Income pot: ${Number(bucket.amount || 0).toFixed(2)}
                    </p>
                  </div>

                  <div
                    className={`text-sm font-semibold ${
                      bucket.safeAfterBuffer < 0
                        ? "text-red-300"
                        : "text-green-300"
                    }`}
                  >
                    {bucket.safeAfterBuffer < 0
                      ? `$${Math.abs(bucket.safeAfterBuffer).toFixed(
                          2
                        )} short after buffer`
                      : `$${bucket.safeAfterBuffer.toFixed(
                          2
                        )} safe after buffer`}
                  </div>
                </div>
              </div>

              <div className="p-4 text-sm text-[#c7cfdb]">
                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                  <div>
                    <div className="text-[#7f8da3]">Assigned</div>
                    <div className="font-bold">
                      ${bucket.assignedTotal.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#7f8da3]">Available</div>
                    <div className="font-bold">
                      ${bucket.availableToAssign.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#7f8da3]">Debt Minimums</div>
                    <div className="font-bold">
                      ${bucket.debtMinimumsTotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {bucket.assignedBills.length === 0 &&
                bucket.assignedDebts.length === 0 ? (
                  <p>No obligations assigned yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {bucket.assignedBills.map((bill: any) => (
                      <li
                        key={`bill-${bucket.id}-${bill.id}`}
                        className="flex justify-between gap-4"
                      >
                        <span>{bill.name}</span>
                        <span>
                          ${Number(bill.remaining || 0).toFixed(2)}
                        </span>
                      </li>
                    ))}

                    {bucket.assignedDebts.map((debt: any) => (
                      <li
                        key={`debt-${bucket.id}-${debt.id}`}
                        className="flex justify-between gap-4"
                      >
                        <span>{debt.name} minimum</span>
                        <span>
                          ${Number(debt.minimum_payment || 0).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
