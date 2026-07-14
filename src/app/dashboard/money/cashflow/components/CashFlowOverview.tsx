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
}: CashFlowOverviewProps) {
  return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">
            Starting Checking Balance
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
          <div className="text-sm text-[#c7cfdb]">Required Cash</div>
          <div className="mt-2 break-words text-2xl font-bold">
            ${requiredCash.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Bills + Debt Due</div>
          <div className="mt-2 break-words text-2xl font-bold">
            ${billsDue.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Income Expected</div>
          <div className="mt-2 break-words text-2xl font-bold">
            ${incomeExpected.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Net Position</div>
          <div
            className={`mt-2 break-words text-2xl font-bold ${
              netPosition < buffer ? "text-red-300" : "text-green-300"
            }`}
          >
            ${netPosition.toFixed(2)}
          </div>
        </div>
      </section>
  );
}
