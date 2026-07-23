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
  const isFinancialHealth = card.id === "financial-health";
  return (
    <article
      className={`group flex min-h-[13rem] min-w-0 flex-col rounded-3xl border bg-gradient-to-br p-5 shadow-[0_18px_50px_rgba(0,0,0,0.14)] transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-6 ${isFinancialHealth ? "sm:col-span-2 xl:col-span-1 2xl:col-span-2" : ""} ${tones[card.tone]}`}
      data-financial-health-hero={isFinancialHealth ? "true" : undefined}
    >
      <Link href={card.href} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300" aria-label={`Open ${card.label}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
          <span aria-hidden="true" className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white">↗</span>
        </div>
        <p className={`mt-3 break-words font-black tracking-tight text-white ${isFinancialHealth ? "text-5xl sm:text-6xl" : "text-2xl sm:text-3xl"}`}>{card.value}</p>
        <p className="mt-2 text-sm font-semibold text-slate-200">{card.detail}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{card.trend}</p>
      </Link>
      <div className="mt-auto"><Explainability card={card} /></div>
    </article>
  );
}

function Surface({ id, title, eyebrow, href, children, className = "" }: { id?: string; title: string; eyebrow: string; href: string; children: React.ReactNode; className?: string }) {
  return (
    <article id={id} className={`min-w-0 scroll-mt-6 rounded-3xl border border-white/10 bg-[#111827]/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16)] backdrop-blur transition duration-300 hover:border-white/15 hover:shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:p-7 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-black text-white">{title}</h2>
        </div>
        <Link href={href} className="flex min-h-[44px] shrink-0 items-center rounded-xl border border-white/10 px-3 text-sm font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Open <span className="sr-only">{title}</span><span aria-hidden="true" className="ml-2">↗</span></Link>
      </div>
      <div className="mt-7">{children}</div>
    </article>
  );
}

export function FinancialMissionControlLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1600px] animate-pulse space-y-8 pb-12"
      aria-busy="true"
      aria-label="Loading Financial Mission Control"
      data-financial-mission-control-loading="true"
    >
      <span className="sr-only">Loading current BeastMoney records.</span>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-52 rounded-3xl bg-white/[0.07] sm:col-span-2 xl:col-span-1" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-52 rounded-3xl bg-white/[0.05]" />
        ))}
      </div>
      <div className="h-36 rounded-3xl bg-white/[0.05]" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-80 rounded-3xl bg-white/[0.05]" />
        <div className="h-80 rounded-3xl bg-white/[0.05]" />
      </div>
    </div>
  );
}

export function FinancialMissionControl({ model }: { model: FinancialMissionControlModel }) {
  const maxScenarioInterest = Math.max(1, ...model.scenarios.map((scenario) => scenario.totalInterest));
  const hasCurrentRecords =
    model.cashFlow.income > 0 ||
    model.cashFlow.outflow > 0 ||
    model.debt.remaining > 0 ||
    model.upcomingObligations.length > 0;
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 pb-12 sm:space-y-10" data-financial-mission-control="true">
      <section id="financial-health" className="scroll-mt-6" aria-labelledby="mission-control-overview">
        <h1 id="mission-control-overview" className="sr-only">Financial Mission Control</h1>
        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {model.heroCards.map((card) => <HeroCard key={card.id} card={card} />)}
        </div>
      </section>

      {!hasCurrentRecords ? (
        <section
          className="rounded-3xl border border-dashed border-cyan-300/20 bg-cyan-300/[0.04] p-6 sm:p-8"
          data-financial-mission-control-empty="true"
        >
          <h2 className="text-xl font-black text-white">Build your financial picture</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Add or import current income, bills, debts, and cash records to turn these transparent placeholders into a useful financial baseline.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/money/import" className="beast-button inline-flex min-h-11 items-center">Import financial data</Link>
            <Link href="/dashboard/money/income" className="beast-button-secondary inline-flex min-h-11 items-center">Add income</Link>
          </div>
        </section>
      ) : null}

      <MorningFinancialBriefingPanel briefing={model.morningBriefing} />

      <section
        id="financial-health-score"
        className="scroll-mt-6 rounded-3xl border border-white/10 bg-[#111827]/85 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:p-6"
        aria-labelledby="financial-health-score-heading"
      >
        <div>
          <div className="max-w-4xl">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">
              Transparent wellness measure
            </p>
            <h2 id="financial-health-score-heading" className="mt-2 text-2xl font-black text-white">
              How your Financial Health Score is calculated
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {model.financialHealth.formula}
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm text-amber-100">
          {model.financialHealth.disclaimer}
        </p>

        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Dimension</th>
                <th className="pb-3 pr-4">Score</th>
                <th className="pb-3 pr-4">Weight</th>
                <th className="pb-3 pr-4">Weighted points</th>
                <th className="pb-3">Calculation</th>
              </tr>
            </thead>
            <tbody>
              {model.financialHealth.components.map((component) => (
                <tr key={component.id} className="border-t border-white/10 align-top">
                  <th scope="row" className="py-4 pr-4 font-bold text-white">{component.label}</th>
                  <td className="py-4 pr-4 text-slate-300">{component.available ? `${component.score}/100` : "Unavailable"}</td>
                  <td className="py-4 pr-4 text-slate-300">{component.weight}%</td>
                  <td className="py-4 pr-4 text-slate-300">{component.available ? component.weightedPoints.toFixed(1) : "Excluded"}</td>
                  <td className="py-4 text-slate-400">
                    <p>{component.calculation}</p>
                    <p className="mt-2 text-xs">{component.evidence.join(" · ")}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-3 md:hidden" aria-label="Financial Health Score components">
          {model.financialHealth.components.map((component) => (
            <article key={component.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-black text-white">{component.label}</h3>
                <span className="shrink-0 text-sm font-bold text-cyan-200">
                  {component.available ? `${component.score}/100` : "Unavailable"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Weight</dt>
                  <dd className="mt-1 font-bold text-slate-300">{component.weight}%</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Weighted points</dt>
                  <dd className="mt-1 font-bold text-slate-300">
                    {component.available ? component.weightedPoints.toFixed(1) : "Excluded"}
                  </dd>
                </div>
              </dl>
              <details className="mt-3 border-t border-white/10 pt-3">
                <summary className="cursor-pointer text-sm font-bold text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  Calculation and evidence
                </summary>
                <p className="mt-3 text-xs leading-5 text-slate-400">{component.calculation}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">
                  {component.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}
                </ul>
              </details>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.04] p-4">
            <h3 className="font-black text-white">Why it changed</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{model.financialHealth.change.explanation}</p>
            {model.financialHealth.change.drivers.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
                {model.financialHealth.change.drivers.map((driver) => <li key={driver}>{driver}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-4">
            <h3 className="font-black text-white">Best improvement opportunity</h3>
            <p className="mt-2 text-sm font-bold text-cyan-200">{model.financialHealth.improvementPriority.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{model.financialHealth.improvementPriority.improvement}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="financial-motion-heading" className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Financial motion</p>
          <h2 id="financial-motion-heading" className="mt-2 text-2xl font-black text-white">Where your money is moving</h2>
        </div>
        <div className="grid items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-12">
          <Surface title="Cash-flow trend" eyebrow="Cash Flow" href="/dashboard/money/cashflow" className="xl:col-span-7">
            <div className="grid gap-3 sm:grid-cols-3">
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

          <Surface title="Payment workflows" eyebrow="Configuration" href="/dashboard/money/cashflow#funding-sources" className="xl:col-span-12">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Active obligations", model.paymentConfigurations.total],
                ["Fully configured", model.paymentConfigurations.complete],
                ["Velocity workflows", model.paymentConfigurations.velocity],
                ["Needs review", model.paymentConfigurations.needsReview],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-white/[0.04] p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Payment Account identifies where a draft leaves, Funding Account identifies where its money originated, and Funding Strategy explains how it moved.
            </p>
          </Surface>
        </div>
      </section>

      <section aria-labelledby="strategy-heading" className="grid items-stretch gap-5 xl:grid-cols-12">
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

      <section aria-labelledby="focus-heading" className="grid items-stretch gap-5 xl:grid-cols-3">
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
