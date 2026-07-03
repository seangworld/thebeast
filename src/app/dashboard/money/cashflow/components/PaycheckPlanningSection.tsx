type PaycheckPlanningSectionProps = {
  nextPaycheckAmount: string;
  setNextPaycheckAmount: (value: string) => void;
  nextPaycheckDate: string;
  setNextPaycheckDate: (value: string) => void;
  secondPaycheckAmount: string;
  setSecondPaycheckAmount: (value: string) => void;
  secondPaycheckDate: string;
  setSecondPaycheckDate: (value: string) => void;
  requiredBeforePaycheck: number;
  projectedAfterObligations: number;
  safeToSpend: number;
};

export default function PaycheckPlanningSection({
  nextPaycheckAmount,
  setNextPaycheckAmount,
  nextPaycheckDate,
  setNextPaycheckDate,
  secondPaycheckAmount,
  setSecondPaycheckAmount,
  secondPaycheckDate,
  setSecondPaycheckDate,
  requiredBeforePaycheck,
  projectedAfterObligations,
  safeToSpend,
}: PaycheckPlanningSectionProps) {
  return (
    <section className="beast-card space-y-5">
      <div>
        <h2 className="text-xl font-bold">Paycheck Coverage</h2>
        <p className="mt-1 text-sm text-[#7f8da3]">
          Coverage is based on scheduled income timing. Manual overrides remain available for exceptions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">
            Required Before Paycheck
          </div>
          <div className="mt-2 break-words text-2xl font-bold">
            ${requiredBeforePaycheck.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">
            Projected After Obligations
          </div>
          <div className="mt-2 break-words text-2xl font-bold">
            ${projectedAfterObligations.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Safe To Spend</div>
          <div
            className={`mt-2 break-words text-2xl font-bold ${
              safeToSpend < 0 ? "text-red-300" : "text-green-300"
            }`}
          >
            ${safeToSpend.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Status</div>
          <div
            className={`mt-2 break-words text-2xl font-bold ${
              safeToSpend < 0 ? "text-red-300" : "text-green-300"
            }`}
          >
            {safeToSpend < 0 ? "Shortfall Risk" : "On Track"}
          </div>
        </div>
      </div>

      <details className="rounded-xl border border-[#2a3242] bg-[#11151c] p-4">
        <summary className="cursor-pointer text-sm font-bold text-[#c7cfdb]">
          Manual paycheck override
        </summary>
        <p className="mt-2 text-sm text-[#7f8da3]">
          Use this only when the next paycheck differs from the saved income schedule.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-[#c7cfdb]">
              Next Paycheck Amount
            </label>
            <input
              type="number"
              value={nextPaycheckAmount}
              onChange={(e) => setNextPaycheckAmount(e.target.value)}
              placeholder="0"
              className="beast-input mt-2"
            />
          </div>

          <div>
            <label className="text-sm text-[#c7cfdb]">
              Next Paycheck Date
            </label>
            <input
              type="date"
              value={nextPaycheckDate}
              onChange={(e) => setNextPaycheckDate(e.target.value)}
              className="beast-input mt-2"
            />
          </div>

          <div>
            <label className="text-sm text-[#c7cfdb]">
              Following Paycheck Amount
            </label>
            <input
              type="number"
              value={secondPaycheckAmount}
              onChange={(e) => setSecondPaycheckAmount(e.target.value)}
              placeholder="0"
              className="beast-input mt-2"
            />
          </div>

          <div>
            <label className="text-sm text-[#c7cfdb]">
              Following Paycheck Date
            </label>
            <input
              type="date"
              value={secondPaycheckDate}
              onChange={(e) => setSecondPaycheckDate(e.target.value)}
              className="beast-input mt-2"
            />
          </div>
        </div>
      </details>
    </section>
  );
}
