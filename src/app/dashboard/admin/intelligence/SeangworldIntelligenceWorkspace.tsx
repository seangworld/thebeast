"use client";

import { useEffect, useMemo, useState } from "react";
import {
  normalizeSeangworldIntelligenceSnapshot,
  seangworldProviderStatusLabels,
  type IntelligenceDimension,
  type IntelligenceMetric,
  type SeangworldIntelligenceSnapshot,
} from "@/lib/seangworldIntelligence";
import { BeastAdminDataFreshness } from "../BeastAdminShell";
import { FirstPartyTelemetryPanels } from "./FirstPartyTelemetryPanels";

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

function QueryCard({
  items,
}: {
  items: SeangworldIntelligenceSnapshot["data"]["topQueries"];
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5 lg:col-span-2 xl:col-span-3">
      <h2 className="text-lg font-black text-white">Top Queries</h2>
      {items.length ? (
        <div
          className="mt-4 overflow-x-auto"
          tabIndex={0}
          aria-label="Top search queries table, horizontally scrollable"
        >
          <table className="min-w-[44rem] w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="p-3">Query</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">Impressions</th>
                <th className="p-3">CTR</th>
                <th className="p-3">Average Position</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 25).map((item) => (
                <tr
                  key={item.label}
                  className="border-t border-white/10 text-slate-200"
                >
                  <td className="max-w-md break-words p-3">{item.label}</td>
                  <td className="p-3">{number(item.clicks || 0)}</td>
                  <td className="p-3">{number(item.impressions || 0)}</td>
                  <td className="p-3">
                    {item.ctr === null || item.ctr === undefined
                      ? "Unavailable"
                      : `${(item.ctr * 100).toFixed(1)}%`}
                  </td>
                  <td className="p-3">
                    {item.position === null || item.position === undefined
                      ? "Unavailable"
                      : item.position.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-400">
          No verified search-query data is available.
        </p>
      )}
    </section>
  );
}

function QualifiedTrafficTable({
  items,
}: {
  items: SeangworldIntelligenceSnapshot["data"]["qualifiedTraffic"];
}) {
  return (
    <section className="rounded-2xl border border-emerald-300/20 bg-[#111827] p-5" aria-labelledby="qualified-traffic-heading">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Primary growth objective</p>
      <h2 id="qualified-traffic-heading" className="mt-2 text-xl font-black text-white">Qualified traffic by source and landing page</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
        This joins existing GA4 acquisition evidence into one owner view. Qualified actions are recorded guide downloads, resource/tool views, Beast entry selections, and account-creation selections—not impressions or visits alone.
      </p>
      {items.length ? (
        <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Qualified traffic by source and landing page table, horizontally scrollable">
          <table className="min-w-[62rem] w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="p-3">Source</th><th className="p-3">Landing page</th><th className="p-3">Sessions</th><th className="p-3">Change</th><th className="p-3">Engaged</th><th className="p-3">Engagement</th><th className="p-3">Qualified actions</th></tr></thead>
            <tbody>{items.map((item) => <tr key={`${item.source}:${item.landingPage}`} className="border-t border-white/10 text-slate-200"><td className="p-3 font-bold text-white">{item.source}</td><td className="max-w-sm break-words p-3">{item.landingPage}</td><td className="p-3">{number(item.sessions)}</td><td className="p-3">{changeLabel(item.sessionChange)}</td><td className="p-3">{number(item.engagedSessions)}</td><td className="p-3">{item.engagementRate === null ? "Unavailable" : `${(item.engagementRate * 100).toFixed(1)}%`}</td><td className="p-3 font-black text-emerald-200">{item.qualifiedActions === null ? "Unavailable" : number(item.qualifiedActions)}<span className="mt-1 block text-xs font-normal text-slate-500">Prior {item.previousQualifiedActions === null ? "unavailable" : number(item.previousQualifiedActions)}</span></td></tr>)}</tbody>
          </table>
        </div>
      ) : <p className="mt-4 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">No verified source-to-landing qualified-traffic rows are available. This is unavailable—not zero—until GA4 returns the bounded acquisition reports.</p>}
    </section>
  );
}

function changeLabel(
  value: number | null,
  kind: "number" | "percent" | "position" = "number"
) {
  if (value === null) return "Prior unavailable";
  if (kind === "position") {
    if (value === 0) return "No position change";
    return `${value < 0 ? "Improved" : "Declined"} ${Math.abs(value).toFixed(1)}`;
  }
  const formatted = kind === "percent"
    ? `${Math.abs(value * 100).toFixed(1)} pts`
    : number(Math.abs(value));
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatted}`;
}

function SearchOpportunityIntelligence({
  data,
}: {
  data: SeangworldIntelligenceSnapshot["data"];
}) {
  const pages = useMemo(
    () => Array.from(
      new Set(data.searchOpportunities.map((opportunity) => opportunity.page))
    ),
    [data.searchOpportunities]
  );
  const [selectedPage, setSelectedPage] = useState(pages[0] || "");
  useEffect(() => {
    if (!pages.includes(selectedPage)) setSelectedPage(pages[0] || "");
  }, [pages, selectedPage]);
  const selected = selectedPage || pages[0] || "";
  const opportunities = data.searchOpportunities.filter(
    (opportunity) => opportunity.page === selected
  );
  const pagePerformance = data.searchLandingPages.find(
    (page) => page.page === selected
  );
  const baseline = data.searchOpportunityBaseline;

  return (
    <section
      aria-labelledby="search-opportunity-heading"
      className="rounded-2xl border border-cyan-300/20 bg-[#111827] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
            SW-SEO-231
          </p>
          <h2 id="search-opportunity-heading" className="mt-2 text-xl font-black text-white">
            Content Gap &amp; Search Opportunity Generation
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-400">Built on Search Opportunity Intelligence</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Search Console page-to-query evidence, prior-period movement, and existing analytics context continuously identify focused optimization and content gaps without promising rankings or treating sampled rows as exhaustive totals.
          </p>
        </div>
        {pages.length ? (
          <label className="grid min-w-64 max-w-full gap-1 text-xs font-bold text-slate-300">
            Landing page
            <select
              className="beast-input max-w-full"
              value={selected}
              onChange={(event) => setSelectedPage(event.target.value)}
            >
              {pages.map((page) => (
                <option key={page} value={page}>{page}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {baseline ? (
        <p className="mt-4 text-xs leading-5 text-slate-400">
          Baseline: {baseline.currentStartDate}–{baseline.currentEndDate} versus {baseline.previousStartDate}–{baseline.previousEndDate}; finalized through {baseline.dataThroughDate}. Up to {baseline.rowLimit.toLocaleString()} page/query rows per period.
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Classification: Optimize Existing · Create New · Distribute · Monitor · Ignore
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Underlying evidence dispositions remain: Improve Existing Page · Create Supporting Content · Distribute Existing Asset · Investigate · Watch · Ignore
      </p>

      {pagePerformance ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Selected landing page search performance">
          {[
            ["Clicks", number(pagePerformance.current.clicks), changeLabel(pagePerformance.change.clicks)],
            ["Impressions", number(pagePerformance.current.impressions), changeLabel(pagePerformance.change.impressions)],
            ["CTR", `${(pagePerformance.current.ctr * 100).toFixed(1)}%`, changeLabel(pagePerformance.change.ctr, "percent")],
            ["Average Position", pagePerformance.current.position.toFixed(1), changeLabel(pagePerformance.change.position, "position")],
          ].map(([label, value, comparison]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-black text-white">{value}</p>
              <p className="mt-1 text-xs text-slate-400">{comparison} vs prior</p>
            </div>
          ))}
        </div>
      ) : null}

      {opportunities.length ? (
        <div
          className="mt-5 overflow-x-auto"
          tabIndex={0}
          aria-label="Page to query search opportunities table, horizontally scrollable"
        >
          <table className="min-w-[92rem] w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="p-3">Query</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">Impressions</th>
                <th className="p-3">CTR</th>
                <th className="p-3">Average Position</th>
                <th className="p-3">Classification</th>
                <th className="p-3">Best format</th>
                <th className="p-3">Signals</th>
                <th className="p-3">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opportunity) => (
                <tr key={`${opportunity.page}-${opportunity.query}`} className="border-t border-white/10 align-top text-slate-200">
                  <td className="max-w-xs break-words p-3 font-bold text-white">{opportunity.query}</td>
                  <td className="p-3">{number(opportunity.current.clicks)}<span className="mt-1 block text-xs text-slate-500">{changeLabel(opportunity.change.clicks)}</span></td>
                  <td className="p-3">{number(opportunity.current.impressions)}<span className="mt-1 block text-xs text-slate-500">{changeLabel(opportunity.change.impressions)}</span></td>
                  <td className="p-3">{(opportunity.current.ctr * 100).toFixed(1)}%<span className="mt-1 block text-xs text-slate-500">{changeLabel(opportunity.change.ctr, "percent")}</span></td>
                  <td className="p-3">{opportunity.current.position.toFixed(1)}<span className="mt-1 block text-xs text-slate-500">{changeLabel(opportunity.change.position, "position")}</span></td>
                  <td className="p-3"><span className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/5 px-3 py-1 text-xs font-bold text-cyan-100">{opportunity.classification}</span></td>
                  <td className="p-3"><span className="font-bold text-white">{opportunity.recommendedAsset}</span>{opportunity.ownerApprovalRequired ? <span className="mt-1 block text-xs text-amber-200">Owner approval required before publication</span> : null}</td>
                  <td className="max-w-xs p-3 text-xs leading-5 text-slate-300">{opportunity.signals.length ? opportunity.signals.join(" · ") : "No action signal crossed the governed threshold"}</td>
                  <td className="max-w-md p-3"><span className="font-bold text-white">Score {opportunity.score}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{opportunity.rationale}</span><details className="mt-2 text-xs text-slate-300"><summary className="cursor-pointer font-bold text-cyan-200">Evidence-backed recommendation</summary><dl className="mt-2 grid gap-1"><div><dt className="inline font-bold">Traffic source: </dt><dd className="inline">{opportunity.trafficSource}</dd></div><div><dt className="inline font-bold">Target audience: </dt><dd className="inline">{opportunity.targetAudience}</dd></div><div><dt className="inline font-bold">Existing asset: </dt><dd className="inline break-all">{opportunity.existingAsset}</dd></div><div><dt className="inline font-bold">Proposed action: </dt><dd className="inline">{opportunity.proposedAction}</dd></div><div><dt className="inline font-bold">Expected benefit: </dt><dd className="inline">{opportunity.expectedBenefit}</dd></div><div><dt className="inline font-bold">Effort: </dt><dd className="inline capitalize">{opportunity.effort}</dd></div><div><dt className="inline font-bold">Measurement: </dt><dd className="inline">{opportunity.measurement}</dd></div></dl></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-400">
          No verified page-to-query rows are available for this reporting range.
        </p>
      )}

      <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-slate-300">
        BeastHunter is canonically registered, but this workspace does not silently convert search opportunities into BeastHunter work. Recommendations are decision support only. Creating or materially publishing content always requires explicit owner approval; this engine cannot authorize, draft, or publish work. Accepted changes require a recorded baseline and later post-change comparison.
      </p>
    </section>
  );
}

function time(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
    : "Unavailable";
}

export function SeangworldIntelligenceWorkspace() {
  const [snapshot, setSnapshot] = useState<SeangworldIntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [reportingDays, setReportingDays] = useState(30);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void fetch(`/api/admin/seangworld-intelligence?days=${reportingDays}`, { cache: "no-store" })
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
  }, [refresh, reportingDays]);

  if (loading) return <div role="status" aria-busy="true" className="rounded-2xl border border-white/10 bg-[#111827] p-6 text-slate-300">Loading provider status and verified analytics…</div>;
  if (error || !snapshot) return <div role="alert" className="rounded-2xl border border-red-300/25 bg-red-300/5 p-6"><h2 className="font-black text-white">Intelligence unavailable</h2><p className="mt-2 text-sm text-slate-300">{error}</p><button className="beast-button mt-4" onClick={() => setRefresh((value) => value + 1)}>Retry</button></div>;

  const data = snapshot.data;
  return <div className="space-y-6">
    <BeastAdminDataFreshness generatedAt={snapshot.generatedAt} staleAfterHours={24} />
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Executive Summary</p><h2 className="mt-2 text-2xl font-black text-white">Verified ecosystem signals</h2><p className="mt-2 text-sm text-slate-300">{snapshot.comparisonPeriod}</p></div><div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-xs font-bold text-slate-300">Reporting range<select className="beast-input min-w-32" value={reportingDays} onChange={(event) => setReportingDays(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label><button className="beast-button-secondary" onClick={() => setRefresh((value) => value + 1)}>Refresh status</button></div></div>
      {snapshot.limitations.length ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm font-black text-amber-100">Current limitations</p><ul className="mt-2 text-sm leading-6 text-slate-300">{snapshot.limitations.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
    </section>

    <section aria-labelledby="public-analytics-heading"><h2 id="public-analytics-heading" className="text-xl font-black text-white">Public visitors and search signals</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Primary public analytics metrics">
      <MetricCard label="Visitors" metric={data.visitors} />
      <MetricCard label="Users" metric={data.users} />
      <MetricCard label="Sessions" metric={data.sessions} />
      <MetricCard label="Views" metric={data.views} />
      <MetricCard label="Engagement" metric={data.engagementRate} percent />
      <MetricCard label="Impressions" metric={data.impressions} />
      <MetricCard label="Clicks" metric={data.clicks} />
      <MetricCard label="CTR" metric={data.ctr} percent />
      <MetricCard label="Average Position" metric={data.averagePosition} />
    </div></section>

    <section aria-labelledby="provider-status-heading"><h2 id="provider-status-heading" className="text-xl font-black text-white">Provider Status</h2><div className="mt-4 grid gap-4 lg:grid-cols-3">{snapshot.providers.map((provider) => <article key={provider.id} className="rounded-2xl border border-white/10 bg-[#111827] p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-white">{provider.label}</h3><span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-slate-200">{seangworldProviderStatusLabels[provider.status]}</span></div><p className="mt-3 text-sm leading-6 text-slate-300">{provider.guidance}</p><dl className="mt-4 grid gap-3 text-xs"><div><dt className="text-slate-500">Connection Status</dt><dd className="mt-1 capitalize text-slate-200">{provider.connectionStatus.replaceAll("_", " ")}</dd></div><div><dt className="text-slate-500">Last Sync</dt><dd className="mt-1 text-slate-200">{time(provider.lastSynchronizationAt)}</dd></div><div><dt className="text-slate-500">Last Successful Synchronization</dt><dd className="mt-1 text-slate-200">{time(provider.lastSuccessfulSynchronizationAt)}</dd></div>{provider.id === "search_console" ? <><div><dt className="text-slate-500">Final Data Through</dt><dd className="mt-1 text-slate-200">{date(provider.dataThroughDate)}</dd></div><div><dt className="text-slate-500">Reporting Delay</dt><dd className="mt-1 text-slate-200">{provider.reportingDelayDays === null ? "Unavailable" : `${provider.reportingDelayDays} day${provider.reportingDelayDays === 1 ? "" : "s"} (2–3 days is normal)`}</dd></div></> : null}<div><dt className="text-slate-500">Data Freshness</dt><dd className="mt-1 capitalize text-slate-200">{provider.freshness}</dd></div></dl>{provider.error ? <p className="mt-4 rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-xs leading-5 text-red-100" role="status">{provider.error.message}{provider.error.retryable ? " Retry is safe." : ""}</p> : null}</article>)}</div></section>

    <FirstPartyTelemetryPanels data={data.firstPartyTelemetry} />

    <QualifiedTrafficTable items={data.qualifiedTraffic} />

    <SearchOpportunityIntelligence data={data} />

    <section aria-labelledby="recommendations-heading"><h2 id="recommendations-heading" className="text-xl font-black text-white">Deterministic Recommendations</h2>{snapshot.recommendations.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{snapshot.recommendations.map((recommendation) => <article key={recommendation.id} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5"><div className="flex justify-between gap-3"><h3 className="font-black text-white">{recommendation.title}</h3><span className="text-xs font-bold capitalize text-cyan-200">{recommendation.confidence} confidence</span></div><p className="mt-3 text-sm font-bold text-cyan-100">{recommendation.supportingMetric}</p><p className="mt-2 text-sm leading-6 text-slate-300">{recommendation.rationale}</p><p className="mt-3 text-xs leading-5 text-slate-400">Owner review: {recommendation.suggestedOwnerReview}</p></article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-white/15 p-5 text-sm leading-6 text-slate-400">No deterministic rule has enough verified evidence to produce a recommendation. This is normal when providers are not configured or have no data.</div>}</section>

    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <DimensionCard title="Countries (GA4)" items={data.countries} />
      <DimensionCard title="Countries (Search Console)" items={data.searchCountries} secondary="impressions" />
      <DimensionCard title="Cities" items={data.cities} />
      <DimensionCard title="Devices (GA4)" items={data.devices} />
      <DimensionCard title="Devices (Search Console)" items={data.searchDevices} secondary="impressions" />
      <DimensionCard title="Browsers" items={data.browsers} />
      <DimensionCard title="Operating Systems" items={data.operatingSystems} />
      <DimensionCard title="Traffic Sources" items={data.trafficSources} />
      <DimensionCard title="Landing Pages" items={data.entryPages} />
      <DimensionCard title="Exit Pages" items={data.exitPages} />
      <DimensionCard title="Top Landing Pages (Search Console)" items={data.topLandingPages} secondary="impressions" />
      <QueryCard items={data.topQueries} />
    </div>

    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5"><h2 className="text-lg font-black text-white">Historical Trends (GA4)</h2>{data.historicalTrends.length ? <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Historical trends table, horizontally scrollable"><table className="min-w-[42rem] w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Visitors</th><th className="p-3">Sessions</th><th className="p-3">Views</th></tr></thead><tbody>{data.historicalTrends.map((row) => <tr key={row.date} className="border-t border-white/10 text-slate-200"><td className="p-3">{row.date}</td><td className="p-3">{row.visitors === null ? "Unavailable" : number(row.visitors)}</td><td className="p-3">{row.sessions === null ? "Unavailable" : number(row.sessions)}</td><td className="p-3">{row.views === null ? "Unavailable" : number(row.views)}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-400">No verified GA4 historical trend series is available.</p>}</section>

    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5"><h2 className="text-lg font-black text-white">Search Performance Trends</h2>{data.searchTrends.length ? <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Search performance trends table, horizontally scrollable"><table className="min-w-[44rem] w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Clicks</th><th className="p-3">Impressions</th><th className="p-3">CTR</th><th className="p-3">Average Position</th></tr></thead><tbody>{data.searchTrends.map((row) => <tr key={row.date} className="border-t border-white/10 text-slate-200"><td className="p-3">{row.date}</td><td className="p-3">{number(row.clicks)}</td><td className="p-3">{number(row.impressions)}</td><td className="p-3">{row.ctr === null ? "Unavailable" : `${(row.ctr * 100).toFixed(1)}%`}</td><td className="p-3">{row.position === null ? "Unavailable" : row.position.toFixed(1)}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-400">No finalized Search Console trend series is available for this period.</p>}</section>
  </div>;
}
