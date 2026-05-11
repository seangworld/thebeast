"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PayoffStrategy = "snowball" | "avalanche";

type Debt = {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
  due_date?: number;
};

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function chooseTarget(debts: Debt[], strategy: PayoffStrategy) {
  const active = debts.filter((d) => Number(d.balance) > 0);

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

function simulatePayoffPlan({
  debts,
  strategy,
  extraPayment,
}: {
  debts: Debt[];
  strategy: PayoffStrategy;
  extraPayment: number;
}) {
  const working = debts.map((d) => ({
    ...d,
    balance: money(Number(d.balance || 0)),
    minimum_payment: money(Number(d.minimum_payment || 0)),
    interest_rate: Number(d.interest_rate || 0),
  }));

  const originalMinimums = money(
    working.reduce((sum, d) => sum + Number(d.minimum_payment || 0), 0)
  );

  const totalMonthlyPool = money(originalMinimums + Number(extraPayment || 0));

  const months: any[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;

  while (working.some((d) => Number(d.balance) > 0) && month < 600) {
    month++;

    const startingBalances: Record<string, number> = {};
    const interestByDebt: Record<string, number> = {};
    let monthlyInterest = 0;

    for (const d of working) {
      if (Number(d.balance) <= 0) continue;

      startingBalances[d.id] = money(Number(d.balance || 0));

      const interest = money(
        (Number(d.balance || 0) * Number(d.interest_rate || 0)) / 100 / 12
      );

      interestByDebt[d.id] = interest;
      d.balance = money(Number(d.balance) + interest);
      monthlyInterest = money(monthlyInterest + interest);
    }

    const totalBalanceAfterInterest = money(
      working.reduce((sum, d) => sum + Number(d.balance || 0), 0)
    );

    let pool = Math.min(totalMonthlyPool, totalBalanceAfterInterest);
    let paid = 0;

    const activeBeforePayments = working.filter((d) => Number(d.balance) > 0);

    for (const d of activeBeforePayments) {
      const payment = Math.min(
        Number(d.minimum_payment || 0),
        Number(d.balance || 0),
        pool
      );

      d.balance = money(Number(d.balance) - payment);
      pool = money(pool - payment);
      paid = money(paid + payment);
    }

    while (pool > 0 && working.some((d) => Number(d.balance) > 0)) {
      const target = chooseTarget(working, strategy);
      if (!target) break;

      const targetStartingBalance = money(
        startingBalances[target.id] ?? Number(target.balance || 0)
      );

      const targetInterest = money(interestByDebt[target.id] || 0);
      const targetMinimum = money(Number(target.minimum_payment || 0));
      const minimumTooLow = targetMinimum > 0 && targetMinimum < targetInterest;

      const debtBalanceBeforeAttack = money(Number(target.balance || 0));
      const attackPayment = Math.min(pool, debtBalanceBeforeAttack);

      target.balance = money(Number(target.balance) - attackPayment);
      pool = money(pool - attackPayment);
      paid = money(paid + attackPayment);

      const targetEndingBalance = money(Number(target.balance || 0));
      const paidOff = targetEndingBalance <= 0;

      const remainingDebt = money(
        working.reduce((sum, d) => sum + Number(d.balance || 0), 0)
      );

      months.push({
        month,
        target: target.name,
        debt_starting_balance: targetStartingBalance,
        min_payment: targetMinimum,
        extra_attack: money(attackPayment),
        total_payment: money(targetMinimum + attackPayment),
        debt_ending_balance: targetEndingBalance,
        remaining_debt: remainingDebt,
        paid_off: paidOff,
        warning: minimumTooLow ? "Payment too low — balance may grow" : "",
      });
    }

    totalInterest = money(totalInterest + monthlyInterest);
    totalPaid = money(totalPaid + paid);

    if (paid <= 0) break;
  }

  return {
    months_to_payoff: month,
    total_interest: money(totalInterest),
    total_paid: money(totalPaid),
    first_target: months[0]?.target || "—",
    payoff_months: months,
  };
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [strategy, setStrategy] = useState<PayoffStrategy>("snowball");
  const [extraPayment, setExtraPayment] = useState("");

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("1");

  const [message, setMessage] = useState("");
const [loading, setLoading] = useState(true);

const [editingDebtId, setEditingDebtId] = useState<string | null>(null);

const [editName, setEditName] = useState("");
const [editBalance, setEditBalance] = useState("");
const [editMinimumPayment, setEditMinimumPayment] = useState("");
const [editInterestRate, setEditInterestRate] = useState("");
const [editDueDate, setEditDueDate] = useState("");
  const [projectionMonths, setProjectionMonths] = useState(24);

  const payoffPlan = useMemo(() => {
    return simulatePayoffPlan({
      debts,
      strategy,
      extraPayment: Number(extraPayment || 0),
    });
  }, [debts, strategy, extraPayment]);

  const orderedDebts = useMemo(() => {
    if (strategy === "avalanche") {
      return [...debts].sort(
        (a, b) => Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
      );
    }

    return [...debts].sort(
      (a, b) => Number(a.balance || 0) - Number(b.balance || 0)
    );
  }, [debts, strategy]);

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0);
  const totalMinimums = debts.reduce(
    (sum, d) => sum + Number(d.minimum_payment || 0),
    0
  );

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

    const { data: debtRows } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId);

    const { data: settings } = await supabase
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setDebts(debtRows || []);
    setStrategy((settings?.strategy || "snowball") as PayoffStrategy);
    setExtraPayment(
      settings?.extra_payment != null ? String(settings.extra_payment) : ""
    );

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    const { error } = await supabase.from("debt_settings").upsert({
      user_id: userId,
      strategy,
      extra_payment: Number(extraPayment || 0),
    });

    if (error) {
      setMessage(`Settings error: ${error.message}`);
      return;
    }

    setMessage("Debt settings saved.");
    await load();
  }

  async function addDebt() {
    setMessage("");

    const supabase = createClient();
    const userId = await getUserId();

    if (!userId) return;

    if (!name || !balance) {
      setMessage("Debt name and balance are required.");
      return;
    }

    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      name,
      balance: Number(balance),
      minimum_payment: Number(minimumPayment || 0),
      interest_rate: Number(interestRate || 0),
      due_date: Number(dueDate || 1),
    });

    if (error) {
      setMessage(`Add debt error: ${error.message}`);
      return;
    }

    setName("");
    setBalance("");
    setMinimumPayment("");
    setInterestRate("");
    setDueDate("1");

    await load();
  }

  function startEditDebt(debt: Debt) {
    setEditingDebtId(debt.id);
  
    setEditName(debt.name || "");
    setEditBalance(String(debt.balance || ""));
    setEditMinimumPayment(String(debt.minimum_payment || ""));
    setEditInterestRate(String(debt.interest_rate || ""));
    setEditDueDate(String(debt.due_date || 1));
  }
  
  function cancelEditDebt() {
    setEditingDebtId(null);
  
    setEditName("");
    setEditBalance("");
    setEditMinimumPayment("");
    setEditInterestRate("");
    setEditDueDate("");
  }
  
  async function saveEditDebt(id: string) {
    const supabase = createClient();
  
    const { error } = await supabase
      .from("debts")
      .update({
        name: editName,
        balance: Number(editBalance || 0),
        minimum_payment: Number(editMinimumPayment || 0),
        interest_rate: Number(editInterestRate || 0),
        due_date: Number(editDueDate || 1),
      })
      .eq("id", id);
  
    if (error) {
      setMessage(`Update error: ${error.message}`);
      return;
    }
  
    setMessage("Debt updated.");
  
    cancelEditDebt();
  
    await load();
  }
  async function deleteDebt(id: string) {
    const supabase = createClient();

    const { error } = await supabase.from("debts").delete().eq("id", id);

    if (error) {
      setMessage(`Delete error: ${error.message}`);
      return;
    }

    await load();
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="beast-kicker">The Beast</p>
              <h1 className="beast-title">Debt Strategy</h1>
              <p className="beast-subtitle">
                Add debts, choose a payoff strategy, and generate your payoff plan.
              </p>
            </div>

            <Link href="/dashboard" className="beast-button-secondary">
              Back to Dashboard
            </Link>
          </div>
        </section>

        {message && (
          <section className="beast-card">
            <p className="text-sm text-yellow-300">{message}</p>
          </section>
        )}

<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Total Debt</div>
            <div className="mt-2 break-words text-2xl font-bold">
              ${totalDebt.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Monthly Minimums</div>
            <div className="mt-2 break-words text-2xl font-bold">
              ${totalMinimums.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Payoff Time</div>
            <div className="mt-2 break-words text-2xl font-bold">
              {payoffPlan.months_to_payoff} months
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">First Target</div>
            <div className="mt-2 break-words text-2xl font-bold">
              {payoffPlan.first_target}
            </div>
          </div>

          <div className="beast-card">
            <div className="text-sm text-[#c7cfdb]">Total Interest</div>
            <div className="mt-2 break-words text-2xl font-bold">
              ${payoffPlan.total_interest.toFixed(2)}
            </div>
          </div>

          <div className="beast-card">
  <div className="text-sm text-[#c7cfdb]">
    Recommended
  </div>

  <div className="mt-2 text-2xl font-bold capitalize">
    {strategy}
  </div>

  <p className="mt-2 text-sm text-[#7f8da3]">
    {strategy === "avalanche"
      ? "Lowest projected interest paid."
      : "Fastest emotional momentum and early wins."}
  </p>
</div>
        </section>

        <section className="beast-card">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-[#c7cfdb]">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as PayoffStrategy)}
                className="beast-input mt-2"
              >
                <option value="snowball">Snowball</option>
                <option value="avalanche">Avalanche</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-[#c7cfdb]">Extra Payment</label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(e.target.value)}
                placeholder="0"
                className="beast-input mt-2"
              />
            </div>

            <div className="flex items-end">
              <button onClick={saveSettings} className="beast-button w-full">
                Update Strategy / Extra Payment
              </button>
            </div>
          </div>
        </section>

        <section className="beast-card">
          <h2 className="text-xl font-bold">Add Debt</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-5">
  <div>
    <label className="text-sm text-[#c7cfdb]">
      Debt Name
    </label>

    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Debt name"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      Balance
    </label>

    <input
      type="number"
      value={balance}
      onChange={(e) => setBalance(e.target.value)}
      placeholder="0"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      Minimum Payment
    </label>

    <input
      type="number"
      value={minimumPayment}
      onChange={(e) => setMinimumPayment(e.target.value)}
      placeholder="0"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      APR %
    </label>

    <input
      type="number"
      value={interestRate}
      onChange={(e) => setInterestRate(e.target.value)}
      placeholder="0"
      className="beast-input mt-2"
    />
  </div>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      Payment Due Day
    </label>

    <input
      type="number"
      min="1"
      max="31"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
      placeholder="Example: 15"
      className="beast-input mt-2"
    />
  </div>
</div>

<button onClick={addDebt} className="beast-button mt-4 w-full">
            Add Debt
          </button>
        </section>

        <section className="beast-panel overflow-hidden">
          <div className="border-b border-[#2a3242] p-5">
            <h2 className="text-xl font-bold">Debt List</h2>
          </div>

          <div className="beast-table-wrap">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Name</th>
                  <th className="text-right">Balance</th>
                  <th className="text-right">Minimum</th>
                  <th className="text-right">APR</th>
                  <th className="text-right">Due Day</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>Loading debts...</td>
                  </tr>
                ) : orderedDebts.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No debts added yet.</td>
                  </tr>
                ) : (
                  orderedDebts.map((debt, index) => (
                    <tr key={debt.id}>
                      <td>#{index + 1}</td>
                  
                      <td>
                        {editingDebtId === debt.id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="beast-input"
                          />
                        ) : (
                          debt.name
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <input
                            type="number"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            className="beast-input"
                          />
                        ) : (
                          `$${Number(debt.balance || 0).toFixed(2)}`
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <input
                            type="number"
                            value={editMinimumPayment}
                            onChange={(e) => setEditMinimumPayment(e.target.value)}
                            className="beast-input"
                          />
                        ) : (
                          `$${Number(debt.minimum_payment || 0).toFixed(2)}`
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <input
                            type="number"
                            value={editInterestRate}
                            onChange={(e) => setEditInterestRate(e.target.value)}
                            className="beast-input"
                          />
                        ) : (
                          `${Number(debt.interest_rate || 0).toFixed(2)}%`
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <input
                            type="number"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="beast-input"
                          />
                        ) : (
                          debt.due_date || 1
                        )}
                      </td>
                  
                      <td className="text-right">
                        {editingDebtId === debt.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveEditDebt(debt.id)}
                              className="beast-button"
                            >
                              Save
                            </button>
                  
                            <button
                              onClick={cancelEditDebt}
                              className="beast-button-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEditDebt(debt)}
                              className="beast-button-secondary"
                            >
                              Edit
                            </button>
                  
                            <button
                              onClick={() => deleteDebt(debt.id)}
                              className="beast-button"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="beast-panel overflow-hidden">
        <div className="border-b border-[#2a3242] p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <h2 className="text-xl font-bold">Payoff Plan</h2>

  <div>
    <label className="text-sm text-[#c7cfdb]">
      Projection Length
    </label>

    <select
      value={projectionMonths}
      onChange={(e) => setProjectionMonths(Number(e.target.value))}
      className="beast-input mt-2"
    >
      <option value={12}>12 Months</option>
      <option value={24}>24 Months</option>
      <option value={36}>36 Months</option>
      <option value={60}>60 Months</option>
      <option value={120}>120 Months</option>
    </select>
  </div>
</div>

          <div className="beast-table-wrap">
            <table className="w-full min-w-[1150px] text-sm">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Target</th>
                  <th className="text-right">Debt Start</th>
                  <th className="text-right">Min Payment</th>
                  <th className="text-right">Extra Attack</th>
                  <th className="text-right">Total Payment</th>
                  <th className="text-right">Debt End</th>
                  <th className="text-right">Total Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {payoffPlan.payoff_months.length === 0 ? (
                  <tr>
                    <td colSpan={9}>Add debts to generate payoff plan.</td>
                  </tr>
                ) : (
                  payoffPlan.payoff_months
  .slice(0, projectionMonths)
  .map((row, index) => (
                    <tr key={`${row.month}-${row.target}-${index}`}>
                      <td>{row.month}</td>
                      <td>{row.target}</td>
                      <td className="text-right">
                        ${row.debt_starting_balance.toFixed(2)}
                      </td>
                      <td className="text-right">
                        ${row.min_payment.toFixed(2)}
                      </td>
                      <td className="text-right">
                        ${row.extra_attack.toFixed(2)}
                      </td>
                      <td className="text-right">
                        ${row.total_payment.toFixed(2)}
                      </td>
                      <td className="text-right">
                        ${row.debt_ending_balance.toFixed(2)}
                      </td>
                      <td className="text-right">
                        ${row.remaining_debt.toFixed(2)}
                      </td>
                      <td>
                        {row.paid_off ? (
                          <span className="text-green-300 font-bold">
                            PAID OFF
                          </span>
                        ) : row.warning ? (
                          <span className="text-red-300 font-semibold">
                            {row.warning}
                          </span>
                        ) : (
                          <span className="text-[#7f8da3]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <footer className="pt-6 text-center text-sm text-[#7f8da3]">
  The Beast v1.1.0
</footer>
    </main>
  );
}