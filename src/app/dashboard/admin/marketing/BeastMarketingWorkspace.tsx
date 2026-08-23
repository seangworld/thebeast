"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  BEAST_MARKETING_VERSION,
  marketingOutcomeMetrics,
  type MarketingAsset,
  type MarketingCampaign,
  type MarketingOutcome,
  type MarketingOutcomeMetric,
  type MarketingRecommendation,
} from "@/lib/beastMarketing";

type SavedRecommendation = MarketingRecommendation & {
  id: string;
  campaign_id: string;
  created_at: string;
};

type SavedDecision = {
  id: string;
  entity_type: "campaign" | "asset";
  entity_id: string;
  decision: string;
  note: string;
  created_at: string;
};

type Snapshot = {
  campaigns: MarketingCampaign[];
  assets: MarketingAsset[];
  outcomes: MarketingOutcome[];
  recommendations: SavedRecommendation[];
  decisions: SavedDecision[];
  providerState: Record<string, string>;
};

const inputClass = "min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none";
const emptySnapshot: Snapshot = { campaigns: [], assets: [], outcomes: [], recommendations: [], decisions: [], providerState: {} };

function csv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function title(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Unavailable";
}

export function BeastMarketingWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [campaignDraft, setCampaignDraft] = useState({ title: "", objective: "", audience: "", offer: "", channels: "", callToAction: "", sourceLabel: "", sourceUrl: "", successMeasures: "", limitations: "" });
  const [assetDraft, setAssetDraft] = useState({ name: "", assetType: "Social copy", channel: "Owned social", body: "", sourceLabel: "", sourceUrl: "" });
  const [outcomeDraft, setOutcomeDraft] = useState<{ metric: MarketingOutcomeMetric; value: string; sourceLabel: string; sourceUrl: string; notes: string }>({ metric: "visits", value: "", sourceLabel: "", sourceUrl: "", notes: "" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/beast-marketing", { cache: "no-store" });
      const body = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(body.error || "BeastMarketing could not load.");
      setSnapshot(body);
      setSelectedCampaignId((current) => current || body.campaigns[0]?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "BeastMarketing could not load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selectedCampaign = snapshot.campaigns.find((item) => item.id === selectedCampaignId) || null;
  const campaignAssets = snapshot.assets.filter((item) => item.campaignId === selectedCampaignId);
  const campaignOutcomes = snapshot.outcomes.filter((item) => item.campaignId === selectedCampaignId);
  const campaignRecommendations = snapshot.recommendations.filter((item) => item.campaign_id === selectedCampaignId);
  const metrics = useMemo(() => [
    { label: "Campaigns", value: String(snapshot.campaigns.length), detail: "Owner-controlled campaign records", icon: "📣" },
    { label: "Approved assets", value: String(snapshot.assets.filter((item) => item.status === "approved").length), detail: "Reviewed assets only", icon: "✅" },
    { label: "Useful outcomes", value: String(snapshot.outcomes.length), detail: "Visits through retained users", icon: "📈" },
    { label: "External posting", value: "Disabled", detail: "No provider or credentials connected", icon: "🔒" },
  ], [snapshot]);

  async function send(payload: Record<string, unknown>, success: string) {
    setBusy(String(payload.kind || "update"));
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/beast-marketing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "The marketing record could not be saved.");
      setNotice(success);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The marketing record could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function updateStatus(kind: "campaign" | "asset", id: string, status: string) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/admin/beast-marketing", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id, status }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Status could not be updated.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status could not be updated.");
    } finally {
      setBusy("");
    }
  }

  async function decide(entityType: "campaign" | "asset", entityId: string, decision: "approve" | "reject" | "request_changes", nextStatus: string) {
    await send({ kind: "decision", entityType, entityId, campaignId: selectedCampaignId, decision, nextStatus, note: decision === "approve" ? "Owner approved this exact revision." : "Owner returned this revision for correction." }, decision === "approve" ? "The exact revision is approved. External publication remains disabled." : "The review decision was recorded.");
  }

  if (loading && !snapshot.campaigns.length) return <DashboardCard accent="admin"><p role="status" className="text-sm text-slate-300">Loading the owner marketing command center…</p></DashboardCard>;

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricTile key={metric.label} {...metric} tone="yellow" />)}</section>
    <DashboardCard accent="admin">
      <SectionHeader eyebrow={`BeastMarketing v${BEAST_MARKETING_VERSION}`} title="Owner control is the publishing gate" description="The foundation can prepare, review, approve, and measure work. It cannot connect providers, schedule externally, spend money, or publish." />
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(snapshot.providerState).map(([key, value]) => <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><dt className="text-xs font-black uppercase tracking-wider text-slate-400">{title(key)}</dt><dd className="mt-1 font-black text-amber-100">{title(value)}</dd></div>)}</dl>
    </DashboardCard>
    {error ? <div role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{error}</div> : null}
    {notice ? <div role="status" className="rounded-xl border border-green-300/30 bg-green-300/10 p-4 text-sm text-green-100">{notice}</div> : null}

    <DashboardCard accent="admin">
      <SectionHeader eyebrow="Campaigns" title="Create a governed campaign" description="Start from approved public truth. Every required field explains what the campaign is trying to accomplish before assets are drafted." />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Campaign title" value={campaignDraft.title} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, title: value }))} />
        <Field label="Audience" value={campaignDraft.audience} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, audience: value }))} />
        <Field label="Objective" value={campaignDraft.objective} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, objective: value }))} />
        <Field label="Offer" value={campaignDraft.offer} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, offer: value }))} />
        <Field label="Call to action" value={campaignDraft.callToAction} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, callToAction: value }))} />
        <Field label="Intended channels · comma separated" value={campaignDraft.channels} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, channels: value }))} />
        <Field label="Source fact label" value={campaignDraft.sourceLabel} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, sourceLabel: value }))} />
        <Field label="Source URL · HTTPS only" value={campaignDraft.sourceUrl} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, sourceUrl: value }))} />
        <Field label="Success measures · comma separated" value={campaignDraft.successMeasures} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, successMeasures: value }))} />
        <Field label="Known limitations · comma separated" value={campaignDraft.limitations} onChange={(value) => setCampaignDraft((draft) => ({ ...draft, limitations: value }))} />
      </div>
      <button type="button" className="beast-button mt-5" disabled={Boolean(busy)} onClick={() => void send({ kind: "campaign", campaign: { ...campaignDraft, channels: csv(campaignDraft.channels), successMeasures: csv(campaignDraft.successMeasures), limitations: csv(campaignDraft.limitations), sourceFacts: campaignDraft.sourceLabel ? [{ label: campaignDraft.sourceLabel, url: campaignDraft.sourceUrl }] : [] } }, "Campaign draft created. Nothing was published.")}>Create campaign draft</button>
    </DashboardCard>

    <section className="grid gap-4 lg:grid-cols-2" aria-label="Campaign portfolio">
      {snapshot.campaigns.map((item) => <DashboardCard key={item.id} accent="admin" className={item.id === selectedCampaignId ? "ring-2 ring-amber-300/60" : ""}>
        <button type="button" className="w-full text-left" onClick={() => setSelectedCampaignId(item.id)}><p className="text-xs font-black uppercase tracking-wider text-amber-200">{title(item.status)}</p><h2 className="mt-2 text-xl font-black text-white">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{item.objective}</p></button>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><Summary label="Audience" value={item.audience} /><Summary label="Offer" value={item.offer} /><Summary label="Call to action" value={item.callToAction} /><Summary label="Updated" value={formatDate(item.updatedAt)} /></dl>
        <div className="mt-4 flex flex-wrap gap-2"><MiniButton label="Submit for review" disabled={busy === item.id} onClick={() => void updateStatus("campaign", item.id, "review")} /><MiniButton label="Approve exact draft" disabled={Boolean(busy)} onClick={() => void decide("campaign", item.id, "approve", "approved")} /><MiniButton label="Request changes" disabled={Boolean(busy)} onClick={() => void decide("campaign", item.id, "request_changes", "draft")} /></div>
      </DashboardCard>)}
      {!snapshot.campaigns.length ? <DashboardCard accent="admin"><p className="text-sm text-slate-300">No campaign exists yet. Create the first bounded campaign above.</p></DashboardCard> : null}
    </section>

    {selectedCampaign ? <>
      <DashboardCard accent="admin">
        <SectionHeader eyebrow={selectedCampaign.title} title="Prepare an asset" description="Assets remain internal drafts until the owner approves the exact copy. Approved still does not mean externally published." />
        <div className="mt-5 grid gap-4 lg:grid-cols-2"><Field label="Asset name" value={assetDraft.name} onChange={(value) => setAssetDraft((draft) => ({ ...draft, name: value }))} /><Field label="Asset type" value={assetDraft.assetType} onChange={(value) => setAssetDraft((draft) => ({ ...draft, assetType: value }))} /><Field label="Intended channel" value={assetDraft.channel} onChange={(value) => setAssetDraft((draft) => ({ ...draft, channel: value }))} /><Field label="Source fact label" value={assetDraft.sourceLabel} onChange={(value) => setAssetDraft((draft) => ({ ...draft, sourceLabel: value }))} /><Field label="Source URL · HTTPS only" value={assetDraft.sourceUrl} onChange={(value) => setAssetDraft((draft) => ({ ...draft, sourceUrl: value }))} /><label className="lg:col-span-2 text-sm font-bold text-slate-200">Draft copy<textarea className={`${inputClass} mt-2 min-h-32`} value={assetDraft.body} onChange={(event) => setAssetDraft((draft) => ({ ...draft, body: event.target.value }))} /></label></div>
        <button type="button" className="beast-button mt-5" disabled={Boolean(busy)} onClick={() => void send({ kind: "asset", campaignId: selectedCampaign.id, ...assetDraft, sourceFacts: assetDraft.sourceLabel ? [{ label: assetDraft.sourceLabel, url: assetDraft.sourceUrl }] : [] }, "Asset draft saved. Nothing was scheduled or published.")}>Save asset draft</button>
        <div className="mt-6 space-y-3">{campaignAssets.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-amber-200">{title(item.status)} · {item.channel}</p><h3 className="mt-1 font-black text-white">{item.name}</h3></div><div className="flex flex-wrap gap-2"><MiniButton label="Review" disabled={busy === item.id} onClick={() => void updateStatus("asset", item.id, "review")} /><MiniButton label="Approve" disabled={Boolean(busy)} onClick={() => void decide("asset", item.id, "approve", "approved")} /><MiniButton label="Reject" disabled={Boolean(busy)} onClick={() => void decide("asset", item.id, "reject", "rejected")} /></div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.body}</p></div>)}{!campaignAssets.length ? <p className="text-sm text-slate-400">No assets have been drafted for this campaign.</p> : null}</div>
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader eyebrow="Performance" title="Record attributable outcomes" description="Use a named evidence source. A recorded zero is valid evidence; a missing row remains unavailable." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-bold text-slate-200">Metric<select className={`${inputClass} mt-2`} value={outcomeDraft.metric} onChange={(event) => setOutcomeDraft((draft) => ({ ...draft, metric: event.target.value as MarketingOutcomeMetric }))}>{marketingOutcomeMetrics.map((metric) => <option key={metric} value={metric}>{title(metric)}</option>)}</select></label><Field label="Value" type="number" value={outcomeDraft.value} onChange={(value) => setOutcomeDraft((draft) => ({ ...draft, value }))} /><Field label="Evidence source" value={outcomeDraft.sourceLabel} onChange={(value) => setOutcomeDraft((draft) => ({ ...draft, sourceLabel: value }))} /><Field label="Evidence URL · optional" value={outcomeDraft.sourceUrl} onChange={(value) => setOutcomeDraft((draft) => ({ ...draft, sourceUrl: value }))} /><Field label="Notes · optional" value={outcomeDraft.notes} onChange={(value) => setOutcomeDraft((draft) => ({ ...draft, notes: value }))} /></div>
        <button type="button" className="beast-button mt-5" disabled={Boolean(busy)} onClick={() => void send({ kind: "outcome", campaignId: selectedCampaign.id, ...outcomeDraft, value: Number(outcomeDraft.value) }, "Outcome recorded with its evidence source.")}>Record outcome</button>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{campaignOutcomes.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{title(item.metric)}</p><p className="mt-1 text-2xl font-black text-white">{item.value.toLocaleString()}</p><p className="mt-2 text-xs text-slate-400">{item.sourceLabel} · {formatDate(item.measuredAt)}</p></div>)}{!campaignOutcomes.length ? <p className="text-sm text-slate-400">Performance evidence is unavailable.</p> : null}</div>
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader eyebrow="BeastMarketing Specialist" title="Continue, modify, or stop" description="The recommendation is deterministic and advisory. It cannot approve, publish, schedule, or spend." action={<button type="button" className="beast-button" disabled={Boolean(busy)} onClick={() => void send({ kind: "recommendation", campaignId: selectedCampaign.id }, "A new evidence-backed recommendation was recorded.")}>Generate recommendation</button>} />
        <div className="mt-5 space-y-4">{campaignRecommendations.map((item) => <div key={item.id} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4"><p className="text-xs font-black uppercase tracking-wider text-amber-200">{item.decision.toUpperCase()} · {item.confidence} confidence</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-200">{item.rationale.map((reason) => <li key={reason}>{reason}</li>)}</ul><p className="mt-3 text-xs text-slate-400">Evidence: {item.evidence.length ? item.evidence.join("; ") : "Unavailable"}</p><p className="mt-1 text-xs text-slate-400">Limitations: {item.limitations.length ? item.limitations.join("; ") : "None recorded"}</p></div>)}{!campaignRecommendations.length ? <p className="text-sm text-slate-400">No recommendation has been recorded yet.</p> : null}</div>
      </DashboardCard>
    </> : null}
  </div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm font-bold text-slate-200">{label}<input className={`${inputClass} mt-2`} type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</dt><dd className="mt-1 text-slate-200">{value}</dd></div>;
}

function MiniButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-black text-white hover:border-amber-300/50 disabled:opacity-50">{label}</button>;
}
