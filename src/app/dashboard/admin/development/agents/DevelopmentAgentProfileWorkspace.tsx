"use client";

import Link from "next/link";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { deriveDevelopmentAgentCanonicalState, type DevelopmentAgentProfile } from "@/lib/developmentAgentProfiles";
import { useBeastAdminCommandCenter } from "@/lib/useBeastAdminCommandCenter";
import { StaffOperationsWorkspace } from "../StaffOperationsWorkspace";
import { AgentAvatar } from "@/app/components/agents/AgentExperience";
import { getDevelopmentAgentCapabilityAssessment } from "@/lib/developmentAgentCapabilityFramework";

function ListCard({ title, items }: { title: string; items: readonly string[] }) {
  if (!items.length) return null;
  return <DashboardCard accent="admin"><h2 className="text-lg font-black text-white">{title}</h2><ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">{items.map((item) => <li key={item}>• {item}</li>)}</ul></DashboardCard>;
}

export function DevelopmentAgentProfileWorkspace({ profile }: { profile: DevelopmentAgentProfile }) {
  const { canonical, loading, error, reload } = useBeastAdminCommandCenter();
  const state = deriveDevelopmentAgentCanonicalState(profile, canonical);
  const assessment = getDevelopmentAgentCapabilityAssessment(profile.id);

  return <div className="space-y-6">
    <Link href="/dashboard/admin/development" className="inline-flex text-sm font-bold text-amber-200 hover:text-amber-100">← Development Console</Link>
    <DashboardCard accent="admin">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AgentAvatar name={profile.name} accessibleLabel={profile.portraitAlt} imageUrl={profile.portraitUrl} size="lg" />
        <SectionHeader eyebrow="Persistent development-agent profile" title={profile.name} description={profile.title} />
      </div>
      <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-300">{profile.purpose}</p>
      <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Authority boundary</p>
        <p className="mt-2 font-bold leading-6 text-white">{profile.authorityBoundary}</p>
      </div>
    </DashboardCard>

    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Role", profile.role], ["Current status", loading ? "Loading canonical status" : state.statusLabel], ["Current / recent work", state.assignmentLabel], ["Current / recent verdict", state.verdictLabel || "Not applicable"]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-[#111827] p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-2 text-sm font-bold leading-6 text-white">{value}</dd></div>)}
    </dl>
    {assessment ? <>
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="BF-AGT-013 capability evidence" title="Software, capability, autonomy, and authority" description="These are separate claims. The autonomy level is a BeastFusion self-assessment against a published framework, not a certification or authority grant." />
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Software generation", assessment.softwareGeneration], ["Capability evidence", "OpenAI four qualitative dimensions"], ["Designed autonomy", `Knight L${assessment.autonomy.level} · user as ${assessment.autonomy.userRole}`], ["Canonical authority", assessment.authority.classification]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-2 text-sm font-bold leading-6 text-white">{value}</dd></div>)}
        </dl>
        <p className="mt-4 text-xs leading-5 text-slate-400">Assessed {assessment.assessedAt} · {assessment.assessedVersion}</p>
      </DashboardCard>
      <div className="grid gap-4 lg:grid-cols-2">
        {assessment.capability.map((item) => <DashboardCard key={item.dimension} accent="admin"><h2 className="text-lg font-black text-white">{item.label}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{item.demonstrated}</p><p className="mt-3 text-xs leading-5 text-slate-400">Limitation: {item.limitation}</p></DashboardCard>)}
      </div>
    </> : null}
    {profile.id === "observer-agent" || profile.id === "proposal-agent" ? <StaffOperationsWorkspace compact /> : null}

    {!canonical ? <DashboardCard accent="admin"><SectionHeader eyebrow="Fail-closed state" title="Canonical governance unavailable" description={error || state.sourceDetail} /><button type="button" onClick={() => void reload()} className="beast-button mt-4">Retry canonical source</button></DashboardCard> : null}

    <div className="grid gap-4 lg:grid-cols-2">
      <ListCard title="What this agent can do" items={profile.responsibilities} />
      <ListCard title="What this agent cannot do" items={profile.limitations} />
      <ListCard title="Review dimensions" items={profile.reviewDimensions} />
      <ListCard title="Verdict model" items={profile.verdictModel} />
      <ListCard title="Escalation conditions" items={profile.escalationConditions} />
      <DashboardCard accent="admin"><h2 className="text-lg font-black text-white">Working relationships</h2><dl className="mt-3 grid gap-3">{profile.relationships.map((relationship) => <div key={relationship.label}><dt className="text-sm font-black text-amber-100">{relationship.label}</dt><dd className="mt-1 text-sm leading-6 text-slate-300">{relationship.detail}</dd></div>)}</dl></DashboardCard>
    </div>

    <DashboardCard accent="admin">
      <SectionHeader eyebrow="Canonical evidence" title="Validation and recent activity" description={state.sourceDetail} />
      <p className="mt-4 text-sm leading-6 text-slate-300">{state.validationSummary}</p>
      {state.evidenceReference ? <p className="mt-3 break-all font-mono text-xs text-amber-200">Evidence: {state.evidenceReference}</p> : null}
      <div className="mt-5 space-y-3">{state.recentActivity.length ? state.recentActivity.map((event) => <article key={event.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><p className="font-mono text-xs font-black text-amber-200">{event.package || event.id}</p><p className="mt-2 text-sm leading-6 text-slate-300">{event.result}</p></article>) : <p className="text-sm text-slate-400">No agent-specific activity is present in the accepted projection. No activity is inferred.</p>}</div>
    </DashboardCard>
  </div>;
}
