"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { buildAgencySnapshot, AgencyChannel } from "@/lib/agencyPreparation";
type Snapshot = ReturnType<typeof buildAgencySnapshot>;
const labels = { instagram: "Instagram", facebook_page: "Facebook", x: "X" };
const states = { not_connected: "Not connected", connected_unverified: "Connected · reporting not verified", expired: "Authorization expired", unavailable: "Connection unavailable", binding_conflict: "Account binding needs review" };
const metrics = ["Followers", "30-day growth", "Reach", "Engagement", "Posts", "Revenue", "Operating cost"];

export function AgencyMetricsContent() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const response = await fetch("/api/admin/agency", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Agency setup is unavailable.");
      if (mounted.current && version === requestVersion.current) { setSnapshot(result); setError(""); setSelection({}); }
    } catch (e) {
      if (mounted.current && version === requestVersion.current) { setSnapshot(null); setError(e instanceof Error ? e.message : "Agency setup is unavailable."); }
    }
  }, []);
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; }; }, [refresh]);
  async function bind(presenterProfileId: string, channel: AgencyChannel) {
    const connectionId = selection[`${presenterProfileId}:${channel}`];
    if (pending.current || !connectionId) return;
    pending.current = true; requestVersion.current++; setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/agency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bind", presenterProfileId, channel, connectionId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Account binding failed.");
      if (mounted.current) await refresh();
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Account binding failed. Refresh before retrying."); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <>
    <section className="rounded-2xl border border-white/10 bg-[#17202b] p-5">
      <h2 className="text-lg font-bold text-white">Agency preparation</h2>
      <p className="mt-2 text-sm text-slate-300">This Agency preparation feature cannot publish automatically or respond to DMs. Its additional spending authorization is $0. Existing Social Accounts publishing controls are managed separately.</p>
      <p className="mt-2 text-sm text-slate-300">Save character drafts in <Link href="/dashboard/admin/marketing/video-growth" className="underline">Video Growth</Link> and review existing connections in <Link href="/dashboard/operations/marketing/social" className="underline">Social Accounts</Link>. Connecting accounts grants persistent provider access and requires your approval.</p>
      <p className="mt-2 text-xs text-slate-400">Account binding below records which character owns an existing connection. It does not authorize publishing. X media upload is not implemented; paid API access remains separately gated.</p>
    </section>
    {error && <p role="alert" className="text-amber-200">{error}</p>}
    <button type="button" disabled={busy} onClick={() => void refresh()} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm text-white">Refresh setup</button>
    {!snapshot && !error && <p role="status" className="text-slate-300">Loading private setup…</p>}
    {snapshot?.creators.length === 0 && <p className="text-slate-300">No character drafts saved yet.</p>}
    <section aria-label="Creator performance" className="grid gap-5 xl:grid-cols-2">
      {snapshot?.creators.map(creator => <article key={creator.id} className="rounded-2xl border border-white/10 bg-[#17202b] p-5 sm:p-6">
        <h2 className="text-xl font-bold text-white">{creator.name}</h2>
        <p className="mt-1 text-sm text-slate-300">{creator.focus}</p>
        <p className="mt-2 text-xs text-amber-100">No data yet · identity {creator.identityApproved ? "approved" : "awaiting approval"} · assets {creator.assetsBound ? "bound" : "not bound"}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{creator.platforms.map(platform => {
          const key = `${creator.id}:${platform.channel}`;
          const available = snapshot.availableConnections.filter(c => c.channel === platform.channel);
          return <div key={platform.channel} className="min-w-0 rounded-xl border border-white/10 p-3">
            <h3 className="text-sm font-semibold text-white">{labels[platform.channel]}</h3>
            <p className="mt-2 text-xs text-slate-300">{states[platform.state]}</p>
            {platform.label && <p className="mt-1 break-words text-xs text-slate-400">{platform.label}</p>}
            {platform.state === "not_connected" && available.length > 0 && <div className="mt-3 space-y-2">
              <label htmlFor={key} className="text-xs text-slate-300">Choose this character’s account</label>
              <select id={key} disabled={busy} value={selection[key] || ""} onChange={e => setSelection(v => ({ ...v, [key]: e.target.value }))} className="min-h-11 w-full rounded bg-slate-900 text-sm text-white">
                <option value="">Select account</option>{available.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button type="button" disabled={busy || !selection[key]} onClick={() => void bind(creator.id, platform.channel)} className="min-h-11 rounded border border-white/20 px-3 text-xs text-white">Save account binding</button>
            </div>}
          </div>;
        })}</div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{metrics.map(label => <div key={label} className="rounded-xl bg-white/[0.03] p-3"><dt className="text-xs text-slate-400">{label}</dt><dd aria-label={`${label} unavailable`} className="mt-2 text-sm text-slate-200">—</dd></div>)}</dl>
        <p className="mt-4 text-xs text-slate-400">Monetization eligibility: Not verified. No analytics, cost, or revenue import is implemented.</p>
      </article>)}
    </section>
    <section aria-label="Agency comparison" className="rounded-2xl border border-white/10 p-5">
      <h2 className="text-lg font-bold text-white">Agency comparison</h2>
      <p className="mt-2 text-sm text-slate-300">No comparison data available. Compare verified growth, engagement, cost, and revenue over matching periods once reporting is connected.</p>
      {snapshot && <p className="mt-2 text-xs text-slate-400">Setup checked: {new Date(snapshot.generatedAt).toLocaleString()}. This is not a metrics freshness timestamp.</p>}
    </section>
  </>;
}
