import type { SiteWideOutcomeReport } from "@/lib/siteWideOutcomeLearning";

const decisionStyle = {
  Continue: "border-emerald-300/30 text-emerald-100",
  Modify: "border-amber-300/30 text-amber-100",
  Investigate: "border-sky-300/30 text-sky-100",
} as const;

export function SiteWideOutcomes({ report }: { report: SiteWideOutcomeReport | null }) {
  if (!report) return <section className="mt-5" aria-label="Site-wide outcome learning"><h3 className="font-bold text-white">Growth, News, and UX outcomes</h3><p className="mt-2 text-sm text-slate-400">Site-wide outcome learning begins with the next completed v2 scheduled observation. Earlier operational cycles remain valid but do not count toward this validation.</p></section>;
  return <section className="mt-5 space-y-3" aria-label="Site-wide outcome learning">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
      <div><h3 className="font-bold text-white">Growth, News, and UX outcomes</h3><p className="mt-1 text-xs text-slate-400">Measured associations only. No recommendation claims causation or authorizes an action.</p></div>
      <span className={`h-fit rounded-full border px-3 py-1 text-xs font-black ${report.validation.status === "validated" ? "border-emerald-300/30 text-emerald-100" : "border-amber-300/30 text-amber-100"}`}>{report.validation.status === "validated" ? "3-cycle behavior validated" : `${report.validation.observedCycles}/${report.validation.requiredCycles} scheduled cycles`}</span>
    </div>
    <p className="text-sm text-slate-300">{report.validation.explanation}</p>
    <div className="grid gap-3 xl:grid-cols-3">{report.workstreams.map((item) => <article key={item.id} className="rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between gap-3"><h4 className="font-black text-white">{item.label}</h4><span className={`rounded-full border px-2 py-1 text-xs font-black ${decisionStyle[item.decision]}`}>{item.decision}</span></div>
      <p className="mt-3 text-sm text-slate-200">{item.recommendation}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">{item.evidence.length ? item.evidence.map((entry) => <li key={entry}>{entry}</li>) : <li>No comparable aggregate evidence was available.</li>}</ul>
      <p className="mt-3 text-xs text-slate-400">Confidence: {item.confidence}. Same decision in {item.sameDecisionCycles}/{item.observedCycles} observed cycle(s).</p>
      <details className="mt-2"><summary className="cursor-pointer py-2 text-xs font-bold text-amber-100">Limits and comparison</summary><p className="text-xs text-slate-400">{item.comparisonPeriod}</p>{item.limitations.map((entry) => <p key={entry} className="mt-1 text-xs text-slate-400">{entry}</p>)}</details>
    </article>)}</div>
    <p className="text-xs text-slate-400">Owner gates preserved: execution, spending, publication, and Production changes. Recommendations remain advisory until separately authorized.</p>
  </section>;
}
