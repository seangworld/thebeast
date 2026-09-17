"use client";

import { useMemo, useState } from "react";
import { comparePayoffScenarios, normalizeScenarioOrder, type ScenarioProjection, type ScenarioStrategy } from "../../../../lib/payoffScenarios";
import { getInclusivePayoffDate, type PayoffDebt } from "../../../../lib/payoffPlan";

const labels = { snowball: "Snowball", avalanche: "Avalanche", custom: "Custom order" };
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function PayoffScenarioComparison({ debts, current, currentLabel, currentExtra, recoveredMinimums, savedCustomOrder, saving = false, onStage }: {
  debts: PayoffDebt[];
  current: ScenarioProjection;
  currentLabel: string;
  currentExtra: number;
  recoveredMinimums: number;
  savedCustomOrder?: string[];
  saving?: boolean;
  onStage: (strategy: ScenarioStrategy, extra: number, order?: string[]) => void;
}) {
  const [extra, setExtra] = useState("0");
  const [lump, setLump] = useState("0");
  const [order, setOrder] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<ScenarioStrategy>("snowball");
  const [message, setMessage] = useState("");
  const customOrder = useMemo(() => normalizeScenarioOrder(debts, order ?? savedCustomOrder ?? []), [debts, order, savedCustomOrder]);
  const comparison = useMemo(() => {
    try {
      return { rows: comparePayoffScenarios({ debts, current, extraMonthly: Number(extra), lumpSum: Number(lump), customOrder, recoveredMinimums }), error: "" };
    } catch (error) {
      return { rows: [], error: error instanceof Error ? error.message : "Unable to calculate this scenario." };
    }
  }, [debts, current, extra, lump, customOrder, recoveredMinimums]);
  const chosen = comparison.rows.find(row => row.strategy === selected);
  const [startDate] = useState(() => new Date());
  function payoffDate(result: ScenarioProjection) {
    if (!result.payoff_complete || result.months_to_payoff === null) return "Not reached within 600 months";
    if (result.months_to_payoff === 0) return "No monthly payments needed";
    return getInclusivePayoffDate(startDate, result.months_to_payoff)!.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  function move(id: string, direction: number) {
    const next = [...customOrder];
    const index = next.indexOf(id);
    if (index < 0 || index + direction < 0 || index + direction >= next.length) return;
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setOrder(next);
  }
  return <section className="money-section-panel min-w-0" id="payoff-scenarios" aria-labelledby="scenario-heading">
    <h2 className="money-section-title" id="scenario-heading">What-if payoff comparison</h2>
    <p className="money-section-description">Try different payments without changing your saved plan, balances, or paycheck assignments. Estimates—not a promise or an affordability check.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="money-field-label">Extra monthly payment above minimums
        <input className="beast-input mt-2" type="number" min="0" max="1000000000" step="0.01" value={extra} onChange={event => { setExtra(event.target.value); setMessage(""); }} />
      </label>
      <label className="money-field-label">One-time cash lump sum
        <input className="beast-input mt-2" type="number" min="0" max="1000000000" step="0.01" value={lump} onChange={event => { setLump(event.target.value); setMessage(""); }} />
      </label>
    </div>
    <p className="mt-3 text-sm text-slate-400">All three scenarios use the same monthly extra and upfront cash. Existing recovered minimums of {money(recoveredMinimums)} stay in the monthly budget. No new charges or APR changes; interest accrues monthly. Freed payments roll forward. Actual lender calculations may differ.</p>
    <details className="mt-4 rounded-xl border border-slate-700 p-3">
      <summary className="cursor-pointer font-semibold">Set custom payoff order</summary>
      <ol className="mt-3 space-y-2">{customOrder.map((id, index) => {
        const debt = debts.find(item => item.id === id)!;
        return <li key={id} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="min-w-0 flex-1 break-words">{index + 1}. {debt.name}</span>
          <button type="button" className="beast-button-secondary" disabled={index === 0} aria-label={`Move ${debt.name} earlier`} onClick={() => move(id, -1)}>Earlier</button>
          <button type="button" className="beast-button-secondary" disabled={index === customOrder.length - 1} aria-label={`Move ${debt.name} later`} onClick={() => move(id, 1)}>Later</button>
        </li>;
      })}</ol>
    </details>
    {comparison.error ? <p role="alert" className="mt-4 text-red-300">{comparison.error}</p> : null}
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-xl border border-slate-700 p-4">
        <h3 className="font-bold">Current settings · {currentLabel}</h3>
        <p className="mt-2 text-sm">{payoffDate(current)}</p>
        <p className="mt-2 text-sm">{current.payoff_complete ? "Total interest" : "Interest through simulated horizon"}: {money(current.total_interest)}</p>
        <p className="mt-2 text-xs text-slate-400">Uses the current page settings and cash-flow-adjusted extra of {money(currentExtra)}. Unsaved edits above also affect this baseline.</p>
      </article>
      {comparison.rows.map(row => <article key={row.strategy} className={`rounded-xl border p-4 ${selected === row.strategy ? "border-cyan-300 bg-cyan-300/5" : "border-slate-700"}`}>
        <h3 className="font-bold">{labels[row.strategy]}</h3>
        <p className="mt-2 text-sm">{payoffDate(row.result)}</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div><dt>{row.result.payoff_complete ? "Total interest" : "Interest through simulated horizon"}</dt><dd>{money(row.result.total_interest)}</dd></div>
          <div><dt>Months saved vs current</dt><dd>{row.monthsSaved ?? "Not comparable"}</dd></div>
          <div><dt>Interest saved vs current</dt><dd>{row.interestSaved === null ? "Not comparable" : money(row.interestSaved)}</dd></div>
          <div><dt>{row.result.payoff_complete ? "Total paid, including lump sum" : "Paid through simulated horizon"}</dt><dd>{money(row.result.total_paid)}</dd></div>
        </dl>
        <button type="button" className="beast-button-secondary mt-4" aria-pressed={selected === row.strategy} onClick={() => { setSelected(row.strategy); setMessage(""); }}>Review {labels[row.strategy]}</button>
      </article>)}
    </div>
    {chosen ? <div className="mt-5 rounded-xl border border-slate-700 p-4" aria-live="polite">
      <h3 className="font-bold">{labels[selected]} · payments to plan</h3>
      <p className="mt-2 text-sm text-slate-400">Upfront cash applied: {money(chosen.result.initial_lump_sum_applied ?? 0)}. Unused lump sum: {money(Math.max(Number(lump) - (chosen.result.initial_lump_sum_applied ?? 0), 0))}. Keep your cash buffer and upcoming bills covered before using extra funds.</p>
      <ul className="mt-3 space-y-2 text-sm">{chosen.result.debt_payment_schedule.filter(row => row.month <= 1).map(row => <li key={`${row.month}-${row.debt_id}`} className="flex flex-wrap justify-between gap-2">
        <span>{row.debt_name} · {row.month === 0 ? "upfront cash" : "first month"}</span><span>{money(row.total_payment)}{row.month === 1 ? ` (${money(row.required_payment)} minimum + ${money(row.additional_payment)} extra)` : ""}</span>
      </li>)}</ul>
      <p className="mt-3 text-sm text-slate-400">Monthly amounts are not per-paycheck instructions. Split them across your income dates in Paycheck Strategy. Your existing assignments remain untouched.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {chosen.result.payoff_complete && customOrder.length > 0 ? <button type="button" disabled={saving} className="beast-button-secondary" onClick={() => {
          if (selected === "custom") onStage(selected, Number(extra), customOrder);
          else onStage(selected, Number(extra));
          setMessage("Strategy and monthly extra copied to the settings form above—not saved. Review them and use Update Strategy / Monthly Extra Attack to save. The lump sum is not copied or recorded as a payment.");
        }}>Copy monthly plan to settings</button> : null}
        <a className="beast-button-secondary" href="/dashboard/money/cashflow#paycheck-strategy">Open paycheck planning</a>
      </div>
      {selected === "custom" ? <p className="mt-3 text-sm text-amber-200">Custom order stays a preview until you copy it to settings and explicitly save. Paid-off or unavailable debts are skipped; new debts follow your listed priorities.</p> : null}
      {message ? <p className="mt-3 text-sm text-cyan-200" role="status">{message}</p> : null}
    </div> : null}
  </section>;
}
