"use client";

type PaymentSourceCoverageData = {
  checking: number;
  savings: number;
  credit_card: number;
  heloc: number;
  ploc: number;
  cash: number;
  unassigned: number;
};

type PaymentSourceCoverageProps = {
  coverage: PaymentSourceCoverageData;
};

export default function PaymentSourceCoverage({
  coverage,
}: PaymentSourceCoverageProps) {
  return (
    <div className="mt-6 border-t border-[#2a3242] pt-6">
      <h3 className="text-lg font-semibold mb-2">Payment Source Coverage (Current Cycle)</h3>
      <p className="text-xs text-[#7f8da3] mb-4">
        Shows how current-cycle bills are being funded.
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Checking Paid</div>
          <div className="mt-2 break-words text-2xl font-bold text-blue-300">
            ${coverage.checking.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Savings Paid</div>
          <div className="mt-2 break-words text-2xl font-bold text-green-300">
            ${coverage.savings.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Credit Cards Paid</div>
          <div className="mt-2 break-words text-2xl font-bold text-yellow-300">
            ${coverage.credit_card.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">HELOC Paid</div>
          <div className="mt-2 break-words text-2xl font-bold text-orange-300">
            ${coverage.heloc.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Cash Paid</div>
          <div className="mt-2 break-words text-2xl font-bold text-gray-300">
            ${coverage.cash.toFixed(2)}
          </div>
        </div>

        <div className="beast-card">
          <div className="text-sm text-[#c7cfdb]">Unassigned Paid</div>
          <div className="mt-2 break-words text-2xl font-bold text-[#7f8da3]">
            ${coverage.unassigned.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
