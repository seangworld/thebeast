"use client";

import Link from "next/link";
import { useState } from "react";
import { DocumentUploadDropzone } from "@/app/dashboard/uploads/DocumentUploadDropzone";
import { analyzeSmartFinancialImport, type SmartFinancialImportAnalysis } from "@/lib/smartFinancialImport";
import { createClient } from "@/lib/supabase/client";
import type { MoneyImportTarget } from "@/lib/financialImport";

const sources = ["Excel", "CSV", "Google Sheets", "Rocket Money", "Quicken", "Monarch", "YNAB", "Bank export", "Credit card export", "Loan export", "Statement"];

export function SmartFinancialImport() {
  const [target, setTarget] = useState<MoneyImportTarget>("bill");
  const [analysis, setAnalysis] = useState<SmartFinancialImportAnalysis | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [showDocuments, setShowDocuments] = useState(false);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    if (!/\.csv$/i.test(file.name)) {
      setAnalysis(null);
      setStatus("Excel and statement files use shared Document Intelligence. Upload the file below so it remains available to Money Coach without creating a duplicate extraction system.");
      setShowDocuments(true);
      return;
    }
    const csv = await file.text();
    setAnalysis(analyzeSmartFinancialImport({ csv, source: file.name, target }));
    setStatus("");
  }

  async function confirmImport() {
    if (!analysis?.preview.readyToSave || analysis.target === "transaction") return;
    const client = createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) { setStatus(authError?.message || "Sign in again before importing."); return; }
    const rows = analysis.preview.validRows.map((row) => {
      if (analysis.target === "bill") return { user_id: user.id, name: String(row.values.name), amount: Number(row.values.amount), due_date: Number(row.values.due_date || 1), frequency: String(row.values.frequency || "monthly"), is_archived: false };
      if (analysis.target === "debt") return { user_id: user.id, name: String(row.values.name), balance: Number(row.values.balance), minimum_payment: Number(row.values.minimum_payment || 0), interest_rate: Number(row.values.interest_rate || 0), due_date: 1, is_archived: false };
      return { user_id: user.id, name: String(row.values.name), amount: Number(row.values.amount), frequency: String(row.values.frequency || "monthly"), next_date: row.values.next_date ? String(row.values.next_date) : null, is_active: true, is_archived: false };
    });
    const table = analysis.target === "bill" ? "bill_events" : analysis.target === "debt" ? "debts" : "income_events";
    const { error } = await client.from(table).insert(rows);
    if (error) setStatus(error.message);
    else { setStatus(`Imported ${rows.length} confirmed ${analysis.target} record${rows.length === 1 ? "" : "s"}.`); setAnalysis(null); }
  }

  return (
    <div className="space-y-6 pb-12" data-smart-financial-import="true">
      <section className="grid gap-4 lg:grid-cols-3" aria-label="Financial onboarding paths">
        <article className="beast-panel p-5"><p className="text-xs font-black uppercase tracking-wide text-cyan-300">Path 1</p><h2 className="mt-2 text-xl font-black text-white">Import My Financial Data</h2><p className="mt-2 text-sm leading-6 text-slate-300">Analyze an export, review proposed records, and confirm before anything is saved.</p><label className="beast-button mt-5 inline-flex cursor-pointer">Choose file<input className="sr-only" type="file" accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf" onChange={(event) => void chooseFile(event.target.files?.[0])} /></label></article>
        <article className="beast-panel p-5"><p className="text-xs font-black uppercase tracking-wide text-cyan-300">Path 2</p><h2 className="mt-2 text-xl font-black text-white">Build My Financial Profile</h2><p className="mt-2 text-sm leading-6 text-slate-300">Let Money Coach guide income, bills, debts, savings, retirement, and goals conversationally.</p><Link className="beast-button mt-5 inline-flex" href="/dashboard/money?starter=Help%20me%20build%20my%20financial%20profile%20starting%20with%20what%20I%20already%20know.">Start with Money Coach</Link></article>
        <article className="beast-panel p-5"><p className="text-xs font-black uppercase tracking-wide text-cyan-300">Path 3</p><h2 className="mt-2 text-xl font-black text-white">Explore First</h2><p className="mt-2 text-sm leading-6 text-slate-300">Browse BeastMoney now. Money Coach will gently point out which missing records would improve future guidance.</p><Link className="beast-button-secondary mt-5 inline-flex" href="/dashboard/money/dashboard">Explore BeastMoney</Link></article>
      </section>

      <section className="beast-panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="money-section-title">Import experience</h2><p className="mt-1 text-sm text-slate-400">{fileName || "Select the kind of records in your export, then choose a file."}</p></div><label className="text-sm font-bold text-slate-300">Import as<select className="beast-input mt-1" value={target} onChange={(event) => { setTarget(event.target.value as MoneyImportTarget); setAnalysis(null); }}><option value="bill">Bills</option><option value="debt">Debts or loans</option><option value="income">Income</option><option value="transaction">Transactions (analysis only)</option></select></label></div>
        <div className="mt-5 flex flex-wrap gap-2">{sources.map((source) => <span key={source} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300">{source}</span>)}</div>
        {status ? <p className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100" role="status">{status}</p> : null}
      </section>

      {analysis ? <section className="beast-panel p-5" aria-labelledby="money-coach-import-review"><p className="text-xs font-black uppercase tracking-wide text-cyan-300">Money Coach review</p><h2 id="money-coach-import-review" className="mt-2 text-xl font-black text-white">Here’s what I found</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">{analysis.summary.map((item) => <div key={item} className="rounded-xl bg-white/[0.04] p-3 text-sm font-bold text-slate-200">{item}</div>)}</div>
        <div className="mt-4 grid gap-3">{analysis.findings.map((finding) => <article key={finding.id} className="rounded-xl border border-white/10 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-black text-white">{finding.title}</h3><span className="text-[10px] font-black uppercase text-slate-500">{finding.confidence} confidence</span></div><p className="mt-2 text-sm text-slate-400">{finding.detail}</p></article>)}</div>
        {analysis.preview.mappingIssues.length || analysis.preview.invalidRows.length ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">Review required: {[...analysis.preview.mappingIssues.map((issue) => issue.message), ...analysis.preview.invalidRows.flatMap((row) => row.errors)].join(" ")}</div> : null}
        <div className="mt-5 flex flex-wrap gap-3"><button className="beast-button" type="button" disabled={!analysis.preview.readyToSave || analysis.target === "transaction"} onClick={() => void confirmImport()}>Confirm and import {analysis.preview.validRows.length}</button><button className="beast-button-secondary" type="button" onClick={() => setAnalysis(null)}>Cancel</button></div>
      </section> : null}

      {showDocuments ? <section className="beast-panel p-5"><h2 className="money-section-title">Document Intelligence intake</h2><p className="mt-2 text-sm text-slate-400">The shared document record remains the source for Excel workbooks and statements.</p><DocumentUploadDropzone /></section> : null}
    </div>
  );
}
