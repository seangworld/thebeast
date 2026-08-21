"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { BEAST_HUNTER_VERSION, beastHunterResultCounts, beastHunterTrackingStatuses, defaultBeastHunterCriteria, validateBeastHunterCriteria, type BeastHunterCriteria, type BeastHunterEvidenceScores, type BeastHunterRankedCandidate, type BeastHunterTrackingStatus } from "@/lib/beastHunter";

const huntTypes = ["PDF / Book", "App / Micro-SaaS", "Calculator / Tool", "Service", "Affiliate", "Beast Capability", "Social Content"];
const markets = ["AI", "Money", "Education", "Health", "Home", "Careers", "Veterans", "Small Business", "Entertainment"];
const revenueModels = ["One-time sale", "Subscription", "Advertising", "Affiliate", "Service fee", "Licensing"];
const trackingLabels: Record<BeastHunterTrackingStatus, string> = { new: "New", watch: "Watch", validate: "Validate", build: "Build", rejected: "Reject", archived: "Archived" };
type HuntHistory = { id: string; name: string | null; status: string; query: string; criteria: BeastHunterCriteria; result_limit: number; strictness: string; created_at: string; completed_at: string | null; archived_at: string | null };
type HuntComparison = { priorHuntId: string; newTitles: string[]; removedTitles: string[]; rankChanges: Array<{ title: string; from: number; to: number }> };

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function BeastHunterWorkspace() {
  const [criteria, setCriteria] = useState<BeastHunterCriteria>(defaultBeastHunterCriteria);
  const [submitted, setSubmitted] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [results, setResults] = useState<BeastHunterRankedCandidate[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [history, setHistory] = useState<HuntHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeHuntId, setActiveHuntId] = useState<string | null>(null);
  const [updatingOpportunityId, setUpdatingOpportunityId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [opportunityStatusFilter, setOpportunityStatusFilter] = useState("all");
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [comparison, setComparison] = useState<HuntComparison | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const errors = useMemo(() => validateBeastHunterCriteria(criteria), [criteria]);
  const visibleHistory = useMemo(() => history.filter((hunt) => (historyStatusFilter === "all" || hunt.status === historyStatusFilter) && `${hunt.name || ""} ${hunt.query}`.toLowerCase().includes(historySearch.toLowerCase())), [history, historySearch, historyStatusFilter]);
  const visibleResults = useMemo(() => results.filter((item) => opportunityStatusFilter === "all" || item.trackingStatus === opportunityStatusFilter), [results, opportunityStatusFilter]);
  const set = <K extends keyof BeastHunterCriteria>(key: K, value: BeastHunterCriteria[K]) => setCriteria((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!running) return;
    setElapsedSeconds(0);
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [running]);

  async function loadHistory() {
    setHistoryLoading(true); setHistoryError(null);
    try {
      const response = await fetch("/api/admin/beast-hunter", { cache: "no-store" });
      const body = await response.json() as { error?: string; hunts?: HuntHistory[] };
      if (!response.ok || !body.hunts) throw new Error(body.error || "Saved hunts could not be loaded.");
      setHistory(body.hunts);
    } catch (reason) { setHistoryError(reason instanceof Error ? reason.message : "Saved hunts could not be loaded."); }
    finally { setHistoryLoading(false); }
  }

  useEffect(() => { void loadHistory(); }, []);

  async function openSavedHunt(hunt: HuntHistory) {
    setRunError(null); setActiveHuntId(hunt.id); setCriteria(hunt.criteria); setSubmitted(true); setResults([]);
    try {
      const response = await fetch(`/api/admin/beast-hunter?huntId=${encodeURIComponent(hunt.id)}`, { cache: "no-store" });
      const body = await response.json() as { error?: string; opportunities?: BeastHunterRankedCandidate[]; comparison?: HuntComparison | null };
      if (!response.ok || !body.opportunities) throw new Error(body.error || "That saved hunt could not be opened.");
      setResults(body.opportunities); setComparison(body.comparison || null);
    } catch (reason) { setRunError(reason instanceof Error ? reason.message : "That saved hunt could not be opened."); }
  }

  async function updateTracking(opportunityId: string, trackingStatus: BeastHunterTrackingStatus) {
    const previous = results;
    setUpdatingOpportunityId(opportunityId); setRunError(null);
    setResults((current) => current.map((item) => item.id === opportunityId ? { ...item, trackingStatus } : item));
    try {
      const response = await fetch("/api/admin/beast-hunter", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ opportunityId, trackingStatus }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "The tracking status could not be saved.");
    } catch (reason) { setResults(previous); setRunError(reason instanceof Error ? reason.message : "The tracking status could not be saved."); }
    finally { setUpdatingOpportunityId(null); }
  }

  async function runOpportunityAction(opportunityId: string, action: "validate" | "build_brief" | "monitor" | "roadmap" | "set_next") {
    setUpdatingOpportunityId(opportunityId); setRunError(null); setNotice(null);
    try {
      const response = await fetch("/api/admin/beast-hunter/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ opportunityId, action }) });
      const body = await response.json() as { error?: string; warning?: string; validation?: BeastHunterRankedCandidate["validation"]; buildBrief?: BeastHunterRankedCandidate["buildBrief"]; trackingStatus?: BeastHunterTrackingStatus; trendStatus?: BeastHunterRankedCandidate["trendStatus"]; lastMonitoredAt?: string; roadmapItemId?: string; executionStatus?: BeastHunterRankedCandidate["executionStatus"]; githubIssueUrl?: string };
      if (!response.ok) throw new Error(body.error || "The BeastHunter action could not be completed.");
      setResults((current) => current.map((item) => item.id === opportunityId ? { ...item, ...(body.validation ? { validation: body.validation } : {}), ...(body.buildBrief ? { buildBrief: body.buildBrief } : {}), ...(body.trackingStatus ? { trackingStatus: body.trackingStatus } : {}), ...(body.trendStatus ? { trendStatus: body.trendStatus, lastMonitoredAt: body.lastMonitoredAt } : {}), ...(body.roadmapItemId ? { roadmapItemId: body.roadmapItemId } : {}), ...(body.executionStatus ? { executionStatus: body.executionStatus } : {}), ...(body.githubIssueUrl ? { githubIssueUrl: body.githubIssueUrl } : {}) } : item));
      setNotice(body.warning || (action === "roadmap" ? "Opportunity sent to the BeastAdmin roadmap." : action === "set_next" ? "Opportunity is now the next approved Beast build." : null));
      setExpandedId(opportunityId);
    } catch (reason) { setRunError(reason instanceof Error ? reason.message : "The BeastHunter action could not be completed."); }
    finally { setUpdatingOpportunityId(null); }
  }

  async function exportToChatGPT(opportunityId: string, mode: "copy" | "download") {
    setUpdatingOpportunityId(opportunityId); setRunError(null); setNotice(null);
    try {
      const response = await fetch("/api/admin/beast-hunter/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ opportunityId, action: "export" }) });
      const body = await response.json() as { error?: string; workRequest?: string; filename?: string; roadmapItemId?: string };
      if (!response.ok || !body.workRequest) throw new Error(body.error || "The ChatGPT work request could not be generated.");
      if (mode === "copy") { await navigator.clipboard.writeText(body.workRequest); setNotice("ChatGPT work request copied. Paste it into this Work conversation and send."); }
      else { const url = URL.createObjectURL(new Blob([body.workRequest], { type: "text/markdown" })); const link = document.createElement("a"); link.href = url; link.download = body.filename || "beast-build-request.md"; link.click(); URL.revokeObjectURL(url); setNotice("Work request downloaded. Attach it to this Work conversation and say “build it.”"); }
      setResults((current) => current.map((item) => item.id === opportunityId ? { ...item, roadmapItemId: body.roadmapItemId || item.roadmapItemId, trackingStatus: "build" } : item));
    } catch (reason) { setRunError(reason instanceof Error ? reason.message : "The ChatGPT work request could not be generated."); }
    finally { setUpdatingOpportunityId(null); }
  }

  async function manageHunt(hunt: HuntHistory, action: "rename" | "archive" | "delete") {
    if (action === "delete" && !window.confirm("Permanently delete this hunt and all of its saved opportunities and evidence?")) return;
    const name = action === "rename" ? window.prompt("Name this hunt", hunt.name || hunt.query || "") : null;
    if (action === "rename" && name === null) return;
    const response = await fetch(action === "delete" ? `/api/admin/beast-hunter?huntId=${encodeURIComponent(hunt.id)}` : "/api/admin/beast-hunter", { method: action === "delete" ? "DELETE" : "PATCH", headers: { "content-type": "application/json" }, ...(action === "delete" ? {} : { body: JSON.stringify({ huntId: hunt.id, ...(action === "rename" ? { name } : { archived: hunt.status !== "archived" }) }) }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setRunError(body.error || "The saved hunt could not be changed."); return; }
    if (action === "delete" && activeHuntId === hunt.id) { setActiveHuntId(null); setResults([]); }
    void loadHistory();
  }

  async function runHunt(selectedCriteria = criteria) {
    setSubmitted(true);
    if (validateBeastHunterCriteria(selectedCriteria).length) return;
    setRunning(true); setRunError(null); setResults([]); setComparison(null);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch("/api/admin/beast-hunter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ criteria: selectedCriteria, force: forceDuplicate }), signal: controller.signal });
      const body = await response.json() as { error?: string; opportunities?: BeastHunterRankedCandidate[]; duplicateHuntId?: string };
      if (response.status === 409) { setForceDuplicate(true); throw new Error(`${body.error} Choose “Run duplicate anyway” to intentionally repeat it.`); }
      if (!response.ok || !body.opportunities) throw new Error(body.error || "BeastHunter could not complete this hunt.");
      setResults(body.opportunities.map((item) => ({ ...item, trackingStatus: item.trackingStatus || "new" }))); setActiveHuntId(null); setForceDuplicate(false); void loadHistory();
    } catch (reason) { setRunError(reason instanceof DOMException && reason.name === "AbortError" ? "You stopped waiting for this hunt. The server will discard it if cancellation reaches it before saving." : reason instanceof Error ? reason.message : "BeastHunter could not complete this hunt."); }
    finally { abortRef.current = null; setRunning(false); }
  }

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="BeastAdmin → Intelligence" title="Start a new hunt" description="BeastHunter will not search broadly and rationalize afterward. Your criteria become the filter and scoring contract before research begins." />
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400"><span>BeastHunter v{BEAST_HUNTER_VERSION}</span><span>•</span><span>Private owner workspace</span><span>•</span><span>Current web research</span></div>
        <p className="mt-5 rounded-xl border border-sky-300/20 bg-sky-300/[0.06] p-4 text-sm leading-6 text-sky-100"><span className="font-black">Required:</span> complete at least one of the first three criteria—search objective, hunt type, or market. Every other field, including expected monthly revenue, is optional.</p>
        <fieldset disabled={running} className="mt-6 grid gap-5 disabled:cursor-wait disabled:opacity-60 lg:grid-cols-2">
          <label className="lg:col-span-2 text-sm font-bold text-slate-200">What should BeastHunter find? <span className="font-normal text-slate-400">(qualifying field)</span>
            <textarea title="Describe the opportunity BeastHunter should research. Completing this field satisfies the minimum hunt requirement." value={criteria.query} onChange={(event) => set("query", event.target.value)} rows={3} placeholder="Example: a low-cost, mostly automated product I can launch within 14 days" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/70 p-3 text-white placeholder:text-slate-500" />
          </label>
          <ChoiceGroup title="Hunt type (qualifying field)" options={huntTypes} selected={criteria.huntTypes} onToggle={(value) => set("huntTypes", toggle(criteria.huntTypes, value))} />
          <ChoiceGroup title="Market / category (qualifying field)" options={markets} selected={criteria.markets} onToggle={(value) => set("markets", toggle(criteria.markets, value))} />
          <NumberField label="Freshness window (days) · Optional" value={criteria.freshnessDays} onChange={(value) => set("freshnessDays", value ?? 30)} />
          <NumberField label="Maximum startup cost ($) · Optional" value={criteria.maximumStartupCost} onChange={(value) => set("maximumStartupCost", value)} />
          <NumberField label="Maximum build time (days) · Optional" value={criteria.maximumBuildDays} onChange={(value) => set("maximumBuildDays", value)} />
          <NumberField label="Monthly revenue target ($) · Optional" value={criteria.monthlyRevenueTarget} onChange={(value) => set("monthlyRevenueTarget", value)} />
          <SelectField label="Interaction required · Optional" value={criteria.interaction} onChange={(value) => set("interaction", value as BeastHunterCriteria["interaction"])} options={[["any", "Any"], ["none", "None"], ["low", "Low"]]} />
          <SelectField label="Automation level · Optional" value={criteria.automation} onChange={(value) => set("automation", value as BeastHunterCriteria["automation"])} options={[["any", "Any"], ["manual", "Manual"], ["assisted", "AI assisted"], ["mostly_automated", "Mostly automated"]]} />
          <ChoiceGroup title="Revenue model (optional)" options={revenueModels} selected={criteria.revenueModels} onToggle={(value) => set("revenueModels", toggle(criteria.revenueModels, value))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Filter behavior" value={criteria.strictness} onChange={(value) => set("strictness", value as BeastHunterCriteria["strictness"])} options={[["strict", "Strict"], ["flexible", "Flexible"]]} />
            <SelectField label="Results" value={String(criteria.resultCount)} onChange={(value) => set("resultCount", Number(value) as BeastHunterCriteria["resultCount"])} options={beastHunterResultCounts.map((count) => [String(count), `Top ${count}`])} />
          </div>
        </fieldset>
        {errors.length && submitted ? <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{errors.join(" ")}</div> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" title="Research current sources, apply this hunt contract, score the surviving opportunities, and save the evidence-backed results." className="beast-button" disabled={running} onClick={() => void runHunt()}>{running ? "Hunting current opportunities…" : forceDuplicate ? "Run duplicate anyway" : "Run BeastHunter"}</button>
          {running ? <button type="button" title="Stop waiting for this active browser request. BeastHunter will discard the hunt if cancellation reaches the server before results are saved." className="min-h-11 rounded-lg border border-red-300/30 px-4 text-sm font-black text-red-100" onClick={() => abortRef.current?.abort()}>Stop search</button> : null}
          <button type="button" title="Clear every hunt filter and remove the current results from this screen. Saved hunt history is not deleted." className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-black text-white" onClick={() => { setCriteria(defaultBeastHunterCriteria); setSubmitted(false); setResults([]); setRunError(null); }}>Reset</button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">Research usage: Top 10 is the lightest run; Top 25 is standard; Top 50–100 uses substantially more model and web-research capacity. Identical hunts are blocked for 24 hours unless you explicitly override the warning.</p>
        {runError ? <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{runError}</div> : null}
        {notice ? <div role="status" className="mt-5 rounded-xl border border-green-300/25 bg-green-300/10 p-4 text-sm text-green-100">{notice}</div> : null}
      </DashboardCard>
      {running ? <DashboardCard accent="admin"><div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="relative h-14 w-14 shrink-0" aria-hidden="true"><span className="absolute inset-0 animate-ping rounded-full bg-amber-300/20" /><span className="absolute inset-1 animate-spin rounded-full border-4 border-amber-300/20 border-t-amber-300" /></div><div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Search in progress</p><h2 className="mt-1 text-xl font-black text-white">BeastHunter is actively researching current sources</h2><p className="mt-2 text-sm leading-6 text-slate-300">Searching, validating citations, filtering candidates, and calculating rankings. Keep this page open. Elapsed time: <span className="font-black text-white">{elapsedSeconds}s</span>.</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/3 animate-pulse rounded-full bg-amber-300" /></div></div></div></DashboardCard> : null}
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="Saved research" title="Hunt history" description="Open any previous hunt to review its evidence and continue tracking its opportunities." />
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_12rem]"><input aria-label="Search saved hunts" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search saved hunts" className="min-h-11 rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white" /><SelectField label="Hunt status" value={historyStatusFilter} onChange={setHistoryStatusFilter} options={[["all", "All"], ["completed", "Completed"], ["failed", "Failed"], ["cancelled", "Cancelled"], ["archived", "Archived"]]} /></div>
        {historyLoading ? <p role="status" className="mt-5 text-sm text-slate-300">Loading saved hunts…</p> : historyError ? <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{historyError}</div> : visibleHistory.length ? <div className="mt-5 grid gap-3">{visibleHistory.map((hunt) => <div key={hunt.id} className={`rounded-xl border p-4 ${activeHuntId === hunt.id ? "border-amber-300/50 bg-amber-300/10" : "border-white/10 bg-white/[0.03]"}`}><button type="button" title="Open this saved hunt and reload its ranked opportunities, evidence, and tracking states." onClick={() => void openSavedHunt(hunt)} className="w-full text-left"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-black text-white">{hunt.name || hunt.query || `${hunt.criteria.huntTypes?.join(", ") || hunt.criteria.markets?.join(", ") || "Saved hunt"}`}</span><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{new Date(hunt.created_at).toLocaleString()}</span></div><p className="mt-2 text-xs text-slate-300">{hunt.status} · Top {hunt.result_limit} · {hunt.strictness} filters</p></button><div className="mt-3 flex flex-wrap gap-2">{hunt.status === "failed" || hunt.status === "cancelled" ? <MiniButton label="Retry" description="Run this saved hunt contract again." onClick={() => { setCriteria(hunt.criteria); void runHunt(hunt.criteria); }} /> : null}<MiniButton label="Rename" description="Give this hunt a clearer saved name." onClick={() => void manageHunt(hunt, "rename")} /><MiniButton label={hunt.status === "archived" ? "Restore" : "Archive"} description="Hide or restore this hunt without deleting its evidence." onClick={() => void manageHunt(hunt, "archive")} /><MiniButton label="Delete" description="Permanently delete this hunt after confirmation." onClick={() => void manageHunt(hunt, "delete")} /></div></div>)}</div> : <p className="mt-5 text-sm text-slate-300">No saved hunts match this view.</p>}
      </DashboardCard>
      {submitted && !errors.length ? (
        <DashboardCard accent="admin">
          <SectionHeader eyebrow="Hunt contract" title={running ? "Researching current evidence" : results.length ? `${results.length} ranked opportunities` : "Ready to hunt"} description={`The configured hunt returns up to ${criteria.resultCount} opportunities using ${criteria.strictness} filters. Uncited candidates are rejected before display or storage.`} />
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><Summary label="Freshness" value={`${criteria.freshnessDays} days`} /><Summary label="Build ceiling" value={criteria.maximumBuildDays === null ? "Any" : `${criteria.maximumBuildDays} days`} /><Summary label="Startup ceiling" value={criteria.maximumStartupCost === null ? "Any" : `$${criteria.maximumStartupCost.toLocaleString()}`} /></dl>
        </DashboardCard>
      ) : null}
      {comparison ? <DashboardCard accent="admin"><SectionHeader eyebrow="Hunt comparison" title="Changes since the previous identical hunt" description="BeastHunter compares exact opportunity titles and rankings; it does not claim a market change when the evidence is ambiguous." /><dl className="mt-5 grid gap-3 sm:grid-cols-3"><Summary label="New entries" value={String(comparison.newTitles.length)} /><Summary label="Dropped entries" value={String(comparison.removedTitles.length)} /><Summary label="Rank changes" value={String(comparison.rankChanges.length)} /></dl>{comparison.rankChanges.length ? <ul className="mt-4 space-y-1 text-sm text-slate-300">{comparison.rankChanges.slice(0, 10).map((change) => <li key={change.title}>{change.title}: #{change.from} → #{change.to}</li>)}</ul> : null}</DashboardCard> : null}
      {results.length ? <section className="space-y-4" aria-label="Ranked BeastHunter opportunities"><div className="flex justify-end"><div className="w-full sm:w-56"><SelectField label="Opportunity status" value={opportunityStatusFilter} onChange={setOpportunityStatusFilter} options={[["all", "All"], ...beastHunterTrackingStatuses.map((status) => [status, trackingLabels[status]] as const)]} /></div></div>{visibleResults.map((result) => <OpportunityCard key={result.id} result={result} expanded={expandedId === result.id} busy={updatingOpportunityId === result.id} onExpand={() => setExpandedId((current) => current === result.id ? null : result.id)} onTrack={(status) => void updateTracking(result.id, status)} onAction={(action) => void runOpportunityAction(result.id, action)} onExport={(mode) => void exportToChatGPT(result.id, mode)} />)}</section> : null}
    </div>
  );
}

function ChoiceGroup({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <fieldset><legend className="text-sm font-bold text-slate-200">{title}</legend><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" title={`${selected.includes(option) ? "Remove" : "Add"} ${option} ${title.toLowerCase()} filter.`} aria-pressed={selected.includes(option)} onClick={() => onToggle(option)} className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${selected.includes(option) ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-white/15 text-slate-300"}`}>{option}</button>)}</div></fieldset>; }
function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) { return <label className="text-sm font-bold text-slate-200">{label}<input type="number" min="0" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white" /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-200">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><dt className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-2 font-black text-white">{value}</dd></div>; }
function MiniButton({ label, description, onClick }: { label: string; description: string; onClick: () => void }) { return <button type="button" title={description} onClick={onClick} className="min-h-9 rounded-lg border border-white/15 px-3 text-xs font-black text-slate-200">{label}</button>; }

const scoreLabels: Record<keyof BeastHunterEvidenceScores, string> = { demand: "Demand", velocity: "Velocity", competitionGap: "Competition gap", commercialIntent: "Commercial intent", saturation: "Saturation risk", aiCommoditizationRisk: "AI risk", seangworldFit: "SEANGWORLD fit", timeToMarket: "Time to market", revenuePotential: "Revenue potential", durability: "Durability", confidence: "Confidence", actionWindow: "Action window" };

type OpportunityCardProps = { result: BeastHunterRankedCandidate; expanded: boolean; busy: boolean; onExpand: () => void; onTrack: (status: BeastHunterTrackingStatus) => void; onAction: (action: "validate" | "build_brief" | "monitor" | "roadmap" | "set_next") => void; onExport: (mode: "copy" | "download") => void };

function OpportunityCard(props: OpportunityCardProps) {
  const { result, busy, onAction, onExport } = props;
  return <div className="space-y-3"><OpportunityCore {...props} /><DashboardCard accent="admin"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-amber-200">Execution handoff</p><p className="mt-1 text-sm text-slate-300">{result.roadmapItemId ? `Roadmap package ${result.roadmapItemId}` : "Create a durable BeastAdmin roadmap package, export it to ChatGPT, or approve it as the next build."}</p></div>{result.githubIssueUrl ? <a href={result.githubIssueUrl} target="_blank" rel="noreferrer" className="text-sm font-black text-green-200 underline">Open build ticket</a> : null}</div><div className="mt-4 flex flex-wrap gap-2"><MiniButton label={result.roadmapItemId ? "In BeastAdmin roadmap" : "Send to roadmap"} description="Create a durable BeastAdmin roadmap package containing this opportunity, validation, evidence, and build brief." onClick={() => onAction("roadmap")} /><button type="button" title="Mark this roadmap package as the next approved build and create its GitHub execution ticket." disabled={busy} onClick={() => onAction("set_next")} className="beast-button">Set as Next Build</button><MiniButton label="Copy for ChatGPT" description="Generate the complete build request and copy it for pasting into ChatGPT Work." onClick={() => onExport("copy")} /><MiniButton label="Download Work Request" description="Download the complete build request as a Markdown file that can be attached to ChatGPT Work." onClick={() => onExport("download")} /></div></DashboardCard></div>;
}

function OpportunityCore({ result, expanded, busy, onExpand, onTrack, onAction }: OpportunityCardProps) {
  return <DashboardCard accent="admin"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">#{result.rank} · {result.huntType} · {result.market}</p><h2 className="mt-2 text-xl font-black text-white">{result.title}</h2><p className="mt-2 text-xs font-bold uppercase tracking-wider text-sky-200">{trackingLabels[result.trackingStatus || "new"]} · Trend: {result.trendStatus || "unknown"}</p></div><div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-lg font-black text-amber-100">{result.score}/100</div></div><p className="mt-4 text-sm leading-6 text-slate-200">{result.summary}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300"><span>Build: {result.buildDays ?? "Unknown"} days</span><span>•</span><span>Cost: {result.startupCost === null ? "Unknown" : `$${result.startupCost.toLocaleString()}`}</span><span>•</span><span>Window: {result.actionWindowDays ?? "Unknown"} days</span></div>{result.filterNotes.length ? <p className="mt-3 text-xs text-amber-200">Flexible-filter notes: {result.filterNotes.join("; ")}</p> : null}<div className="mt-4 flex flex-wrap gap-3">{result.evidence.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-300 underline">{source.label}</a>)}</div><div className="mt-5 flex flex-wrap gap-2"><MiniButton label={expanded ? "Hide details" : "View details"} description="Show the full evidence score, validation, risks, and build plan." onClick={onExpand} /><button type="button" title="Run a deeper current-evidence validation and return Go, Caution, or No-Go." disabled={busy} onClick={() => onAction("validate")} className="beast-button">{busy ? "Working…" : "Validate opportunity"}</button><MiniButton label="Check trend" description="Research this opportunity again and classify it as rising, stable, falling, saturated, or expired." onClick={() => onAction("monitor")} /><MiniButton label="Create build brief" description="Convert this opportunity and its validation into a structured implementation brief without starting development." onClick={() => onAction("build_brief")} /></div><div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Opportunity status</p><div className="mt-3 flex flex-wrap gap-2">{beastHunterTrackingStatuses.map((status) => <button key={status} type="button" title={`Mark this opportunity as ${trackingLabels[status]}.`} disabled={busy} aria-pressed={(result.trackingStatus || "new") === status} onClick={() => onTrack(status)} className={`min-h-10 rounded-full border px-3 text-sm font-bold ${(result.trackingStatus || "new") === status ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-white/15 text-slate-300"}`}>{trackingLabels[status]}</button>)}</div></div>{expanded ? <div className="mt-5 space-y-5 border-t border-white/10 pt-5"><div><h3 className="font-black text-white">Evidence score breakdown</h3><dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(result.scores).map(([key, value]) => <Summary key={key} label={scoreLabels[key as keyof BeastHunterEvidenceScores]} value={`${value}/100`} />)}</dl></div>{result.validation ? <div className="rounded-xl border border-sky-300/20 bg-sky-300/[0.05] p-4"><h3 className="font-black text-white">Validation: {result.validation.verdict.replace("_", "-").toUpperCase()}</h3><p className="mt-3 text-sm text-slate-200">{result.validation.demandEvidence}</p><p className="mt-2 text-sm text-slate-300">Competitors: {result.validation.competitorAnalysis}</p><p className="mt-2 text-sm text-slate-300">Revenue: {result.validation.realisticMonthlyRevenue}</p><p className="mt-2 text-sm text-slate-300">Marketing: {result.validation.marketingDifficulty}</p><List title="Reasons to proceed" values={result.validation.reasonsToProceed} /><List title="Reasons to reject" values={result.validation.reasonsToReject} /><List title="Next steps" values={result.validation.nextSteps} /><div className="mt-4 flex flex-wrap gap-3">{result.validation.sourceUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-300 underline">Validation source</a>)}</div></div> : <p className="text-sm text-slate-400">No deep validation has been run yet.</p>}{result.buildBrief ? <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4"><h3 className="font-black text-white">Build brief</h3><p className="mt-3 text-sm text-slate-200">{result.buildBrief.objective}</p><p className="mt-2 text-sm text-slate-300">Audience: {result.buildBrief.audience}</p><List title="Minimum viable scope" values={result.buildBrief.minimumViableScope} /><List title="Milestones" values={result.buildBrief.milestones} /><List title="Success measures" values={result.buildBrief.successMeasures} /><List title="Risks" values={result.buildBrief.risks} /></div> : null}</div> : null}</DashboardCard>;
}

function List({ title, values }: { title: string; values: string[] }) { return values.length ? <div className="mt-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{values.map((value) => <li key={value}>{value}</li>)}</ul></div> : null; }
