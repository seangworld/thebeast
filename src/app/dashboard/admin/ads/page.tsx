import { BeastAdminShell } from "../BeastAdminShell";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminPlannedWorkspaces,
  beastAdminPlannedWorkspaceStatusDescriptions,
  beastAdminPlannedWorkspaceStatuses,
  type BeastAdminPlannedWorkspaceStatus,
} from "@/lib/beastAdminPlannedWorkspaces";

const statusLabels: Record<BeastAdminPlannedWorkspaceStatus, string> = {
  deferred: "Deferred",
  planning: "Planning",
  research: "Research",
  future: "Future",
};

const statusClasses: Record<BeastAdminPlannedWorkspaceStatus, string> = {
  deferred: "border-slate-300/30 bg-slate-300/10 text-slate-100",
  planning: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  research: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  future: "border-sky-300/35 bg-sky-300/10 text-sky-100",
};

export default function BeastAdminPlannedWorkspacesPage() {
  return (
    <BeastAdminShell
      title="Planned Workspaces"
      description="A read-only registry of intentionally deferred capabilities and the conditions required before implementation begins."
    >
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="BA-126 · Roadmap documentation"
          title="Deferred work has an explicit place"
          description="These summaries document purpose, status, and dependencies. They do not activate features, create implementation commitments, or replace an approved roadmap item."
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {beastAdminPlannedWorkspaceStatuses.map((status) => (
            <div
              key={status}
              className="min-w-0 rounded-xl border border-white/10 bg-black/15 p-4"
            >
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
              >
                {statusLabels[status]}
              </span>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {beastAdminPlannedWorkspaceStatusDescriptions[status]}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      <section
        className="grid min-w-0 gap-5 lg:grid-cols-2"
        aria-label="Planned workspace registry"
      >
        {beastAdminPlannedWorkspaces.map((workspace) => (
          <DashboardCard key={workspace.id} accent="admin" className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/80">
                  Planned workspace
                </p>
                <h2 className="mt-2 break-words text-xl font-semibold text-white">
                  {workspace.name}
                </h2>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Current status
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[workspace.status]}`}
                >
                  {statusLabels[workspace.status]}
                </span>
              </div>
            </div>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Purpose
                </dt>
                <dd className="mt-2 break-words text-sm leading-6 text-slate-200">
                  {workspace.purpose}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Reason
                </dt>
                <dd className="mt-2 break-words text-sm leading-6 text-slate-200">
                  {workspace.reason}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Dependencies
                </dt>
                <dd className="mt-2">
                  <ul className="space-y-2 text-sm leading-6 text-slate-200">
                    {workspace.dependencies.map((dependency) => (
                      <li key={dependency} className="flex min-w-0 gap-2">
                        <span aria-hidden="true" className="text-amber-300">
                          •
                        </span>
                        <span className="min-w-0 break-words">{dependency}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Target milestone
                </dt>
                <dd className="mt-2 break-words text-sm leading-6 text-slate-200">
                  {workspace.targetMilestone}
                </dd>
              </div>
            </dl>
          </DashboardCard>
        ))}
      </section>
    </BeastAdminShell>
  );
}
