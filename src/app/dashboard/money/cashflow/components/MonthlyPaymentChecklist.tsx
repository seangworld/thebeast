"use client";

import { useState } from "react";
import Link from "next/link";
import type { MonthlyChecklistItem } from "@/lib/monthlyPaymentChecklist";

const money = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function MonthlyPaymentChecklist({ items, today, loading, dataComplete, incomeBuckets, extraPayment, targetName }: {
  items: MonthlyChecklistItem[];
  today: string;
  loading: boolean;
  dataComplete: boolean;
  incomeBuckets: { date: string; label: string }[];
  extraPayment: number | null;
  targetName?: string;
}) {
  const [showPaid, setShowPaid] = useState(false);
  const complete = items.filter(item => item.status === "Paid").length;
  const remaining = items.filter(item => item.status !== "Review").reduce((sum, item) => sum + item.remaining, 0);
  const visible = items.filter(item => showPaid || item.status !== "Paid");
  const groups = Array.from(new Set(visible.map(item => item.paycheckDate))).sort((a, b) => a ? b ? a.localeCompare(b) : -1 : 1);
  const month = new Date(`${today.slice(0, 7)}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return <section id="monthly-checklist" className="money-section-panel min-w-0" aria-labelledby="monthly-checklist-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="beast-kicker">{month}</p><h2 id="monthly-checklist-heading" className="money-section-title">Monthly payment checklist</h2></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showPaid} onChange={event => setShowPaid(event.target.checked)} />Show paid</label>
    </div>
    <p className="mt-2 text-sm text-slate-400">This month’s due dates and the current overdue cycle. Completion follows recorded payments. Record or correct a payment in Bills or Debts.</p>
    {loading ? <p role="status" className="mt-4">Loading payment checklist…</p> : !dataComplete ?
      <p role="status" className="mt-4 text-amber-200">The checklist could not verify complete payment records. Refresh to try again, or review Bills and Debts. Completion totals are unavailable.</p> : <>
      <p className="mt-4 font-semibold" role="status">{complete} of {items.length} paid · {money(remaining)} remaining{items.some(item => item.status === "Review") ? " · Some records need review" : ""}</p>
      {items.length === 0 ? <p className="mt-3 text-slate-400">No scheduled payments found for this month.</p> : visible.length === 0 ? <p className="mt-3 text-emerald-300">All listed payments are recorded as paid.</p> : null}
      <div className="mt-4 space-y-4">{groups.map(group => <div key={group || "unassigned"} className="rounded-xl border border-slate-700 p-3 sm:p-4">
        <h3 className="font-bold">{group ? incomeBuckets.find(bucket => bucket.date === group)?.label || `Paycheck ${dateLabel(group)}` : "No paycheck assigned"}</h3>
        <ul className="mt-3 divide-y divide-slate-700">{visible.filter(item => item.paycheckDate === group).map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1"><p className="break-words font-semibold"><span aria-hidden="true">{item.status === "Paid" ? "✓" : "○"}</span> {item.name}</p>
            <p className="text-sm text-slate-400">{item.kind === "debt" ? "Debt minimum" : "Bill"} · Due {dateLabel(item.dueDate)} · {item.status}{item.status === "Partial" && item.dueDate < today ? " · Overdue" : ""}</p>
            {group && group > item.dueDate && item.status !== "Paid" ? <p className="text-xs text-amber-200">Assigned paycheck arrives after the due date.</p> : null}
          </div>
          <div className="text-right text-sm"><p>{item.status === "Review" ? "Review amount due" : `${money(item.remaining)} left`}</p><p className="text-slate-400">{money(item.paid)} recorded</p></div>
          {item.status !== "Paid" ? <Link className="beast-button-secondary text-sm" href={item.kind === "bill" ? "/dashboard/money/bills" : "/dashboard/money/debts"} aria-label={`Review ${item.name} payment`}>Review payment</Link> : null}
        </li>)}</ul>
      </div>)}</div>
      <p className="mt-3 text-xs text-slate-400">Amounts use current bill and minimum-payment settings unless a completed payment cycle is recorded. Future occurrences need their own paycheck assignment.</p>
      {extraPayment != null && extraPayment > 0 && targetName ? <div className="mt-4 rounded-xl border border-sky-700 p-4"><p className="font-semibold">Optional extra debt payment: {money(extraPayment)} toward {targetName}</p><p className="mt-1 text-sm text-slate-400">Current cash-flow suggestion. Review your paycheck plan before recording a payment.</p><Link className="mt-2 inline-block text-sky-300 underline" href="#paycheck-strategy">Review paycheck plan</Link></div> : null}
    </>}
    <div className="mt-4 flex flex-wrap gap-4 text-sm text-sky-300"><Link href="/dashboard/money/bills">Open Bills</Link><Link href="/dashboard/money/debts">Open Debts</Link></div>
  </section>;
}
