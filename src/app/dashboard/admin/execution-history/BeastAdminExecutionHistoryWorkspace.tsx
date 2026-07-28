"use client";

import { useEffect, useState } from "react";
import {
  normalizeBeastAdminExecutionHistorySnapshot,
  type BeastAdminExecutionHistorySnapshot,
} from "@/lib/beastAdminExecutionHistory";
import { BeastAdminDataFreshness } from "../BeastAdminShell";

export function BeastAdminExecutionHistoryWorkspace() {
  const [snapshot, setSnapshot] = useState<BeastAdminExecutionHistorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/execution-history", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Execution history could not be loaded.");
        const normalized = normalizeBeastAdminExecutionHistorySnapshot(body);
        if (!normalized) throw new Error("Execution history returned an invalid response.");
        if (active) setSnapshot(normalized);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Execution history could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div role="status" className="rounded-2xl border border-white/10 bg-[#111827] p-6 text-sm text-slate-300">Loading durable execution history…</div>;
  }
  if (error) {
    return <div role="alert" className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-6"><h2 className="font-black text-white">Execution history unavailable</h2><p className="mt-2 text-sm leading-6 text-slate-300">{error}</p><p className="mt-2 text-xs text-slate-400">This is normal before the execution-history migration is applied. No activity is inferred.</p></div>;
  }
  if (!snapshot?.requests.length) {
    return <div className="rounded-2xl border border-dashed border-white/15 p-6"><h2 className="font-black text-white">No execution history yet</h2><p className="mt-2 text-sm leading-6 text-slate-300">This area records real execution requests after the persistence migration is applied and a member starts permissioned work. An empty history is normal and no placeholder activity is created.</p></div>;
  }

  return (
    <div className="space-y-6">
      <BeastAdminDataFreshness generatedAt={snapshot.generatedAt} staleAfterHours={1} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Execution status summary">
        {Object.entries(snapshot.counts).filter(([, value]) => value > 0).map(([status, value]) => (
          <div key={status} className="rounded-xl border border-white/10 bg-[#111827] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{status.replaceAll("_", " ")}</p>
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4" aria-label="Execution requests">
        {snapshot.requests.map((request) => (
          <details key={request.id} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <summary className="cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-wide text-cyan-300">{request.professionalId}</p><h2 className="mt-1 text-lg font-black text-white">{request.title}</h2><p className="mt-1 text-xs text-slate-400">{request.actionClassification}</p></div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-200">{request.status.replaceAll("_", " ")}</span>
              </div>
            </summary>
            <dl className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Audit events", request.auditEvents], ["Approvals", request.approvals],
                ["Results", request.results], ["Outcomes", request.outcomes],
                ["Recommendations", request.recommendations.length], ["Follow-ups", request.followUps],
              ].map(([label, value]) => <div key={label} className="rounded-lg border border-white/10 p-3"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 font-black text-white">{value}</dd></div>)}
            </dl>
            {request.limitations.length ? <div className="mt-4"><h3 className="text-sm font-black text-white">Limitations</h3><ul className="mt-2 text-sm leading-6 text-slate-300">{request.limitations.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
            {request.recommendations.length ? <div className="mt-4"><h3 className="text-sm font-black text-white">Recommendation evolution</h3><div className="mt-2 grid gap-2">{request.recommendations.map((item) => <div key={item.id} className="rounded-lg border border-white/10 p-3 text-sm text-slate-300"><span className="font-bold text-white">{item.title}</span> — {item.status}</div>)}</div></div> : null}
          </details>
        ))}
      </section>
    </div>
  );
}
