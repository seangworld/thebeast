import type { OperatingOutcomeReport } from "@/lib/standingObservationOutcomes";

export function OperatingOutcomes({ report }: { report: OperatingOutcomeReport | null }) {
  if (!report) return <p className="mt-4 text-sm text-slate-400">Detailed outcome learning begins with the next completed daily observation. Older briefings remain available; they do not establish a finding-level baseline.</p>;
  const visible = report.outcomes.filter((o) => o.outcome !== "healthy");
  return <section className="mt-5 space-y-3" aria-label="Operating outcomes and follow-through">
    <h3 className="font-bold text-white">What changed, and what needs follow-through</h3>
    <p className="text-sm text-amber-100">{report.nextStep}</p>
    <p className="text-xs text-slate-400">Based on the observation at {new Date(report.observedAt).toLocaleString()}. Priorities adapt to missing evidence, severity, recurrence, and days observed. Recommendations do not authorize execution.</p>
    {visible.length ? <ul className="space-y-3">{visible.slice(0, 10).map((item) => <li key={item.id} className="rounded-xl border border-white/10 p-3 text-sm">
      <p className="font-bold text-white">{item.product} · {item.outcome}</p>
      <p className="mt-1 break-words text-slate-300">{item.detail}</p>
      <p className="mt-1 text-slate-200">{item.recommendation}</p>
      <p className="mt-1 text-xs text-slate-400">Attention observed on {item.observedDays} day(s) in the last 30 calendar days.</p>
    </li>)}</ul> : <p className="text-sm text-slate-300">No current operational attention observed. Business outcomes still require their own evidence.</p>}
    {visible.length > 10 ? <details><summary className="cursor-pointer py-3 text-sm text-amber-100">{visible.length - 10} more observed conditions</summary><ul className="space-y-2 text-sm text-slate-300">{visible.slice(10).map((item) => <li key={item.id}>{item.product} · {item.outcome}: {item.detail} {item.recommendation}</li>)}</ul></details> : null}
    <div className="grid gap-3 sm:grid-cols-2">{report.windows.map((window) => <p key={window.days} className="rounded-xl border border-white/10 p-3 text-xs text-slate-300">Last {window.days} calendar days: {window.clearDays} clear, {window.attentionDays} with attention, {window.unknownDays} unknown. {window.observedDays} day(s) have detailed observations.</p>)}</div>
    <p className="text-xs text-slate-400">“Resolved” means the signal was clear on three consecutive observed days. It does not prove an intervention caused improvement. Missing or failed days remain unknown.</p>
    {report.followUps.length ? <details><summary className="cursor-pointer py-3 text-sm font-bold text-amber-100">{report.followUps.length} existing decisions and blockers to follow up</summary><ul className="space-y-3 text-sm text-slate-300">{report.followUps.map((item) => <li key={item.id}><strong>{item.product}: {item.title}</strong> · {item.status.replaceAll("_", " ")}<p>{item.nextStep}</p></li>)}</ul></details> : null}
    <a className="inline-block min-h-11 py-3 text-sm font-bold text-amber-100 underline" href="/dashboard/admin/development/proposals">Review existing proposals and owner decisions</a>
  </section>;
}
