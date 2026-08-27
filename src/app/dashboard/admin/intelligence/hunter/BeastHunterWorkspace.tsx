"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { BEAST_HUNTER_VERSION, beastHunterBuiltInPresets, beastHunterHuntTypes, beastHunterMarkets, beastHunterRejectionReasons, beastHunterResultCounts, beastHunterTrackingStatuses, defaultBeastHunterCriteria, validateBeastHunterCriteria, type BeastHunterCriteria, type BeastHunterEvidenceScores, type BeastHunterRankedCandidate, type BeastHunterRejectionReason, type BeastHunterTrackingStatus } from "@/lib/beastHunter";

const revenueModels = ["One-time sale", "Subscription", "Advertising", "Affiliate", "Lead generation", "Freemium", "Paid upgrade", "Service fee", "Licensing"];
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

  function applyBuiltInPreset(preset: (typeof beastHunterBuiltInPresets)[number]) {
    setCriteria({ ...preset.criteria, huntTypes: [...preset.criteria.huntTypes], markets: [...preset.criteria.markets], revenueModels: [...preset.criteria.revenueModels] });
    setActiveHuntId(null); setSubmitted(false); setResults([]); setComparison(null); setRunError(null);
    setNotice(`${preset.name} loaded. Every field remains editable before you search or save it.`);
  }

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

  async function updateTracking(opportunityId: string, trackingStatus: BeastHunterTrackingStatus, rejectionReason?: BeastHunterRejectionReason) {
    const previous = results;
    setUpdatingOpportunityId(opportunityId); setRunError(null);
    setResults((current) => current.map((item) => item.id === opportunityId ? { ...item, trackingStatus, rejectionReason: trackingStatus === "rejected" ? rejectionReason : null } : item));
    try {
      const response = await fetch("/api/admin/beast-hunter", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ opportunityId, trackingStatus, rejectionReason }) });
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
      setNotice(body.warning || (action === "roadmap" ? "Opportunity saved as BeastAdmin intake for BeastFusion review." : action === "set_next" ? "Opportunity marked as candidate intake; BeastFusion approval is still required." : null));
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

  async function savePreset(updateCurrent: boolean) {
    const active = history.find((hunt) => hunt.id === activeHuntId && hunt.status === "draft");
    const name = window.prompt(updateCurrent && active ? "Update preset name" : "Name this search preset", active?.name || criteria.query || "");
    if (name === null) return;
    setRunError(null); setNotice(null);
    const response = await fetch("/api/admin/beast-hunter", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(updateCurrent && active ? { presetId: active.id } : {}), name, criteria }) });
    const body = await response.json() as { error?: string; preset?: { id: string } };
    if (!response.ok || !body.preset) { setRunError(body.error || "The search preset could not be saved."); return; }
    setActiveHuntId(body.preset.id); setNotice(updateCurrent && active ? "Search preset updated." : "Search preset saved. You can reopen, edit, and run it at any time."); void loadHistory();
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
        <div className="mt-5">
          <p className="text-xs font-black uppercase tracking-wider text-amber-200">Start with an editable preset</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{beastHunterBuiltInPresets.map((preset) => <button key={preset.id} type="button" onClick={() => applyBuiltInPreset(preset)} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-amber-300/40"><span className="block font-black text-white">{preset.name}</span><span className="mt-2 block text-xs leading-5 text-slate-300">{preset.description}</span></button>)}</div>
          <p className="mt-2 text-xs text-slate-400">Selecting a preset fills the form; it does not run or save anything. Change any field before searching.</p>
        </div>
        <p className="mt-5 rounded-xl border border-sky-300/20 bg-sky-300/[0.06] p-4 text-sm leading-6 text-sky-100"><span className="font-black">Required:</span> complete at least one of the first three criteria—search objective, hunt type, or market. Every other field, including expected monthly revenue, is optional.</p>
        <fieldset disabled={running} className="mt-6 grid gap-5 disabled:cursor-wait disabled:opacity-60 lg:grid-cols-2">
          <label className="lg:col-span-2 text-sm font-bold text-slate-200">What should BeastHunter find? <span className="font-normal text-slate-400">(qualifying field)</span>
            <textarea title="Describe the opportunity BeastHunter should research. Completing this field satisfies the minimum hunt requirement." value={criteria.query} onChange={(event) => set("query", event.target.value)} rows={3} placeholder="Example: a low-cost, mostly automated product I can launch within 14 days" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/70 p-3 text-white placeholder:text-slate-500" />
          </label>
          <ChoiceGroup title="What should we build?" description="Limits results to the selected product formats. Leave empty when the format is undecided." options={[...beastHunterHuntTypes]} selected={criteria.huntTypes} onToggle={(value) => set("huntTypes", toggle(criteria.huntTypes, value))} />
          <ChoiceGroup title="Who or what is it for?" description="Select familiar markets to narrow the search. General Consumer favors broadly understandable needs." options={[...beastHunterMarkets]} selected={criteria.markets} onToggle={(value) => set("markets", toggle(criteria.markets, value))} />
          <NumberField label="Evidence freshness (days)" description="Hunter looks for demand evidence observed within this many days." value={criteria.freshnessDays} onChange={(value) => set("freshnessDays", value ?? 30)} />
          <NumberField label="Maximum startup cost ($)" description="Penalizes or excludes ideas expected to cost more before launch." value={criteria.maximumStartupCost} onChange={(value) => set("maximumStartupCost", value)} />
          <NumberField label="Maximum build time (days)" description="Penalizes or excludes products estimated to take longer to build." value={criteria.maximumBuildDays} onChange={(value) => set("maximumBuildDays", value)} />
          <NumberField label="Monthly revenue target ($)" description="Checks whether the upper conservative revenue estimate could reach this target; it is not a guarantee." value={criteria.monthlyRevenueTarget} onChange={(value) => set("monthlyRevenueTarget", value)} />
          <SelectField label="Target buyer" description="General Consumer avoids professional-only workflows by default." value={criteria.audience} onChange={(value) => set("audience", value as BeastHunterCriteria["audience"])} options={[["general_consumer", "General consumer"], ["small_business", "Small business"], ["any", "Any"]]} />
          <SelectField label="Specialized professional domains" description="Penalize is the normal discovery mode. Allow keeps professional niches available when you intentionally want them." value={criteria.specializedDomains} onChange={(value) => set("specializedDomains", value as BeastHunterCriteria["specializedDomains"])} options={[["penalize", "Penalize unless explicitly requested"], ["allow", "Allow specialized opportunities"]]} />
          <NumberField label="Minimum owner fit (0–100)" description="How easily you can understand the product, customer, and business without specialized credentials." value={criteria.minimumOwnerFit} onChange={(value) => set("minimumOwnerFit", value ?? 65)} />
          <NumberField label="Minimum verifiability (0–100)" description="How realistically you can check that the finished product is correct using independent sources or deterministic tests." value={criteria.minimumVerifiability} onChange={(value) => set("minimumVerifiability", value ?? 65)} />
          <NumberField label="Maximum liability risk (0–100)" description="Lower values avoid products where incorrect output could cause professional, legal, medical, tax, or regulatory harm." value={criteria.maximumLiabilityRisk} onChange={(value) => set("maximumLiabilityRisk", value ?? 45)} />
          <SelectField label="Owner/customer interaction" description="Choose None or Low when the product should operate with minimal calls or in-person work." value={criteria.interaction} onChange={(value) => set("interaction", value as BeastHunterCriteria["interaction"])} options={[["any", "Any"], ["none", "None"], ["low", "Low"]]} />
          <SelectField label="AI automation level" description="Controls how much ongoing delivery or production AI should be able to perform." value={criteria.automation} onChange={(value) => set("automation", value as BeastHunterCriteria["automation"])} options={[["any", "Any"], ["manual", "Manual"], ["assisted", "AI assisted"], ["mostly_automated", "Mostly automated"]]} />
          <ChoiceGroup title="How should it make money?" description="Requires at least one matching monetization path when selected." options={revenueModels} selected={criteria.revenueModels} onToggle={(value) => set("revenueModels", toggle(criteria.revenueModels, value))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Filter behavior" description="Strict excludes every mismatch. Flexible can show near-matches with visible warnings, but still rejects severe default-fit failures." value={criteria.strictness} onChange={(value) => set("strictness", value as BeastHunterCriteria["strictness"])} options={[["strict", "Strict"], ["flexible", "Flexible"]]} />
            <SelectField label="Maximum results" description="This is a ceiling, not a quota. Hunter may return fewer when only a few opportunities are strong." value={String(criteria.resultCount)} onChange={(value) => set("resultCount", Number(value) as BeastHunterCriteria["resultCount"])} options={beastHunterResultCounts.map((count) => [String(count), `Up to ${count}`])} />
          </div>
        </fieldset>
        {errors.length && submitted ? <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{errors.join(" ")}</div> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" title="Research current sources, apply this hunt contract, score the surviving opportunities, and save the evidence-backed results." className="beast-button" disabled={running} onClick={() => void runHunt()}>{running ? "Hunting current opportunities…" : forceDuplicate ? "Run duplicate anyway" : "Run BeastHunter"}</button>
          {running ? <button type="button" title="Stop waiting for this active browser request. BeastHunter will discard the hunt if cancellation reaches the server before results are saved." className="min-h-11 rounded-lg border border-red-300/30 px-4 text-sm font-black text-red-100" onClick={() => abortRef.current?.abort()}>Stop search</button> : null}
          <button type="button" title="Clear every hunt filter and remove the current results from this screen. Saved hunt history is not deleted." className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-black text-white" onClick={() => { setCriteria(defaultBeastHunterCriteria); setSubmitted(false); setResults([]); setRunError(null); }}>Reset</button>
          <button type="button" title="Save the current hunt criteria as a named reusable preset without running the search." className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-black text-white" disabled={running || errors.length > 0} onClick={() => void savePreset(false)}>Save as preset</button>
          {history.some((hunt) => hunt.id === activeHuntId && hunt.status === "draft") ? <button type="button" title="Save your current edits back into this selected preset." className="min-h-11 rounded-lg border border-amber-300/30 px-4 text-sm font-black text-amber-100" disabled={running || errors.length > 0} onClick={() => void savePreset(true)}>Update preset</button> : null}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">Research usage: Top 10 is the lightest run; Top 25 is standard; Top 50–100 uses substantially more model and web-research capacity. Identical hunts are blocked for 24 hours unless you explicitly override the warning.</p>
        {runError ? <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{runError}</div> : null}
        {notice ? <div role="status" className="mt-5 rounded-xl border border-green-300/25 bg-green-300/10 p-4 text-sm text-green-100">{notice}</div> : null}
      </DashboardCard>
      {running ? <DashboardCard accent="admin"><div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="relative h-14 w-14 shrink-0" aria-hidden="true"><span className="absolute inset-0 animate-ping rounded-full bg-amber-300/20" /><span className="absolute inset-1 animate-spin rounded-full border-4 border-amber-300/20 border-t-amber-300" /></div><div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Search in progress</p><h2 className="mt-1 text-xl font-black text-white">BeastHunter is actively researching current sources</h2><p className="mt-2 text-sm leading-6 text-slate-300">Searching, validating citations, filtering candidates, and calculating rankings. Keep this page open. Elapsed time: <span className="font-black text-white">{elapsedSeconds}s</span>.</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/3 animate-pulse rounded-full bg-amber-300" /></div></div></div></DashboardCard> : null}
      {submitted && !errors.length ? (
        <DashboardCard accent="admin">
          <SectionHeader eyebrow="Hunt contract" title={running ? "Researching current evidence" : results.length ? `${results.length} ranked opportunities` : "Ready to hunt"} description={`The configured hunt returns up to ${criteria.resultCount} opportunities using ${criteria.strictness} filters. Uncited candidates are rejected before display or storage.`} />
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><Summary label="Freshness" value={`${criteria.freshnessDays} days`} /><Summary label="Build ceiling" value={criteria.maximumBuildDays === null ? "Any" : `${criteria.maximumBuildDays} days`} /><Summary label="Startup ceiling" value={criteria.maximumStartupCost === null ? "Any" : `$${criteria.maximumStartupCost.toLocaleString()}`} /></dl>
        </DashboardCard>
      ) : null}
      {comparison ? <DashboardCard accent="admin"><SectionHeader eyebrow="Hunt comparison" title="Changes since the previous identical hunt" description="BeastHunter compares exact opportunity titles and rankings; it does not claim a market change when the evidence is ambiguous." /><dl className="mt-5 grid gap-3 sm:grid-cols-3"><Summary label="New entries" value={String(comparison.newTitles.length)} /><Summary label="Dropped entries" value={String(comparison.removedTitles.length)} /><Summary label="Rank changes" value={String(comparison.rankChanges.length)} /></dl>{comparison.rankChanges.length ? <ul className="mt-4 space-y-1 text-sm text-slate-300">{comparison.rankChanges.slice(0, 10).map((change) => <li key={change.title}>{change.title}: #{change.from} → #{change.to}</li>)}</ul> : null}</DashboardCard> : null}
      {results.length ? <section className="space-y-4" aria-label="Active BeastHunter results"><SectionHeader eyebrow="Current hunt" title="Active results" description="Review and act on the current hunt before returning to saved research." /><div className="flex justify-end"><div className="w-full sm:w-56"><SelectField label="Opportunity status" value={opportunityStatusFilter} onChange={setOpportunityStatusFilter} options={[["all", "All"], ...beastHunterTrackingStatuses.map((status) => [status, trackingLabels[status]] as const)]} /></div></div>{visibleResults.map((result) => <OpportunityCard key={result.id} result={result} expanded={expandedId === result.id} busy={updatingOpportunityId === result.id} onExpand={() => setExpandedId((current) => current === result.id ? null : result.id)} onTrack={(status, reason) => void updateTracking(result.id, status, reason)} onAction={(action) => void runOpportunityAction(result.id, action)} onExport={(mode) => void exportToChatGPT(result.id, mode)} />)}</section> : null}
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="Saved research" title="Hunt history" description="Open any previous hunt to review its evidence and continue tracking its opportunities." />
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_12rem]"><input aria-label="Search saved hunts" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search saved hunts and presets" className="min-h-11 rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white" /><SelectField label="Hunt status" value={historyStatusFilter} onChange={setHistoryStatusFilter} options={[["all", "All"], ["draft", "Presets"], ["completed", "Completed"], ["failed", "Failed"], ["cancelled", "Cancelled"], ["archived", "Archived"]]} /></div>
        {historyLoading ? <p role="status" className="mt-5 text-sm text-slate-300">Loading saved hunts…</p> : historyError ? <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{historyError}</div> : visibleHistory.length ? <div className="mt-5 grid gap-3">{visibleHistory.map((hunt) => <div key={hunt.id} className={`rounded-xl border p-4 ${activeHuntId === hunt.id ? "border-amber-300/50 bg-amber-300/10" : "border-white/10 bg-white/[0.03]"}`}><button type="button" title="Open this saved hunt and reload its ranked opportunities, evidence, and tracking states." onClick={() => void openSavedHunt(hunt)} className="w-full text-left"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-black text-white">{hunt.name || hunt.query || `${hunt.criteria.huntTypes?.join(", ") || hunt.criteria.markets?.join(", ") || "Saved hunt"}`}</span><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{new Date(hunt.created_at).toLocaleString()}</span></div><p className="mt-2 text-xs text-slate-300">{hunt.status} · Top {hunt.result_limit} · {hunt.strictness} filters</p></button><div className="mt-3 flex flex-wrap gap-2">{hunt.status === "failed" || hunt.status === "cancelled" ? <MiniButton label="Retry" description="Run this saved hunt contract again." onClick={() => { setCriteria(hunt.criteria); void runHunt(hunt.criteria); }} /> : null}<MiniButton label="Rename" description="Give this hunt a clearer saved name." onClick={() => void manageHunt(hunt, "rename")} /><MiniButton label={hunt.status === "archived" ? "Restore" : "Archive"} description="Hide or restore this hunt without deleting its evidence." onClick={() => void manageHunt(hunt, "archive")} /><MiniButton label="Delete" description="Permanently delete this hunt after confirmation." onClick={() => void manageHunt(hunt, "delete")} /></div></div>)}</div> : <p className="mt-5 text-sm text-slate-300">No saved hunts match this view.</p>}
      </DashboardCard>
    </div>
  );
}

function ChoiceGroup({ title, description, options, selected, onToggle }: { title: string; description?: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <fieldset><legend className="text-sm font-bold text-slate-200">{title}</legend>{description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}<div className="mt-2 flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" title={`${selected.includes(option) ? "Remove" : "Add"} ${option} ${title.toLowerCase()} filter.`} aria-pressed={selected.includes(option)} onClick={() => onToggle(option)} className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${selected.includes(option) ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-white/15 text-slate-300"}`}>{option}</button>)}</div></fieldset>; }
function NumberField({ label, description, value, onChange }: { label: string; description?: string; value: number | null; onChange: (value: number | null) => void }) { return <label className="text-sm font-bold text-slate-200">{label}{description ? <span className="mt-1 block text-xs font-normal leading-5 text-slate-400">{description}</span> : null}<input type="number" min="0" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white" /></label>; }
function SelectField({ label, description, value, options, onChange }: { label: string; description?: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-200">{label}{description ? <span className="mt-1 block text-xs font-normal leading-5 text-slate-400">{description}</span> : null}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><dt className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-2 font-black text-white">{value}</dd></div>; }
function MiniButton({ label, description, onClick }: { label: string; description: string; onClick: () => void }) { return <button type="button" title={description} onClick={onClick} className="min-h-9 rounded-lg border border-white/15 px-3 text-xs font-black text-slate-200">{label}</button>; }

const scoreLabels: Record<keyof BeastHunterEvidenceScores, string> = { demand: "Demand", velocity: "Velocity", competitionGap: "Competition gap", commercialIntent: "Commercial intent", saturation: "Saturation risk", aiCommoditizationRisk: "AI risk", seangworldFit: "SEANGWORLD fit", brandFit: "Brand fit", timeToMarket: "Time to market", revenuePotential: "Revenue potential", durability: "Durability", confidence: "Confidence", actionWindow: "Action window", ownerFit: "Owner fit", verifiability: "Verifiability", aiBuildability: "AI buildability", liabilityRisk: "Liability risk" };

type OpportunityCardProps = { result: BeastHunterRankedCandidate; expanded: boolean; busy: boolean; onExpand: () => void; onTrack: (status: BeastHunterTrackingStatus, reason?: BeastHunterRejectionReason) => void; onAction: (action: "validate" | "build_brief" | "monitor" | "roadmap" | "set_next") => void; onExport: (mode: "copy" | "download") => void };

function OpportunityCard(props: OpportunityCardProps) {
  const { result, busy, onAction, onExport } = props;
  return <div className="space-y-3">
    <OpportunityCore {...props} />
    {result.validation?.economics ? <DashboardCard accent="admin"><SectionHeader eyebrow="Opportunity economics" title="Income model" description="Evidence-backed ranges are planning estimates, not guaranteed earnings." /><dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Summary label="Price per sale/customer" value={result.validation.economics.offerPrice} /><Summary label="Revenue model" value={result.validation.economics.revenueModel} /><Summary label="Monthly sales needed" value={result.validation.economics.monthlySalesNeeded} /><Summary label="Monthly gross revenue" value={result.validation.economics.grossRevenueRange} /><Summary label="Monthly operating cost" value={result.validation.economics.monthlyOperatingCost} /><Summary label="Gross margin" value={result.validation.economics.grossMargin} /><Summary label="Break-even" value={result.validation.economics.breakEvenPoint} /><Summary label="Time to first revenue" value={result.validation.economics.timeToFirstRevenue} /><Summary label="Income confidence" value={result.validation.economics.incomeConfidence} /></dl></DashboardCard> : null}
    <DashboardCard accent="admin"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-amber-200">Governance intake</p><p className="mt-1 text-sm text-slate-300">{result.roadmapItemId ? `Intake record ${result.roadmapItemId}` : "Create a durable BeastAdmin intake record or export it for canonical BeastFusion review."}</p></div>{result.githubIssueUrl ? <a href={result.githubIssueUrl} target="_blank" rel="noreferrer" className="text-sm font-black text-green-200 underline">Open historical build ticket</a> : null}</div><div className="mt-4 flex flex-wrap gap-2"><MiniButton label={result.roadmapItemId ? "Saved as intake" : "Send to intake"} description="Create a BeastAdmin intake record containing this opportunity, validation, evidence, and build brief. It is not canonical or executable until approved in BeastFusion." onClick={() => onAction("roadmap")} /><button type="button" title="Mark this record as candidate intake for BeastFusion review. This does not approve execution or create a GitHub ticket." disabled={busy} onClick={() => onAction("set_next")} className="beast-button">Mark Candidate Intake</button><MiniButton label="Copy for ChatGPT" description="Generate the complete build request and copy it for pasting into ChatGPT Work." onClick={() => onExport("copy")} /><MiniButton label="Download Work Request" description="Download the complete build request as a Markdown file that can be attached to ChatGPT Work." onClick={() => onExport("download")} /></div></DashboardCard>
  </div>;
}

function OpportunityCore({ result, expanded, busy, onExpand, onTrack, onAction }: OpportunityCardProps) {
  const [rejectionReason, setRejectionReason] = useState<BeastHunterRejectionReason>(result.rejectionReason || "not_relevant_to_brand");
  const recommendationStyle = result.recommendation === "BUILD" ? "border-green-300/30 bg-green-300/10 text-green-100" : result.recommendation === "REJECT" ? "border-red-300/30 bg-red-300/10 text-red-100" : "border-amber-300/30 bg-amber-300/10 text-amber-100";
  const revenue = result.expectedMonthlyRevenueLow === null && result.expectedMonthlyRevenueHigh === null ? "Not enough evidence" : `$${(result.expectedMonthlyRevenueLow ?? 0).toLocaleString()}–$${(result.expectedMonthlyRevenueHigh ?? 0).toLocaleString()}/month`;
  return <DashboardCard accent="admin"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">#{result.rank} · {result.huntType} · {result.market}</p><h2 className="mt-2 text-xl font-black text-white">{result.title}</h2><p className="mt-2 text-xs font-bold uppercase tracking-wider text-sky-200">{trackingLabels[result.trackingStatus || "new"]} · Trend: {result.trendStatus || "unknown"}</p></div><div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-lg font-black text-amber-100">{result.score}/100</div></div>{result.brandFit ? <div className={`mt-4 rounded-xl border p-4 ${result.brandFit.classification === "outside_brand_exceptional" ? "border-violet-300/30 bg-violet-300/10" : result.brandFit.classification === "outside_brand" ? "border-slate-300/20 bg-white/[0.03]" : "border-sky-300/20 bg-sky-300/[0.05]"}`}><p className="text-xs font-black uppercase tracking-wider text-sky-100">{result.brandFit.classification === "outside_brand_exceptional" ? "Outside Brand — Exceptional Opportunity" : result.brandFit.classification === "outside_brand" ? "Outside current brand" : "Strong ecosystem fit"} · Brand Fit {result.scores.brandFit ?? result.scores.seangworldFit}/100</p><p className="mt-2 text-sm leading-6 text-slate-200">{result.brandFit.rationale}</p>{result.brandFit.ecosystemMatches.length ? <p className="mt-2 text-xs text-slate-300">Fits: {result.brandFit.ecosystemMatches.join(" · ")}</p> : null}</div> : null}{result.feedbackAdjustment ? <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-xs text-amber-100">Owner feedback adjustment: {result.feedbackAdjustment.points} points. {result.feedbackAdjustment.reason}</p> : null}<div className={`mt-4 rounded-xl border p-4 ${recommendationStyle}`}><p className="text-xs font-black uppercase tracking-wider">Recommendation: {result.recommendation}</p><p className="mt-2 text-sm leading-6">{result.recommendationReason}</p></div><p className="mt-4 text-sm leading-6 text-slate-200">{result.explanation.whatItIs}</p><dl className="mt-4 grid gap-3 sm:grid-cols-2"><Summary label="Who buys or uses it?" value={result.explanation.customer} /><Summary label="What would we build?" value={result.explanation.whatToBuild} /><Summary label="Why now?" value={result.explanation.whyNow} /><Summary label="How does it make money?" value={result.explanation.monetization} /><Summary label="Can we verify it?" value={result.explanation.verifiability} /><Summary label="How hard is it?" value={result.explanation.difficulty} /></dl><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300"><span>Build: {result.buildDays ?? "Unknown"} days</span><span>•</span><span>Cost: {result.startupCost === null ? "Unknown" : `$${result.startupCost.toLocaleString()}`}</span><span>•</span><span>Revenue: {revenue}</span><span>•</span><span>Window: {result.actionWindowDays ?? "Unknown"} days</span></div>{result.filterNotes.length ? <p className="mt-3 text-xs text-amber-200">Near-match warnings: {result.filterNotes.join("; ")}</p> : null}<div className="mt-4 flex flex-wrap gap-3">{result.evidence.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-300 underline">{source.label}</a>)}</div><div className="mt-5 flex flex-wrap gap-2"><MiniButton label={expanded ? "Hide details" : "View details"} description="Show the full evidence score, validation, risks, and build plan." onClick={onExpand} /><button type="button" title="Run a deeper current-evidence validation and return Go, Caution, or No-Go." disabled={busy} onClick={() => onAction("validate")} className="beast-button">{busy ? "Working…" : "Validate opportunity"}</button><MiniButton label="Check trend" description="Research this opportunity again and classify it as rising, stable, falling, saturated, or expired." onClick={() => onAction("monitor")} /><MiniButton label="Create build brief" description="Convert this opportunity and its validation into a structured implementation brief without starting development." onClick={() => onAction("build_brief")} /></div><div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Opportunity status</p><div className="mt-3 flex flex-wrap gap-2">{beastHunterTrackingStatuses.filter((status) => status !== "rejected").map((status) => <button key={status} type="button" title={`Mark this opportunity as ${trackingLabels[status]}.`} disabled={busy} aria-pressed={(result.trackingStatus || "new") === status} onClick={() => onTrack(status)} className={`min-h-10 rounded-full border px-3 text-sm font-bold ${(result.trackingStatus || "new") === status ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-white/15 text-slate-300"}`}>{trackingLabels[status]}</button>)}</div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="min-w-0 flex-1 text-xs font-bold text-slate-300">Why reject?<select value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value as BeastHunterRejectionReason)} className="mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-slate-950 px-3 text-sm text-white">{beastHunterRejectionReasons.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><button type="button" title="Reject this opportunity and save the selected owner feedback reason." disabled={busy} aria-pressed={(result.trackingStatus || "new") === "rejected"} onClick={() => onTrack("rejected", rejectionReason)} className="min-h-10 self-end rounded-lg border border-red-300/30 px-4 text-sm font-bold text-red-100">Reject with reason</button></div>{result.rejectionReason ? <p className="mt-2 text-xs text-slate-400">Saved owner feedback: {beastHunterRejectionReasons.find(([id]) => id === result.rejectionReason)?.[1]}</p> : null}</div>{expanded ? <div className="mt-5 space-y-5 border-t border-white/10 pt-5"><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><h3 className="font-black text-white">Owner involvement</h3><p className="mt-2 text-sm leading-6 text-slate-300">{result.explanation.ownerInvolvement}</p></div><div><h3 className="font-black text-white">Evidence score breakdown</h3><dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(result.scores).map(([key, value]) => <Summary key={key} label={scoreLabels[key as keyof BeastHunterEvidenceScores] || key} value={`${value}/100`} />)}</dl></div>{result.validation ? <div className="rounded-xl border border-sky-300/20 bg-sky-300/[0.05] p-4"><h3 className="font-black text-white">Validation: {result.validation.verdict.replace("_", "-").toUpperCase()}</h3><p className="mt-3 text-sm text-slate-200">{result.validation.demandEvidence}</p><p className="mt-2 text-sm text-slate-300">Competitors: {result.validation.competitorAnalysis}</p><p className="mt-2 text-sm text-slate-300">Revenue: {result.validation.realisticMonthlyRevenue}</p><p className="mt-2 text-sm text-slate-300">Marketing: {result.validation.marketingDifficulty}</p><List title="Reasons to proceed" values={result.validation.reasonsToProceed} /><List title="Reasons to reject" values={result.validation.reasonsToReject} /><List title="Next steps" values={result.validation.nextSteps} /><div className="mt-4 flex flex-wrap gap-3">{result.validation.sourceUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-300 underline">Validation source</a>)}</div></div> : <p className="text-sm text-slate-400">No deep validation has been run yet.</p>}{result.buildBrief ? <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4"><h3 className="font-black text-white">Build brief</h3><p className="mt-3 text-sm text-slate-200">{result.buildBrief.objective}</p><p className="mt-2 text-sm text-slate-300">Audience: {result.buildBrief.audience}</p><List title="Minimum viable scope" values={result.buildBrief.minimumViableScope} /><List title="Milestones" values={result.buildBrief.milestones} /><List title="Success measures" values={result.buildBrief.successMeasures} /><List title="Risks" values={result.buildBrief.risks} /></div> : null}</div> : null}</DashboardCard>;
}

function List({ title, values }: { title: string; values: string[] }) { return values.length ? <div className="mt-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{values.map((value) => <li key={value}>{value}</li>)}</ul></div> : null; }
