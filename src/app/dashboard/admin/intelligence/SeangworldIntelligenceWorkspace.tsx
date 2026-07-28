"use client";

import { useEffect, useState } from "react";
import {
  normalizeSeangworldIntelligenceSnapshot,
  seangworldProviderStatusLabels,
  type IntelligenceDimension,
  type IntelligenceMetric,
  type SeangworldIntelligenceSnapshot,
} from "@/lib/seangworldIntelligence";
import { BeastAdminDataFreshness } from "../BeastAdminShell";

function number(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function MetricCard({ label, metric, percent = false }: { label: string; metric: IntelligenceMetric | null; percent?: boolean }) {
  const display = metric ? (percent ? `${(metric.value * 100).toFixed(1)}%` : number(metric.value)) : "Unavailable";
  const comparison = metric?.previousValue === null || !metric
    ? "No verified comparison"
    : `${metric.value >= metric.previousValue ? "Up" : "Down"} ${Math.abs(metric.value - metric.previousValue).toLocaleString()} from prior period`;
  return <div className="rounded-xl border border-white/10 bg-[#111827] p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-white">{display}</p><p className="mt-2 text-xs text-slate-400">{comparison}</p></div>;
}

function DimensionCard({ title, items, secondary }: { title: string; items: IntelligenceDimension[]; secondary?: string }) {
  return <section className="rounded-2xl border border-white/10 bg-[#111827] p-5"><h2 className="text-lg font-black text-white">{title}</h2>{items.length ? <ol className="mt-4 grid gap-3">{items.slice(0, 10).map((item) => <li key={item.label} className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm"><span className="min-w-0 break-words text-slate-300">{item.label}</span><span className="shrink-0 font-black text-white">{number(item.value)}{secondary && item.secondaryValue !== undefined && item.secondaryValue !== null ? ` · ${secondary} ${number(item.secondaryValue)}` : ""}</span></li>)}</ol> : <p className="mt-3 text-sm leading-6 text-slate-400">No verified data is available for this section.</p>}</section>;
}

function time(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

export function SeangworldIntelligenceWorkspace() {
  const [snapshot, setSnapshot] = useState<SeangworldIntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void fetch("/api/admin/seangworld-intelligence", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "SEANGWORLD Intelligence could not be loaded.");
        const normalized = normalizeSeangworldIntelligenceSnapshot(body);
        if (!normalized) throw new Error("SEANGWORLD Intelligence returned an invalid response.");
        if (active) setSnapshot(normalized);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "SEANGWORLD Intelligence could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  if (loading) return <div role="status" aria-busy="true" className="rounded-2xl border border-white/10 bg-[#111827] p-6 text-slate-300">Loading provider status and verified analytics…</div>;
  if (error || !snapshot) return <div role="alert" className="rounded-2xl border border-red-300/25 bg-red-300/5 p-6"><h2 className="font-black text-white">Intelligence unavailable</h2><p className="mt-2 text-sm text-slate-300">{error}</p><button className="beast-button mt-4" onClick={() => setRefresh((value) => value + 1)}>Retry</button></div>;

  const data = snapshot.data;
  return <div className="space-y-6">
    <BeastAdminDataFreshness generatedAt={snapshot.generatedAt} staleAfterHours={24} />
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Executive Summary</p><h2 className="mt-2 text-2xl font-black text-white">Verified ecosystem signals</h2><p className="mt-2 text-sm text-slate-300">{snapshot.comparisonPeriod}</p></div><button className="beast-button-secondary" onClick={() => setRefresh((value) => value + 1)}>Refresh status</button></div>
      {snapshot.limitations.length ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm font-black text-amber-100">Current limitations</p><ul className="mt-2 text-sm leading-6 text-slate-300">{snapshot.limitations.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Primary analytics metrics">
      <MetricCard label="Visitors" metric={data.visitors} />
      <MetricCard label="Sessions" metric={data.sessions} />
      <MetricCard label="Views" metric={data.views} />
      <MetricCard label="Engagement" metric={data.engagementRate} percent />
    </section>

    <section aria-labelledby="provider-status-heading"><h2 id="provider-status-heading" className="text-xl font-black text-white">Provider Status</h2><div className="mt-4 grid gap-4 lg:grid-cols-3">{snapshot.providers.map((provider) => <article key={provider.id} className="rounded-2xl border border-white/10 bg-[#111827] p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-white">{provider.label}</h3><span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-200">{seangworldProviderStatusLabels[provider.status]}</span></div><p className="mt-3 text-sm leading-6 text-slate-300">{provider.guidance}</p><dl className="mt-4 grid gap-3 text-xs"><div><dt className="text-slate-500">Last Synchronization</dt><dd className="mt-1 text-slate-200">{time(provider.lastSynchronizationAt)}</dd></div><div><dt className="text-slate-500">Last Successful Synchronization</dt><dd className="mt-1 text-slate-200">{time(provider.lastSuccessfulSynchronizationAt)}</dd></div><div><dt className="text-slate-500">Data Freshness</dt><dd className="mt-1 capitalize text-slate-200">{provider.freshness}</dd></div></dl></article>)}</div></section>

    <section aria-labelledby="recommendations-heading"><h2 id="recommendations-heading" className="text-xl font-black text-white">Deterministic Recommendations</h2>{snapshot.recommendations.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{snapshot.recommendations.map((recommendation) => <article key={recommendation.id} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5"><div className="flex justify-between gap-3"><h3 className="font-black text-white">{recommendation.title}</h3><span className="text-xs font-bold capitalize text-cyan-200">{recommendation.confidence} confidence</span></div><p className="mt-3 text-sm font-bold text-cyan-100">{recommendation.supportingMetric}</p><p className="mt-2 text-sm leading-6 text-slate-300">{recommendation.rationale}</p><p className="mt-3 text-xs leading-5 text-slate-400">Owner review: {recommendation.suggestedOwnerReview}</p></article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-white/15 p-5 text-sm leading-6 text-slate-400">No deterministic rule has enough verified evidence to produce a recommendation. This is normal when providers are not configured or have no data.</div>}</section>

    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <DimensionCard title="Countries" items={data.countries} />
      <DimensionCard title="Cities" items={data.cities} />
      <DimensionCard title="Devices" items={data.devices} />
      <DimensionCard title="Browsers" items={data.browsers} />
      <DimensionCard title="Operating Systems" items={data.operatingSystems} />
      <DimensionCard title="Traffic Sources" items={data.trafficSources} />
      <DimensionCard title="Entry Pages" items={data.entryPages} />
      <DimensionCard title="Exit Pages" items={data.exitPages} />
      <DimensionCard title="Top Queries" items={data.topQueries} />
      <DimensionCard title="Top Landing Pages" items={data.topLandingPages} />
    </div>

    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5"><h2 className="text-lg font-black text-white">Historical Trends</h2>{data.historicalTrends.length ? <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Historical trends table, horizontally scrollable"><table className="min-w-[42rem] w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Visitors</th><th className="p-3">Sessions</th><th className="p-3">Views</th></tr></thead><tbody>{data.historicalTrends.map((row) => <tr key={row.date} className="border-t border-white/10 text-slate-200"><td className="p-3">{row.date}</td><td className="p-3">{row.visitors === null ? "Unavailable" : number(row.visitors)}</td><td className="p-3">{row.sessions === null ? "Unavailable" : number(row.sessions)}</td><td className="p-3">{row.views === null ? "Unavailable" : number(row.views)}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-400">No verified historical trend series is available.</p>}</section>
  </div>;
}
