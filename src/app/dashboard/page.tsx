"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [extraPayment, setExtraPayment] = useState(0);

  async function getUserId() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, []);

  const totalDebt = useMemo(
    () => debts.reduce((sum, d) => sum + Number(d.balance || 0), 0),
    [debts]
  );

  const totalMinimums = useMemo(
    () =>
      debts.reduce(
        (sum, d) => sum + Number(d.minimum_payment || 0),
        0
      ),
    [debts]
  );

  const totalBills = useMemo(
    () =>
      bills.reduce((sum, b) => sum + Number(b.amount || 0), 0),
    [bills]
  );

  const monthlyOutflow = totalMinimums + totalBills + extraPayment;

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">

        {/* NEW HEADER */}
        <section className="beast-page-header">
          <p className="beast-kicker">The Beast</p>
          <h1 className="beast-title">Dashboard</h1>
          <p className="beast-subtitle">
            Your debt payoff and cash flow command center.
          </p>
        </section>

        {/* SUMMARY */}
        <section className="grid gap-4 md:grid-cols-5">
          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Total Debt</div>
            <div className="mt-2 text-3xl font-bold">
              ${totalDebt.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Monthly Minimums</div>
            <div className="mt-2 text-3xl font-bold">
              ${totalMinimums.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Bills</div>
            <div className="mt-2 text-3xl font-bold">
              ${totalBills.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Extra Payment</div>
            <div className="mt-2 text-3xl font-bold">
              ${extraPayment.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Total Outflow</div>
            <div className="mt-2 text-3xl font-bold">
              ${monthlyOutflow.toFixed(2)}
            </div>
          </div>
        </section>

        {/* NAV */}
        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard/cashflow"
            className="beast-card block"
          >
            <div className="text-sm text-[#c7cfdb]">Cash Flow</div>
            <div className="mt-2 text-2xl font-bold">
              Paycheck + Bills
            </div>
            <p className="mt-3 text-sm text-[#7f8da3]">
              View income, bills, and buffer risk.
            </p>
          </Link>

          <Link
            href="/dashboard/debts"
            className="beast-card block"
          >
            <div className="text-sm text-[#c7cfdb]">
              Debt Strategy
            </div>
            <div className="mt-2 text-2xl font-bold">
              Payoff Engine
            </div>
            <p className="mt-3 text-sm text-[#7f8da3]">
              Build and track your payoff plan.
            </p>
          </Link>

          <Link
            href="/dashboard/settings"
            className="beast-card block"
          >
            <div className="text-sm text-[#c7cfdb]">Settings</div>
            <div className="mt-2 text-2xl font-bold">
              System Controls
            </div>
            <p className="mt-3 text-sm text-[#7f8da3]">
              Configure your system.
            </p>
          </Link>
        </section>

      </div>
    </main>
  );
}