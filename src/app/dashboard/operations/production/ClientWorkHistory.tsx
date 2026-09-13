"use client";

import { useCallback, useEffect, useState } from "react";

type ClientJob = {
  id: string;
  client_name: string;
  project_name: string;
  job_type: "code_audit" | "client_delivery";
  status: "completed" | "archived";
  audit_profile: string | null;
  attention_level: string | null;
  files_count: number;
  findings_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  artifact_name: string;
  created_at: string;
};

const jobLabel = (job: ClientJob) => job.job_type === "code_audit" ? "Code audit" : "Client delivery";
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

export function ClientWorkHistory() {
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [archiving, setArchiving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/production/client-jobs", { cache: "no-store" });
      const body = await response.json().catch(() => null) as { jobs?: ClientJob[]; error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Client work history is unavailable.");
      setJobs(body?.jobs || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Client work history is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function archive(id: string) {
    setArchiving(id);
    setError("");
    try {
      const response = await fetch("/api/admin/production/client-jobs", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, action: "archive" }) });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "The job could not be archived.");
      setJobs((current) => current.map((job) => job.id === id ? { ...job, status: "archived" } : job));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The job could not be archived.");
    } finally {
      setArchiving(null);
    }
  }

  const active = jobs.filter((job) => job.status === "completed").slice(0, 8);
  const archived = jobs.filter((job) => job.status === "archived").length;

  return (
    <section className="rounded-3xl border border-white/10 bg-[#111c2b] p-5 sm:p-7" aria-labelledby="client-work-history-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Client operations</p><h2 id="client-work-history-title" className="mt-2 text-2xl font-bold text-white">Recent client work</h2></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-10 rounded-xl border border-white/15 px-4 text-sm font-bold text-slate-200 disabled:opacity-50">{loading ? "Loading…" : "Refresh"}</button>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">HQ records job metadata only. Client source and deliverables are not stored; finished files remain only in your download.</p>
      {error ? <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100" role="alert">{error}</p> : null}
      {!loading && !error && active.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-400">No completed client packages yet. New code audits and delivery packages will appear here.</p> : null}
      {active.length > 0 ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Client / project</th><th className="px-3 py-3">Package</th><th className="px-3 py-3">Result</th><th className="px-3 py-3">Created</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody>{active.map((job) => <tr key={job.id} className="border-b border-white/[0.07] align-top"><td className="px-3 py-4"><span className="font-bold text-white">{job.client_name}</span><span className="mt-1 block text-slate-400">{job.project_name}</span></td><td className="px-3 py-4 text-slate-300"><span>{jobLabel(job)}</span>{job.audit_profile ? <span className="mt-1 block capitalize text-slate-500">{job.audit_profile} profile</span> : null}</td><td className="px-3 py-4 text-slate-300">{job.job_type === "code_audit" ? <><span className="capitalize">{job.attention_level || "review"} attention</span><span className="mt-1 block text-slate-500">{job.findings_count} findings · {job.files_count} files</span></> : <span>{job.files_count} deliverable files</span>}</td><td className="px-3 py-4 text-slate-400">{formatDate(job.created_at)}</td><td className="px-3 py-4 text-right"><button type="button" onClick={() => void archive(job.id)} disabled={archiving === job.id} className="min-h-10 rounded-lg border border-white/15 px-3 font-bold text-slate-300 disabled:opacity-50">{archiving === job.id ? "Archiving…" : "Archive"}</button></td></tr>)}</tbody></table></div> : null}
      {!loading && archived > 0 ? <p className="mt-4 text-xs text-slate-500">{archived} archived job{archived === 1 ? "" : "s"} retained in history.</p> : null}
    </section>
  );
}
