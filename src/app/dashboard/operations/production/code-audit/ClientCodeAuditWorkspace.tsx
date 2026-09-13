"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type Result = { fileName: string; files: number; findings: number; critical: number; high: number; medium: number; attention: string; recorded: boolean };

export function ClientCodeAuditWorkspace() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const downloadUrl = useRef<string | null>(null);

  useEffect(() => () => { if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunning(true);
    setError("");
    setResult(null);
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    downloadUrl.current = null;
    try {
      const response = await fetch("/api/admin/production/code-audit", { method: "POST", body: new FormData(event.currentTarget) });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "The audit package could not be created.");
      }
      const disposition = response.headers.get("content-disposition") || "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || "client-code-audit.zip";
      const url = URL.createObjectURL(await response.blob());
      downloadUrl.current = url;
      setResult({ fileName, files: Number(response.headers.get("x-audit-files-reviewed") || 0), findings: Number(response.headers.get("x-audit-findings") || 0), critical: Number(response.headers.get("x-audit-critical") || 0), high: Number(response.headers.get("x-audit-high") || 0), medium: Number(response.headers.get("x-audit-medium") || 0), attention: response.headers.get("x-audit-attention") || "review", recorded: response.headers.get("x-job-recorded") === "true" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The audit package could not be created.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div><Link href="/dashboard/operations/production" className="text-sm font-bold text-cyan-200 hover:text-white">← Production</Link></div>
      <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-300/10 via-[#111c2b] to-[#0d1522] p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Client package factory</p>
        <h2 className="mt-2 text-3xl font-black text-white">Create a code audit package</h2>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-300">Upload a ZIP. HQ performs a multi-area static review and creates the finished client-facing audit—without using AI credits. Review it, then send it directly to the client.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[['1', 'Choose the review', 'Select complete, security, launch, or code-quality focus.'], ['2', 'Audit and prioritize', 'Code is read as text, never executed, and findings are grouped by risk.'], ['3', 'Send this package', 'Review the professional report and deliver this ZIP directly.']].map(([number, title, detail]) => <div key={number} className="rounded-2xl border border-white/10 bg-black/10 p-4"><span className="text-sm font-black text-cyan-200">{number}</span><h3 className="mt-2 font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p></div>)}
        </div>
      </section>

      <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-[#111c2b] p-5 sm:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-200">Client name<input name="clientName" required maxLength={120} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#080e18] px-4 text-white" /></label>
          <label className="text-sm font-bold text-slate-200">Project name<input name="projectName" required maxLength={120} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#080e18] px-4 text-white" /></label>
          <label className="text-sm font-bold text-slate-200 md:col-span-2">Audit profile<select name="auditType" defaultValue="full" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#080e18] px-4 text-white"><option value="full">Complete client audit — recommended</option><option value="security">Security and dependency review</option><option value="launch">Launch readiness review</option><option value="quality">Code quality and maintainability</option></select><span className="mt-2 block font-normal leading-6 text-slate-400">Complete audit checks all supported security, dependency, reliability, accessibility, performance, maintainability, and delivery-readiness rules.</span></label>
          <label className="text-sm font-bold text-slate-200 md:col-span-2">What should the audit focus on?<textarea name="focus" maxLength={500} rows={3} placeholder="Example: security, launch readiness, maintainability, and handoff risks" className="mt-2 w-full rounded-xl border border-white/15 bg-[#080e18] p-4 text-white placeholder:text-slate-600" /></label>
          <label className="text-sm font-bold text-slate-200 md:col-span-2">Client notes or delivery context<textarea name="notes" maxLength={3000} rows={4} placeholder="Optional scope, known issues, deadlines, or client expectations" className="mt-2 w-full rounded-xl border border-white/15 bg-[#080e18] p-4 text-white placeholder:text-slate-600" /></label>
          <label className="rounded-2xl border border-dashed border-cyan-200/35 bg-cyan-200/[0.04] p-5 text-sm font-bold text-slate-200 md:col-span-2">Client code ZIP (12 MB maximum)<input name="archive" type="file" required accept=".zip,application/zip" className="mt-3 block w-full text-sm font-normal text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-200 file:px-4 file:py-2.5 file:font-bold file:text-slate-950" /><span className="mt-3 block font-normal leading-6 text-slate-400">Dependencies, Git history, build output, binary files, and common generated folders are skipped. Remove anything you are not authorized to review.</span></label>
        </div>
        <button type="submit" disabled={running} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-200 px-5 py-3 font-black text-slate-950 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{running ? "Auditing and packaging…" : "Create client audit package"}</button>
        {running ? <div className="mt-4" role="status"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-200" /></div><p className="mt-2 text-sm text-cyan-100">Reading the ZIP, checking supported files, and building the delivery package.</p></div> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100" role="alert">{error}</p> : null}
        {result && downloadUrl.current ? <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-5" role="status"><p className="font-black text-emerald-100">Client audit package ready</p><p className="mt-1 text-sm text-slate-300">Attention: <b className="uppercase">{result.attention}</b> · {result.files} files reviewed · {result.findings} prioritized findings ({result.critical} critical, {result.high} high, {result.medium} medium).</p><p className="mt-2 text-sm font-bold text-emerald-100">This is the package you send. You do not need to run it through Client Delivery Package.</p>{!result.recorded ? <p className="mt-2 text-sm text-amber-100">The download is ready, but HQ could not add this run to Recent client work.</p> : null}<a href={downloadUrl.current} download={result.fileName} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-200 px-4 py-3 text-sm font-black text-slate-950">Download finished audit package</a></div> : null}
      </form>

      <section className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-5">
        <h2 className="font-bold text-white">What is inside the finished package</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">A polished browser/print report, executive summary, technical findings, CSV tracker, prioritized remediation plan, runtime-verification checklist, project inventory, and structured audit data. The static audit does not run the code, perform a penetration test, query live vulnerability databases, or certify that the project is secure.</p>
      </section>
    </div>
  );
}
