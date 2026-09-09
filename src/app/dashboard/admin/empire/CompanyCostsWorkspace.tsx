"use client";

import { useEffect, useState } from "react";
import { type CompanyCost, parseCompanyCost, summarizeCompanyCosts } from "@/lib/companyCosts";

const money = (cents: number | null) => cents === null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const blank = (): CompanyCost => ({ id: crypto.randomUUID(), name: "", kind: "recurring", amount_cents: null, interval_months: 1, active: true, paid_on: null, notes: "" });
const inputClass = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white";

export function CompanyCostsWorkspace() {
  const [entries, setEntries] = useState<CompanyCost[] | null>(null);
  const [draft, setDraft] = useState<CompanyCost | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setError(""); setEntries(null);
    try {
      const response = await fetch("/api/admin/company-costs", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.entries)) throw new Error(result.error || "Costs could not be loaded.");
      setEntries(result.entries.map(parseCompanyCost));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Costs could not be loaded."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  function edit(row: CompanyCost) { setDraft({ ...row }); setAmount(row.amount_cents === null ? "" : (row.amount_cents / 100).toFixed(2)); setNotice(""); setError(""); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError(""); setNotice("");
    if (amount !== "" && !/^\d+(\.\d{1,2})?$/.test(amount)) { setError("Enter a nonnegative amount with up to two decimal places."); return; }
    let row: CompanyCost;
    try { row = parseCompanyCost({ ...draft, amount_cents: amount === "" ? null : Math.round(Number(amount) * 100) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Check the form."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/company-costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cost was not saved.");
      const saved = parseCompanyCost(result.entry);
      setEntries((previous) => [saved, ...(previous || []).filter((entry) => entry.id !== saved.id)]);
      setDraft(null); setNotice("Cost saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cost was not saved."); }
    finally { setBusy(false); }
  }
  const summary = entries ? summarizeCompanyCosts(entries) : null;
  return <section className="mt-5 space-y-4" aria-label="Company expense ledger">
    <p className="text-sm text-slate-300">Track subscriptions, actual payments and prepaid credits. Amounts are owner-entered in USD; automatic billing imports are not connected.</p>
    <div className="grid gap-3 sm:grid-cols-3">
      {[["Known monthly estimate", summary?.monthlyCents ?? null], ["Recorded payments", summary?.recordedPaymentsCents ?? null], ["Recorded credit funding", summary?.recordedFundingCents ?? null]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-slate-700 p-3"><p className="text-sm text-slate-400">{label}</p><p className="text-xl font-bold text-white">{money(value as number | null)}</p></div>)}
    </div>
    <p className="text-xs leading-5 text-slate-400">These are partial records, not a verified company total. Recurring costs are averaged by billing interval, not counted as paid. Credit funding is money deposited, not proof of API consumption. Payment history is not inferred from a subscription rate. {summary ? `${summary.unknownRecurring} active recurring entries have unknown amounts.` : ""}</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-300">{notice}</p>}
    <div className="flex gap-3">
      <button disabled={busy || entries === null || draft !== null} onClick={() => edit(blank())} className="rounded-lg bg-amber-200 px-4 py-2 font-bold text-slate-950 disabled:opacity-50">Add cost</button>
      <button disabled={busy || draft !== null} onClick={() => void load()} className="rounded-lg border border-slate-600 px-4 py-2 text-white disabled:opacity-50">{busy ? "Working…" : "Refresh / Retry"}</button>
    </div>
    {draft && <form onSubmit={save} className="space-y-3 rounded-xl border border-slate-600 p-4">
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-3 font-bold text-white">Cost entry</legend>
        <label className="text-sm text-slate-300">Service / description<input autoFocus required maxLength={120} className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label className="text-sm text-slate-300">Entry type<select className={inputClass} value={draft.kind} onChange={(e) => { const kind = e.target.value as CompanyCost["kind"]; setDraft({ ...draft, kind, interval_months: kind === "recurring" ? 1 : null, paid_on: null, active: true }); }}><option value="recurring">Recurring cost estimate</option><option value="payment">Actual payment / historical total</option><option value="credit_funding">Prepaid credit funding</option></select></label>
        <label className="text-sm text-slate-300">Amount (USD; blank means unknown)<input inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        {draft.kind === "recurring" ? <>
          <label className="text-sm text-slate-300">Billed every (months)<input type="number" min={1} max={120} required className={inputClass} value={draft.interval_months ?? ""} onChange={(e) => setDraft({ ...draft, interval_months: e.target.value === "" ? null : Number(e.target.value) })} /></label>
          <label className="text-sm text-slate-300"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Currently active</label>
        </> : <label className="text-sm text-slate-300">Payment date (optional)<input type="date" className={inputClass} value={draft.paid_on || ""} onChange={(e) => setDraft({ ...draft, paid_on: e.target.value || null })} /></label>}
        <label className="text-sm text-slate-300 sm:col-span-2">Notes / receipt reference / historical period<textarea maxLength={1000} className={inputClass} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label>
      </fieldset>
      <div className="flex gap-3"><button disabled={busy} className="rounded-lg bg-amber-200 px-4 py-2 font-bold text-slate-950">Save cost</button><button type="button" disabled={busy} onClick={() => setDraft(null)} className="px-4 py-2 text-slate-300">Cancel</button></div>
    </form>}
    {entries?.length === 0 && <p className="text-sm text-slate-400">No costs recorded yet. Add subscriptions even when the amount is still unknown.</p>}
    <div className="space-y-2">{entries?.map((row) => <article key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-700 p-3">
      <div className="min-w-0 flex-1"><h3 className="break-words font-bold text-white">{row.name}</h3><p className="text-sm text-slate-300">{row.amount_cents === null ? "Amount unknown" : money(row.amount_cents)} · {row.kind === "recurring" ? `every ${row.interval_months} month(s) · ${row.active ? "active" : "inactive"}` : row.kind === "payment" ? "recorded payment" : "prepaid funding"}{row.paid_on ? ` · ${row.paid_on}` : ""}</p><p className="whitespace-pre-wrap break-words text-xs text-slate-400">{row.notes}</p></div>
      <button disabled={busy || draft !== null} onClick={() => edit(row)} aria-label={`Edit ${row.name}`} className="rounded border border-slate-600 px-3 py-1 text-white disabled:opacity-50">Edit</button>
    </article>)}</div>
  </section>;
}
