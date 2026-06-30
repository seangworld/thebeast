"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/appVersion";

export default function DashboardPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [extraPayment, setExtraPayment] = useState(0);
  const activeBills = useMemo(
    () => bills.filter((b) => !Boolean(b.is_archived)),
    [bills]
  );
  
  const activeDebts = useMemo(
    () => debts.filter((d) => !Boolean(d.is_archived)),
    [debts]
  );

  const getUserId = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const userId = await getUserId();
    if (!userId) return;

    const { data: debtRows } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId);

    const { data: incomeRows } = await supabase
      .from("income_events")
      .select("*")
      .eq("user_id", userId);

    const { data: billRows } = await supabase
      .from("bill_events")
      .select("*")
      .eq("user_id", userId);

    const { data: debtSettings } = await supabase
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setDebts(debtRows || []);
    setIncomes(incomeRows || []);
    setBills(billRows || []);
    setExtraPayment(Number(debtSettings?.extra_payment || 0));
    }, [getUserId]);
  useEffect(() => {
    load();
  }, [load]);

  const totalDebt = useMemo(
    () => activeDebts.reduce((sum, d) => sum + Number(d.balance || 0), 0),
    [activeDebts]
  );

  const totalMinimums = useMemo(
    () =>
      activeDebts.reduce(
        (sum, d) => sum + Number(d.minimum_payment || 0),
        0
      ),
    [activeDebts]
  );

  const totalBills = useMemo(
    () =>
      activeBills.reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [activeBills]
  );

  const monthlyOutflow = totalMinimums + totalBills + extraPayment;
  const unassignedBills = activeBills.filter(
    (b) => !b.assigned_income_date
  );
  
  const unassignedDebts = activeDebts.filter(
    (d) => !d.assigned_income_date
  );
  
  const totalUnassigned =
    unassignedBills.length + unassignedDebts.length;

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">

        <section className="beast-page-header space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="beast-kicker">The Beast {APP_VERSION}</p>
              <h1 className="beast-title">Dashboard</h1>
              <p className="beast-subtitle">
                Your debt payoff and cash flow command center.
              </p>
            </div>

            <div className="flex flex-col gap-2 text-sm md:items-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-300" />
                <span className="font-semibold">Auto-Save Enabled</span>
              </div>
              <div className="text-xs text-[#7f8da3]">
                Operational changes save automatically during use.
              </div>
              <Link href="/dashboard/releases" className="text-xs text-[#38bdf8] hover:underline">
                View Release Notes
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100 md:hidden">
          <div className="font-semibold">Desktop experience recommended.</div>
          <p className="mt-1 text-yellow-100/80">
            The Beast is desktop-first today. Mobile optimization remains on the roadmap.
          </p>
        </section>

        {/* SUMMARY */}
        <section className="grid gap-4 md:grid-cols-5">
        <Link
  href="/dashboard/debts"
  className="beast-card block transition hover:border-[#38bdf8] hover:bg-[#202634]"
>
            <div className="text-sm text-[#c7cfdb]">Active Debt Balance</div>
            <div className="mt-2 text-2xl font-bold">
              ${totalDebt.toFixed(2)}
            </div>
          </Link>

          <Link
  href="/dashboard/debts"
  className="beast-card block transition hover:border-[#38bdf8] hover:bg-[#202634]"
>
            <div className="text-sm text-[#c7cfdb]">Debt Minimums</div>
            <div className="mt-2 text-2xl font-bold">
              ${totalMinimums.toFixed(2)}
            </div>
          </Link>

          <Link
  href="/dashboard/cashflow"
  className="beast-card block transition hover:border-[#38bdf8] hover:bg-[#202634]"
>
            <div className="text-sm text-[#c7cfdb]">Monthly Bills</div>
            <div className="mt-2 text-2xl font-bold">
              ${totalBills.toFixed(2)}
            </div>
          </Link>

          <Link
  href="/dashboard/debts"
  className="beast-card block transition hover:border-[#38bdf8] hover:bg-[#202634]"
>
            <div className="text-sm text-[#c7cfdb]">Extra Debt Attack</div>
            <div className="mt-2 text-2xl font-bold">
              ${extraPayment.toFixed(2)}
            </div>
          </Link>

          <Link
  href="/dashboard/cashflow"
  className="beast-card block transition hover:border-[#38bdf8] hover:bg-[#202634]"
>
            <div className="text-sm text-[#c7cfdb]">Planned Monthly Outflow</div>
            <div className="mt-2 text-2xl font-bold">
              ${monthlyOutflow.toFixed(2)}
            </div>
          </Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
        <Link href="/dashboard/cashflow" className="beast-card block">
    <div className="text-sm font-semibold text-[#7f8da3]">
      Recommended Next Step Today
    </div>

    <div className="mt-3 text-lg font-bold">
      Assign unassigned obligations to upcoming income pots.
    </div>

    <p className="mt-2 text-sm text-[#9aa7b8]">
      Keeping obligations assigned prevents paycheck shortfalls and improves cashflow visibility.
    </p>
  </Link>

  <div className="beast-card">
    <div className="text-sm font-semibold text-[#7f8da3]">
      System Status
    </div>

    <div className="mt-3 space-y-2 text-sm">

  <Link
    href="/dashboard/cashflow"
    className="flex items-center justify-between rounded-lg px-2 py-1 transition hover:bg-[#11151c]"
  >
    <span>Income Events</span>
    <span className="font-semibold">{incomes.length}</span>
  </Link>

  <Link
    href="/dashboard/cashflow"
    className="flex items-center justify-between rounded-lg px-2 py-1 transition hover:bg-[#11151c]"
  >
    <span>Active Bills</span>
    <span className="font-semibold">{activeBills.length}</span>
  </Link>

  <Link
    href="/dashboard/debts"
    className="flex items-center justify-between rounded-lg px-2 py-1 transition hover:bg-[#11151c]"
  >
    <span>Active Debts</span>
    <span className="font-semibold">{activeDebts.length}</span>
  </Link>

</div>
  </div>
</section>

<section className="grid gap-4 lg:grid-cols-2">
  <div className="beast-card">
    <div className="text-sm font-semibold text-[#7f8da3]">
      Alerts & Risks
    </div>

    <div className="mt-3 space-y-2 text-sm">
      {totalUnassigned > 0 ? (
  <Link
  href="/dashboard/cashflow"
  className="block rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 transition hover:border-red-400 hover:bg-red-500/20"
>
  {totalUnassigned} unassigned obligations detected.
</Link>
) : (
  <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
    No active cashflow alerts detected.
  </div>
)}
    </div>
  </div>

  <div className="beast-card">
    <div className="text-sm font-semibold text-[#7f8da3]">
      Roadmap
    </div>

    <ul className="mt-3 space-y-2 text-sm text-[#9aa7b8]">
      <li>• Multi-source Velocity comparisons</li>
      <li>• Advanced payoff visualizations</li>
      <li>• Mobile optimization</li>
      <li>• Financial reporting</li>
    </ul>
  </div>
</section>

      </div>
      
    </main>
  );
}
