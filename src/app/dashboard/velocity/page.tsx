"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SnapshotValue = {
  label: string;
  value: string;
  detail?: string;
};

const sourceTypes = ["HELOC", "PLOC", "Credit Card", "Other"];

export default function VelocityPlannerPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [strategy, setStrategy] = useState("—");
  const [extraAttack, setExtraAttack] = useState<number | null>(null);
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [buffer, setBuffer] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const getUserId = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: debtRows } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId);

    const { data: fundingRows } = await supabase
      .from("funding_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: debtSettings } = await supabase
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: cashSettings } = await supabase
      .from("cash_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setDebts(debtRows || []);
    setFundingSources(fundingRows || []);
    setStrategy(debtSettings?.strategy || "—");
    setExtraAttack(
      debtSettings?.extra_payment != null
        ? Number(debtSettings.extra_payment)
        : null
    );
    setStartingBalance(
      cashSettings?.starting_balance != null
        ? Number(cashSettings.starting_balance)
        : null
    );
    setBuffer(
      cashSettings?.checking_buffer != null
        ? Number(cashSettings.checking_buffer)
        : null
    );
    setLoading(false);
  }, [getUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeDebts = useMemo(() => {
    return debts.filter(
      (debt) => !Boolean(debt.is_archived) && Number(debt.balance || 0) > 0
    );
  }, [debts]);

  const totalDebtBalance = useMemo(() => {
    return activeDebts.reduce(
      (sum, debt) => sum + Number(debt.balance || 0),
      0
    );
  }, [activeDebts]);

  const currentMonthlySurplus =
    startingBalance == null || buffer == null ? null : startingBalance - buffer;

  const snapshotValues: SnapshotValue[] = [
    {
      label: "Active Debt Count",
      value: loading ? "Loading..." : String(activeDebts.length),
    },
    {
      label: "Total Debt Balance",
      value: loading ? "Loading..." : `$${totalDebtBalance.toFixed(2)}`,
    },
    {
      label: "Current Strategy",
      value: loading ? "Loading..." : strategy,
    },
    {
      label: "Current Extra Attack",
      value:
        loading || extraAttack == null
          ? loading
            ? "Loading..."
            : "Not set"
          : `$${extraAttack.toFixed(2)}`,
    },
    {
      label: "Current Monthly Surplus",
      value:
        loading || currentMonthlySurplus == null
          ? loading
            ? "Loading..."
            : "Not available"
          : `$${currentMonthlySurplus.toFixed(2)}`,
      detail: "Placeholder from starting balance minus buffer.",
    },
    {
      label: "Funding Sources Count",
      value: loading ? "Loading..." : String(fundingSources.length),
    },
  ];

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <p className="beast-kicker">The Beast v2.0 Foundation</p>
          <h1 className="beast-title">Velocity Planner</h1>
          <p className="beast-subtitle">
            A planning workspace for future Velocity Lite and Full Velocity
            Banking tools. Calculations are not enabled yet.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="beast-card">
            <h2 className="text-xl font-bold">Velocity Lite</h2>
            <p className="mt-3 text-sm text-[#c7cfdb]">
              Velocity Lite uses available monthly cash flow, debt information,
              and a revolving credit source to accelerate debt payoff while
              maintaining safety guardrails.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-[#9aa7b8] sm:grid-cols-2">
              <li>Cash flow efficiency</li>
              <li>Debt reduction</li>
              <li>Risk management</li>
              <li>Preserving liquidity</li>
            </ul>
          </div>

          <div className="beast-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-xl font-bold">Future Full Velocity Banking</h2>
              <span className="w-fit rounded border border-yellow-300/50 bg-yellow-950/30 px-3 py-1 text-xs font-semibold text-yellow-100">
                Coming In Future Version
              </span>
            </div>
            <p className="mt-3 text-sm text-[#c7cfdb]">
              Full Velocity Banking will explore HELOC strategies, PLOC
              strategies, credit card velocity, income timing, bill timing
              optimization, daily interest modeling, and average daily balance
              calculations.
            </p>
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="border-b border-[#2a3242] p-5">
            <h2 className="text-xl font-bold">Velocity Snapshot</h2>
            <p className="mt-1 text-sm text-[#7f8da3]">
              Read-only foundation using existing Beast data.
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {snapshotValues.map((item) => (
              <div key={item.label} className="beast-card">
                <div className="text-sm text-[#c7cfdb]">{item.label}</div>
                <div className="mt-2 break-words text-2xl font-bold">
                  {item.value}
                </div>
                {item.detail ? (
                  <p className="mt-2 text-xs text-[#7f8da3]">{item.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="beast-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Velocity Source</h2>
              <span className="w-fit rounded border border-[#2a3242] px-3 py-1 text-xs font-semibold text-[#c7cfdb]">
                Coming Soon
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[#c7cfdb]">Source Type</label>
                <select className="beast-input mt-2" disabled>
                  {sourceTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">Credit Limit</label>
                <input className="beast-input mt-2" disabled placeholder="$0.00" />
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">Current Balance</label>
                <input className="beast-input mt-2" disabled placeholder="$0.00" />
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">APR</label>
                <input className="beast-input mt-2" disabled placeholder="0.00%" />
              </div>
            </div>
          </div>

          <div className="beast-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold">Velocity Guardrails</h2>
              <span className="w-fit rounded border border-[#2a3242] px-3 py-1 text-xs font-semibold text-[#c7cfdb]">
                Coming Soon
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-[#c7cfdb]">
                  Maximum Utilization
                </label>
                <input className="beast-input mt-2" disabled value="66%" />
              </div>
              <div>
                <label className="text-sm text-[#c7cfdb]">Recovery Window</label>
                <input className="beast-input mt-2" disabled value="6 Months" />
              </div>
              <label className="flex items-center gap-3 text-sm text-[#c7cfdb]">
                <input type="checkbox" checked readOnly disabled />
                Emergency Reserve Required
              </label>
              <label className="flex items-center gap-3 text-sm text-[#c7cfdb]">
                <input type="checkbox" checked readOnly disabled />
                Super Velocity Disabled
              </label>
            </div>
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="border-b border-[#2a3242] p-5">
            <h2 className="text-xl font-bold">Velocity Lite Results</h2>
            <p className="mt-1 text-sm text-yellow-200">
              Velocity Lite Engine Not Yet Enabled
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
            {[
              "Recommended Chunk",
              "Recommended Target Debt",
              "Recovery Time",
              "Interest Savings",
              "Risk Level",
            ].map((label) => (
              <div key={label} className="beast-card">
                <div className="text-sm text-[#c7cfdb]">{label}</div>
                <div className="mt-2 text-lg font-bold">Not Yet Available</div>
              </div>
            ))}
          </div>
        </section>

        <section className="beast-card">
          <h2 className="text-xl font-bold">Full Velocity Roadmap</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ["Phase 1", "Velocity Lite"],
              ["Phase 2", "Velocity Source Modeling"],
              ["Phase 3", "Cash Flow Timing Optimization"],
              ["Phase 4", "Advanced Velocity Banking"],
            ].map(([phase, title]) => (
              <div key={phase} className="rounded-lg border border-[#2a3242] p-4">
                <div className="text-sm font-semibold text-[#38bdf8]">
                  {phase}
                </div>
                <div className="mt-2 font-bold">{title}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
