"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MoneyObservationCenterModel } from "@/lib/moneyObservationCenter";

export function ObservationCenter({
  model,
}: {
  model: MoneyObservationCenterModel;
}) {
  const [sort, setSort] = useState<"newest" | "priority">("newest");
  const [status, setStatus] = useState<"current" | "resolved" | "dismissed">("current");
  const [category, setCategory] = useState("all");
  const categories = useMemo(
    () =>
      Array.from(
        new Set(model.groups.flatMap((group) => group.items.map((item) => item.category)))
      ).sort(),
    [model.groups]
  );
  const groups = useMemo(
    () =>
      model.groups
        .map((group) => ({
          ...group,
          items: group.items
            .filter((item) =>
              status === "resolved"
                ? item.status === "Resolved"
                : status === "dismissed"
                  ? item.status === "Dismissed"
                  : !["Resolved", "Dismissed"].includes(item.status)
            )
            .filter((item) => category === "all" || item.category === category)
            .sort((left, right) =>
              sort === "priority"
                ? right.priorityScore - left.priorityScore ||
                  Date.parse(right.observedAt) - Date.parse(left.observedAt)
                : Date.parse(right.observedAt) - Date.parse(left.observedAt) ||
                  right.priorityScore - left.priorityScore
            ),
        }))
        .filter((group) => group.items.length > 0),
    [category, model.groups, sort, status]
  );
  const visibleTotal = groups.reduce((total, group) => total + group.items.length, 0);
  const moneyCoachHref = (question: string) =>
    `/dashboard/money?starter=${encodeURIComponent(question)}`;

  return (
    <div
      className="mx-auto w-full max-w-[1400px] space-y-6 pb-12"
      data-money-observation-center="true"
    >
      <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_38%),#111827] p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
          Observation Intelligence
        </p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
          Observation Center
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Meaningful improvements, opportunities, risks, questions, missing
          information, data-quality findings, and milestones from current
          BeastMoney evidence.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          {model.total} retained observation{model.total === 1 ? "" : "s"} ·
          Updated {new Date(model.generatedAt).toLocaleString()}
        </p>
      </header>

      <section
        className="rounded-2xl border border-white/10 bg-[#111827]/80 p-4"
        aria-label="Observation filters"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="grid gap-2 text-xs font-bold text-slate-300">
            Sort observations
            <select
              className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
            >
              <option value="newest">Newest</option>
              <option value="priority">Highest Priority</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold text-slate-300">
            Observation status
            <select
              className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              <option value="current">Current</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold text-slate-300">
            By Category
            <select
              className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500" aria-live="polite">
          Showing {visibleTotal} observation{visibleTotal === 1 ? "" : "s"}.
        </p>
      </section>

      {groups.map((group) => (
        <section
          key={group.id}
          id={group.id}
          className="scroll-mt-6"
          aria-labelledby={`${group.id}-heading`}
        >
          <div className="mb-3 flex items-end justify-between gap-4">
            <h2
              id={`${group.id}-heading`}
              className="text-xl font-black text-white"
            >
              {group.label}
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {group.items.length}
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {group.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-[#141a24] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
                      {item.priority} priority
                    </p>
                    <h3 className="mt-2 text-lg font-black text-white">
                      {item.title}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase text-slate-300">
                    {item.confidenceLabel} · {item.confidence}%
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-200">
                  {item.summary}
                </p>
                <div className="mt-4 rounded-xl bg-white/[0.04] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Why it matters
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {item.whyItMatters}
                  </p>
                </div>

                <details className="mt-4 rounded-xl border border-white/10 p-4">
                  <summary className="cursor-pointer font-bold text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                    Explain Why
                  </summary>
                  <div className="mt-3 space-y-3 text-xs leading-5 text-slate-400">
                    <p>{item.explainWhy.whyNoticed}</p>
                    <p>
                      <span className="font-bold text-slate-300">Rule:</span>{" "}
                      {item.explainWhy.rule}
                    </p>
                    <ul className="list-disc pl-5">
                      {item.explainWhy.evidence.map((evidence) => (
                        <li key={evidence}>{evidence}</li>
                      ))}
                    </ul>
                    {item.explainWhy.limitations.length ? (
                      <p>
                        Limitations: {item.explainWhy.limitations.join(" ")}
                      </p>
                    ) : null}
                  </div>
                </details>

                <div className="mt-5 flex flex-wrap gap-3">
                  {item.suggestedQuestion ? (
                    <Link
                      className="beast-button inline-flex min-h-11 items-center"
                      href={moneyCoachHref(item.suggestedQuestion)}
                    >
                      Discuss with Money Coach
                    </Link>
                  ) : null}
                  {item.suggestedAction ? (
                    <Link
                      className="beast-button-secondary inline-flex min-h-11 items-center"
                      href={item.suggestedAction.href}
                    >
                      {item.suggestedAction.label}
                    </Link>
                  ) : null}
                  {item.workspace &&
                  item.workspace.href !== item.suggestedAction?.href ? (
                    <Link
                      className="beast-button-secondary inline-flex min-h-11 items-center"
                      href={item.workspace.href}
                    >
                      Open {item.workspace.label}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {!groups.length ? (
        <section className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
          <h2 className="text-xl font-black text-white">
            No matching observations
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Adjust the status or category filter to review other
            evidence-backed observations.
          </p>
        </section>
      ) : null}
    </div>
  );
}
