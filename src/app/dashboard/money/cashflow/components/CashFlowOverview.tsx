type CashFlowOverviewProps = {
  startingBalance: number;
  setStartingBalance: (value: number) => void;
  recalc: (value: number) => void;
  handleStartingBalanceBlur: () => void;
  isStartingBalanceFocusedRef: { current: boolean };
  saveStatus: string;
  requiredCash: number;
  billsDue: number;
  incomeExpected: number;
  netPosition: number;
  buffer: number;
  availableCredit: number;
  monthlySurplus: number;
};

export default function CashFlowOverview({
  startingBalance,
  setStartingBalance,
  recalc,
  handleStartingBalanceBlur,
  isStartingBalanceFocusedRef,
  saveStatus,
  requiredCash,
  billsDue,
  incomeExpected,
  netPosition,
  buffer,
  availableCredit,
  monthlySurplus,
}: CashFlowOverviewProps) {
  return (
      <section className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Cash Flow summary">
        <div className="beast-card">
          <div className="text-sm font-bold text-[#c7cfdb]">
            Checking Balance
          </div>
          <input
            type="number"
            value={startingBalance}
            onFocus={() => {
              isStartingBalanceFocusedRef.current = true;
            }}
            onBlur={() => {
              handleStartingBalanceBlur();
            }}
            onChange={(e) => {
              const val = Number(e.target.value);
              setStartingBalance(val);
              recalc(val);
            }}
            className="beast-input mt-3"
          />
          <div className="mt-2 text-xs text-slate-400 whitespace-nowrap">
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
              ? "Saved"
              : ""}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm font-bold text-[#c7cfdb]">Protected Cash Buffer</div>
          <div className="mt-2 break-words text-2xl font-bold">
            ${buffer.toFixed(2)}
          </div>
          <p className="mt-2 text-xs text-slate-400">${requiredCash.toFixed(2)} required in the current planning window.</p>
        </div>

        <div className="beast-card">
          <div className="text-sm font-bold text-[#c7cfdb]">Available Credit</div>
          <div className="mt-2 break-words text-2xl font-bold">
            ${availableCredit.toFixed(2)}
          </div>
          <p className="mt-2 text-xs text-slate-400">Across active credit sources; not specific to Velocity.</p>
        </div>

        <div className="beast-card">
          <div className="text-sm font-bold text-[#c7cfdb]">Monthly Cash Flow</div>
          <div className="mt-2 break-words text-2xl font-bold">
            ${incomeExpected.toFixed(2)} in
          </div>
          <p className="mt-2 text-xs text-slate-400">${billsDue.toFixed(2)} in known bills and debt minimums.</p>
        </div>

        <div className="beast-card">
          <div className="text-sm font-bold text-[#c7cfdb]">Monthly Surplus</div>
          <div
            className={`mt-2 break-words text-2xl font-bold ${
              monthlySurplus < 0 ? "text-red-300" : "text-green-300"
            }`}
          >
            ${monthlySurplus.toFixed(2)}
          </div>
          <p className="mt-2 text-xs text-slate-400">Current net position: ${netPosition.toFixed(2)}.</p>
        </div>
      </section>
  );
}
