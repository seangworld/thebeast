"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Workstream = { id: string; presenter_profile_id: string; campaign_id: string };
type Plan = { id: string; agency_workstream_id: string; agency_channel: string; planned_for: string | null; timezone: string; status: string; variant_revision: number };
type Snapshot = { mode: "review_only"; publishingAuthorized: false; renderingAuthorized: false; spendingAuthorized: false; workstreams: Workstream[]; plans: Plan[]; truncated: boolean };
const channels: Record<string, string> = { facebook_page: "Facebook", instagram: "Instagram", x: "X" };

export function AgencyPlanningStatus() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const request = useRef(0);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    try {
      const response = await fetch("/api/admin/agency/plans", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || data.mode !== "review_only" || data.publishingAuthorized !== false || data.renderingAuthorized !== false || data.spendingAuthorized !== false || !Array.isArray(data.workstreams) || !Array.isArray(data.plans) || data.plans.some((plan: Partial<Plan> | null) => !plan || typeof plan.id !== "string" || typeof plan.agency_workstream_id !== "string" || typeof plan.agency_channel !== "string" || typeof plan.status !== "string" || typeof plan.timezone !== "string" || (plan.planned_for !== null && typeof plan.planned_for !== "string") || !Number.isInteger(plan.variant_revision))) throw new Error("Private planning status is unavailable.");
      if (mounted.current && request.current === version) { setSnapshot(data); setError(""); }
    } catch {
      if (mounted.current && request.current === version) { setSnapshot(null); setError("Private planning status is unavailable. Setup may still need its database migration."); }
    }
  }, []);
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; }; }, [refresh]);
  return <section aria-label="Private agency planning" className="rounded-2xl border border-white/10 bg-[#17202b] p-5">
    <h2 className="text-lg font-bold text-white">Private planning queue</h2>
    <p className="mt-2 text-sm text-slate-300">Review-only plans reuse saved creative revisions. Planned dates are review targets, not scheduled posts. This queue cannot render, spend or publish.</p>
    <button type="button" onClick={() => void refresh()} className="mt-3 min-h-11 rounded-lg border border-white/20 px-4 text-sm text-white">Refresh planning</button>
    {error && <p role="alert" className="mt-3 text-amber-200">{error}</p>}
    {!snapshot && !error && <p role="status" className="mt-3 text-slate-300">Loading private plans…</p>}
    {snapshot && <>
      <p className="mt-3 text-sm text-slate-300">{snapshot.workstreams.length} private workstreams · {snapshot.plans.length} review plans{snapshot.truncated ? " shown; additional records may exist" : ""}</p>
      {snapshot.plans.length === 0 && <p className="mt-2 text-sm text-slate-400">No review plans saved yet. First link a private character to a draft campaign, then prepare a revision-bound creative plan.</p>}
      <ul className="mt-3 space-y-3">{snapshot.plans.map(plan => <li key={plan.id} className="rounded-xl border border-white/10 p-3 text-sm text-slate-300">
        <p>{channels[plan.agency_channel] || "Unspecified channel"} · creative revision {plan.variant_revision} · internal state: {plan.status}</p>
        <p className="mt-1 text-xs text-slate-400">Workstream {plan.agency_workstream_id.slice(0, 8)} · {plan.planned_for ? `Review target: ${plan.planned_for} (${plan.timezone})` : "No review date chosen"}</p>
      </li>)}</ul>
    </>}
  </section>;
}
