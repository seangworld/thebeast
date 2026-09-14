import { concentrationWarnings, type NewsSourceConcentration } from "@/lib/newsSourceConcentration";

export function NewsSourceConcentrationPanel({ evidence }: { evidence?: NewsSourceConcentration | null }) {
  return <section className="rounded-2xl border border-amber-300/20 bg-[#111827] p-5" aria-labelledby="news-diversity-heading">
    <h2 id="news-diversity-heading" className="text-xl font-black text-white">World & USA publisher diversity</h2>
    <p className="mt-2 text-sm text-slate-300">Total registered sources do not establish diversity in the visible columns. These observations describe the unfiltered homepage, excluding its Top Story.</p>
    {!evidence ? <p className="mt-3 text-amber-100">Diversity evidence unavailable. This is not a zero count or an all-clear.</p> : <>
      <p className="mt-3 text-sm text-slate-300">Snapshot: {evidence.totalHeadlineCount} headlines · {evidence.totalFeedCount} feeds · {evidence.totalPublisherCount} publisher labels.</p>
      <p className="mt-2 text-xs text-slate-400">Observed {evidence.generatedAt}. {evidence.freshness === "stale" ? "STALE — current diversity is unverified." : "Fresh snapshot."}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{evidence.lanes.map((lane) => {
        const warnings = concentrationWarnings(lane);
        return <div key={lane.scope} className="rounded-xl border border-white/10 p-4">
          <h3 className="font-black text-white">{lane.scope.toUpperCase()}</h3>
          <p className="mt-2 text-sm text-slate-300">Pool: {lane.poolHeadlineCount} headlines, {lane.poolFeedCount} feeds, {lane.poolPublisherCount} publishers.</p>
          <p className="mt-2 text-sm text-slate-300">Visible: {lane.visibleHeadlineCount}/20 stories from {lane.visiblePublisherCount} publishers.</p>
          <p className="mt-2 text-sm text-slate-300">{lane.publishers.map((row) => `${row.name}: ${row.count}`).join(" · ") || "No visible stories; diversity cannot be assessed."}</p>
          {lane.visiblePublisherCount > 0 && lane.visiblePublisherCount < 3 && <p className="mt-2 text-amber-100">Limited-source fallback: fewer than three publishers are visible.</p>}
          {warnings.length > 0 ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-100">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : lane.visibleHeadlineCount > 0 && <p className="mt-3 text-sm text-slate-300">No majority concentration in this observation.</p>}
        </div>;
      })}</div>
    </>}
    <p className="mt-4 text-xs text-slate-400">Warning threshold: more than 50% of a pool or visible column from one publisher or observed publisher-host family. Host families are not corporate-ownership claims. Warnings are read-only; technical, legitimacy, rights and owner activation gates still apply.</p>
  </section>;
}
