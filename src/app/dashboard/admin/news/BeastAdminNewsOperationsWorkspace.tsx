import { BeastAdminDataFreshness } from "../BeastAdminShell";
import type { NewsOperationsStatus } from "@/lib/newsOperations";

function BooleanState({ value }: { value: boolean }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${value ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}>
      {value ? "READY" : "BLOCKED"}
    </span>
  );
}

export function BeastAdminNewsOperationsWorkspace({ status }: { status: NewsOperationsStatus | null }) {
  if (!status) {
    return (
      <section className="rounded-2xl border border-amber-300/20 bg-[#111827] p-5" aria-labelledby="news-ops-unavailable">
        <h2 id="news-ops-unavailable" className="text-xl font-black text-white">SEANGWORLD News Operations</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">The public-safe News operations projection is unavailable. This is not treated as zero or healthy. No secret or database fallback is attempted.</p>
      </section>
    );
  }

  const coverage = [
    ["Confirmed Sources", status.coverage.confirmedSources],
    ["Global Desks", status.coverage.globalDesks],
    ["Countries", status.coverage.countries],
    ["States", status.coverage.states],
    ["Metro Regions", status.coverage.regions],
    ["Cities", status.coverage.cities],
  ] as const;
  const runtime = [
    ["Provider", status.factDesk.providerConfigured],
    ["Public read", status.factDesk.publicReadConfigured],
    ["Persistence", status.factDesk.persistenceConfigured],
    ["Candidate generation", status.factDesk.candidateGenerationConfigured],
    ["Public AI publishing", status.factDesk.publicPublishingEnabled],
  ] as const;

  return (
    <div className="space-y-6">
      <BeastAdminDataFreshness generatedAt={status.generatedAt} staleAfterHours={1} />

      <section className="rounded-2xl border border-cyan-300/20 bg-[#111827] p-5" aria-labelledby="news-coverage-heading">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">SEANGWORLD News</p>
        <h2 id="news-coverage-heading" className="mt-2 text-xl font-black text-white">Coverage & Source Intelligence</h2>
        <p className="mt-2 text-sm text-slate-300">{status.editorialPromise}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {coverage.map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>)}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(status.sourceHealth).map(([state, count]) => <div key={state} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"><span className="capitalize text-slate-300">{state}</span><span className="font-black text-white">{count}</span></div>)}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111827] p-5" aria-labelledby="news-fact-desk-heading">
        <h2 id="news-fact-desk-heading" className="text-xl font-black text-white">Fact Desk Runtime</h2>
        <p className="mt-2 text-sm text-slate-400">Ready through: <span className="font-black text-white">{status.factDesk.readiness.readyThrough}</span></p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {runtime.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-4"><span className="text-sm font-bold text-slate-300">{label}</span><BooleanState value={value} /></div>)}
        </div>
        {status.factDesk.readiness.blockers.length ? <p className="mt-4 text-sm text-amber-100">Current blockers: {status.factDesk.readiness.blockers.join(" · ")}</p> : null}
        <p className="mt-3 text-xs text-slate-500">Public auto-publishing: {status.publicAutoPublishing ? "enabled" : "disabled"}. This workspace is read-only and cannot change publication authority.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111827] p-5" aria-labelledby="news-newsroom-heading">
        <h2 id="news-newsroom-heading" className="text-xl font-black text-white">AI Newsroom</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 p-4"><p className="text-xs font-black uppercase text-slate-400">Staff</p><p className="mt-2 text-2xl font-black text-white">{status.newsroom.staffCount}</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="text-xs font-black uppercase text-slate-400">Version</p><p className="mt-2 font-black text-white">{status.newsroom.version}</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="text-xs font-black uppercase text-slate-400">Mode</p><p className="mt-2 font-black text-white">{status.newsroom.mode}</p></div>
          <div className="rounded-xl border border-white/10 p-4"><p className="text-xs font-black uppercase text-slate-400">Desks</p><p className="mt-2 font-black text-white">{status.newsroom.desks.join(" · ")}</p></div>
        </div>
      </section>
    </div>
  );
}
