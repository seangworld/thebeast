import type { FirstPartyTelemetrySnapshot } from "@/lib/firstPartyTelemetry";

function count(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function rate(value: number | null) {
  return value === null ? "Insufficient data" : `${(value * 100).toFixed(1)}%`;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1220] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

const professionalLabels = {
  fusion_director: "Director",
  money_coach: "Money Coach",
  guidance_counselor: "Guidance Counselor",
  health_advisor: "Health Advisor",
};

export function FirstPartyTelemetryPanels({ data }: { data: FirstPartyTelemetrySnapshot | null }) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-dashed border-white/15 p-5">
        <h2 className="text-xl font-black text-white">Authenticated member telemetry</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          No verified first-party aggregate is available. Public GA4 users are not treated as Beast members.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5" aria-labelledby="member-telemetry-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Members · First-party only</p>
          <h2 id="member-telemetry-heading" className="mt-2 text-2xl font-black text-white">Registration to reliable value</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Authenticated Beast members are counted from canonical records and bounded operational events. GA4 visitors and Search Console users are never identity-stitched into these totals.
          </p>
        </div>
        <span className="rounded-full border border-cyan-200/25 px-3 py-1 text-xs font-bold text-cyan-100">
          {data.historicalTreatment.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Registered members" value={count(data.members.registered)} detail="Non-admin Beast accounts" />
        <Metric label="Verified members" value={count(data.members.verified)} detail="Accounts with canonical email verification" />
        <Metric label="Activated members" value={count(data.members.activated)} detail="Onboarding complete plus one meaningful action" />
        <Metric label="Activation rate" value={rate(data.members.activationRate)} detail="Activated ÷ onboarding-complete members" />
        <Metric label="DAU" value={count(data.activity.dau)} detail="Unique meaningful members today" />
        <Metric label="WAU" value={count(data.activity.wau)} detail="Unique meaningful members in trailing 7 days" />
        <Metric label="MAU" value={count(data.activity.mau)} detail="Unique meaningful members in trailing 30 days" />
        <Metric label="Owner/Admin" value={count(data.ownerAdmin.meaningfulActions)} detail={`${count(data.ownerAdmin.accounts)} admin account(s), excluded from member adoption`} />
      </div>

      <details className="mt-5 rounded-xl border border-white/10 bg-[#111827] p-4" open>
        <summary className="cursor-pointer font-black text-white">Signup → activation funnel and retention</summary>
        <p className="mt-3 text-xs leading-5 text-slate-400">Day 1, Day 7, and Day 30 retention use exact return-day windows and suppress percentages below the minimum cohort.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto" tabIndex={0} aria-label="Authenticated member funnel table, horizontally scrollable">
            <table className="min-w-[32rem] w-full text-left text-sm">
              <thead className="text-slate-400"><tr><th className="p-3">Stage</th><th className="p-3">Members</th></tr></thead>
              <tbody>{data.funnel.map((stage) => <tr key={stage.stage} className="border-t border-white/10 text-slate-200"><td className="p-3 capitalize">{stage.stage.replaceAll("_", " ")}</td><td className="p-3 font-black">{count(stage.count)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="grid gap-3">
            {data.retention.map((item) => (
              <div key={item.day} className="rounded-xl border border-white/10 bg-[#0b1220] p-4">
                <div className="flex items-center justify-between gap-3"><p className="font-black text-white">Day {item.day} retention</p><p className="font-black text-cyan-100">{rate(item.rate)}</p></div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{item.returnedMembers} of {item.eligibleMembers} eligible activated members returned on Day {item.day}. {item.status === "insufficient_data" ? `At least ${data.minimumCohortSize} eligible members are required before showing a percentage.` : "Minimum cohort threshold met."}</p>
              </div>
            ))}
          </div>
        </div>
      </details>

      <details className="mt-4 rounded-xl border border-white/10 bg-[#111827] p-4">
        <summary className="cursor-pointer font-black text-white">Product usage and cross-module adoption</summary>
        <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Module adoption table, horizontally scrollable">
          <table className="min-w-[42rem] w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="p-3">Module</th><th className="p-3">Activated members</th><th className="p-3">Meaningful actions</th><th className="p-3">Adoption</th></tr></thead>
            <tbody>{data.moduleAdoption.map((module) => <tr key={module.moduleId} className="border-t border-white/10 text-slate-200"><td className="p-3 font-black">{module.moduleLabel}</td><td className="p-3">{count(module.activatedMembers)}</td><td className="p-3">{count(module.meaningfulActions)}</td><td className="p-3">{rate(module.adoptionRate)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {data.crossModuleAdoption.map((item) => <Metric key={item.minimumModules} label={`${item.minimumModules}+ modules`} value={item.status === "available" ? rate(item.rate) : "Cohort too small"} detail={`${item.memberCount} activated member(s); individual module combinations are never shown`} />)}
        </div>
      </details>

      <details className="mt-4 rounded-xl border border-white/10 bg-[#111827] p-4">
        <summary className="cursor-pointer font-black text-white">Digital Professional usage</summary>
        <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Digital Professional aggregate usage table, horizontally scrollable">
          <table className="min-w-[58rem] w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="p-3">Professional</th><th className="p-3">Initiated</th><th className="p-3">Completed</th><th className="p-3">Failures</th><th className="p-3">Timeouts</th><th className="p-3">Ordinary / Strong</th><th className="p-3">Median / P95 latency</th></tr></thead>
            <tbody>{data.professionalUsage.map((professional) => <tr key={professional.professionalId} className="border-t border-white/10 text-slate-200"><td className="p-3 font-black">{professionalLabels[professional.professionalId]}</td><td className="p-3">{count(professional.turnsInitiated)}</td><td className="p-3">{count(professional.turnsCompleted)}</td><td className="p-3">{count(professional.failures)}</td><td className="p-3">{count(professional.timeouts)}</td><td className="p-3">{professional.ordinaryRoutes} / {professional.strongRoutes}</td><td className="p-3">{professional.medianLatencyMs === null ? "No data" : `${professional.medianLatencyMs} ms`} / {professional.p95LatencyMs === null ? "No data" : `${professional.p95LatencyMs} ms`}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-400">Conversation text, prompts, responses, and member identity are not part of this aggregate.</p>
      </details>

      <details className="mt-4 rounded-xl border border-white/10 bg-[#111827] p-4">
        <summary className="cursor-pointer font-black text-white">Reliability and data governance</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Successful operations" value={count(data.reliability.successfulOperations)} detail="Bounded operational outcomes" />
          <Metric label="Failures" value={count(data.reliability.failures)} detail="Safe categorical failures only" />
          <Metric label="Timeouts" value={count(data.reliability.timeouts)} detail="Provider/runtime timeout category" />
          <Metric label="Failure rate" value={rate(data.reliability.failureRate)} detail="Failures ÷ recorded operational outcomes" />
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">Raw bounded events are excluded from aggregates after {data.rawEventRetentionDays} days. Canonical source records retain their own product policies. Event rows contain no arbitrary JSON, content, names, emails, financial values, health details, education details, document contents, or authentication/provider secrets.</p>
      </details>
    </section>
  );
}
