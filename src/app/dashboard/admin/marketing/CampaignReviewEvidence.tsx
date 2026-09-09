import type { MarketingCampaign } from "@/lib/beastMarketing";

export function CampaignReviewEvidence({ campaign }: { campaign: Pick<MarketingCampaign, "sourceFacts" | "successMeasures" | "limitations"> }) {
  return <details className="mt-4 rounded-xl border border-white/10 p-3 text-sm text-slate-300">
    <summary className="cursor-pointer font-bold text-amber-100">Review evidence, baseline and limits</summary>
    <h3 className="mt-3 font-bold text-white">Source facts and baseline</h3>
    {campaign.sourceFacts.length ? <ul className="mt-2 space-y-3">{campaign.sourceFacts.map((fact, index) => <li key={index} className="break-words">
      <p>{fact.label}</p>
      {fact.url && /^https:\/\//i.test(fact.url) ? <a className="break-all text-cyan-200 underline" href={fact.url} target="_blank" rel="noopener noreferrer">{fact.url}</a> : null}
      <p className="text-xs text-slate-400">Observed: {fact.observedAt || "Unavailable"}</p>
      {fact.limitation ? <p className="mt-1 text-xs text-amber-100">{fact.limitation}</p> : null}
    </li>)}</ul> : <p className="mt-2">No source evidence recorded.</p>}
    <h3 className="mt-3 font-bold text-white">Success measures</h3>
    <ul className="mt-2 list-inside list-disc">{campaign.successMeasures.map((measure, index) => <li key={index}>{measure}</li>)}</ul>
    <h3 className="mt-3 font-bold text-white">Limitations</h3>
    <ul className="mt-2 list-inside list-disc">{campaign.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>
  </details>;
}
