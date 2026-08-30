"use client";

import Link from "next/link";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { developmentAgentProfiles, deriveDevelopmentAgentCanonicalState } from "@/lib/developmentAgentProfiles";
import type { BeastAdminCanonicalReadModel } from "@/lib/beastAdminCanonicalProjection";
import { AgentAvatar } from "@/app/components/agents/AgentExperience";
import { getDevelopmentAgentCapabilityAssessment } from "@/lib/developmentAgentCapabilityFramework";

export function DevelopmentAgentDirectory({ canonical }: { canonical: BeastAdminCanonicalReadModel }) {
  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Development agents"
        title="Governed agent roster"
        description="Orchestrator coordinates, Observer detects, Proposal Agent researches and recommends, Developer builds, Reviewer independently checks, Outcome Agent measures, and the owner authorizes. Profiles report accepted BeastFusion state and never create authority."
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-development-agent-roster="true">
        {developmentAgentProfiles.map((profile) => {
          const state = deriveDevelopmentAgentCanonicalState(profile, canonical);
          const assessment = getDevelopmentAgentCapabilityAssessment(profile.id);
          return (
            <Link
              key={profile.id}
              href={`/dashboard/admin/development/agents/${profile.id}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <AgentAvatar name={profile.name} accessibleLabel={profile.portraitAlt} imageUrl={profile.portraitUrl} size="lg" />
                  <h3 className="mt-3 text-xl font-black text-white">{profile.name}</h3>
                  <p className="mt-1 text-sm font-bold text-amber-200">{profile.title}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300">
                  {state.statusLabel}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{profile.role}</p>
              {assessment ? <p className="mt-3 text-xs font-bold text-cyan-200">Software {assessment.capabilityRelease} · Knight L{assessment.autonomy.level} self-assessed · {assessment.authority.classification}</p> : null}
              <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">
                Most recent governed package: {state.assignmentLabel}
              </p>
            </Link>
          );
        })}
      </div>
    </DashboardCard>
  );
}
