import Link from "next/link";

type StrategySnapshotProps = {
  strategy: string;
  extraPayment: number;
  targetDebtName: string;
  activeDebtCount: number;
};

export default function StrategySnapshot({
  strategy,
  extraPayment,
  targetDebtName,
  activeDebtCount,
}: StrategySnapshotProps) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">Strategy</div>
        <div className="mt-2 text-2xl font-bold capitalize">
          {strategy}
        </div>
        {strategy === "velocity" ? (
          <Link
            href="/dashboard/velocity"
            className="mt-3 inline-block text-sm text-[#38bdf8] underline"
          >
            Open Velocity Planner
          </Link>
        ) : null}
      </div>

      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">
          Planned Extra Debt Payment
        </div>
        <div className="mt-2 text-2xl font-bold">
          ${extraPayment.toFixed(2)}
        </div>
      </div>

      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">Attack Target</div>
        <div className="mt-2 text-2xl font-bold">{targetDebtName}</div>
      </div>

      <div className="beast-card">
        <div className="text-sm text-[#c7cfdb]">Active Debt Count</div>
        <div className="mt-2 text-2xl font-bold">{activeDebtCount}</div>
      </div>
    </section>
  );
}
