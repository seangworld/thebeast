import { BeastAdminShell } from "../BeastAdminShell";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminPlannedWorkspaces,
  beastAdminPlannedWorkspaceStatusDescriptions,
  type BeastAdminPlannedWorkspaceStatus,
} from "@/lib/beastAdminPlannedWorkspaces";

const statusLabels: Record<BeastAdminPlannedWorkspaceStatus, string> = {
  deferred: "Deferred",
  planning: "Planning",
  research: "Research",
  future: "Future",
};

export default function BeastAdminPlannedWorkspacesPage() {
  return (
    <BeastAdminShell
      title="Planned Workspaces"
      purpose="A read-only registry of intentionally deferred capabilities and the conditions required before implementation begins."
    >
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="BA-126 · Roadmap documentation"
          title="Deferred work has an explicit place"
          description="These summaries do not activate features or replace an approved roadmap item."
        />
      </DashboardCard>
      <section
        className="grid min-w-0 gap-5 lg:grid-cols-2"
        aria-label="Planned workspace registry"
      >
        {beastAdminPlannedWorkspaces.map((workspace) => (
          <DashboardCard key={workspace.id} accent="admin" className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/80">
                  Planned workspace
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {workspace.name}
                </h2>
              </div>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-slate-200">
                {statusLabels[workspace.status]}
              </span>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-200">
              {workspace.purpose}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {workspace.reason}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Dependencies
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-200">
              {workspace.dependencies.map((dependency) => (
                <li key={dependency}>• {dependency}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-300">
              {workspace.targetMilestone}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              {beastAdminPlannedWorkspaceStatusDescriptions[workspace.status]}
            </p>
          </DashboardCard>
        ))}
      </section>
    </BeastAdminShell>
  );
}
