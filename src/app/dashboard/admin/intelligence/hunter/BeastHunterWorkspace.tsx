"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { beastHunterResultCounts, defaultBeastHunterCriteria, validateBeastHunterCriteria, type BeastHunterCriteria, type BeastHunterRankedCandidate } from "@/lib/beastHunter";

const huntTypes = ["PDF / Book", "App / Micro-SaaS", "Calculator / Tool", "Service", "Affiliate", "Beast Capability", "Social Content"];
const markets = ["AI", "Money", "Education", "Health", "Home", "Careers", "Veterans", "Small Business", "Entertainment"];
const revenueModels = ["One-time sale", "Subscription", "Advertising", "Affiliate", "Service fee", "Licensing"];

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function BeastHunterWorkspace() {
  const [criteria, setCriteria] = useState<BeastHunterCriteria>(defaultBeastHunterCriteria);
  const [submitted, setSubmitted] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [results, setResults] = useState<BeastHunterRankedCandidate[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const errors = useMemo(() => validateBeastHunterCriteria(criteria), [criteria]);
  const set = <K extends keyof BeastHunterCriteria>(key: K, value: BeastHunterCriteria[K]) => setCriteria((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!running) return;
    setElapsedSeconds(0);
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [running]);

  async function runHunt() {
    setSubmitted(true);
    if (errors.length) return;
    setRunning(true); setRunError(null); setResults([]);
    try {
      const response = await fetch("/api/admin/beast-hunter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ criteria }) });
      const body = await response.json() as { error?: string; opportunities?: BeastHunterRankedCandidate[] };
      if (!response.ok || !body.opportunities) throw new Error(body.error || "BeastHunter could not complete this hunt.");
      setResults(body.opportunities);
    } catch (reason) { setRunError(reason instanceof Error ? reason.message : "BeastHunter could not complete this hunt."); }
    finally { setRunning(false); }
  }

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="BeastAdmin → Intelligence" title="Start a new hunt" description="BeastHunter will not search broadly and rationalize afterward. Your criteria become the filter and scoring contract before research begins." />
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
          <button type="button" title="Research current sources, apply this hunt contract, score the surviving opportunities, and save the evidence-backed results." className="beast-button" disabled={running} onClick={runHunt}>{running ? "Hunting current opportunities…" : "Run BeastHunter"}</button>
          <button type="button" title="Clear every hunt filter and remove the current results from this screen. Saved hunt history is not deleted." className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-black text-white" onClick={() => { setCriteria(defaultBeastHunterCriteria); setSubmitted(false); setResults([]); setRunError(null); }}>Reset</button>
        </div>
        {runError ? <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{runError}</div> : null}
      </DashboardCard>
      {running ? <DashboardCard accent="admin"><div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="relative h-14 w-14 shrink-0" aria-hidden="true"><span className="absolute inset-0 animate-ping rounded-full bg-amber-300/20" /><span className="absolute inset-1 animate-spin rounded-full border-4 border-amber-300/20 border-t-amber-300" /></div><div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Search in progress</p><h2 className="mt-1 text-xl font-black text-white">BeastHunter is actively researching current sources</h2><p className="mt-2 text-sm leading-6 text-slate-300">Searching, validating citations, filtering candidates, and calculating rankings. Keep this page open. Elapsed time: <span className="font-black text-white">{elapsedSeconds}s</span>.</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/3 animate-pulse rounded-full bg-amber-300" /></div></div></div></DashboardCard> : null}
      {submitted && !errors.length ? (
        <DashboardCard accent="admin">
          <SectionHeader eyebrow="Hunt contract" title={running ? "Researching current evidence" : results.length ? `${results.length} ranked opportunities` : "Ready to hunt"} description={`The configured hunt returns up to ${criteria.resultCount} opportunities using ${criteria.strictness} filters. Uncited candidates are rejected before display or storage.`} />
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><Summary label="Freshness" value={`${criteria.freshnessDays} days`} /><Summary label="Build ceiling" value={criteria.maximumBuildDays === null ? "Any" : `${criteria.maximumBuildDays} days`} /><Summary label="Startup ceiling" value={criteria.maximumStartupCost === null ? "Any" : `$${criteria.maximumStartupCost.toLocaleString()}`} /></dl>
        </DashboardCard>
      ) : null}
      {results.length ? <section className="space-y-4" aria-label="Ranked BeastHunter opportunities">{results.map((result) => <DashboardCard key={result.id} accent="admin"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">#{result.rank} · {result.huntType} · {result.market}</p><h2 className="mt-2 text-xl font-black text-white">{result.title}</h2></div><div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-lg font-black text-amber-100">{result.score}/100</div></div><p className="mt-4 text-sm leading-6 text-slate-200">{result.summary}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300"><span>Build: {result.buildDays ?? "Unknown"} days</span><span>•</span><span>Cost: {result.startupCost === null ? "Unknown" : `$${result.startupCost.toLocaleString()}`}</span><span>•</span><span>Window: {result.actionWindowDays ?? "Unknown"} days</span></div>{result.filterNotes.length ? <p className="mt-3 text-xs text-amber-200">Flexible-filter notes: {result.filterNotes.join("; ")}</p> : null}<div className="mt-4 flex flex-wrap gap-3">{result.evidence.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-300 underline">{source.label}</a>)}</div></DashboardCard>)}</section> : null}
    </div>
  );
}

function ChoiceGroup({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <fieldset><legend className="text-sm font-bold text-slate-200">{title}</legend><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" title={`${selected.includes(option) ? "Remove" : "Add"} ${option} ${title.toLowerCase()} filter.`} aria-pressed={selected.includes(option)} onClick={() => onToggle(option)} className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${selected.includes(option) ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-white/15 text-slate-300"}`}>{option}</button>)}</div></fieldset>; }
function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) { return <label className="text-sm font-bold text-slate-200">{label}<input type="number" min="0" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white" /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-200">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><dt className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-2 font-black text-white">{value}</dd></div>; }
