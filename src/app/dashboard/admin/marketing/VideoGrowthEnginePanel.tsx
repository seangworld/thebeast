"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { allowedVideoTransitions, defaultVideoSeriesSettings, normalizeVideoTopicPhrases, VIDEO_TOPIC_PHRASE_LIMIT, VIDEO_TOPIC_PHRASE_MAX_LENGTH, type VideoJobState, type VideoSeriesSettings } from "@/lib/beastMarketingVideo";
import { ownerWorkflowGroup, ownerWorkflowStatus, VIDEO_CANDIDATE_BATCH_LIMIT, type OwnerWorkflowGroup } from "@/lib/beastMarketingOwnerWorkflow";

type Series = { id: string; name: string; description: string; enabled: boolean; settings: VideoSeriesSettings };
type Presenter = { id: string; name: string; presenter_type: string; active: boolean };
type Evidence = { source: string; label: string; url: string | null; observedAt: string | null; sampleSize: number | null; value: number | null; limitation: string | null };
type SearchOpportunity = { page: string; query: string; score: number; disposition: string; classification: string; recommendedAsset: string; signals: string[]; rationale: string; current: { clicks: number; impressions: number; ctr: number; position: number } };
type IntelligenceSnapshot = { generatedAt: string; providers: { id: string; label: string; status: string; guidance?: string | null }[]; data: { searchOpportunities: SearchOpportunity[] }; limitations: string[] };
type JobTopic = { title?: string; score?: number; confidence?: number | null; evidenceStatus?: string; evidence?: Evidence[]; rationale?: string[]; searchOpportunity?: SearchOpportunity };
type Job = { id: string; series_id: string; state: VideoJobState; topic: JobTopic; script?: { estimatedSeconds?: number; warnings?: string[] }; production?: { manifest?: { checksum: string; runtimeMs: number; width: number; height: number; scenes: unknown[]; planState: string; blockers: string[] }; providerState?: string; externalActionPerformed?: boolean; estimatedCredits?: { estimatedTotal: number; basis: string } }; quality?: { warnings?: string[]; renderReady?: boolean; ownerQualityReview?: string; ownerWorkflowDecision?: string; ownerApprovalSource?: string; autoApprovalBlockers?: string[]; remediationRenderUsed?: boolean; narrationNormalizationRenderUsed?: boolean; controlTokenRemediationRenderUsed?: boolean; spokenControlTokenRemediationRenderUsed?: boolean }; provenance?: { generatedBy?: string; generationMode?: string; generatedAt?: string; waitingForOwnerApproval?: boolean; candidateIndex?: number; candidateCount?: number; cadencePlan?: { plannedFor?: string } }; last_error?: string | null; updated_at: string };
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

  async function generateCandidates(mode: "test" | "batch", topicFamily: string, count: number) {
    if (!selected) return;
    setBusy("owner_generate"); setError(""); setMessage("");
    try {
      const saveResponse = await fetch("/api/admin/beast-marketing/video", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "series", id: selected.id, name: selected.name, description: selected.description, enabled: selected.enabled, settings: selected.settings }) });
      const saved = await saveResponse.json() as { error?: string };
      if (!saveResponse.ok) throw new Error(saved.error || "The current series settings could not be saved.");
      const response = await fetch("/api/admin/beast-marketing/video", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "owner_generate", mode, seriesId: selected.id, topicFamily, count }) });
      const body = await response.json() as { error?: string; candidateCount?: number; shotstackCreditsConsumed?: number };
      if (!response.ok) throw new Error(body.error || "The candidate videos could not be prepared.");
      setMessage(`${body.candidateCount || count} ${mode === "test" ? "test video candidate" : "video candidates"} prepared from the current series settings. No Shotstack credits were used and nothing was published.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The candidate videos could not be prepared."); }
    finally { setBusy(""); }
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
          <Select title="Approval mode" value={selected.settings.approvalMode} options={["owner_approval", "automatic"]} optionLabels={{ owner_approval: "Owner Approval", automatic: "Auto-Approve & Schedule" }} onChange={(value) => updateSetting("approvalMode", value as VideoSeriesSettings["approvalMode"])} />
          {selected.settings.approvalMode === "automatic" ? <NumberField title="Require manual approval for first N videos" value={selected.settings.manualApprovalFirstN} onChange={(value) => updateSetting("manualApprovalFirstN", Math.max(0, Math.min(100, Math.round(value))))} /> : null}
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
          <TopicPhraseInput key={`allowed-${selected.id}`} title="Allowed topics" values={selected.settings.allowedTopics} onChange={(value) => updateSetting("allowedTopics", value)} />
          <TopicPhraseInput key={`excluded-${selected.id}`} title="Excluded topics" values={selected.settings.excludedTopics} onChange={(value) => updateSetting("excludedTopics", value)} />
          <NumberField title="Evergreen %" value={selected.settings.evergreenPercent} onChange={(value) => updateSetting("evergreenPercent", value)} />
          <NumberField title="Beast promotion %" value={selected.settings.beastPromotionPercent} onChange={(value) => updateSetting("beastPromotionPercent", value)} />
          <NumberField title="Trend sensitivity" value={selected.settings.trendSensitivity} onChange={(value) => updateSetting("trendSensitivity", value)} />
          <NumberField title="Minimum confidence" value={selected.settings.minimumOpportunityConfidence} onChange={(value) => updateSetting("minimumOpportunityConfidence", value)} />
        </div>
        <div><p className="text-sm font-black text-white">Optimization</p><div className="mt-3 flex flex-wrap gap-3">{(["optimizeTitle", "optimizeDescription", "researchKeywords", "generateTags", "generateHashtags", "testHooks", "testCtas", "selectDestination", "campaignAttribution", "optimizeTiming"] as const).map((key) => <label key={key} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200"><input type="checkbox" checked={selected.settings[key]} onChange={(event) => updateSetting(key, event.target.checked)} />{label(key)}</label>)}</div></div>
        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4 text-sm text-slate-300"><p className="font-black text-amber-100">{selected.settings.approvalMode === "automatic" ? "Auto-Approve & Schedule · configured, authority-gated" : "Owner Approval · every finished video requires review"}</p><p className="mt-1">Auto-approval fails closed unless every factual, Product Truth, provenance, runtime, destination, safety, duplication, metadata, media, and publication-readiness gate passes. PAUSE ALL PUBLISHING, YouTube OAuth, and existing external/automatic publishing authority remain mandatory.</p></div>
        <button className="beast-button" disabled={Boolean(busy)} onClick={() => void saveSeries()}>Save series controls</button>
      </div> : null}
    </DashboardCard>

    <OwnerProductionWorkflow series={data.series} jobs={data.jobs} selectedId={selectedId} onSelectSeries={setSelectedId} busy={Boolean(busy)} pauseAllPublishing={data.controls.pause_all_publishing} authorities={data.authorities} onGenerate={generateCandidates} onSend={send} />

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

const workflowSections: { id: OwnerWorkflowGroup; title: string; description: string }[] = [
  { id: "needs_review", title: "Needs Review", description: "Preparing, rendering, held, or waiting for your approval." },
  { id: "approved_scheduled", title: "Approved / Scheduled", description: "Owner-approved candidates; upload remains locked until authority exists." },
  { id: "published_history", title: "Published / History", description: "Persistent publication and Outcome history for ongoing analytics." },
  { id: "rejected_needs_changes", title: "Rejected / Needs Changes", description: "Rejected candidates and revision or regeneration requests." },
];

function OwnerProductionWorkflow({ series, jobs, selectedId, onSelectSeries, busy, pauseAllPublishing, authorities, onGenerate, onSend }: { series: Series[]; jobs: Job[]; selectedId: string; onSelectSeries: (id: string) => void; busy: boolean; pauseAllPublishing: boolean; authorities: Snapshot["authorities"]; onGenerate: (mode: "test" | "batch", topicFamily: string, count: number) => Promise<void>; onSend: Send }) {
  const [topicFamily, setTopicFamily] = useState("");
  const [count, setCount] = useState(3);
  const grouped = useMemo(() => Object.fromEntries(workflowSections.map((section) => [section.id, jobs.filter((job) => ownerWorkflowGroup(job) === section.id)])) as Record<OwnerWorkflowGroup, Job[]>, [jobs]);
  const seriesNames = Object.fromEntries(series.map((item) => [item.id, item.name]));
  const selectedSeries = series.find((item) => item.id === selectedId);
  const publishingLocked = authorities.youtube !== "authorized" || authorities.externalPublishing !== "enabled";
  return <DashboardCard accent="admin">
    <SectionHeader eyebrow="BMKT-007 · Owner production workflow" title="Generate, review, approve, and track video candidates" description="Series are reusable content strategies. Prepare one test candidate or a bounded batch from a multi-word topic family, then manage the finished videos without learning internal job states." />
    <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.05] p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_9rem_auto_auto]">
        <Select title="Series" value={selectedId} options={series.map((item) => item.id)} optionLabels={seriesNames} onChange={onSelectSeries} />
        <Field title="Topic or topic family" value={topicFamily} onChange={setTopicFamily} />
        <label className="text-sm font-bold text-slate-200">Batch count<input className={input} type="number" min={1} max={VIDEO_CANDIDATE_BATCH_LIMIT} value={count} onChange={(event) => setCount(Math.max(1, Math.min(VIDEO_CANDIDATE_BATCH_LIMIT, Number(event.target.value) || 1)))} /></label>
        <button className="beast-button self-end" disabled={busy || !selectedId || !topicFamily.trim()} onClick={() => void onGenerate("test", topicFamily, 1)}>Generate Test Video</button>
        <button className="beast-button self-end" disabled={busy || !selectedId || !topicFamily.trim()} onClick={() => void onGenerate("batch", topicFamily, count)}>Generate Batch</button>
      </div>
      <p className="mt-3 text-xs text-slate-400">Current series settings are saved first. Topic policy, presenter, runtime, quality threshold, cadence, and Owner Approval are snapshotted onto each candidate. This prepares internal jobs only: 0 Shotstack credits, no YouTube upload, and no external publication.</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black"><span className={`rounded-full border px-3 py-1 ${pauseAllPublishing ? "border-red-300/30 text-red-100" : "border-white/10 text-slate-300"}`}>{pauseAllPublishing ? "PAUSE ALL PUBLISHING active" : "Global pause released"}</span><span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">{selectedSeries?.settings.approvalMode === "automatic" ? `Auto-Approve configured · first ${selectedSeries.settings.manualApprovalFirstN} manual` : "Owner Approval required"}</span><span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">Automatic publishing authority {authorities.automaticPublishing === "enabled" ? "enabled" : "locked"}</span><span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">YouTube upload {authorities.youtube === "authorized" ? "authorized" : "locked"}</span></div>
    </div>
    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      {workflowSections.map((section) => <section key={section.id} aria-labelledby={`workflow-${section.id}`} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"><div className="flex items-start justify-between gap-3"><div><h3 id={`workflow-${section.id}`} className="font-black text-white">{section.title}</h3><p className="mt-1 text-sm text-slate-400">{section.description}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-slate-300">{grouped[section.id].length}</span></div><div className="mt-4 space-y-3">{grouped[section.id].map((job) => <OwnerWorkflowCard key={job.id} job={job} seriesName={seriesNames[job.series_id] || "Video series"} busy={busy} publishingLocked={publishingLocked} onSend={onSend} />)}{!grouped[section.id].length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No videos in this view.</p> : null}</div></section>)}
    </div>
  </DashboardCard>;
}

function OwnerWorkflowCard({ job, seriesName, busy, publishingLocked, onSend }: { job: Job; seriesName: string; busy: boolean; publishingLocked: boolean; onSend: Send }) {
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [signedUrl, setSignedUrl] = useState("");
  const decision = job.quality?.ownerWorkflowDecision;
  const finished = job.quality?.renderReady === true;
  const canReject = allowedVideoTransitions[job.state].includes("skipped");
  const canRequestChanges = allowedVideoTransitions[job.state].includes("modify");

  async function preview() {
    setPreviewBusy(true); setPreviewError("");
    try {
      const response = await fetch("/api/admin/beast-marketing/video/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "inspect", jobId: job.id }) });
      const body = await response.json() as { error?: string; signedUrl?: string };
      if (!response.ok || !body.signedUrl) throw new Error(body.error || "The finished preview is not available yet.");
      setSignedUrl(body.signedUrl);
    } catch (reason) { setPreviewError(reason instanceof Error ? reason.message : "The finished preview is not available yet."); }
    finally { setPreviewBusy(false); }
  }

  return <article className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-white">{job.topic.title || "Untitled candidate"}</p><p className="mt-1 text-xs text-slate-400">{seriesName}{job.provenance?.candidateCount ? ` · Candidate ${job.provenance.candidateIndex || 1} of ${job.provenance.candidateCount}` : ""}</p></div><span className="rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-3 py-1 text-xs font-black text-amber-100">{ownerWorkflowStatus(job)}</span></div>
    {job.provenance?.generatedBy === "BeastMarketing" ? <p className="mt-3 text-sm font-bold text-green-200">BeastMarketing generated this candidate and is waiting for owner review.</p> : null}
    {job.provenance?.cadencePlan?.plannedFor ? <p className="mt-2 text-xs text-slate-500">Cadence plan: {new Date(job.provenance.cadencePlan.plannedFor).toLocaleString()}</p> : null}
    {job.quality?.warnings?.length ? <p className="mt-2 text-sm text-amber-100">{job.quality.warnings.join(" ")}</p> : null}
    {job.quality?.autoApprovalBlockers?.length ? <details className="mt-3 rounded-lg border border-amber-300/15 p-3"><summary className="cursor-pointer text-xs font-black text-amber-100">Why auto-approval did not run</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">{job.quality.autoApprovalBlockers.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
    {finished ? <div className="mt-3"><button className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-black text-white disabled:opacity-50" disabled={busy || previewBusy} onClick={() => void preview()}>{previewBusy ? "Loading preview…" : signedUrl ? "Refresh preview link" : "Preview / Watch"}</button>{previewError ? <p role="alert" className="mt-2 text-sm text-red-200">{previewError}</p> : null}{signedUrl ? <video aria-label={`Preview of ${job.topic.title || "video candidate"}`} className="mt-3 max-h-[30rem] w-full rounded-xl bg-black" src={signedUrl} controls preload="metadata" /> : null}</div> : null}
    <div className="mt-3 flex flex-wrap gap-2">
      {finished && decision !== "approved" ? <button className="beast-button" disabled={busy} onClick={() => void onSend("PATCH", { kind: "owner_review", id: job.id, decision: "approved" }, "Video approved. It is visible in Approved / Scheduled, but YouTube scheduling remains locked until authority exists.")}>Approve for Scheduling</button> : null}
      {decision !== "held" && !["approved", "rejected", "needs_changes"].includes(decision || "") && !["published", "measuring", "completed", "scale"].includes(job.state) ? <button className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-black text-white disabled:opacity-50" disabled={busy} onClick={() => void onSend("PATCH", { kind: "owner_review", id: job.id, decision: "held" }, "Video candidate placed on hold.")}>Hold</button> : null}
      {["held", "approved"].includes(decision || "") && job.state === "ready" ? <button className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-black text-white disabled:opacity-50" disabled={busy} onClick={() => void onSend("PATCH", { kind: "owner_review", id: job.id, decision: "pending" }, "Video returned to Needs Review.")}>Return to Needs Review</button> : null}
      {finished && canRequestChanges ? <button className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-black text-white disabled:opacity-50" disabled={busy} onClick={() => void onSend("PATCH", { kind: "owner_review", id: job.id, decision: "needs_changes" }, "Changes requested. The candidate moved to Rejected / Needs Changes for revision or regeneration.")}>Request Changes / Regenerate</button> : null}
      {canReject && decision !== "rejected" ? <button className="min-h-10 rounded-lg border border-red-300/25 px-3 text-sm font-black text-red-100 disabled:opacity-50" disabled={busy} onClick={() => void onSend("PATCH", { kind: "owner_review", id: job.id, decision: "rejected" }, "Video candidate rejected and retained in history.")}>Reject</button> : null}
      {decision === "approved" && publishingLocked ? <span className="self-center text-xs font-bold text-slate-500">Scheduled upload locked · YouTube OAuth and publishing authority required</span> : null}
    </div>
  </article>;
}

function Field({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-200">{title}<input className={input} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ title, value, onChange }: { title: string; value: number; onChange: (value: number) => void }) { return <label className="text-sm font-bold text-slate-200">{title}<input className={input} type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function Select({ title, value, options, optionLabels, onChange }: { title: string; value: string; options: string[]; optionLabels?: Record<string, string>; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-200">{title}<select className={input} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{optionLabels?.[option] || label(option)}</option>)}</select></label>; }

function TopicPhraseInput({ title, values, onChange }: { title: string; values: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [validationError, setValidationError] = useState("");
  const inputId = `topic-phrases-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  function commit(rawPhrases: string[]) {
    const pending = rawPhrases.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!pending.length) return true;
    const tooLong = pending.find((item) => item.length > VIDEO_TOPIC_PHRASE_MAX_LENGTH);
    if (tooLong) { setValidationError(`Each topic phrase must be ${VIDEO_TOPIC_PHRASE_MAX_LENGTH} characters or fewer.`); return false; }
    const next = [...values];
    for (const phrase of pending) {
      if (!next.some((item) => item.toLowerCase() === phrase.toLowerCase())) next.push(phrase);
    }
    if (next.length === values.length) { setValidationError("That topic phrase is already in this list."); return false; }
    if (next.length > VIDEO_TOPIC_PHRASE_LIMIT) { setValidationError(`Use no more than ${VIDEO_TOPIC_PHRASE_LIMIT} topic phrases in this list.`); return false; }
    onChange(normalizeVideoTopicPhrases(next)); setValidationError(""); return true;
  }

  function handleDraftChange(value: string) {
    const parts = value.split(",");
    if (parts.length === 1) { setDraft(value); return; }
    const remainder = parts.pop() || "";
    if (commit(parts)) setDraft(remainder);
  }

  return <div className="text-sm font-bold text-slate-200">
    <label htmlFor={inputId}>{title}</label>
    <p id={helpId} className="mt-1 text-xs font-normal text-slate-400">Enter a topic phrase such as “AI agents,” then press Enter or comma. Add multiple phrases without creating another series.</p>
    {values.length ? <ul aria-label={`${title} selected topic phrases`} aria-live="polite" className="mt-2 flex flex-wrap gap-2">{values.map((topic) => <li key={topic} className="flex min-h-9 items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-3 text-sm text-amber-100"><span>{topic}</span><button type="button" className="rounded-full px-1 text-base leading-none hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-300" aria-label={`Remove ${topic} from ${title}`} onClick={() => { onChange(values.filter((item) => item !== topic)); setValidationError(""); }}>×</button></li>)}</ul> : null}
    <input id={inputId} className={input} value={draft} autoComplete="off" aria-describedby={`${helpId}${validationError ? ` ${errorId}` : ""}`} aria-invalid={Boolean(validationError)} placeholder="Type a topic phrase" onChange={(event) => handleDraftChange(event.target.value)} onBlur={() => { if (commit([draft])) setDraft(""); }} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === ",") { event.preventDefault(); if (commit([draft])) setDraft(""); }
      else if (event.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
    }} />
    {validationError ? <p id={errorId} role="alert" className="mt-1 text-xs font-bold text-red-200">{validationError}</p> : null}
  </div>;
}

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
  const qualityRemediationAvailable = job.state === "ready" && job.quality?.ownerQualityReview === "pending" && !job.quality?.remediationRenderUsed;
  const pronunciationValidationAvailable = job.state === "ready" && job.quality?.ownerQualityReview === "pending" && job.quality?.remediationRenderUsed && !job.quality?.narrationNormalizationRenderUsed;
  const controlTokenRemediationAvailable = job.state === "ready" && job.quality?.ownerQualityReview === "pending" && job.quality?.narrationNormalizationRenderUsed && !job.quality?.controlTokenRemediationRenderUsed;
  const spokenControlTokenRemediationAvailable = job.state === "ready" && job.quality?.ownerQualityReview === "pending" && job.quality?.controlTokenRemediationRenderUsed && !job.quality?.spokenControlTokenRemediationRenderUsed;
  return <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4"><p className="text-sm font-black text-amber-100">Provider-neutral production plan</p>{manifest ? <><p className="mt-2 text-sm text-slate-300">{manifest.scenes.length} scenes · {(manifest.runtimeMs / 1000).toFixed(0)} seconds · {manifest.width}×{manifest.height} · {providerActive ? `Shotstack ${label(job.production?.providerState || "internal")}` : label(manifest.planState)}</p><p className="mt-1 break-all text-xs text-slate-500">Manifest {manifest.checksum}</p>{!providerActive ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{manifest.blockers.map((item) => <li key={item}>{item}</li>)}</ul> : null}</> : <p className="mt-2 text-sm text-slate-300">Builds deterministic scenes, timing, captions, provider slots, retry policy, and provenance requirements without contacting a provider.</p>}<div className="mt-3 flex flex-wrap gap-2"><button className="beast-button" disabled={busy || renderBusy || job.state !== "scripted"} onClick={() => void onSend("POST", { kind: "plan_production", id: job.id }, manifest ? "Production manifest rebuilt deterministically. No provider was contacted." : "Production manifest prepared. Provider authorization is still required before rendering.")}>{manifest ? "Rebuild manifest" : "Prepare production manifest"}</button>{manifest ? <button className="beast-button" disabled={busy || renderBusy || (job.state !== "scripted" && !qualityRemediationAvailable && !pronunciationValidationAvailable && !controlTokenRemediationAvailable && !spokenControlTokenRemediationAvailable)} onClick={() => void render("submit")}>{spokenControlTokenRemediationAvailable ? "Generate spoken-label correction render" : controlTokenRemediationAvailable ? "Generate clean-output validation render" : pronunciationValidationAvailable ? "Generate pronunciation-validation render" : qualityRemediationAvailable ? "Generate corrected internal render" : "Generate internal Shotstack render"}</button> : <button className="min-h-10 rounded-lg border border-white/10 px-3 text-sm font-black text-slate-500" disabled>Generate video · provider gate</button>}<button className="min-h-10 rounded-lg border border-white/15 px-3 text-sm font-black text-white disabled:opacity-50" disabled={busy || renderBusy || !manifest || job.state === "scripted"} onClick={() => void render("inspect")}>Check render status</button></div><p className="mt-2 text-xs text-slate-400">Edit and Serve APIs only. Recovery is bounded to credential/schema correction and one explicitly authorized pass for each discovered quality defect. Internal sequencing labels are removed from captions, narration, metadata, and final media. Sandbox watermarks are test-only and Sandbox assets are never publication-eligible. Maximum estimated 2.0 credits per render, no automatic retry, no YouTube destination, and no external publication.</p>{renderError ? <p role="alert" className="mt-2 text-sm font-bold text-red-200">{renderError}</p> : null}{renderStatus ? <p className="mt-2 text-sm font-bold text-green-200">{renderStatus}</p> : null}{signedUrl ? <video aria-label="Internal Shotstack render with burned-in captions" className="mt-4 max-h-[36rem] w-full rounded-xl bg-black" src={signedUrl} controls preload="metadata" /> : null}</div>;
}
