"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { allowedVideoTransitions, defaultVideoSeriesSettings, type VideoJobState, type VideoSeriesSettings } from "@/lib/beastMarketingVideo";

type Series = { id: string; name: string; description: string; enabled: boolean; settings: VideoSeriesSettings };
type Presenter = { id: string; name: string; presenter_type: string; active: boolean };
type Evidence = { source: string; label: string; url: string | null; observedAt: string | null; sampleSize: number | null; value: number | null; limitation: string | null };
type SearchOpportunity = { page: string; query: string; score: number; disposition: string; classification: string; recommendedAsset: string; signals: string[]; rationale: string; current: { clicks: number; impressions: number; ctr: number; position: number } };
type IntelligenceSnapshot = { generatedAt: string; providers: { id: string; label: string; status: string; guidance?: string | null }[]; data: { searchOpportunities: SearchOpportunity[] }; limitations: string[] };
type JobTopic = { title?: string; score?: number; confidence?: number | null; evidenceStatus?: string; evidence?: Evidence[]; rationale?: string[]; searchOpportunity?: SearchOpportunity };
type Job = { id: string; series_id: string; state: VideoJobState; topic: JobTopic; script?: { estimatedSeconds?: number; warnings?: string[] }; production?: { manifest?: { checksum: string; runtimeMs: number; width: number; height: number; scenes: unknown[]; planState: string; blockers: string[] }; providerState?: string; externalActionPerformed?: boolean; estimatedCredits?: { estimatedTotal: number; basis: string } }; quality?: { warnings?: string[]; ownerQualityReview?: string }; last_error?: string | null; updated_at: string };
type Snapshot = {
  controls: { pause_all_publishing: boolean };
  series: Series[];
  presenters: Presenter[];
  jobs: Job[];
  authorities: { externalPublishing: string; automaticPublishing: string; youtube: string; paidProviders: string };
};

const input = "mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-amber-300 focus:outline-none";
const empty: Snapshot = { controls: { pause_all_publishing: true }, series: [], presenters: [], jobs: [], authorities: { externalPublishing: "disabled", automaticPublishing: "disabled", youtube: "not_authorized", paidProviders: "not_configured" } };
const queueOrder: VideoJobState[] = ["idea", "selected", "scripted", "generating", "ready", "scheduled", "published", "measuring", "completed", "scale", "modify", "stop", "failed", "skipped"];
const words = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function VideoGrowthEnginePanel() {
  const [data, setData] = useState<Snapshot>(empty);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newSeries, setNewSeries] = useState({ name: "", description: "" });
  const [newTopic, setNewTopic] = useState("");
  const [presenterName, setPresenterName] = useState("");
  const [intelligence, setIntelligence] = useState<IntelligenceSnapshot | null>(null);
  const [intelligenceLoaded, setIntelligenceLoaded] = useState(false);
  const selected = useMemo(() => data.series.find((item) => item.id === selectedId) || null, [data.series, selectedId]);

  async function load() {
    try {
      const response = await fetch("/api/admin/beast-marketing/video", { cache: "no-store" });
      const body = await response.json() as Snapshot & { error?: string };
      if (!response.ok) throw new Error(body.error || "The Video Growth Engine could not load.");
      setData(body);
      setSelectedId((current) => current || body.series[0]?.id || "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The Video Growth Engine could not load."); }
  }

  useEffect(() => { void load(); }, []);

  async function send(method: "POST" | "PATCH", payload: Record<string, unknown>, success: string) {
    setBusy(String(payload.id || payload.kind)); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/beast-marketing/video", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "The video setting could not be saved.");
      setMessage(success); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The video setting could not be saved."); }
    finally { setBusy(""); }
  }

  async function loadIntelligence() {
    setBusy("content_intelligence"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/seangworld-intelligence?days=30", { cache: "no-store" });
      const body = await response.json() as IntelligenceSnapshot & { error?: string };
      if (!response.ok) throw new Error(body.error || "Content intelligence could not load.");
      setIntelligence(body); setIntelligenceLoaded(true);
      setMessage(`Content intelligence refreshed. ${body.data.searchOpportunities.length} Search Console opportunities available.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Content intelligence could not load."); setIntelligenceLoaded(true); }
    finally { setBusy(""); }
  }

  function updateSetting<K extends keyof VideoSeriesSettings>(key: K, value: VideoSeriesSettings[K]) {
    if (!selected) return;
    setData((current) => ({ ...current, series: current.series.map((item) => item.id === selected.id ? { ...item, settings: { ...item.settings, [key]: value } } : item) }));
  }

  async function saveSeries() {
    if (!selected) return;
    await send("PATCH", { kind: "series", id: selected.id, name: selected.name, description: selected.description, enabled: selected.enabled, settings: selected.settings }, "Series controls saved. External publishing remains disabled.");
  }

  return <div className="space-y-6">
    <DashboardCard accent="admin">
      <SectionHeader eyebrow="BMKT-006 · Owner only" title="AI Video & YouTube Growth Engine" description="A deterministic control plane for evidence-backed discovery, grounded scripting, provider-neutral production planning, private media provenance, series, presenters, jobs, and future YouTube delivery." />
      <div className={`mt-5 rounded-2xl border p-5 ${data.controls.pause_all_publishing ? "border-red-300/40 bg-red-400/[0.08]" : "border-amber-300/30 bg-amber-300/[0.05]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-red-100">Global publishing interlock</p><p className="mt-1 text-sm text-slate-300">{data.controls.pause_all_publishing ? "PAUSE ALL PUBLISHING is active." : "Internal scheduling is unpaused; external authority is still absent."}</p></div><button className="beast-button" disabled={Boolean(busy)} onClick={() => void send("PATCH", { kind: "controls", pauseAllPublishing: !data.controls.pause_all_publishing }, data.controls.pause_all_publishing ? "Global pause released. YouTube publishing is still locked." : "All publishing paused.")}>{data.controls.pause_all_publishing ? "Release global pause" : "PAUSE ALL PUBLISHING"}</button></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(data.authorities).map(([key, value]) => <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label(key)}</p><p className="mt-1 font-black text-white">{label(value)}</p></div>)}</div>
      <p className="mt-4 text-sm text-amber-100">Publish Now and Automatic mode remain locked until proper YouTube OAuth, external-publishing authority, and an internally validated production exist.</p>
      {error ? <p role="alert" className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}{message ? <p className="mt-4 text-sm font-bold text-green-200">{message}</p> : null}
    </DashboardCard>

    <DashboardCard accent="admin">
      <SectionHeader eyebrow="Reusable series" title="Configure production without hard-coded duration" description="Global defaults are safe and paused. Each series can independently define publishing cadence, runtime, presentation, topic policy, and quality." />
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_2fr_auto]"><Field title="Series name" value={newSeries.name} onChange={(value) => setNewSeries((draft) => ({ ...draft, name: value }))} /><Field title="Purpose" value={newSeries.description} onChange={(value) => setNewSeries((draft) => ({ ...draft, description: value }))} /><button className="beast-button self-end" disabled={Boolean(busy) || !newSeries.name.trim()} onClick={() => void send("POST", { kind: "series", ...newSeries, settings: defaultVideoSeriesSettings }, "Paused series created.").then(() => setNewSeries({ name: "", description: "" }))}>Create series</button></div>
      {data.series.length ? <div className="mt-6 flex flex-wrap gap-2">{data.series.map((item) => <button key={item.id} className={`min-h-10 rounded-xl border px-4 text-sm font-black ${selectedId === item.id ? "border-amber-300 bg-amber-300/10 text-amber-100" : "border-white/15 text-white"}`} onClick={() => setSelectedId(item.id)}>{item.name} · {item.enabled ? "enabled" : "paused"}</button>)}</div> : <p className="mt-5 text-sm text-slate-400">No video series exists yet.</p>}
      {selected ? <div className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select title="Series state" value={selected.enabled ? "enabled" : "paused"} options={["paused", "enabled"]} onChange={(value) => setData((current) => ({ ...current, series: current.series.map((item) => item.id === selected.id ? { ...item, enabled: value === "enabled" } : item) }))} />
          <Select title="Approval mode" value={selected.settings.approvalMode} options={["owner_approval", "automatic"]} onChange={(value) => updateSetting("approvalMode", value as VideoSeriesSettings["approvalMode"])} />
          <Select title="Aspect ratio" value={selected.settings.aspectRatio} options={["9:16", "16:9", "1:1"]} onChange={(value) => updateSetting("aspectRatio", value as VideoSeriesSettings["aspectRatio"])} />
          <NumberField title="Quality threshold" value={selected.settings.qualityThreshold} onChange={(value) => updateSetting("qualityThreshold", value)} />
          <NumberField title="Minimum runtime (sec)" value={selected.settings.minimumRuntimeSeconds} onChange={(value) => updateSetting("minimumRuntimeSeconds", value)} />
          <NumberField title="Target runtime (sec)" value={selected.settings.targetRuntimeSeconds} onChange={(value) => updateSetting("targetRuntimeSeconds", value)} />
          <NumberField title="Maximum runtime (sec)" value={selected.settings.maximumRuntimeSeconds} onChange={(value) => updateSetting("maximumRuntimeSeconds", value)} />
          <NumberField title="Minimum spacing (min)" value={selected.settings.minimumSpacingMinutes} onChange={(value) => updateSetting("minimumSpacingMinutes", value)} />
          <NumberField title="Maximum per day" value={selected.settings.maximumPerDay} onChange={(value) => updateSetting("maximumPerDay", value)} />
          <NumberField title="Maximum per week" value={selected.settings.maximumPerWeek} onChange={(value) => updateSetting("maximumPerWeek", value)} />
          <Field title="Posting windows" value={selected.settings.preferredWindows.join(", ")} onChange={(value) => updateSetting("preferredWindows", words(value))} />
          <Field title="Days (0 Sun–6 Sat)" value={selected.settings.daysOfWeek.join(", ")} onChange={(value) => updateSetting("daysOfWeek", words(value).map(Number).filter((day) => day >= 0 && day <= 6))} />
          <Field title="Visual style" value={selected.settings.visualStyle} onChange={(value) => updateSetting("visualStyle", value)} />
          <Field title="Caption style" value={selected.settings.captionStyle} onChange={(value) => updateSetting("captionStyle", value)} />
          <Field title="Allowed topics" value={selected.settings.allowedTopics.join(", ")} onChange={(value) => updateSetting("allowedTopics", words(value))} />
          <Field title="Excluded topics" value={selected.settings.excludedTopics.join(", ")} onChange={(value) => updateSetting("excludedTopics", words(value))} />
          <NumberField title="Evergreen %" value={selected.settings.evergreenPercent} onChange={(value) => updateSetting("evergreenPercent", value)} />
          <NumberField title="Beast promotion %" value={selected.settings.beastPromotionPercent} onChange={(value) => updateSetting("beastPromotionPercent", value)} />
          <NumberField title="Trend sensitivity" value={selected.settings.trendSensitivity} onChange={(value) => updateSetting("trendSensitivity", value)} />
          <NumberField title="Minimum confidence" value={selected.settings.minimumOpportunityConfidence} onChange={(value) => updateSetting("minimumOpportunityConfidence", value)} />
        </div>
        <div><p className="text-sm font-black text-white">Optimization</p><div className="mt-3 flex flex-wrap gap-3">{(["optimizeTitle", "optimizeDescription", "researchKeywords", "generateTags", "generateHashtags", "testHooks", "testCtas", "selectDestination", "campaignAttribution", "optimizeTiming"] as const).map((key) => <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200"><input type="checkbox" checked={selected.settings[key]} onChange={(event) => updateSetting(key, event.target.checked)} />{label(key)}</label>)}</div></div>
        <button className="beast-button" disabled={Boolean(busy)} onClick={() => void saveSeries()}>Save series controls</button>
      </div> : null}
    </DashboardCard>

    <DashboardCard accent="admin">
      <SectionHeader eyebrow="Identity foundation" title="Reusable presenter profiles" description="Faceless profiles are available now. AI Sean likeness, voice, and source media remain explicitly locked pending separate consent." />
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><Field title="Faceless presenter profile" value={presenterName} onChange={setPresenterName} /><button className="beast-button self-end" disabled={Boolean(busy) || !presenterName.trim()} onClick={() => void send("POST", { kind: "presenter", name: presenterName }, "Faceless presenter profile created without likeness or voice media.").then(() => setPresenterName(""))}>Create presenter</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.presenters.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-4"><p className="font-black text-white">{item.name}</p><p className="text-sm text-slate-400">{label(item.presenter_type)} · {item.active ? "active" : "inactive"}</p></div>)}<div className="rounded-xl border border-dashed border-amber-300/30 p-4"><p className="font-black text-amber-100">AI Sean · locked</p><p className="text-sm text-slate-400">Requires explicit likeness/voice authorization and owner-provided source media.</p></div></div>
    </DashboardCard>

    <DashboardCard accent="admin">
      <SectionHeader eyebrow="BMKT-004 · Evidence before inference" title="Content Intelligence" description="Refreshes the existing owner-only SEANGWORLD Search Console, GA4, and first-party intelligence on demand. Missing trend or history data stays explicitly unavailable." />
      <div className="mt-5 flex flex-wrap items-end gap-3"><div className="min-w-60 flex-1"><Select title="Queue discoveries into series" value={selectedId} options={data.series.map((item) => item.id)} optionLabels={Object.fromEntries(data.series.map((item) => [item.id, item.name]))} onChange={setSelectedId} /></div><button className="beast-button" disabled={Boolean(busy) || !selectedId} onClick={() => void loadIntelligence()}>Refresh content opportunities</button></div>
      {!intelligenceLoaded ? <p className="mt-4 text-sm text-slate-400">No provider is contacted until the owner requests a refresh.</p> : null}
      {intelligence ? <>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">{intelligence.providers.map((provider) => <div key={provider.id} className="rounded-xl border border-white/10 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-500">{provider.label}</p><p className="mt-1 font-black text-white">{label(provider.status)}</p>{provider.guidance ? <p className="mt-1 text-xs text-slate-400">{provider.guidance}</p> : null}</div>)}</div>
        {intelligence.limitations.length ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><p className="text-sm font-black text-amber-100">Evidence limitations</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{intelligence.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        <div className="mt-4 space-y-3">{intelligence.data.searchOpportunities.slice(0, 12).map((opportunity) => <div key={`${opportunity.page}:${opportunity.query}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="font-black text-white">{opportunity.query}</p><p className="mt-1 text-sm text-slate-300">{opportunity.rationale}</p><p className="mt-2 text-xs font-bold text-slate-500">Score {opportunity.score}/100 · {opportunity.current.impressions} impressions · {opportunity.current.clicks} clicks · position {opportunity.current.position.toFixed(1)} · {opportunity.classification}</p></div><button className="min-h-10 rounded-lg border border-amber-300/30 px-3 text-sm font-black text-amber-100 disabled:opacity-50" disabled={Boolean(busy) || !selectedId} onClick={() => void send("POST", { kind: "search_opportunity_job", seriesId: selectedId, opportunity, generatedAt: intelligence.generatedAt }, "Evidence-backed idea added. Product Truth and funnel fit still require evaluation.")}>Add to queue</button></div></div>)}{!intelligence.data.searchOpportunities.length ? <p className="text-sm text-slate-400">No Search Console opportunity rows are available for this period. No demand or trend claim has been inferred.</p> : null}</div>
      </> : intelligenceLoaded ? <p className="mt-4 text-sm text-slate-400">Content intelligence is unavailable. No synthetic opportunities were created.</p> : null}
    </DashboardCard>

    <DashboardCard accent="admin">
      <SectionHeader eyebrow="Deterministic production queue" title="Idea → learn, with guarded transitions" description="Evidence-backed evaluation and grounded scripting now preserve provenance, missing-data limitations, configurable runtime, and measurable destination attribution." />
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr_auto]"><Select title="Series" value={selectedId} options={data.series.map((item) => item.id)} optionLabels={Object.fromEntries(data.series.map((item) => [item.id, item.name]))} onChange={setSelectedId} /><Field title="Owner-selected topic" value={newTopic} onChange={setNewTopic} /><button className="beast-button self-end" disabled={Boolean(busy) || !selectedId || !newTopic.trim()} onClick={() => void send("POST", { kind: "job", seriesId: selectedId, topicTitle: newTopic }, "Idea added to the internal production queue.").then(() => setNewTopic(""))}>Add idea</button></div>
      <div className="mt-5 flex flex-wrap gap-2">{queueOrder.map((state) => <span key={state} className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-slate-400">{label(state)} {data.jobs.filter((job) => job.state === state).length}</span>)}</div>
      <div className="mt-5 space-y-3">{data.jobs.map((job) => <div key={job.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-black text-white">{job.topic?.title || "Untitled idea"}</p><p className="mt-1 text-xs font-black uppercase tracking-wider text-amber-200">{label(job.state)}{typeof job.topic.score === "number" ? ` · score ${job.topic.score}/100 · confidence ${job.topic.confidence ?? 0}/100` : ""}</p>{job.topic.evidenceStatus ? <p className="mt-1 text-xs text-slate-400">Evidence: {label(job.topic.evidenceStatus)}</p> : null}{job.last_error ? <p className="mt-1 text-sm text-red-200">{job.last_error}</p> : null}{job.quality?.warnings?.length ? <p className="mt-1 text-sm text-amber-100">{job.quality.warnings.join(" ")}</p> : null}</div><div className="flex flex-wrap gap-2">{allowedVideoTransitions[job.state].filter((state) => !["selected", "scripted", "generating", "scheduled", "published"].includes(state)).map((state) => <button key={state} className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-black text-white disabled:opacity-50" disabled={Boolean(busy)} onClick={() => void send("PATCH", { kind: "job", id: job.id, state }, `Queue item moved to ${label(state)}.`)}>{label(state)}</button>)}<button className="min-h-10 rounded-lg border border-white/10 px-3 text-sm font-black text-slate-500" disabled title="YouTube OAuth and publishing authority required">Publish Now · locked</button></div></div>{["idea", "modify"].includes(job.state) ? <OpportunityEvaluation job={job} busy={Boolean(busy)} onSend={send} /> : null}{["selected", "modify"].includes(job.state) ? <ScriptBuilder job={job} busy={Boolean(busy)} onSend={send} /> : null}{["scripted", "generating", "ready", "failed"].includes(job.state) ? <ProductionPlanner job={job} busy={Boolean(busy)} onSend={send} /> : null}</div>)}{!data.jobs.length ? <p className="text-sm text-slate-400">The production queue is empty.</p> : null}</div>
    </DashboardCard>
  </div>;
}

function Field({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-200">{title}<input className={input} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ title, value, onChange }: { title: string; value: number; onChange: (value: number) => void }) { return <label className="text-sm font-bold text-slate-200">{title}<input className={input} type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function Select({ title, value, options, optionLabels, onChange }: { title: string; value: string; options: string[]; optionLabels?: Record<string, string>; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-200">{title}<select className={input} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{optionLabels?.[option] || label(option)}</option>)}</select></label>; }

type Send = (method: "POST" | "PATCH", payload: Record<string, unknown>, success: string) => Promise<void>;

function OpportunityEvaluation({ job, busy, onSend }: { job: Job; busy: boolean; onSend: Send }) {
  const [draft, setDraft] = useState({ category: job.topic.searchOpportunity?.classification || "", capabilityMatch: 0, funnelValue: 0 });
  const audienceInterest = job.topic.searchOpportunity?.score ?? null;
  return <details className="mt-4 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-black text-white">Evaluate Product Truth and funnel fit</summary><p className="mt-2 text-sm text-slate-400">Search interest is retained as evidence. Capability and funnel scores must reflect verified Beast/SEANGWORLD fit; trend and YouTube history remain unavailable.</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><Field title="Category" value={draft.category} onChange={(value) => setDraft((current) => ({ ...current, category: value }))} /><NumberField title="Capability match (0–100)" value={draft.capabilityMatch} onChange={(value) => setDraft((current) => ({ ...current, capabilityMatch: Math.min(100, value) }))} /><NumberField title="Funnel value (0–100)" value={draft.funnelValue} onChange={(value) => setDraft((current) => ({ ...current, funnelValue: Math.min(100, value) }))} /></div><button className="beast-button mt-3" disabled={busy || !draft.category.trim()} onClick={() => void onSend("POST", { kind: "evaluate_job", id: job.id, ...draft, audienceInterest, trendOpportunity: null, historicalPerformance: null, evidence: job.topic.evidence || [] }, "Opportunity evaluated against the series threshold; unavailable evidence stayed unavailable.")}>Evaluate opportunity</button></details>;
}

function ScriptBuilder({ job, busy, onSend }: { job: Job; busy: boolean; onSend: Send }) {
  const [draft, setDraft] = useState({ destinationUrl: "", destinationLabel: "SEANGWORLD", summary: "", keywords: "", claims: "", sourceLabel: "Product Truth", sourceUrl: "", verified: false });
  const claims = draft.claims.split("\n").map((statement) => statement.trim()).filter(Boolean).slice(0, 8);
  return <details className="mt-4 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-sm font-black text-white">Build grounded script and YouTube metadata</summary><p className="mt-2 text-sm text-slate-400">One verified claim per line. If truthful source material cannot meet the configured minimum runtime, the item remains selected instead of being padded.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field title="HTTPS destination" value={draft.destinationUrl} onChange={(value) => setDraft((current) => ({ ...current, destinationUrl: value }))} /><Field title="Destination label" value={draft.destinationLabel} onChange={(value) => setDraft((current) => ({ ...current, destinationLabel: value }))} /><Field title="Natural keywords (comma separated)" value={draft.keywords} onChange={(value) => setDraft((current) => ({ ...current, keywords: value }))} /><Field title="Fact source label" value={draft.sourceLabel} onChange={(value) => setDraft((current) => ({ ...current, sourceLabel: value }))} /><Field title="Fact source HTTPS URL (optional)" value={draft.sourceUrl} onChange={(value) => setDraft((current) => ({ ...current, sourceUrl: value }))} /><label className="flex items-end gap-2 pb-3 text-sm font-bold text-slate-200"><input type="checkbox" checked={draft.verified} onChange={(event) => setDraft((current) => ({ ...current, verified: event.target.checked }))} />I verified these claims against the named source</label></div><label className="mt-3 block text-sm font-bold text-slate-200">Description summary<textarea className={`${input} min-h-24`} value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} /></label><label className="mt-3 block text-sm font-bold text-slate-200">Verified claims, one per line<textarea className={`${input} min-h-32`} value={draft.claims} onChange={(event) => setDraft((current) => ({ ...current, claims: event.target.value }))} /></label><button className="beast-button mt-3" disabled={busy || !draft.destinationUrl || !draft.summary || !claims.length || !draft.verified} onClick={() => void onSend("POST", { kind: "script_job", id: job.id, destinationUrl: draft.destinationUrl, destinationLabel: draft.destinationLabel, summary: draft.summary, keywords: words(draft.keywords), facts: claims.map((statement) => ({ statement, sourceLabel: draft.sourceLabel, sourceUrl: draft.sourceUrl || null, verified: draft.verified })) }, "Grounded script and attributed YouTube metadata created or safely flagged for more source material.")}>Build script package</button></details>;
}

function ProductionPlanner({ job, busy, onSend }: { job: Job; busy: boolean; onSend: Send }) {
  const manifest = job.production?.manifest;
  const [renderBusy, setRenderBusy] = useState(false);
  const [renderStatus, setRenderStatus] = useState("");
  const [renderError, setRenderError] = useState("");
  const [signedUrl, setSignedUrl] = useState("");

  async function render(action: "submit" | "inspect") {
    setRenderBusy(true); setRenderError("");
    try {
      const response = await fetch("/api/admin/beast-marketing/video/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, jobId: job.id }) });
      const body = await response.json() as { error?: string; status?: string; providerStatus?: string; signedUrl?: string; estimate?: { estimatedTotal: number; basis: string }; duplicatePrevented?: boolean };
      if (!response.ok && response.status !== 202) throw new Error(body.error || "The internal render could not be completed.");
      if (body.signedUrl) setSignedUrl(body.signedUrl);
      if (body.status === "succeeded") setRenderStatus("Internal render is ready for quality review. Nothing was published.");
      else if (action === "submit") setRenderStatus(`${body.duplicatePrevented ? "Existing attempt retained" : "Internal render submitted"}${body.estimate ? ` · estimated maximum ${body.estimate.estimatedTotal.toFixed(1)} credits (${body.estimate.basis.toLowerCase()})` : ""}. Automatic retry is off.`);
      else setRenderStatus(`Shotstack status: ${label(body.providerStatus || body.status || "submitted")}. Check again shortly; no new render will be submitted.`);
    } catch (reason) { setRenderError(reason instanceof Error ? reason.message : "The internal render could not be completed."); }
    finally { setRenderBusy(false); }
  }

  const providerActive = job.production?.providerState && job.production.providerState !== "authorization_required";
  return <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><p className="text-sm font-black text-amber-100">Provider-neutral production plan</p>{manifest ? <><p className="mt-2 text-sm text-slate-300">{manifest.scenes.length} scenes · {(manifest.runtimeMs / 1000).toFixed(0)} seconds · {manifest.width}×{manifest.height} · {providerActive ? `Shotstack ${label(job.production?.providerState || "internal")}` : label(manifest.planState)}</p><p className="mt-1 break-all text-xs text-slate-500">Manifest {manifest.checksum}</p>{!providerActive ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{manifest.blockers.map((item) => <li key={item}>{item}</li>)}</ul> : null}</> : <p className="mt-2 text-sm text-slate-300">Builds deterministic scenes, timing, captions, provider slots, retry policy, and provenance requirements without contacting a provider.</p>}<div className="mt-3 flex flex-wrap gap-2"><button className="beast-button" disabled={busy || renderBusy || job.state !== "scripted"} onClick={() => void onSend("POST", { kind: "plan_production", id: job.id }, manifest ? "Production manifest rebuilt deterministically. No provider was contacted." : "Production manifest prepared. Provider authorization is still required before rendering.")}>{manifest ? "Rebuild manifest" : "Prepare production manifest"}</button>{manifest ? <button className="beast-button" disabled={busy || renderBusy || job.state !== "scripted"} onClick={() => void render("submit")}>Generate internal Shotstack render</button> : <button className="min-h-10 rounded-lg border border-white/10 px-3 text-sm font-black text-slate-500" disabled>Generate video · provider gate</button>}<button className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-black text-white disabled:opacity-50" disabled={busy || renderBusy || !manifest || job.state === "scripted"} onClick={() => void render("inspect")}>Check render status</button></div><p className="mt-2 text-xs text-slate-400">Edit and Serve APIs only. One initial idempotent attempt; one credential-remediation attempt; and one schema-correction attempt after a pre-submission validation rejection. Maximum estimated 2.0 credits, no automatic retry, no YouTube destination, and no external publication.</p>{renderError ? <p role="alert" className="mt-2 text-sm font-bold text-red-200">{renderError}</p> : null}{renderStatus ? <p className="mt-2 text-sm font-bold text-green-200">{renderStatus}</p> : null}{signedUrl ? <video aria-label="Internal Shotstack render with burned-in captions" className="mt-4 max-h-[36rem] w-full rounded-xl bg-black" src={signedUrl} controls preload="metadata" /> : null}</div>;
}
