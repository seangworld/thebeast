"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DEBT_STRATEGIES,
  normalizeDebtStrategy,
  type DebtStrategy,
} from "@/lib/debtStrategies";
import { BeastMoneyShell } from "@/app/dashboard/money/BeastMoneyShell";

export default function SettingsPage() {
  const [startingBalance, setStartingBalance] = useState(500);
  const [buffer, setBuffer] = useState(500);
  const [lookaheadDays, setLookaheadDays] = useState(30);
  const [assignmentHorizonMonths, setAssignmentHorizonMonths] = useState(6);

  const [strategy, setStrategy] = useState<DebtStrategy>("snowball");
  const [extraPayment, setExtraPayment] = useState("");

  const [message, setMessage] = useState("");

  const getUserId = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    const { data: cashSettings } = await supabase
      .from("cash_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: debtSettings } = await supabase
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setStartingBalance(Number(cashSettings?.starting_balance ?? 500));
    setBuffer(Number(cashSettings?.checking_buffer ?? 500));
    setLookaheadDays(Number(cashSettings?.lookahead_days ?? 30));
    setAssignmentHorizonMonths(Number(cashSettings?.assignment_horizon_months ?? 6));

    setStrategy(normalizeDebtStrategy(debtSettings?.strategy));
    setExtraPayment(
      debtSettings?.extra_payment != null
        ? String(debtSettings.extra_payment)
        : ""
    );
  }, [getUserId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAll() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) {
      setMessage("Error: Unable to get user ID");
      return;
    }

    const { error: cashError } = await supabase.from("cash_settings").upsert(
      {
        user_id: userId,
        starting_balance: Number(startingBalance),
        checking_buffer: Number(buffer),
        lookahead_days: Number(lookaheadDays),
        assignment_horizon_months: Number(assignmentHorizonMonths),
      },
      { onConflict: "user_id" }
    );

    if (cashError) {
      console.error("Failed to save cash settings:", cashError);
      setMessage(`❌ Failed to save cash settings: ${cashError.message}`);
      return;
    }

    const { error: debtError } = await supabase.from("debt_settings").upsert(
      {
        user_id: userId,
        strategy,
        extra_payment: strategy === "minimum" ? 0 : Number(extraPayment || 0),
      },
      { onConflict: "user_id" }
    );

    if (debtError) {
      console.error("Failed to save debt settings:", debtError);
      setMessage(`❌ Failed to save debt settings: ${debtError.message}`);
      return;
    }

    setMessage("✓ Settings saved successfully.");
    await load();
  }

  async function resetTestDueDates() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    if (
      !window.confirm(
        "Reset Bill/Debt Test Due Dates? This will clear only next_due_date_after_payment values and will not delete any bills or debts."
      )
    ) {
      return;
    }

    const { error: billError } = await supabase
      .from("bill_events")
      .update({ next_due_date_after_payment: null })
      .eq("user_id", userId);

    if (billError) {
      setMessage(`Failed to reset bill due dates: ${billError.message}`);
      return;
    }

    const { error: debtError } = await supabase
      .from("debts")
      .update({ next_due_date_after_payment: null })
      .eq("user_id", userId);

    if (debtError) {
      setMessage(`Failed to reset debt due dates: ${debtError.message}`);
      return;
    }

    setMessage("Bill and debt test due dates reset successfully.");
    await load();
  }

  return (
    <BeastMoneyShell
      title="Money Settings"
      description="Configure system-wide cashflow and debt behavior."
    >
      <div className="space-y-8">

        {message && (
          <div className="beast-card">
            <p className="text-sm text-green-300">{message}</p>
          </div>
        )}

        {/* CASH SETTINGS */}
        <section className="beast-card">
          <h2 className="text-xl font-bold">Cash Settings</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mt-4">
            <div>
              <label className="text-sm text-[#c7cfdb]">
                Starting Balance
              </label>
              <input
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(Number(e.target.value))}
                className="beast-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">Buffer</label>
              <input
                type="number"
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
                className="beast-input mt-2"
              />
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">
                Lookahead Days (Dashboard)
              </label>
              <select
                value={lookaheadDays}
                onChange={(e) => setLookaheadDays(Number(e.target.value))}
                className="beast-input mt-2"
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
                <option value={120}>120 Days</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">
                Assignment Horizon
              </label>
              <select
                value={assignmentHorizonMonths}
                onChange={(e) => setAssignmentHorizonMonths(Number(e.target.value))}
                className="beast-input mt-2"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>
            </div>
          </div>
        </section>

        {/* DEBT SETTINGS */}
        <section className="beast-card">
          <h2 className="text-xl font-bold">Debt Settings</h2>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <label className="text-sm text-[#c7cfdb]">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(normalizeDebtStrategy(e.target.value))}
                className="beast-input mt-2"
              >
                {DEBT_STRATEGIES.map((strategyOption) => (
                  <option key={strategyOption.value} value={strategyOption.value}>
                    {strategyOption.label}
                  </option>
                ))}
              </select>
              {strategy === "velocity" ? (
                <p className="mt-2 text-xs text-[#7f8da3]">
                  Configure Velocity recommendations in the{" "}
                  <Link href="/dashboard/money/velocity" className="text-[#38bdf8] underline">
                    Velocity Planner
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">
                Monthly Extra Attack
              </label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                className="beast-input mt-2"
                placeholder="0"
                disabled={strategy === "minimum"}
              />
              {strategy === "minimum" ? (
                <p className="mt-2 text-xs text-[#7f8da3]">
                  Minimum strategy ignores extra attack payments.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <button onClick={saveAll} className="beast-button w-full">
            Save All Settings
          </button>
        </section>

      </div>
    </BeastMoneyShell>
  );
}
