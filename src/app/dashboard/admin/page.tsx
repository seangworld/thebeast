import Link from "next/link";
import {
  AlertCard,
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { BeastAdminShell } from "./BeastAdminShell";
import { buildBeastAdminExecutiveSnapshot } from "@/lib/beastAdminExecutive";
import {
  getModuleVisibilityLabel,
  type BeastModuleRegistryEntry,
} from "@/lib/moduleRegistry";

const statusClasses = {
  active: "border-green-400/35 bg-green-400/10 text-green-100",
  foundation: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  planned: "border-[#38bdf8]/35 bg-[#38bdf8]/10 text-[#bae6fd]",
  disabled: "border-red-400/35 bg-red-400/10 text-red-100",
} as const;

function formatReleaseDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function AdminSectionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/20"
    >
      {children}
    </Link>
  );
}

function ModuleStatusRow({ module }: { module: BeastModuleRegistryEntry }) {
  return (
    <li className="grid gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-white">{module.name}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-black uppercase ${statusClasses[module.status]}`}
          >
            {module.status}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
          {module.version} · {getModuleVisibilityLabel(module.visibility)}
        </p>
      </div>
      <p className="text-sm font-bold text-[#dbe3ef]">
        {module.enabled ? "Enabled" : "Disabled"}
      </p>
    </li>
  );
}

export default function BeastAdminDashboardPage() {
  const snapshot = buildBeastAdminExecutiveSnapshot();
  const attentionCount =
    snapshot.platformHealth.observabilityGaps.length +
    snapshot.featureProgress.disabled.length;
  const progressSections: {
    label: string;
    modules: BeastModuleRegistryEntry[];
    status: keyof typeof statusClasses;
  }[] = [
    {
      label: "Operating",
      modules: snapshot.featureProgress.operating,
      status: "active",
    },
    {
      label: "Foundations",
      modules: snapshot.featureProgress.foundations,
      status: "foundation",
    },
    {
      label: "Planned",
      modules: snapshot.featureProgress.planned,
      status: "planned",
    },
    {
      label: "Disabled",
      modules: snapshot.featureProgress.disabled,
      status: "disabled",
    },
  ];

  return (
    <BeastAdminShell
      title="Executive Dashboard"
      description="A 30-second owner view of platform visibility, members, modules, releases, feature progress, beta activity, and the operational data BeastAdmin still needs."
    >
      <DashboardCard accent={snapshot.platformHealth.tone}>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <p className="beast-kicker">Platform Status · Executive readout</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {snapshot.platformHealth.label}
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-[#dbe3ef]">
              {snapshot.platformHealth.summary}
            </p>
            <p className="mt-3 text-sm text-[#9aa7b8]">
              Platform Health reflects the sources BeastAdmin can verify. It is
              not a claim of production uptime.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                Attention
              </p>
              <p className="mt-2 text-3xl font-black text-white">{attentionCount}</p>
              <p className="mt-1 text-sm text-[#c7cfdb]">
                Visibility or module issues requiring owner awareness
              </p>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                Registry coverage
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {snapshot.platformHealth.enabledModules}/
                {snapshot.platformHealth.registeredModules}
              </p>
              <p className="mt-1 text-sm text-[#c7cfdb]">Registered modules enabled</p>
            </div>
          </div>
        </div>
      </DashboardCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Executive metrics">
        <MetricTile
          label="Platform Health"
          value={snapshot.platformHealth.label}
          detail={`${snapshot.platformHealth.observabilityGaps.length} observability gaps`}
          icon="H"
          tone={snapshot.platformHealth.tone}
        />
        <MetricTile
          label="Members"
          value={String(snapshot.members.total)}
          detail={`${snapshot.members.active} active · ${snapshot.members.invited} invited`}
          icon="M"
          tone="blue"
        />
        <MetricTile
          label="Active Modules"
          value={`${snapshot.modules.enabled}/${snapshot.modules.entries.length}`}
          detail={`${snapshot.modules.byStatus.active} operating · ${snapshot.modules.byStatus.foundation} foundations`}
          icon="S"
          tone="green"
        />
        <MetricTile
          label="Beta Testers"
          value={String(snapshot.betaActivity.assignedMembers)}
          detail={`${snapshot.betaActivity.assignments.length} assignments · ${snapshot.betaActivity.openFeedback.length} open feedback`}
          icon="B"
          tone="purple"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2" aria-label="AI Usage and Errors">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Platform Health"
            title="What BeastAdmin can verify"
            description="Configuration is visible. Runtime observability remains incomplete until centralized usage and error feeds are connected."
            action={<AdminSectionLink href="/dashboard/admin/health">Open Platform Health</AdminSectionLink>}
          />
          <div className="mt-5 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-400/25 bg-green-400/10 p-4">
              <div>
                <p className="font-black text-white">Module registry</p>
                <p className="mt-1 text-sm text-[#c7cfdb]">
                  {snapshot.modules.enabled} of {snapshot.modules.entries.length} entries enabled
                </p>
              </div>
              <span className="rounded-full border border-green-400/35 px-3 py-1 text-xs font-black text-green-100">
                Visible
              </span>
            </div>
            {snapshot.platformHealth.observabilityGaps.map((gap) => (
              <AlertCard
                key={gap}
                severity="warning"
                title={`${gap} feed not connected`}
                message={`BeastAdmin cannot confirm ${gap.toLowerCase()} from a centralized operational source yet.`}
              />
            ))}
          </div>
        </DashboardCard>

        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Members"
            title="Known member records"
            description={snapshot.members.sourceLabel}
            action={
              <div className="flex flex-wrap gap-2">
                <AdminSectionLink href="/dashboard/admin/metrics">
                  Open Metrics
                </AdminSectionLink>
                <AdminSectionLink href="/dashboard/admin/members">
                  Open Members
                </AdminSectionLink>
              </div>
            }
          />
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Total", snapshot.members.total],
              ["Active", snapshot.members.active],
              ["Invited", snapshot.members.invited],
              ["Paused", snapshot.members.paused],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                  {label}
                </dt>
                <dd className="mt-2 text-2xl font-black text-white">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-6 text-[#9aa7b8]">
            These totals come from the configured BeastAdmin registry, not a
            live production-member directory.
          </p>
        </DashboardCard>
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Module Status"
          title="The Beast ecosystem at a glance"
          description="Version, lifecycle state, visibility, and enablement come from the canonical module registry."
          action={<AdminSectionLink href="/dashboard/admin/modules">Open Modules</AdminSectionLink>}
        />
        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {snapshot.modules.entries.map((module) => (
            <ModuleStatusRow key={module.identifier} module={module} />
          ))}
        </ul>
      </DashboardCard>

      <section className="grid gap-4 xl:grid-cols-2">
        {[snapshot.aiUsage, snapshot.errors].map((source) => (
          <DashboardCard
            key={source.label}
            accent={source.state === "connected" ? "green" : "yellow"}
          >
            <SectionHeader
              eyebrow={source.label}
              title={source.value}
              description={source.detail}
            />
            <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-amber-100">
                Connection needed
              </p>
              <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                Choose an owner-approved centralized source before BeastAdmin
                reports counts, trends, cost, rate, or severity.
              </p>
            </div>
          </DashboardCard>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Recent Releases"
            title="Canonical release identities"
            description="Latest dated products from the generated Beast ecosystem version manifest."
            action={<AdminSectionLink href="/dashboard/admin/releases">Open Release Center</AdminSectionLink>}
          />
          <ol className="mt-5 divide-y divide-[#2a3242]">
            {snapshot.recentReleases.map((release) => (
              <li key={release.buildId} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-black text-white">
                    {release.name} v{release.version}
                  </p>
                  <p className="mt-1 break-all text-xs text-[#7f8da3]">{release.buildId}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-bold text-[#dbe3ef]">{release.channel}</p>
                  <p className="mt-1 text-xs text-[#9aa7b8]">
                    {release.releaseDate ? formatReleaseDate(release.releaseDate) : "Undated"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </DashboardCard>

        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Feature Progress"
            title="Lifecycle distribution"
            description="Registry lifecycle states show operating modules and foundations without converting them into unsupported completion percentages."
            action={<AdminSectionLink href="/dashboard/admin/roadmap">Manage Roadmap</AdminSectionLink>}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {progressSections.map(({ label, modules, status }) => (
              <div key={label} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-white">{label}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClasses[status]}`}>
                    {modules.length}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
                  {modules.length
                    ? modules.map((module) => module.name).join(", ")
                    : `No modules currently marked ${String(label).toLowerCase()}.`}
                </p>
              </div>
            ))}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Beta Activity"
          title="Recent Activity: assignments and open feedback"
          description="Current beta assignments and unresolved feedback from the BeastAdmin operating registry."
          action={<AdminSectionLink href="/dashboard/admin/feedback">Open Feedback</AdminSectionLink>}
        />
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
              Assignments
            </p>
            <div className="mt-3 grid gap-3">
              {snapshot.betaActivity.assignments.length ? (
                snapshot.betaActivity.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <p className="font-black text-white">{assignment.memberName}</p>
                    <p className="mt-1 text-sm text-[#c7cfdb]">
                      {assignment.moduleName} · {assignment.memberRole}
                    </p>
                    <p className="mt-2 text-xs text-[#7f8da3]">
                      Assigned {formatReleaseDate(assignment.assignedAt.slice(0, 10))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-[#2a3242] p-4 text-sm text-[#9aa7b8]">
                  No beta assignments are recorded.
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
              Open feedback
            </p>
            <div className="mt-3 grid gap-3">
              {snapshot.betaActivity.openFeedback.length ? (
                snapshot.betaActivity.openFeedback.map((item) => (
                  <article key={item.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-white">{item.module}</p>
                      <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-0.5 text-xs font-black text-amber-100">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">{item.summary}</p>
                    <p className="mt-2 text-xs text-[#7f8da3]">
                      {item.user} · {formatReleaseDate(item.date)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-[#2a3242] p-4 text-sm text-[#9aa7b8]">
                  No unresolved feedback is recorded.
                </p>
              )}
            </div>
          </div>
        </div>
        <p className="mt-5 border-t border-[#2a3242] pt-4 text-xs leading-5 text-[#7f8da3]">
          Dashboard evolution: BA-101 replaces the BeastAdmin Phase A placeholder
          with source-backed executive visibility while preserving owner-only access.
        </p>
      </DashboardCard>
    </BeastAdminShell>
  );
}
