"use client";

import { useEffect, useMemo, useState } from "react";

type MarketingSnapshot = {
  campaigns: Array<{ status: string }>;
  assets: Array<{ status: string }>;
  outcomes: Array<{ metric: string; measuredAt: string }>;
  providerState: Record<string, string>;
};

type VideoSnapshot = {
  controls: { pause_all_publishing: boolean };
  jobs: Array<{ state: string }>;
  authorities: Record<string, string>;
};

const emptyMarketing: MarketingSnapshot = { campaigns: [], assets: [], outcomes: [], providerState: {} };
const emptyVideo: VideoSnapshot = { controls: { pause_all_publishing: true }, jobs: [], authorities: {} };
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function BeastMarketingOverviewSummary() {
  const [marketing, setMarketing] = useState(emptyMarketing);
  const [video, setVideo] = useState(emptyVideo);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/admin/beast-marketing", { cache: "no-store" }),
      fetch("/api/admin/beast-marketing/video", { cache: "no-store" }),
    ]).then(async ([marketingResponse, videoResponse]) => {
      if (!marketingResponse.ok || !videoResponse.ok) throw new Error("BeastMarketing status is currently unavailable.");
      const [marketingBody, videoBody] = await Promise.all([marketingResponse.json(), videoResponse.json()]);
      if (active) { setMarketing(marketingBody as MarketingSnapshot); setVideo(videoBody as VideoSnapshot); setLoading(false); }
    }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "BeastMarketing status is currently unavailable."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const outcomeSummary = useMemo(() => {
    const metrics = new Set(marketing.outcomes.map((item) => item.metric));
    const latest = marketing.outcomes.map((item) => Date.parse(item.measuredAt)).filter(Number.isFinite).sort((left, right) => right - left)[0];
    return { metrics: metrics.size, latest: latest ? new Date(latest).toLocaleDateString() : "Unavailable" };
  }, [marketing.outcomes]);

  const summaries = [
    { label: "Campaigns", value: String(marketing.campaigns.length), detail: `${marketing.campaigns.filter((item) => ["approved", "active"].includes(item.status)).length} approved or active` },
    { label: "Advertising assets", value: String(marketing.assets.length), detail: `${marketing.assets.filter((item) => item.status === "approved").length} approved exact drafts` },
    { label: "Video queue", value: String(video.jobs.length), detail: `${video.jobs.filter((item) => item.state === "ready").length} ready for owner review` },
    { label: "Growth evidence", value: String(marketing.outcomes.length), detail: `${outcomeSummary.metrics} measured metrics · latest ${outcomeSummary.latest}` },
  ];

  const authorities = {
    publishingInterlock: video.controls.pause_all_publishing ? "paused" : "internal scheduling only",
    ...marketing.providerState,
    ...video.authorities,
  };

  return (
    <div className="mb-6 space-y-4">
      {loading ? <p role="status" className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">Loading verified BeastMarketing status…</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4 text-sm text-amber-100">{error} No zero-valued performance claim has been inferred.</p> : null}
      {!loading && !error ? <section aria-label="BeastMarketing status summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaries.map((item) => <article key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{item.label}</p><p className="mt-2 text-3xl font-black text-white">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.detail}</p></article>)}
      </section> : null}
      {!loading && !error ? <section aria-label="Marketing provider and publishing state" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
        <h2 className="text-lg font-black text-white">Provider and publishing state</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(authorities).map(([key, value]) => <div key={key}><dt className="text-xs font-black uppercase tracking-wider text-slate-500">{label(key)}</dt><dd className="mt-1 text-sm font-black text-amber-100">{label(value)}</dd></div>)}
        </dl>
      </section> : null}
    </div>
  );
}
