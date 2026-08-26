"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";

type Run = { id: string; status: string; started_at: string; checked_sources: string[]; unavailable_sources: string[]; findings: unknown[]; suppressed_signals: string[]; confidence: string; impact: string; next_step: string; investigation_count: number; proposal_count: number; error_category: string | null };
type Payload = { state: "never_run" | "clean" | "failed" | "findings"; schedule: { enabled: boolean; cadence: string; next_run_at: string | null; last_run_at: string | null } | null; runs: Run[]; authority: string };

const stateLabels = { never_run: "Never run", clean: "Worked today · no material findings", failed: "Last cycle failed", findings: "Findings need owner review" };
export function StaffOperationsWorkspace({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Payload | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const response = await fetch("/api/admin/staff-operations", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Staff evidence unavailable."); setData(body); setError(null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Staff evidence unavailable."); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function act(action: "pause" | "resume") { setBusy(true); try { const response = await fetch("/api/admin/staff-operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); if (!response.ok) throw new Error("The assignment could not be updated."); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "The assignment could not be updated."); } finally { setBusy(false); } }
  const latest = data?.runs[0];
  return <DashboardCard accent="admin"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><SectionHeader eyebrow="Orchestrator 3.0 · Standing staff" title="Did the staff work today?" description={data ? stateLabels[data.state] : "Loading durable observation evidence…"} />{data ? <span className={`h-fit rounded-full border px-3 py-1 text-xs font-black ${data.schedule?.enabled ? "border-emerald-300/30 text-emerald-200" : "border-slate-500/40 text-slate-300"}`}>{data.schedule?.enabled ? "Daily assignment active" : "Paused / not activated"}</span> : null}</div>
    {error ? <p role="alert" className="mt-4 text-sm text-red-200">{error}</p> : null}
    {latest ? <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Last run", new Date(latest.started_at).toLocaleString()], ["Sources", `${latest.checked_sources.length} checked · ${latest.unavailable_sources.length} unavailable`], ["Findings", `${latest.findings.length} · ${latest.investigation_count} investigated`], ["Next", latest.next_step]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 p-3"><dt className="text-xs font-black uppercase text-slate-400">{label}</dt><dd className="mt-2 text-sm font-bold text-white">{value}</dd></div>)}</dl> : <p className="mt-4 text-sm text-slate-400">No cycle evidence exists. This is different from a completed clean cycle.</p>}
    {!compact && latest ? <div className="mt-4 grid gap-3 md:grid-cols-2"><p className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">Confidence: {latest.confidence} · impact: {latest.impact}<br />Suppressed: {latest.suppressed_signals.length} · proposals: {latest.proposal_count}</p><p className="rounded-xl border border-white/10 p-4 text-sm text-slate-300">{data?.authority}</p></div> : null}
    {!compact && data ? <button type="button" disabled={busy} className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-sm font-black text-white" onClick={() => void act(data.schedule?.enabled ? "pause" : "resume")}>{busy ? "Updating…" : data.schedule?.enabled ? "Pause daily assignment" : "Resume daily assignment"}</button> : null}
  </DashboardCard>;
}
