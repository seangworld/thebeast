"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { GrowthCycleReport } from "@/lib/marketingGrowthCycle";

type Snapshot = { enabled: boolean; blocker: string; runs: { id: string; cycle_date: string; status: string; report: GrowthCycleReport }[] };
const endpoint = "/api/admin/beast-marketing/growth-cycle";
export function GrowthCyclePanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Growth history unavailable.");
      setSnapshot(body);
    } catch (error) { setSnapshot(null); throw error; }
  }
  useEffect(() => { void refresh().catch(() => setError("Growth history unavailable. Refresh to try again.")); }, []);
  async function act(body: object) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Growth operation unavailable.");
      setMessage(result.status === "already_claimed" ? "Today's cycle was already claimed. Review its record below; the next cycle is tomorrow." : result.status === "paused" ? "Enable discovery before running a cycle." : "Operation recorded. Review the latest cycle and any unavailable evidence below.");
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Growth operation unavailable."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-2xl border border-white/10 p-5">
    <div><h2 className="text-xl font-black text-white">Growth operating cycle</h2><p className="mt-2 text-sm text-slate-300">Daily Beast and News search discovery prepares up to four campaign drafts, destination introductions, tracked links, and refreshed search assessments. Existing campaign decisions remain yours.</p></div>
    {error && <p role="alert" className="text-rose-200">{error}</p>}
    {message && <p role="status" className="text-slate-200">{message}</p>}
    {!snapshot ? <p className="text-slate-300">{error ? "Cycle controls are unavailable." : "Loading cycle history…"}</p> : <>
      <p className="text-amber-200">{snapshot.blocker}</p>
      <p className="text-sm text-slate-300">Discovery is {snapshot.enabled ? "enabled" : "paused"}. Daily check: 10:20 UTC. One attempt per UTC day; an interrupted or failed attempt remains visible until the next day&apos;s cycle. Up to ten campaigns per product receive assessments, rotating daily. Search changes are not attributed conversions or proof of campaign effectiveness.</p>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => void act({ action: "set_enabled", enabled: !snapshot.enabled })} className="min-h-11 rounded-xl border border-white/20 px-4 py-2 text-white disabled:opacity-50">{snapshot.enabled ? "Pause discovery" : "Enable daily discovery"}</button>
        <button disabled={busy || !snapshot.enabled} onClick={() => void act({ action: "run" })} className="min-h-11 rounded-xl bg-amber-300 px-4 py-2 font-bold text-black disabled:opacity-50">{busy ? "Working…" : "Run today's cycle"}</button>
        <Link href="/dashboard/admin/marketing/advertising" className="min-h-11 px-4 py-2 text-amber-100">Review campaigns and assets →</Link>
      </div>
      {!snapshot.runs.length && <p className="text-slate-300">No cycles have run. No growth results have been established.</p>}
      <ol className="space-y-3">{snapshot.runs.map((run) => <li key={run.id} className="rounded-xl border border-white/10 p-4">
        <h3 className="font-bold text-white">{run.cycle_date} · {run.status}</h3>
        <p className="text-sm text-slate-300">{run.report.prepared?.length || 0} campaigns prepared · {run.report.assessed?.length || 0} new assessments</p>
        {run.status === "running" && <p className="text-amber-200">Completion is unconfirmed. This may be an active or interrupted cycle.</p>}
        {(run.report.unavailable || []).map((item) => <p key={item} className="break-words text-sm text-amber-200">Unavailable: {item}</p>)}
        {(run.report.blockers || []).map((item) => <p key={item} className="break-words text-sm text-amber-200">{item}</p>)}
        {(run.report.prepared || []).map((id) => <Link key={id} href={`/dashboard/admin/marketing/advertising?campaign=${id}`} className="mt-2 block break-all text-sm text-amber-100">Review campaign {id}</Link>)}
      </li>)}</ol>
    </>}
  </section>;
}
