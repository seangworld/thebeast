import Link from "next/link";
import type { MoneyObservationCenterModel } from "@/lib/moneyObservationCenter";

export function ObservationCenter({
  model,
}: {
  model: MoneyObservationCenterModel;
}) {
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
          {model.total} active observation{model.total === 1 ? "" : "s"} ·
          Updated {new Date(model.generatedAt).toLocaleString()}
        </p>
      </header>

      {model.groups.map((group) => (
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

                {item.suggestedQuestion ? (
                  <p className="mt-4 text-sm italic text-slate-400">
                    Ask Money Coach: “{item.suggestedQuestion}”
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  {item.suggestedAction ? (
                    <Link
                      className="beast-button inline-flex min-h-11 items-center"
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

      {!model.groups.length ? (
        <section className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
          <h2 className="text-xl font-black text-white">
            No active observations
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Money Coach did not find an evidence-backed change that needs
            attention right now.
          </p>
        </section>
      ) : null}
    </div>
  );
}
