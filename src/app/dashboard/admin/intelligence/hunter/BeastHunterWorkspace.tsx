"use client";

import { useMemo, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { beastHunterResultCounts, defaultBeastHunterCriteria, validateBeastHunterCriteria, type BeastHunterCriteria } from "@/lib/beastHunter";

const huntTypes = ["PDF / Book", "App / Micro-SaaS", "Calculator / Tool", "Service", "Affiliate", "Beast Capability", "Social Content"];
const markets = ["AI", "Money", "Education", "Health", "Home", "Careers", "Veterans", "Small Business", "Entertainment"];
const revenueModels = ["One-time sale", "Subscription", "Advertising", "Affiliate", "Service fee", "Licensing"];

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function BeastHunterWorkspace() {
  const [criteria, setCriteria] = useState<BeastHunterCriteria>(defaultBeastHunterCriteria);
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(() => validateBeastHunterCriteria(criteria), [criteria]);
  const set = <K extends keyof BeastHunterCriteria>(key: K, value: BeastHunterCriteria[K]) => setCriteria((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="BeastAdmin → Intelligence" title="Start a new hunt" description="BeastHunter will not search broadly and rationalize afterward. Your criteria become the filter and scoring contract before research begins." />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="lg:col-span-2 text-sm font-bold text-slate-200">What should BeastHunter find?
            <textarea value={criteria.query} onChange={(event) => set("query", event.target.value)} rows={3} placeholder="Example: a low-cost, mostly automated product I can launch within 14 days" className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/70 p-3 text-white placeholder:text-slate-500" />
          </label>
          <ChoiceGroup title="Hunt type" options={huntTypes} selected={criteria.huntTypes} onToggle={(value) => set("huntTypes", toggle(criteria.huntTypes, value))} />
          <ChoiceGroup title="Market / category" options={markets} selected={criteria.markets} onToggle={(value) => set("markets", toggle(criteria.markets, value))} />
          <NumberField label="Freshness window (days)" value={criteria.freshnessDays} onChange={(value) => set("freshnessDays", value ?? 30)} />
          <NumberField label="Maximum startup cost ($)" value={criteria.maximumStartupCost} onChange={(value) => set("maximumStartupCost", value)} />
          <NumberField label="Maximum build time (days)" value={criteria.maximumBuildDays} onChange={(value) => set("maximumBuildDays", value)} />
          <NumberField label="Monthly revenue target ($)" value={criteria.monthlyRevenueTarget} onChange={(value) => set("monthlyRevenueTarget", value)} />
          <SelectField label="Interaction required" value={criteria.interaction} onChange={(value) => set("interaction", value as BeastHunterCriteria["interaction"])} options={[["any", "Any"], ["none", "None"], ["low", "Low"]]} />
          <SelectField label="Automation level" value={criteria.automation} onChange={(value) => set("automation", value as BeastHunterCriteria["automation"])} options={[["any", "Any"], ["manual", "Manual"], ["assisted", "AI assisted"], ["mostly_automated", "Mostly automated"]]} />
          <ChoiceGroup title="Revenue model" options={revenueModels} selected={criteria.revenueModels} onToggle={(value) => set("revenueModels", toggle(criteria.revenueModels, value))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Filter behavior" value={criteria.strictness} onChange={(value) => set("strictness", value as BeastHunterCriteria["strictness"])} options={[["strict", "Strict"], ["flexible", "Flexible"]]} />
            <SelectField label="Results" value={String(criteria.resultCount)} onChange={(value) => set("resultCount", Number(value) as BeastHunterCriteria["resultCount"])} options={beastHunterResultCounts.map((count) => [String(count), `Top ${count}`])} />
          </div>
        </div>
        {errors.length && submitted ? <div role="alert" className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{errors.join(" ")}</div> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="beast-button" onClick={() => setSubmitted(true)}>Review hunt contract</button>
          <button type="button" className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-black text-white" onClick={() => { setCriteria(defaultBeastHunterCriteria); setSubmitted(false); }}>Reset</button>
        </div>
      </DashboardCard>
      {submitted && !errors.length ? (
        <DashboardCard accent="admin">
          <SectionHeader eyebrow="Hunt contract ready" title="Research execution is the next build slice" description={`The configured hunt will return up to ${criteria.resultCount} opportunities using ${criteria.strictness} filters. No opportunity data is fabricated while external research providers and persistence are being connected.`} />
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><Summary label="Freshness" value={`${criteria.freshnessDays} days`} /><Summary label="Build ceiling" value={criteria.maximumBuildDays === null ? "Any" : `${criteria.maximumBuildDays} days`} /><Summary label="Startup ceiling" value={criteria.maximumStartupCost === null ? "Any" : `$${criteria.maximumStartupCost.toLocaleString()}`} /></dl>
        </DashboardCard>
      ) : null}
    </div>
  );
}

function ChoiceGroup({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <fieldset><legend className="text-sm font-bold text-slate-200">{title}</legend><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" aria-pressed={selected.includes(option)} onClick={() => onToggle(option)} className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${selected.includes(option) ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-white/15 text-slate-300"}`}>{option}</button>)}</div></fieldset>; }
function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) { return <label className="text-sm font-bold text-slate-200">{label}<input type="number" min="0" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white" /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) { return <label className="text-sm font-bold text-slate-200">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 text-white">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><dt className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-2 font-black text-white">{value}</dd></div>; }
