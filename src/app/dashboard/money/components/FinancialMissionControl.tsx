"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import type { FinancialMissionControlModel, MissionControlHeroCard, MissionControlTone } from "@/lib/financialMissionControl";
import { MorningFinancialBriefingPanel } from "./MorningFinancialBriefing";

const tones: Record<MissionControlTone, string> = {
  positive: "border-emerald-400/25 from-emerald-400/15 to-emerald-400/[0.02]",
  caution: "border-amber-300/25 from-amber-300/15 to-amber-300/[0.02]",
  critical: "border-rose-400/25 from-rose-400/15 to-rose-400/[0.02]",
  neutral: "border-slate-400/20 from-slate-400/10 to-slate-400/[0.02]",
  accent: "border-cyan-300/25 from-cyan-300/15 to-cyan-300/[0.02]",
};

function ProgressBar({ value, label }: { value: number; label: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{label}</span>
        <span>{Math.round(safe)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safe)}>
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

function Explainability({ card }: { card: MissionControlHeroCard }) {
  return (
    <details className="mt-4 border-t border-white/10 pt-3 text-xs">
      <summary className="cursor-pointer font-bold text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Explain this</summary>
      <div className="mt-3 space-y-2 leading-5 text-slate-300">
        <p>{card.explanation.why}</p>
        <ul className="space-y-1">
          {card.explanation.evidence.map((item) => <li key={item.id}>• {item.statement}</li>)}
        </ul>
        {card.explanation.limitations.map((item) => <p key={item} className="text-slate-400">Limitation: {item}</p>)}
      </div>
    </details>
  );
}

function HeroCard({ card }: { card: MissionControlHeroCard }) {
  return (
    <article className={`group min-w-0 rounded-2xl border bg-gradient-to-br p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:border-white/25 sm:p-5 ${tones[card.tone]}`}>
      <Link href={card.href} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300" aria-label={`Open ${card.label}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
          <span aria-hidden="true" className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white">↗</span>
        </div>
        <p className="mt-3 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">{card.value}</p>
        <p className="mt-2 text-sm font-semibold text-slate-200">{card.detail}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{card.trend}</p>
      </Link>
      <Explainability card={card} />
    </article>
  );
}

function Surface({ id, title, eyebrow, href, children, className = "" }: { id?: string; title: string; eyebrow: string; href: string; children: React.ReactNode; className?: string }) {
  return (
    <article id={id} className={`min-w-0 scroll-mt-6 rounded-3xl border border-white/10 bg-[#111827]/85 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)] backdrop-blur sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
        </div>
        <Link href={href} className="flex min-h-[44px] shrink-0 items-center rounded-xl border border-white/10 px-3 text-sm font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Open <span className="sr-only">{title}</span><span aria-hidden="true" className="ml-2">↗</span></Link>
      </div>
      <div className="mt-6">{children}</div>
    </article>
  );
}

export function FinancialMissionControl({ model }: { model: FinancialMissionControlModel }) {
  const maxScenarioInterest = Math.max(1, ...model.scenarios.map((scenario) => scenario.totalInterest));
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 pb-12" data-financial-mission-control="true">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_36%),linear-gradient(135deg,#111827,#0b111c)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.3)] sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Financial Mission Control</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">Your financial position, at a glance.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Current health, cash, debt, progress, and priorities—summarized from your existing BeastMoney records and calculation engines.</p>
        </div>
        <div className="relative z-10 mt-6 flex flex-wrap gap-3 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">Updated {new Date(model.generatedAt).toLocaleString()}</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">Current records remain authoritative</span>
        </div>
      </header>

      <MorningFinancialBriefingPanel briefing={model.morningBriefing} />

      <section id="financial-health" className="scroll-mt-6" aria-labelledby="mission-control-overview">
        <h2 id="mission-control-overview" className="sr-only">Financial overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {model.heroCards.map((card) => <HeroCard key={card.id} card={card} />)}
        </div>
      </section>

      <section aria-labelledby="financial-motion-heading" className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Financial motion</p>
          <h2 id="financial-motion-heading" className="mt-2 text-2xl font-black text-white">Where your money is moving</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
          <Surface title="Cash-flow trend" eyebrow="Cash Flow" href="/dashboard/money/cashflow" className="xl:col-span-7">
            <div className="grid grid-cols-3 gap-3">
              {[["Income", model.cashFlow.income, "text-emerald-300"], ["Outflow", model.cashFlow.outflow, "text-amber-200"], ["Surplus", model.cashFlow.surplus, model.cashFlow.surplus >= 0 ? "text-cyan-300" : "text-rose-300"]].map(([label, value, tone]) => (
                <Link href={label === "Income" ? "/dashboard/money/income" : "/dashboard/money/cashflow"} key={String(label)} className="rounded-2xl bg-white/[0.04] p-3 transition hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={`mt-2 break-words text-lg font-black sm:text-2xl ${tone}`}>{formatCurrency(Number(value))}</p>
                </Link>
              ))}
            </div>
            <div className="mt-5 grid h-28 grid-cols-3 items-end gap-3" aria-label="Cash flow current-period bar chart">
              {[model.cashFlow.income, model.cashFlow.outflow, Math.abs(model.cashFlow.surplus)].map((value, index) => {
                const max = Math.max(1, model.cashFlow.income, model.cashFlow.outflow, Math.abs(model.cashFlow.surplus));
                return <div key={index} className={`min-h-2 rounded-t-xl ${index === 0 ? "bg-emerald-400" : index === 1 ? "bg-amber-300" : "bg-cyan-300"}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />;
              })}
            </div>
          </Surface>

          <Surface title="Debt payoff progress" eyebrow="Debt" href="/dashboard/money/debts" className="xl:col-span-5">
            <p className="text-3xl font-black text-white">{formatCurrency(model.debt.remaining)}</p>
            <p className="mt-2 text-sm text-slate-400">{model.debt.countdown}</p>
            <div className="mt-6"><ProgressBar value={model.debt.progressPercent} label="Current-plan progress" /></div>
            <p className="mt-5 rounded-2xl bg-white/[0.04] p-4 text-sm text-slate-300">{formatCurrency(model.debt.monthlyReduction)} modeled reduction this month.</p>
          </Surface>

          <Surface title="Monthly spending" eyebrow="Spending" href="/dashboard/money/cashflow" className="xl:col-span-4">
            <div className="space-y-4">
              {[["Bills", model.spending.bills], ["Debt minimums", model.spending.debtMinimums], ["Total tracked outflow", model.spending.total]].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0">
                  <span className="text-sm text-slate-400">{label}</span><span className="font-black text-white">{formatCurrency(Number(value))}</span>
                </div>
              ))}
            </div>
          </Surface>

          <Surface title="Savings trend" eyebrow="Savings" href="/dashboard/money/cashflow" className="xl:col-span-4">
            <p className="text-3xl font-black text-emerald-300">{formatCurrency(model.savings.monthlySurplus)}</p>
            <p className="mt-2 text-sm text-slate-400">Current monthly capacity after tracked outflow</p>
            <div className="mt-6"><ProgressBar value={model.savings.cashEfficiency} label="Cash efficiency" /></div>
          </Surface>

          <Surface title="Retirement progress" eyebrow="Retirement" href="/dashboard/money/retirement" className="xl:col-span-4">
            <p className="text-2xl font-black text-white">{model.retirement.readiness}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{model.retirement.detail}</p>
            {!model.retirement.available ? <p className="mt-5 rounded-2xl border border-dashed border-white/15 p-4 text-xs leading-5 text-slate-400">No readiness percentage is shown until current retirement inputs exist.</p> : null}
          </Surface>
        </div>
      </section>

      <section aria-labelledby="strategy-heading" className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Surface title="Strategy comparison" eyebrow="Scenarios" href="/dashboard/money/debts">
            {model.scenarios.length ? <div className="space-y-4">
              {model.scenarios.map((scenario) => (
                <div key={scenario.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3"><h3 className="font-black text-white">{scenario.label}</h3><span className="text-xs font-bold uppercase text-slate-400">{scenario.riskLevel} risk</span></div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${Math.max(5, (scenario.totalInterest / maxScenarioInterest) * 100)}%` }} /></div>
                  </div>
                  <div className="text-left sm:text-right"><p className="font-black text-white">{scenario.monthsToPayoff} months</p><p className="text-xs text-slate-400">{formatCurrency(scenario.totalInterest)} interest</p></div>
                </div>
              ))}
            </div> : <p className="text-sm text-slate-400">Comparable payoff scenarios are not available yet.</p>}
          </Surface>
        </div>
        <div className="xl:col-span-5">
          <Surface title="Velocity progress" eyebrow="Velocity" href="/dashboard/money/velocity" className="h-full">
            {model.velocity.available ? <>
              <p className="text-3xl font-black text-white">{model.velocity.monthsToPayoff} months</p>
              <p className="mt-2 text-sm text-slate-400">Modeled payoff · {model.velocity.riskLevel} risk</p>
              <p className="mt-5 rounded-2xl bg-violet-400/10 p-4 text-sm text-violet-100">{formatCurrency(model.velocity.totalInterest || 0)} modeled interest under the current Velocity scenario.</p>
            </> : <p className="text-sm leading-6 text-slate-400">A current Velocity scenario is not available. Open Velocity to review required inputs and guardrails.</p>}
          </Surface>
        </div>
      </section>

      <section aria-labelledby="focus-heading" className="grid gap-4 xl:grid-cols-3">
        <Surface title="Recommended focus" eyebrow="Today" href={model.recommendedFocus.href}>
          <h3 id="focus-heading" className="text-xl font-black text-white">{model.recommendedFocus.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{model.recommendedFocus.action}</p>
          <p className="mt-4 rounded-2xl bg-cyan-300/10 p-4 text-xs leading-5 text-cyan-100">{model.recommendedFocus.why}</p>
        </Surface>
        <Surface title="Upcoming obligations" eyebrow="Next 7 days" href="/dashboard/money/cashflow#bills">
          <div className="space-y-3">
            {model.upcomingObligations.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.04] p-3"><div className="min-w-0"><p className="truncate font-bold text-white">{item.name}</p><p className="text-xs text-slate-400">{item.dueLabel}</p></div><span className="shrink-0 font-black text-white">{formatCurrency(item.amount)}</span></div>)}
            {!model.upcomingObligations.length ? <p className="text-sm text-slate-400">No obligations are due in the current review window.</p> : null}
          </div>
        </Surface>
        <Surface id="observations" title="Observation Center" eyebrow="Intelligence" href="/dashboard/money/observations">
          <div className="space-y-3">
            {model.observations.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between gap-3"><p className="font-bold text-white">{item.title}</p><span className="text-[10px] font-black uppercase text-cyan-300">{item.priority}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{item.summary}</p>{item.confidence ? <p className="mt-2 text-[10px] uppercase text-slate-500">{item.confidence} confidence</p> : null}</div>)}
            {!model.observations.length ? <p className="text-sm text-slate-400">No evidence-backed observations require attention right now.</p> : null}
          </div>
        </Surface>
      </section>
    </div>
  );
}
