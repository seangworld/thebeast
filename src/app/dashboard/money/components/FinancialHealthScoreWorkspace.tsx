"use client";

import Link from "next/link";
import type {
  FinancialHealthScoreComponent,
  FinancialHealthScoreResult,
} from "@/lib/financialHealthScore";

function CategoryCard({
  component,
}: {
  component: FinancialHealthScoreComponent;
}) {
  const score = component.score ?? 0;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-white">{component.label}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {component.weight}% of the available score
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-sm font-black text-cyan-200">
          {component.available ? `${component.score}/100` : "Unavailable"}
        </span>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={`${component.label} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={component.available ? score : undefined}
        aria-valuetext={
          component.available ? `${score} out of 100` : "Unavailable"
        }
      >
        {component.available ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
            style={{ width: `${score}%` }}
          />
        ) : null}
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Weighted points
          </dt>
          <dd className="mt-1 font-bold text-slate-200">
            {component.available
              ? component.weightedPoints.toFixed(1)
              : "Excluded"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Weight
          </dt>
          <dd className="mt-1 font-bold text-slate-200">
            {component.weight}%
          </dd>
        </div>
      </dl>
      <details className="mt-4 border-t border-white/10 pt-3">
        <summary className="cursor-pointer text-sm font-bold text-cyan-200">
          Calculation and evidence
        </summary>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {component.calculation}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">
          {component.evidence.map((evidence) => (
            <li key={evidence}>{evidence}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export function FinancialHealthScoreWorkspace({
  model,
}: {
  model: FinancialHealthScoreResult;
}) {
  const availableComponents = model.components.filter(
    (component) => component.available
  );
  const improvementOpportunities = [...availableComponents].sort(
    (left, right) => (left.score ?? 0) - (right.score ?? 0)
  );

  return (
    <div
      className="mx-auto w-full max-w-[1400px] space-y-6 pb-10"
      data-financial-health-score-workspace="true"
    >
      <header className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/10 to-transparent p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
              Financial Health Score
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">
              How your score is built
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {model.formula}
            </p>
          </div>
          <div className="shrink-0">
            <p className="text-5xl font-black text-white">{model.score}</p>
            <p className="mt-1 text-sm font-bold capitalize text-cyan-200">
              {model.band}
            </p>
          </div>
        </div>
        <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm leading-6 text-amber-100">
          {model.disclaimer}
        </p>
      </header>

      <section
        className="grid gap-4 md:grid-cols-2"
        aria-label="Financial Health Score strengths and weaknesses"
      >
        <article className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-300">
            Current strength
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            {model.strongest.label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {model.strongest.available
              ? `${model.strongest.score}/100 is your strongest available category.`
              : "No scored category is available yet."}
          </p>
        </article>
        <article className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5">
          <p className="text-xs font-black uppercase tracking-wide text-amber-200">
            Best improvement opportunity
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            {model.improvementPriority.label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {model.improvementPriority.improvement}
          </p>
        </article>
      </section>

      <section aria-labelledby="score-categories">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
            Category breakdown
          </p>
          <h2 id="score-categories" className="mt-2 text-2xl font-black text-white">
            Scores, weighting, and evidence
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Available categories account for {model.availableWeight}% of the
            configured weighting. Missing categories are excluded rather than
            estimated.
          </p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {model.components.map((component) => (
            <CategoryCard key={component.id} component={component} />
          ))}
        </div>
      </section>

      <section
        className="rounded-2xl border border-white/10 bg-[#111827]/80 p-5"
        aria-labelledby="score-improvements"
      >
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
          Recommendations
        </p>
        <h2 id="score-improvements" className="mt-2 text-2xl font-black text-white">
          Improvement opportunities
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {improvementOpportunities.map((component) => (
            <article
              key={component.id}
              className="rounded-xl border border-white/10 bg-black/10 p-4"
            >
              <h3 className="font-black text-white">{component.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {component.improvement}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="rounded-2xl border border-white/10 bg-[#111827]/80 p-5"
        aria-labelledby="score-history"
      >
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
          Score history
        </p>
        <h2 id="score-history" className="mt-2 text-2xl font-black text-white">
          Change over time
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {model.change.explanation}
        </p>
        {model.change.drivers.length > 0 ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-400">
            {model.change.drivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">
            Score history will appear after BeastMoney has a verified prior
            score to compare. No trend is inferred from a single snapshot.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/money/dashboard"
          className="beast-button-secondary inline-flex min-h-11 items-center"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/dashboard/money/coach"
          className="beast-button inline-flex min-h-11 items-center"
        >
          Discuss with Money Coach
        </Link>
      </div>
    </div>
  );
}
