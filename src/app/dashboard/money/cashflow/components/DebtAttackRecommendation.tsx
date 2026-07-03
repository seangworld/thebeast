import { getDebtStrategyLabel } from "@/lib/debtStrategies";

type DebtAttackRecommendationProps = {
  suggestedMonthlyDebtAttack: number | null;
  incomes: any[];
  nextPaycheckAmount: string;
  recommendedTargetDebt: any;
  strategy: string;
  isApplyingSuggestedAttack: boolean;
  applySuggestedAttack: () => void;
  suggestedAttackMessage: string | null;
};

export default function DebtAttackRecommendation({
  suggestedMonthlyDebtAttack,
  incomes,
  nextPaycheckAmount,
  recommendedTargetDebt,
  strategy,
  isApplyingSuggestedAttack,
  applySuggestedAttack,
  suggestedAttackMessage,
}: DebtAttackRecommendationProps) {
  return (
    <section className="beast-card space-y-4">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-[#c7cfdb]">
          Suggested Monthly Debt Attack
        </div>
        <div className="text-3xl font-bold">
          {suggestedMonthlyDebtAttack !== null
            ? `$${suggestedMonthlyDebtAttack.toFixed(2)}`
            : incomes.length === 0 && !nextPaycheckAmount
            ? "Add income entries or enter paycheck details"
            : "Enter starting balance and buffer to calculate"}
        </div>
        <p className="text-sm text-[#7f8da3]">
          {suggestedMonthlyDebtAttack !== null
            ? "Based on current paycheck input, upcoming bills, debt minimums, and your checking buffer."
            : incomes.length === 0 && !nextPaycheckAmount
            ? "Set up recurring income in the Income section or enter next paycheck manually."
            : "Configure your starting checking balance and buffer in settings."}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
        <div className="text-sm text-[#c7cfdb]">Recommended Target</div>
        {recommendedTargetDebt ? (
          <div className="flex flex-col gap-1">
            <div className="text-base font-semibold text-white">
              {recommendedTargetDebt.name}
            </div>
            <div className="text-xs text-[#7f8da3]">
              Based on:{" "}
              {strategy === "velocity"
                ? "Velocity Planner"
                : `${getDebtStrategyLabel(strategy)} strategy`}
            </div>
          </div>
        ) : (
          <div className="text-sm text-[#7f8da3]">
            No active debt target available.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 items-start">
        <button
          className="beast-button w-fit disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={
            isApplyingSuggestedAttack ||
            suggestedMonthlyDebtAttack === null ||
            suggestedMonthlyDebtAttack <= 0 ||
            !recommendedTargetDebt ||
            Number(recommendedTargetDebt.balance || 0) <= 0
          }
          onClick={applySuggestedAttack}
        >
          {isApplyingSuggestedAttack ? "Applying..." : "Apply Suggested Attack"}
        </button>
        <div className="text-xs text-[#7f8da3]">
          This records the payment inside The Beast only. Complete the real payment through your lender.
        </div>
      </div>

      {suggestedAttackMessage && (
        <div className={`rounded-lg border p-3 text-sm ${
          suggestedAttackMessage.includes("Error") || suggestedAttackMessage.includes("already")
            ? "border-red-400/60 bg-red-950/30 text-red-100"
            : "border-green-400/60 bg-green-950/30 text-green-100"
        }`}>
          {suggestedAttackMessage}
        </div>
      )}

      <p className="text-xs text-slate-500">
        The Beast does not connect to or transact with your financial
        institutions. Applying payments, marking bills paid, or updating
        balances inside The Beast does not move real money. Always verify and
        complete transactions through your actual bank, lender, or payment
        provider.
      </p>
    </section>
  );
}
