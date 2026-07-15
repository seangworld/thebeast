type DailyOperatingFocusProps = {
  operationalAlerts: any[];
  safeToSpend: number;
  requiredBeforePaycheck: number;
  startingBalance: number;
  billsDueNext7Days: any;
  billsAhead: any;
  unassignedObligationsCount: number;
  fundingSourceRiskCount: number;
  recommendedNextSteps: string[];
  buffer: number;
};

export default function DailyOperatingFocus({
  operationalAlerts,
  safeToSpend,
  requiredBeforePaycheck,
  startingBalance,
  billsDueNext7Days,
  billsAhead,
  unassignedObligationsCount,
  fundingSourceRiskCount,
  recommendedNextSteps,
  buffer,
}: DailyOperatingFocusProps) {
  return (
    <>
      <section className="space-y-2">
        <p className="beast-kicker">Command Zone</p>
        <h2 className="text-2xl font-bold">Daily operating focus</h2>
      </section>

      {operationalAlerts.length > 0 && (
        <section className="beast-card space-y-4">
          <div>
            <h2 className="money-section-title">Operational Alerts</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Current cashflow items that need attention.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {operationalAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border p-3 text-sm ${
                  alert.severity === "critical"
                    ? "border-red-400/60 bg-red-950/30 text-red-100"
                    : alert.severity === "warning"
                    ? "border-yellow-300/60 bg-yellow-950/20 text-yellow-100"
                    : "border-sky-300/60 bg-sky-950/20 text-sky-100"
                }`}
              >
                <div className="font-bold">{alert.title}</div>
                <div className="mt-1 opacity-90">{alert.message}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="beast-card space-y-4">
        <div>
          <h2 className="money-section-title">Daily Command Summary</h2>
          <p className="mt-1 text-sm text-[#7f8da3]">
            Quick operating numbers for today.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="beast-panel p-4">
            <div className="text-sm text-[#c7cfdb]">Safe To Spend</div>
            <div
              className={`mt-2 break-words text-2xl font-bold ${
                safeToSpend < 0
                  ? "text-red-300"
                  : safeToSpend < Number(buffer || 0) * 0.25
                  ? "text-yellow-300"
                  : "text-green-300"
              }`}
            >
              ${safeToSpend.toFixed(2)}
            </div>
          </div>

          <div className="beast-panel p-4">
            <div className="text-sm text-[#c7cfdb]">
              Required Before Paycheck
            </div>
            <div
              className={`mt-2 break-words text-2xl font-bold ${
                requiredBeforePaycheck > Number(startingBalance || 0)
                  ? "text-red-300"
                  : requiredBeforePaycheck >
                    Number(startingBalance || 0) * 0.75
                  ? "text-yellow-300"
                  : "text-green-300"
              }`}
            >
              ${requiredBeforePaycheck.toFixed(2)}
            </div>
          </div>

          <div className="beast-panel p-4">
            <div className="text-sm text-[#c7cfdb]">Bills Due 7 Days</div>
            <div
              className={`mt-2 break-words text-2xl font-bold ${
                billsDueNext7Days.total > Number(startingBalance || 0)
                  ? "text-red-300"
                  : billsDueNext7Days.bills.length > 0
                  ? "text-yellow-300"
                  : "text-green-300"
              }`}
            >
              ${billsDueNext7Days.total.toFixed(2)}
            </div>
          </div>

          <div className="beast-panel p-4">
            <div className="text-sm text-[#c7cfdb]">Bills Due 30 Days</div>
            <div
              className={`mt-2 break-words text-2xl font-bold ${
                billsAhead.total > Number(startingBalance || 0)
                  ? "text-red-300"
                  : billsAhead.bills.length > 0
                  ? "text-yellow-300"
                  : "text-green-300"
              }`}
            >
              ${billsAhead.total.toFixed(2)}
            </div>
          </div>

          <div className="beast-panel p-4">
            <div className="text-sm text-[#c7cfdb]">
              Unassigned Obligations
            </div>
            <div
              className={`mt-2 break-words text-2xl font-bold ${
                unassignedObligationsCount > 0
                  ? "text-yellow-300"
                  : "text-green-300"
              }`}
            >
              {unassignedObligationsCount}
            </div>
          </div>

          <div className="beast-panel p-4">
            <div className="text-sm text-[#c7cfdb]">Funding Risk Count</div>
            <div
              className={`mt-2 break-words text-2xl font-bold ${
                fundingSourceRiskCount > 0
                  ? "text-red-300"
                  : "text-green-300"
              }`}
            >
              {fundingSourceRiskCount}
            </div>
          </div>
        </div>
      </section>

      <section className="beast-card space-y-4">
        <div>
          <h2 className="money-section-title">Recommended Next Step Today</h2>
          <p className="mt-1 text-sm text-[#7f8da3]">
            Rules-based guidance from current assignments, cash pots, and
            active obligations.
          </p>
        </div>

        <div className="grid gap-3">
          {recommendedNextSteps.map((step, index) => (
            <div
              key={`${step}-${index}`}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-sm text-[#c7cfdb]"
            >
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="beast-kicker">Execution Zone</p>
        <h2 className="text-2xl font-bold">Active cashflow management</h2>
      </section>
    </>
  );
}
