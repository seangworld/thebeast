"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [startingBalance, setStartingBalance] = useState(500);
  const [buffer, setBuffer] = useState(500);
  const [lookaheadDays, setLookaheadDays] = useState(30);

  const [strategy, setStrategy] = useState("snowball");
  const [extraPayment, setExtraPayment] = useState("");

  const [message, setMessage] = useState("");

  async function getUserId() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }

  async function load() {
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

    setStrategy(debtSettings?.strategy || "snowball");
    setExtraPayment(
      debtSettings?.extra_payment != null
        ? String(debtSettings.extra_payment)
        : ""
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function saveAll() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    await supabase.from("cash_settings").upsert({
      user_id: userId,
      starting_balance: Number(startingBalance),
      checking_buffer: Number(buffer),
      lookahead_days: Number(lookaheadDays),
    });

    await supabase.from("debt_settings").upsert({
      user_id: userId,
      strategy,
      extra_payment: Number(extraPayment || 0),
    });

    setMessage("Settings saved.");
    await load();
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">

        {/* HEADER */}
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="beast-kicker">The Beast</p>
              <h1 className="beast-title">Settings</h1>
              <p className="beast-subtitle">
                Configure system-wide cashflow and debt behavior.
              </p>
            </div>

            <Link href="/dashboard" className="beast-button-secondary">
              Back to Dashboard
            </Link>
          </div>
        </section>

        {message && (
          <div className="beast-card">
            <p className="text-sm text-green-300">{message}</p>
          </div>
        )}

        {/* CASH SETTINGS */}
        <section className="beast-card">
          <h2 className="text-xl font-bold">Cash Settings</h2>

          <div className="grid gap-4 md:grid-cols-3 mt-4">
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
                Lookahead Days
              </label>
              <input
                type="number"
                value={lookaheadDays}
                onChange={(e) => setLookaheadDays(Number(e.target.value))}
                className="beast-input mt-2"
              />
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
                onChange={(e) => setStrategy(e.target.value)}
                className="beast-input mt-2"
              >
                <option value="snowball">Snowball</option>
                <option value="avalanche">Avalanche</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">
                Extra Payment
              </label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                className="beast-input mt-2"
                placeholder="0"
              />
            </div>
          </div>
        </section>

        <section>
          <button onClick={saveAll} className="beast-button w-full">
            Save All Settings
          </button>
        </section>

      </div>
    </main>
  );
}