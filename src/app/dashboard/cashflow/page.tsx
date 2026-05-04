"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildCashTimeline,
  simulateCashFlow,
  calculateRequiredCash,
  calculateBillsDue,
  calculateIncomeExpected,
} from "@/lib/cashflow";
import { createClient } from "@/lib/supabase/client";

type PayoffStrategy = "snowball" | "avalanche";

function getTargetDebt(debts: any[], strategy: PayoffStrategy) {
  const active = debts.filter((d) => Number(d.balance || 0) > 0);

  if (active.length === 0) return null;

  if (strategy === "avalanche") {
    return [...active].sort(
      (a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
    )[0];
  }

  return [...active].sort(
    (a, b) => Number(a.balance || 0) - Number(b.balance || 0)
  )[0];
}

function formatDate(value: any) {
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value || "");
}

export default function CashFlowPage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);

  const [requiredCash, setRequiredCash] = useState(0);
  const [billsDue, setBillsDue] = useState(0);
  const [incomeExpected, setIncomeExpected] = useState(0);

  const [lookaheadDays, setLookaheadDays] = useState(30);
  const [buffer, setBuffer] = useState(500);
  const [startingBalance, setStartingBalance] = useState(500);

  const [strategy, setStrategy] = useState<PayoffStrategy>("snowball");
  const [extraPayment, setExtraPayment] = useState(0);
  const [targetDebtName, setTargetDebtName] = useState("—");

  const [incomeName, setIncomeName] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeFrequency, setIncomeFrequency] = useState("biweekly");
  const [incomeNextDate, setIncomeNextDate] = useState("");

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");

  const [loading, setLoading] = useState(true);

  const netPosition = useMemo(() => {
    return Number(startingBalance) + incomeExpected - billsDue;
  }, [startingBalance, incomeExpected, billsDue]);

  async function getUserId() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  }

  async function load() {
    setLoading(true);

    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: incomeRows } = await supabase
      .from("income_events")
      .select("*")
      .eq("user_id", userId)
      .order("next_date", { ascending: true });

    const { data: billRows } = await supabase
      .from("bill_events")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

    const { data: debtRows } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true });

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

    const activeLookahead = Number(cashSettings?.lookahead_days ?? 30);
    const activeBuffer = Number(cashSettings?.checking_buffer ?? 500);
    const activeStartingBalance = Number(cashSettings?.starting_balance ?? 500);

    const activeStrategy = (debtSettings?.strategy || "snowball") as PayoffStrategy;
    const activeExtraPayment = Number(debtSettings?.extra_payment || 0);

    const activeDebts = debtRows || [];
    const targetDebt = getTargetDebt(activeDebts, activeStrategy);

    const extraAttackBill =
      targetDebt && activeExtraPayment > 0
        ? [
            {
              id: "extra-debt-attack",
              user_id: userId,
              name: `Scheduled Extra Debt Payment ${targetDebt.name}`,
              amount: activeExtraPayment,
              due_date: Number(targetDebt.due_date || 1),
              is_debt: true,
            },
          ]
        : [];

    const combinedBills = [...(billRows || []), ...extraAttackBill];

    const builtTimeline = buildCashTimeline({
      incomes: incomeRows || [],
      bills: combinedBills,
      debts: activeDebts,
      startDate: new Date(),
      days: activeLookahead,
    });

    const simulated = simulateCashFlow({
      timeline: builtTimeline,
      startingBalance: activeStartingBalance,
      buffer: activeBuffer,
    });

    setIncomes(incomeRows || []);
    setBills(billRows || []);
    setDebts(activeDebts);
    setTimeline(builtTimeline);
    setData(simulated);

    setLookaheadDays(activeLookahead);
    setBuffer(activeBuffer);
    setStartingBalance(activeStartingBalance);

    setStrategy(activeStrategy);
    setExtraPayment(activeExtraPayment);
    setTargetDebtName(targetDebt?.name || "—");

    setRequiredCash(calculateRequiredCash(builtTimeline));
    setBillsDue(calculateBillsDue(builtTimeline));
    setIncomeExpected(calculateIncomeExpected(builtTimeline));

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function recalc(balance: number) {
    const simulated = simulateCashFlow({
      timeline,
      startingBalance: balance,
      buffer,
    });

    setData(simulated);
  }

  async function saveSettings() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    await supabase.from("cash_settings").upsert({
      user_id: userId,
      checking_buffer: Number(buffer),
      lookahead_days: Number(lookaheadDays),
      starting_balance: Number(startingBalance),
    });

    await load();
  }

  async function addIncome() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;
    if (!incomeName || !incomeAmount || !incomeNextDate) return;

    await supabase.from("income_events").insert({
      user_id: userId,
      name: incomeName,
      amount: Number(incomeAmount),
      frequency: incomeFrequency,
      next_date: incomeNextDate,
    });

    setIncomeName("");
    setIncomeAmount("");
    setIncomeFrequency("biweekly");
    setIncomeNextDate("");

    await load();
  }

  async function addBill() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;
    if (!billName || !billAmount || !billDueDate) return;

    await supabase.from("bill_events").insert({
      user_id: userId,
      name: billName,
      amount: Number(billAmount),
      due_date: Number(billDueDate),
      is_debt: false,
    });

    setBillName("");
    setBillAmount("");
    setBillDueDate("");

    await load();
  }

  async function deleteIncome(id: string) {
    const supabase = createClient();
    await supabase.from("income_events").delete().eq("id", id);
    await load();
  }

  async function deleteBill(id: string) {
    const supabase = createClient();
    await supabase.from("bill_events").delete().eq("id", id);
    await load();
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="beast-kicker">The Beast</p>
              <h1 className="beast-title">Cash Flow</h1>
              <p className="beast-subtitle">
                Manage paychecks, bills, debt minimums, extra attack payments, required cash, and buffer risk.
              </p>
            </div>

            <Link href="/dashboard" className="beast-button-secondary">
              Back to Dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Starting Balance</div>
            <input
              type="number"
              value={startingBalance}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartingBalance(val);
                recalc(val);
              }}
              className="beast-input mt-3"
            />
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Required Cash</div>
            <div className="mt-2 text-3xl font-bold">${requiredCash.toFixed(2)}</div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Bills + Debt Due</div>
            <div className="mt-2 text-3xl font-bold">${billsDue.toFixed(2)}</div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Income Expected</div>
            <div className="mt-2 text-3xl font-bold">${incomeExpected.toFixed(2)}</div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Net Position</div>
            <div className={`mt-2 text-3xl font-bold ${netPosition < buffer ? "text-red-300" : "text-green-300"}`}>
              ${netPosition.toFixed(2)}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Strategy</div>
            <div className="mt-2 text-2xl font-bold capitalize">{strategy}</div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Scheduled Extra Debt Payment</div>
            <div className="mt-2 text-2xl font-bold">${extraPayment.toFixed(2)}</div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Attack Target</div>
            <div className="mt-2 text-2xl font-bold">{targetDebtName}</div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Debt Count</div>
            <div className="mt-2 text-2xl font-bold">{debts.length}</div>
          </div>
        </section>

        <section className="beast-card">
          <h2 className="text-xl font-bold">Cash Settings</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm text-[#c7cfdb]">Starting Balance</label>
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
              <label className="text-sm text-[#c7cfdb]">Lookahead Days</label>
              <input
                type="number"
                value={lookaheadDays}
                onChange={(e) => setLookaheadDays(Number(e.target.value))}
                className="beast-input mt-2"
              />
            </div>

            <div className="flex items-end">
              <button onClick={saveSettings} className="beast-button w-full">
                Save Settings
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="beast-card">
            <h2 className="text-xl font-bold">Add Income</h2>

            <div className="mt-4 grid gap-3">
              <input
                value={incomeName}
                onChange={(e) => setIncomeName(e.target.value)}
                placeholder="Income name"
                className="beast-input"
              />

              <input
                type="number"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                placeholder="Amount"
                className="beast-input"
              />

              <select
                value={incomeFrequency}
                onChange={(e) => setIncomeFrequency(e.target.value)}
                className="beast-input"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>

              <input
                type="date"
                value={incomeNextDate}
                onChange={(e) => setIncomeNextDate(e.target.value)}
                className="beast-input"
              />

              <button onClick={addIncome} className="beast-button">
                Add Income
              </button>
            </div>
          </div>

          <div className="beast-card">
            <h2 className="text-xl font-bold">Add Bill</h2>

            <div className="mt-4 grid gap-3">
              <input
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
                placeholder="Bill name"
                className="beast-input"
              />

              <input
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="Amount"
                className="beast-input"
              />

              <input
                type="number"
                min="1"
                max="31"
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
                placeholder="Due day"
                className="beast-input"
              />

              <button onClick={addBill} className="beast-button">
                Add Bill
              </button>
            </div>
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="border-b border-[#2a3242] p-5">
            <h2 className="text-xl font-bold">Cash Timeline</h2>
          </div>

          <div className="beast-table-wrap">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Running Balance</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>Loading cashflow...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No cashflow events found.</td>
                  </tr>
                ) : (
                  data.map((row, index) => {
                    const runningBalance = Number(row.runningBalance || row.running_balance || 0);

                    return (
                      <tr key={`${formatDate(row.date)}-${row.name}-${index}`}>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.type}</td>
                        <td>{row.name}</td>
                        <td className="text-right">
                          ${Number(row.amount || 0).toFixed(2)}
                        </td>
                        <td className="text-right">
                          ${runningBalance.toFixed(2)}
                        </td>
                        <td>
                          {runningBalance < buffer ? (
                            <span className="text-red-300">Risk</span>
                          ) : (
                            <span className="text-green-300">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="beast-panel overflow-hidden">
            <div className="border-b border-[#2a3242] p-5">
              <h2 className="text-xl font-bold">Income Events</h2>
            </div>

            <div className="beast-table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-right">Amount</th>
                    <th>Frequency</th>
                    <th>Next Date</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {incomes.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No income events added yet.</td>
                    </tr>
                  ) : (
                    incomes.map((income) => (
                      <tr key={income.id}>
                        <td>{income.name}</td>
                        <td className="text-right">
                          ${Number(income.amount || 0).toFixed(2)}
                        </td>
                        <td>{income.frequency}</td>
                        <td>{income.next_date}</td>
                        <td className="text-right">
                          <button
                            onClick={() => deleteIncome(income.id)}
                            className="beast-button-secondary"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="beast-panel overflow-hidden">
            <div className="border-b border-[#2a3242] p-5">
              <h2 className="text-xl font-bold">Bills</h2>
            </div>

            <div className="beast-table-wrap">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-right">Amount</th>
                    <th>Due Day</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {bills.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No bills added yet.</td>
                    </tr>
                  ) : (
                    bills.map((bill) => (
                      <tr key={bill.id}>
                        <td>{bill.name}</td>
                        <td className="text-right">
                          ${Number(bill.amount || 0).toFixed(2)}
                        </td>
                        <td>{bill.due_date}</td>
                        <td className="text-right">
                          <button
                            onClick={() => deleteBill(bill.id)}
                            className="beast-button-secondary"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}