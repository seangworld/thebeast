"use client";

import { useMemo, useState } from "react";
import { comparePayoffScenarios, normalizeScenarioOrder, type ScenarioProjection, type ScenarioStrategy } from "../../../../lib/payoffScenarios";
import { getInclusivePayoffDate, type PayoffDebt } from "../../../../lib/payoffPlan";

const labels = { current: "Current settings", snowball: "Snowball", avalanche: "Avalanche", custom: "Custom order" };
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
  const [selection, setSelected] = useState<ScenarioStrategy | "current" | null>(null);
  const selected = selection ?? (currentLabel === "snowball" || currentLabel === "avalanche" || currentLabel === "custom" ? currentLabel : "current");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState("");
  const customOrder = useMemo(() => normalizeScenarioOrder(debts, order ?? savedCustomOrder ?? []), [debts, order, savedCustomOrder]);
  const comparison = useMemo(() => {
    try {
      return { rows: comparePayoffScenarios({ debts, current, extraMonthly: Number(extra), lumpSum: Number(lump), customOrder, recoveredMinimums }), error: "" };
    } catch (error) {
      return { rows: [], error: error instanceof Error ? error.message : "Unable to calculate this scenario." };
    }
  }, [debts, current, extra, lump, customOrder, recoveredMinimums]);
  const chosen = selected === "current" ? { strategy: "current" as const, result: current } : comparison.rows.find(row => row.strategy === selected);
  const [startDate] = useState(() => new Date());
  function payoffDate(result: ScenarioProjection) {
    if (!result.payoff_complete || result.months_to_payoff === null) return "Not reached within 600 months";
    if (result.months_to_payoff === 0) return "No monthly payments needed";
    return getInclusivePayoffDate(startDate, result.months_to_payoff)!.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  function move(id: string, position: number) {
    const index = customOrder.indexOf(id);
    if (index < 0 || position < 0 || position >= customOrder.length || index === position) return;
    const next = customOrder.filter(value => value !== id);
    next.splice(position, 0, id);
    setOrder(next);
    setSelected("custom");
    setMessage("");
    setOrderMessage(`${debts.find(debt => debt.id === id)?.name || "Debt"} moved to position ${position + 1}. Preview only; your saved plan has not changed.`);
  }
  function clearDrag() { setDragging(null); setDropTarget(null); }
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
      <p className="mt-2 text-sm text-slate-400">Drag a whole row to its new position, or choose its position number. Changes stay in this preview until you copy and save the plan.</p>
      <ol className="mt-3 space-y-2" aria-label="Custom payoff priority">{customOrder.map((id, index) => {
        const debt = debts.find(item => item.id === id)!;
        return <li key={id} draggable={!saving} data-debt-id={id}
          onDragStart={event => {
            if ((event.target as HTMLElement).closest("select")) { event.preventDefault(); return; }
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", id);
            setDragging(id);
          }}
          onDragOver={event => { if (dragging && dragging !== id) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(id); } }}
          onDrop={event => { event.preventDefault(); if (dragging && !saving) move(dragging, index); clearDrag(); }}
          onDragEnd={clearDrag}
          className={`flex min-h-12 flex-wrap items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${dragging === id ? "cursor-grabbing border-cyan-300 bg-cyan-400/25 ring-2 ring-cyan-300" : dropTarget === id ? "cursor-grab border-cyan-300 bg-cyan-400/10 ring-2 ring-cyan-300" : "cursor-grab border-slate-700 bg-slate-900/40"}`}>
          <span aria-hidden="true" className="text-xl text-slate-400">⠿</span>
          <span className="min-w-0 flex-1 break-words">{index + 1}. {debt.name}</span>
          <label className="flex items-center gap-2 text-slate-300">Position
            <select className="rounded-lg border border-slate-600 bg-slate-950 p-2" disabled={saving} aria-label={`Position for ${debt.name}`} value={index} onChange={event => move(id, Number(event.target.value))}>
              {customOrder.map((_, position) => <option key={position} value={position}>{position + 1}</option>)}
            </select>
          </label>
          {dropTarget === id && dragging !== id ? <span className="w-full text-xs text-cyan-200">Drop to move to position {index + 1}</span> : null}
        </li>;
      })}</ol>
      <p className="mt-2 text-sm text-cyan-200" aria-live="polite">{orderMessage}</p>
    </details>
    {comparison.error ? <p role="alert" className="mt-4 text-red-300">{comparison.error}</p> : null}
    <p className="mt-4 text-sm text-slate-300">Select any card to preview its payments below. The highlighted card is the preview selection; selecting it does not change your saved strategy. The comparison cards use the extra payment and lump sum entered above.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className={`relative rounded-xl border p-4 focus-within:ring-2 focus-within:ring-cyan-300 ${selected === "current" ? "border-cyan-300 bg-cyan-300/5" : "border-slate-700"}`}>
        <button type="button" className="absolute inset-0 z-10 cursor-pointer rounded-xl" aria-label="Select current settings card" aria-pressed={selected === "current"} onClick={() => { setSelected("current"); setMessage(""); }} />
        <h3 className="font-bold">Current settings · {currentLabel}</h3>
        <p className="mt-2 text-sm">{payoffDate(current)}</p>
        <p className="mt-2 text-sm">{current.payoff_complete ? "Total interest" : "Interest through simulated horizon"}: {money(current.total_interest)}</p>
        <p className="mt-2 text-xs text-slate-400">Uses the current page settings and cash-flow-adjusted extra of {money(currentExtra)}. Unsaved edits above also affect this baseline.</p>
        <button type="button" className="beast-button-secondary relative z-20 mt-4" aria-pressed={selected === "current"} onClick={() => { setSelected("current"); setMessage(""); }}>Review current settings</button>
      </article>
      {comparison.rows.map(row => <article key={row.strategy} className={`relative rounded-xl border p-4 focus-within:ring-2 focus-within:ring-cyan-300 ${selected === row.strategy ? "border-cyan-300 bg-cyan-300/5" : "border-slate-700"}`}>
        <h3 className="font-bold">{labels[row.strategy]}</h3>
        <p className="mt-2 text-sm">{payoffDate(row.result)}</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div><dt>{row.result.payoff_complete ? "Total interest" : "Interest through simulated horizon"}</dt><dd>{money(row.result.total_interest)}</dd></div>
          <div><dt>Months saved vs current</dt><dd>{row.monthsSaved ?? "Not comparable"}</dd></div>
          <div><dt>Interest saved vs current</dt><dd>{row.interestSaved === null ? "Not comparable" : money(row.interestSaved)}</dd></div>
          <div><dt>{row.result.payoff_complete ? "Total paid, including lump sum" : "Paid through simulated horizon"}</dt><dd>{money(row.result.total_paid)}</dd></div>
        </dl>
        <button type="button" className="absolute inset-0 z-10 cursor-pointer rounded-xl" aria-label={`Select ${labels[row.strategy]} card`} aria-pressed={selected === row.strategy} onClick={() => { setSelected(row.strategy); setMessage(""); }} />
        <button type="button" className="beast-button-secondary relative z-20 mt-4" aria-pressed={selected === row.strategy} onClick={() => { setSelected(row.strategy); setMessage(""); }}>Review {labels[row.strategy]}</button>
        {selected === row.strategy ? <p className="mt-2 text-sm font-semibold text-cyan-200">Selected preview</p> : null}
      </article>)}
    </div>
    {chosen ? <div className="mt-5 rounded-xl border border-slate-700 p-4" aria-live="polite">
      <h3 className="font-bold">{labels[selected]} · payments to plan</h3>
      <p className="mt-2 text-sm text-slate-400">Upfront cash applied: {money("initial_lump_sum_applied" in chosen.result ? Number(chosen.result.initial_lump_sum_applied || 0) : 0)}.{selected !== "current" ? <> Unused lump sum: {money(Math.max(Number(lump) - ("initial_lump_sum_applied" in chosen.result ? Number(chosen.result.initial_lump_sum_applied || 0) : 0), 0))}.</> : null} Keep your cash buffer and upcoming bills covered before using extra funds.</p>
      <ul className="mt-3 space-y-2 text-sm">{chosen.result.debt_payment_schedule.filter(row => row.month <= 1).map(row => <li key={`${row.month}-${row.debt_id}`} className="flex flex-wrap justify-between gap-2">
        <span>{row.debt_name} · {row.month === 0 ? "upfront cash" : "first month"}</span><span>{money(row.total_payment)}{row.month === 1 ? ` (${money(row.required_payment)} minimum + ${money(row.additional_payment)} extra)` : ""}</span>
      </li>)}</ul>
      <p className="mt-3 text-sm text-slate-400">Monthly amounts are not per-paycheck instructions. Split them across your income dates in Paycheck Strategy. Your existing assignments remain untouched.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {selected !== "current" && chosen.result.payoff_complete && customOrder.length > 0 ? <button type="button" disabled={saving} className="beast-button-secondary" onClick={() => {
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
