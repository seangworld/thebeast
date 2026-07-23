"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { advanceIncomeDate, getNextIncomeDateDisplay } from "../cashflow/cashflowUtils";

type IncomeRecord = {
  id: string;
  name: string;
  amount: number;
  frequency: string | null;
  next_date: string | null;
  is_active: boolean;
  is_archived: boolean;
};

type AssignmentRecord = {
  id: string;
  name: string | null;
  assigned_income_date: string | null;
};

type IncomeDraft = { name: string; amount: string; frequency: string; nextDate: string };
const emptyDraft: IncomeDraft = { name: "", amount: "", frequency: "biweekly", nextDate: "" };

function previewDates(income: IncomeRecord) {
  if (!income.next_date) return [];
  const dates: string[] = [];
  let current = new Date(`${income.next_date}T12:00:00`);
  for (let index = 0; index < 3; index += 1) {
    dates.push(current.toLocaleDateString());
    current = advanceIncomeDate(current, income.frequency || "monthly");
  }
  return dates;
}

export function IncomeWorkspace() {
  const [ownerId, setOwnerId] = useState("");
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [draft, setDraft] = useState<IncomeDraft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [previewId, setPreviewId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const client = createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      setError(authError?.message || "Sign in again to load Income.");
      setLoading(false);
      return;
    }
    const [incomeResult, billsResult, debtsResult] = await Promise.all([
      client.from("income_events").select("*").eq("user_id", user.id).order("next_date", { ascending: true }),
      client.from("bill_events").select("id,name,assigned_income_date").eq("user_id", user.id).eq("is_archived", false),
      client.from("debts").select("id,name,assigned_income_date").eq("user_id", user.id).eq("is_archived", false),
    ]);
    const loadError = incomeResult.error || billsResult.error || debtsResult.error;
    if (loadError) setError(loadError.message);
    else {
      setOwnerId(user.id);
      setIncomes((incomeResult.data || []) as IncomeRecord[]);
      setAssignments([...(billsResult.data || []), ...(debtsResult.data || [])] as AssignmentRecord[]);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !draft.name.trim() || !draft.amount || !draft.nextDate) return;
    const client = createClient();
    const values = { name: draft.name.trim(), amount: Number(draft.amount), frequency: draft.frequency, next_date: draft.nextDate };
    const result = editingId
      ? await client.from("income_events").update(values).eq("user_id", ownerId).eq("id", editingId)
      : await client.from("income_events").insert({ ...values, user_id: ownerId, is_active: true, is_archived: false });
    if (result.error) setError(result.error.message);
    else { setDraft(emptyDraft); setEditingId(""); await load(); }
  }

  async function updateStatus(id: string, values: Partial<Pick<IncomeRecord, "is_active" | "is_archived">>) {
    const { error: updateError } = await createClient().from("income_events").update(values).eq("user_id", ownerId).eq("id", id);
    if (updateError) setError(updateError.message);
    else await load();
  }

  async function remove(record: IncomeRecord) {
    if (!window.confirm(`Delete ${record.name}? This cannot be undone.`)) return;
    const { error: deleteError } = await createClient().from("income_events").delete().eq("user_id", ownerId).eq("id", record.id);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  const active = incomes.filter((income) => !income.is_archived);
  const recurring = active.filter((income) => income.is_active);
  const future = [...recurring].sort((a, b) => (a.next_date || "").localeCompare(b.next_date || ""));
  const pots = useMemo(() => {
    const grouped = new Map<string, number>();
    assignments.forEach((item) => {
      if (item.assigned_income_date) grouped.set(item.assigned_income_date, (grouped.get(item.assigned_income_date) || 0) + 1);
    });
    return Array.from(grouped, ([date, count]) => ({ date, count }));
  }, [assignments]);

  if (loading) return <section className="beast-panel p-6 text-sm text-slate-300">Loading your income workspace…</section>;

  return (
    <div className="space-y-6 pb-12" data-income-workspace="true">
      {error ? <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100" role="alert">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Income summary">
        {[
          ["Active sources", String(recurring.length)],
          ["Next income", future[0]?.next_date ? getNextIncomeDateDisplay(future[0].next_date, future[0].frequency || "monthly") : "Not scheduled"],
          ["Income Pots", String(pots.length)],
          ["Monthly view", formatCurrency(recurring.reduce((sum, item) => sum + Number(item.amount || 0), 0))],
        ].map(([label, value]) => <article key={label} className="beast-panel p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></article>)}
      </section>

      <section className="beast-panel p-5" id="income-sources">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="money-section-title">Income Sources</h2><p className="mt-1 text-sm text-slate-400">Add recurring income and manage its availability.</p></div>
          <Link href="/dashboard/money/import" className="beast-button-secondary">Import income</Link>
        </div>
        <form onSubmit={save} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm text-slate-300">Name<input className="beast-input mt-1" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
          <label className="text-sm text-slate-300">Amount<input className="beast-input mt-1" type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} required /></label>
          <label className="text-sm text-slate-300">Frequency<select className="beast-input mt-1" value={draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value })}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
          <label className="text-sm text-slate-300">Next date<input className="beast-input mt-1" type="date" value={draft.nextDate} onChange={(event) => setDraft({ ...draft, nextDate: event.target.value })} required /></label>
          <div className="flex items-end gap-2"><button className="beast-button min-h-11 flex-1" type="submit">{editingId ? "Save" : "Add income"}</button>{editingId ? <button className="beast-button-secondary min-h-11" type="button" onClick={() => { setEditingId(""); setDraft(emptyDraft); }}>Cancel</button> : null}</div>
        </form>
        <div className="mt-5 grid gap-3">
          {active.map((income) => <article key={income.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="font-black text-white">{income.name}</h3><p className="mt-1 text-sm text-slate-400">{formatCurrency(income.amount)} · {income.frequency || "Unscheduled"} · {income.next_date || "No next date"}{!income.is_active ? " · Disabled" : ""}</p></div>
              <div className="flex flex-wrap gap-2">
                <button className="beast-button-secondary min-h-11" type="button" onClick={() => { setEditingId(income.id); setDraft({ name: income.name, amount: String(income.amount), frequency: income.frequency || "monthly", nextDate: income.next_date || "" }); }}>Edit</button>
                <button className="beast-button-secondary min-h-11" type="button" onClick={() => setPreviewId(previewId === income.id ? "" : income.id)}>Preview</button>
                <button className="beast-button-secondary min-h-11" type="button" onClick={() => void updateStatus(income.id, { is_active: !income.is_active })}>{income.is_active ? "Disable" : "Enable"}</button>
                <button className="beast-button-secondary min-h-11" type="button" onClick={() => void updateStatus(income.id, { is_archived: true })}>Archive</button>
                <button className="min-h-11 rounded-xl border border-rose-400/25 px-3 text-sm font-bold text-rose-200" type="button" onClick={() => void remove(income)}>Delete</button>
              </div>
            </div>
            {previewId === income.id ? <div className="mt-4 border-t border-white/10 pt-4"><p className="text-xs font-black uppercase tracking-wide text-cyan-300">Next expected deposits</p><ol className="mt-2 flex flex-wrap gap-2">{previewDates(income).map((date) => <li key={date} className="rounded-lg bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{date} · {formatCurrency(income.amount)}</li>)}</ol></div> : null}
          </article>)}
          {!active.length ? <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">No income sources yet. Add one above or import existing records.</p> : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="beast-panel p-5" id="income-pots"><h2 className="money-section-title">Income Pots</h2><p className="mt-1 text-sm text-slate-400">Obligations grouped by their assigned income date.</p><div className="mt-4 grid gap-2">{pots.map((pot) => <div key={pot.date} className="flex justify-between rounded-xl bg-white/[0.04] p-3 text-sm"><span className="font-bold text-white">{pot.date}</span><span className="text-slate-300">{pot.count} assignments</span></div>)}{!pots.length ? <p className="text-sm text-slate-400">No Income Pot assignments yet.</p> : null}</div></section>
        <section className="beast-panel p-5" id="paycheck-schedule"><h2 className="money-section-title">Paycheck Schedule</h2><p className="mt-1 text-sm text-slate-400">Upcoming recurring and future income.</p><div className="mt-4 grid gap-2">{future.slice(0, 6).map((income) => <div key={income.id} className="flex justify-between gap-3 rounded-xl bg-white/[0.04] p-3 text-sm"><span className="font-bold text-white">{income.name}</span><span className="text-right text-slate-300">{income.next_date || "Unscheduled"} · {formatCurrency(income.amount)}</span></div>)}</div></section>
        <section className="beast-panel p-5" id="funding-rules"><h2 className="money-section-title">Funding Rules</h2><p className="mt-2 text-sm leading-6 text-slate-300">Income Pots remain the source of truth for bill and debt timing. Manage assignment and transfer rules in Cash Flow.</p><Link className="beast-button-secondary mt-4 inline-flex" href="/dashboard/money/cashflow#income-planning">Review funding rules</Link></section>
        <section className="beast-panel p-5" id="transfers"><h2 className="money-section-title">Transfers</h2><p className="mt-2 text-sm leading-6 text-slate-300">Review scheduled transfers alongside funding sources and protected cash in Cash Flow.</p><Link className="beast-button-secondary mt-4 inline-flex" href="/dashboard/money/cashflow#funding-sources">Open transfers and funding</Link></section>
      </div>

      {incomes.some((income) => income.is_archived) ? <section className="beast-panel p-5"><h2 className="money-section-title">Archived Income</h2><div className="mt-4 grid gap-2">{incomes.filter((income) => income.is_archived).map((income) => <div key={income.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3"><span className="text-sm font-bold text-slate-300">{income.name}</span><button className="beast-button-secondary min-h-11" type="button" onClick={() => void updateStatus(income.id, { is_archived: false })}>Restore</button></div>)}</div></section> : null}
    </div>
  );
}
