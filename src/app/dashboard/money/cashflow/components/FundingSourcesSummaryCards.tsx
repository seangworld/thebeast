"use client";

type FundingSourcesSummaryCardsProps = {
  activeSourceCount: number;
  liquidFundingTotal: number;
  creditAvailableTotal: number;
  creditLimitTotal: number;
  creditUtilizationPercent: number;
};

export default function FundingSourcesSummaryCards({
  activeSourceCount,
  liquidFundingTotal,
  creditAvailableTotal,
  creditLimitTotal,
  creditUtilizationPercent,
}: FundingSourcesSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">Active Sources</div>
        <div className="mt-2 break-words text-2xl font-bold">
          {activeSourceCount}
        </div>
      </div>

      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">Liquid Cash</div>
        <div className="mt-2 break-words text-2xl font-bold text-green-300">
          ${liquidFundingTotal.toFixed(2)}
        </div>
      </div>

      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">Available Credit</div>
        <div className="mt-2 break-words text-2xl font-bold text-yellow-300">
          ${creditAvailableTotal.toFixed(2)}
        </div>
      </div>

      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">Credit Limit</div>
        <div className="mt-2 break-words text-2xl font-bold">
          ${creditLimitTotal.toFixed(2)}
        </div>
      </div>

      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">Credit Utilization</div>
        <div
          className={`mt-2 break-words text-2xl font-bold ${
            creditUtilizationPercent > 90
              ? "text-red-300"
              : creditUtilizationPercent > 70
              ? "text-yellow-300"
              : "text-green-300"
          }`}
        >
          {creditUtilizationPercent.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
