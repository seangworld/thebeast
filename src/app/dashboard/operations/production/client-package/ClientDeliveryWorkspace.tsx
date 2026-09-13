"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type Result = { fileName: string; files: number; bytes: number };
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function ClientDeliveryWorkspace() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const downloadUrl = useRef<string | null>(null);
  useEffect(() => () => { if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunning(true); setError(""); setResult(null);
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    downloadUrl.current = null;
    try {
      const response = await fetch("/api/admin/production/client-package", { method: "POST", body: new FormData(event.currentTarget) });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || "The client package could not be created.");
      }
      const fileName = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "client-delivery.zip";
      downloadUrl.current = URL.createObjectURL(await response.blob());
      setResult({ fileName, files: Number(response.headers.get("x-delivery-files") || 0), bytes: Number(response.headers.get("x-delivery-bytes") || 0) });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The client package could not be created."); }
    finally { setRunning(false); }
  }

  return <div className="space-y-6">
    <div><Link href="/dashboard/operations/production" className="text-sm font-bold text-cyan-200 hover:text-white">← Production</Link></div>
    <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-300/10 via-[#111c2b] to-[#0d1522] p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Client package factory</p><h2 className="mt-2 text-3xl font-black text-white">Package finished work for delivery</h2><p className="mt-2 max-w-3xl text-base leading-7 text-slate-300">Add the finished files and handoff details once. HQ creates one organized ZIP with a polished browser/print summary, README, and SHA-256 file manifest—without AI credits.</p></section>
    <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-[#111c2b] p-5 sm:p-7">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-200">Client name<input name="clientName" required maxLength={120} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#080e18] px-4 text-white" /></label>
        <label className="text-sm font-bold text-slate-200">Project name<input name="projectName" required maxLength={120} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#080e18] px-4 text-white" /></label>
        <label className="text-sm font-bold text-slate-200 md:col-span-2">Service type<select name="serviceType" required defaultValue="" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#080e18] px-4 text-white"><option value="" disabled>Select the work delivered</option><option>Code audit</option><option>Website or application</option><option>Content package</option><option>Marketing package</option><option>Research or consulting</option><option>Custom service</option></select></label>
        <label className="text-sm font-bold text-slate-200 md:col-span-2">Project summary<textarea name="summary" required maxLength={3000} rows={4} placeholder="What was completed and what outcome this delivery provides" className="mt-2 w-full rounded-xl border border-white/15 bg-[#080e18] p-4 text-white placeholder:text-slate-600" /></label>
        <label className="text-sm font-bold text-slate-200">Deliverables, one per line<textarea name="deliverables" required maxLength={3000} rows={6} placeholder={'Final website source\nDeployment guide\nAudit report'} className="mt-2 w-full rounded-xl border border-white/15 bg-[#080e18] p-4 text-white placeholder:text-slate-600" /></label>
        <label className="text-sm font-bold text-slate-200">Next steps, one per line<textarea name="nextSteps" maxLength={3000} rows={6} placeholder={'Review the delivery\nConfirm acceptance\nSend revision requests by the agreed date'} className="mt-2 w-full rounded-xl border border-white/15 bg-[#080e18] p-4 text-white placeholder:text-slate-600" /></label>
        <label className="text-sm font-bold text-slate-200">Handoff instructions<textarea name="handoffInstructions" maxLength={3000} rows={5} placeholder="How to open, install, publish, or use the delivered work" className="mt-2 w-full rounded-xl border border-white/15 bg-[#080e18] p-4 text-white placeholder:text-slate-600" /></label>
        <label className="text-sm font-bold text-slate-200">Support and revision terms<textarea name="supportTerms" maxLength={3000} rows={5} placeholder="Example: One revision round within seven days" className="mt-2 w-full rounded-xl border border-white/15 bg-[#080e18] p-4 text-white placeholder:text-slate-600" /></label>
        <label className="rounded-2xl border border-dashed border-cyan-200/35 bg-cyan-200/[0.04] p-5 text-sm font-bold text-slate-200 md:col-span-2">Finished deliverable files<input name="files" type="file" required multiple className="mt-3 block w-full text-sm font-normal text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-200 file:px-4 file:py-2.5 file:font-bold file:text-slate-950" /><span className="mt-3 block font-normal leading-6 text-slate-400">Up to 50 files, 15 MB each and 24 MB combined. The files are packaged for this download and are not saved to Beast.</span></label>
      </div>
      <button type="submit" disabled={running} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-200 px-5 py-3 font-black text-slate-950 disabled:cursor-wait disabled:opacity-60 sm:w-auto">{running ? "Building client delivery…" : "Create delivery package"}</button>
      {running ? <div className="mt-4" role="status"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-200" /></div><p className="mt-2 text-sm text-cyan-100">Organizing files, calculating checksums, and writing the handoff documents.</p></div> : null}
      {error ? <p className="mt-4 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100" role="alert">{error}</p> : null}
      {result && downloadUrl.current ? <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-5" role="status"><p className="font-black text-emerald-100">Delivery package ready</p><p className="mt-1 text-sm text-slate-300">Packaged {result.files} files ({formatBytes(result.bytes)}). Open and review the ZIP before sending it.</p><a href={downloadUrl.current} download={result.fileName} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-200 px-4 py-3 text-sm font-black text-slate-950">Download {result.fileName}</a></div> : null}
    </form>
    <section className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-5"><h2 className="font-bold text-white">This packages completed work</h2><p className="mt-2 text-sm leading-6 text-slate-300">It does not create or approve the underlying client work. You remain responsible for confirming scope, quality, licenses, confidential-data handling, and the final files before delivery.</p></section>
  </div>;
}
