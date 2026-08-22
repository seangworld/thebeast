"use client";

import Link from "next/link";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  canonicalEvidenceHref,
  canonicalStatusLabel,
} from "@/lib/beastAdminCommandCenter";
import type { BeastAdminCanonicalReadModel } from "@/lib/beastAdminCanonicalProjection";
import { useBeastAdminCommandCenter } from "@/lib/useBeastAdminCommandCenter";

function formatTimestamp(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function EvidenceLink({
  reference,
  sourceCommit,
}: {
  reference: string | null | undefined;
  sourceCommit: string | null | undefined;
}) {
  if (!reference) return <span className="text-[#7f8da3]">No reference</span>;
  const href = canonicalEvidenceHref(reference, sourceCommit);
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all font-mono text-xs font-bold text-amber-200 underline decoration-amber-300/40 underline-offset-4"
    >
      {reference}
    </a>
  ) : (
    <span className="break-all font-mono text-xs text-slate-300">{reference}</span>
  );
}

function SourceGap({ detail, onRetry }: { detail: string; onRetry: () => void }) {
  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Canonical command center"
        title="Canonical governance unavailable"
        description={detail}
      />
      <p className="mt-4 text-sm leading-6 text-slate-300">
        The Development Console fails closed. Legacy roadmap rows and operational
        release notes are not used as governance truth.
      </p>
      <button type="button" onClick={onRetry} className="beast-button mt-5">
        Retry canonical source
      </button>
    </DashboardCard>
  );
}

function WorkList({
  title,
  items,
}: {
  title: string;
  items: Array<{
    package: string | null;
    product: string | null;
    reason: string | null;
    ownerDecisionRequired?: boolean;
    blockingDependencies?: string[];
  }>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="font-black text-white">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item.package || item.product || title}-${index}`} className="rounded-lg border border-white/10 bg-[#0b1220] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-black text-amber-200">
                  {item.package || "No package"}
                </span>
                {item.product ? <span className="text-xs text-slate-400">{item.product}</span> : null}
                {item.ownerDecisionRequired ? (
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] font-black text-amber-100">
                    Owner decision
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {item.reason || "No canonical reason recorded."}
              </p>
              {item.blockingDependencies?.length ? (
                <p className="mt-2 text-xs text-slate-400">
                  Dependencies: {item.blockingDependencies.join(", ")}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">None reported by the canonical projection.</p>
        )}
      </div>
    </div>
  );
}

function ProjectionIdentity({ canonical }: { canonical: BeastAdminCanonicalReadModel }) {
  const projection = canonical.projection;
  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Projection identity and freshness"
        title="Exact canonical source"
        description="These values identify the immutable BeastFusion snapshot currently accepted by BeastAdmin."
      />
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Provider", canonicalStatusLabel(canonical.provider.status)],
          ["Projection ID", projection?.projectionId || canonical.provider.projectionId || "Unavailable"],
          ["Source commit", projection?.sourceCommit || "Unavailable"],
          ["Repository", projection ? `${projection.repository} · ${projection.branch}` : "Unavailable"],
          ["Generated", formatTimestamp(projection?.generatedAt)],
          ["Accepted", formatTimestamp(projection?.acceptedAt)],
          ["Last confirmed", formatTimestamp(projection?.lastConfirmedAt)],
          ["Projection version", projection?.projectionVersion || "Unavailable"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <dt className="text-xs font-black uppercase tracking-[0.16em] text-[#7f8da3]">{label}</dt>
            <dd className="mt-2 break-all text-sm font-bold text-white">{value}</dd>
          </div>
        ))}
      </dl>
    </DashboardCard>
  );
}

export function BeastAdminDevelopmentConsoleWorkspace() {
  const { canonical, loading, error, reload } = useBeastAdminCommandCenter();

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Canonical command center"
          title="Loading Development Console"
          description="BeastAdmin is loading the accepted BeastFusion projection."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      </DashboardCard>
    );
  }

  if (!canonical) return <SourceGap detail={error} onRetry={() => void reload()} />;

  const overview = canonical.executionOverview;
  const reconciliation = overview?.reconciliation;
  const sourceCommit = canonical.projection?.sourceCommit;
  const dependencyItems = canonical.roadmap.filter(
    (item) => item.dependencies.length || item.blocked
  );
  const history = [...canonical.execution]
    .sort((left, right) => (right.occurredAt || "").localeCompare(left.occurredAt || ""))
    .slice(0, 30);
  const governance = canonical.governance;
  const validation = canonical.validation;

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Canonical command center"
          title="Current governed development state"
          description="Roadmap, execution, release, package, dependency, and governance state comes only from the accepted BeastFusion projection."
        />
        <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Canonical cursor</p>
          <p className="mt-2 text-lg font-black text-white">
            {canonical.cursor.path.join(" → ") || canonicalStatusLabel(canonical.cursor.mode)}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {canonical.cursor.recommendedDirective || "No directive is currently supported."}
          </p>
          <p className="mt-3 text-xs font-bold text-slate-400">
            Executable package: {canonical.cursor.executableWorkAvailable ? canonical.cursor.selectedPackage || "Selected" : "None"}
          </p>
        </div>
      </DashboardCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Package progress">
        <MetricTile label="Packages indexed" value={String(reconciliation?.total ?? 0)} detail="Canonical package reconciliation" icon="📦" tone="yellow" />
        <MetricTile label="Completed" value={String(reconciliation?.completed ?? 0)} detail="Governed completion records" icon="✓" tone="yellow" />
        <MetricTile label="Remaining" value={String(reconciliation?.remaining ?? 0)} detail="Not complete; not automatically executable" icon="◷" tone="yellow" />
        <MetricTile label="Blocked / waiting" value={String((overview?.blocked.length ?? 0) + (overview?.waiting.length ?? 0))} detail="Explicit canonical constraints" icon="!" tone="yellow" />
      </section>

      <ProjectionIdentity canonical={canonical} />

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Execution gates"
          title="Blocked, waiting, and next work"
          description="This view reports governed state and owner decisions; it does not execute Git, deployments, or database changes."
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <WorkList title="Blocked work" items={overview?.blocked ?? []} />
          <WorkList title="Waiting work" items={overview?.waiting ?? []} />
          <WorkList title="Canonical next five" items={overview?.nextFive ?? []} />
        </div>
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Dependencies"
          title="Package and roadmap dependency view"
          description="Dependencies and blockers are projected from BeastFusion; missing entries are not inferred."
          action={<Link href="/dashboard/admin/roadmap" className="beast-button">Open canonical roadmap</Link>}
        />
        <div
          className="mt-5 overflow-x-auto rounded-xl border border-white/10"
          tabIndex={0}
          aria-label="Canonical dependency table, horizontally scrollable"
        >
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-[#7f8da3]">
              <tr><th className="px-4 py-3">Package</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Dependencies</th><th className="px-4 py-3">Blockers</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {dependencyItems.length ? dependencyItems.slice(0, 50).map((item) => (
                <tr key={item.id} className="text-slate-300">
                  <td className="px-4 py-3"><span className="font-mono text-xs font-black text-amber-200">{item.id}</span><p className="mt-1 text-white">{item.title}</p></td>
                  <td className="px-4 py-3">{canonicalStatusLabel(item.status)}</td>
                  <td className="px-4 py-3">{item.dependencies.join(", ") || "None"}</td>
                  <td className="px-4 py-3">{item.blockerCodes?.join(", ") || (item.blocked ? "Blocked" : "None")}</td>
                </tr>
              )) : <tr><td colSpan={4} className="px-4 py-6 text-slate-400">No dependency or blocker entries are present.</td></tr>}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <section id="development-history" className="scroll-mt-6">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Development History"
            title="Canonical governed execution history"
            description="This is development history from BeastFusion. Digital Professional Execution History remains a separate member-execution workspace."
          />
          <div className="mt-5 space-y-3">
          {history.length ? history.map((event) => (
            <article key={event.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0"><p className="font-mono text-xs font-black text-amber-200">{event.package || event.id}</p><h3 className="mt-1 font-black text-white">{canonicalStatusLabel(event.status)}</h3></div>
                <time className="text-xs text-slate-400">{formatTimestamp(event.occurredAt)}</time>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{event.result}</p>
              {event.candidateCommit ? <div className="mt-3"><EvidenceLink reference={`commit:${event.candidateCommit}`} sourceCommit={sourceCommit} /></div> : null}
            </article>
          )) : <p className="text-sm text-slate-400">No canonical development events are present.</p>}
          </div>
        </DashboardCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard accent="admin">
          <SectionHeader eyebrow="Governance health" title="Registry, BeastShield, and agent policy" description="Governance declarations are shown with their exact bounded meaning; they are not live-control verification." />
          <dl className="mt-5 space-y-3 text-sm">
            {[
              ["Governance registry", governance?.registryVersion || "Unavailable"],
              ["Package registry", governance?.packageRegistryVersion || "Unavailable"],
              ["Execution state", governance?.executionStateVersion || "Unavailable"],
              ["Validator", governance ? canonicalStatusLabel(governance.validatorState) : "Unavailable"],
              ["Dependency integrity", governance ? canonicalStatusLabel(governance.dependencyIntegrity) : "Unavailable"],
              ["BeastShield", governance ? canonicalStatusLabel(governance.beastShieldState) : "Unavailable"],
              ["Automation", governance?.automationEnabled ? "Enabled" : "Disabled"],
              ["Autonomous execution", governance?.autonomousExecution ? "Enabled" : "Prohibited"],
              ["Deployment capability", governance?.deploymentCapability ? "Enabled" : "Not granted"],
            ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-slate-400">{label}</dt><dd className="text-right font-bold text-white">{value}</dd></div>)}
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-400">{governance?.beastShieldMeaning ? canonicalStatusLabel(governance.beastShieldMeaning) : "BeastShield meaning unavailable."}</p>
        </DashboardCard>

        <DashboardCard accent="admin">
          <SectionHeader eyebrow="Validation health" title="Projection and governed evidence" description="Current projection validity is distinct from repository CI and Production provider evidence shown above." />
          <dl className="mt-5 space-y-3 text-sm">
            {[
              ["Projection schema", validation?.projectionSchema || "Unavailable"],
              ["Projection generated", validation?.projectionGenerated ? "Passed" : "Unavailable"],
              ["Canonical consistency", validation ? canonicalStatusLabel(validation.canonicalConsistency) : "Unavailable"],
              ["Recorded test count", validation?.testCount === null || validation?.testCount === undefined ? "Not recorded" : String(validation.testCount)],
              ["Last governed date", validation?.lastGovernedEvidenceDate || "Unavailable"],
            ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 border-b border-white/10 pb-3"><dt className="text-slate-400">{label}</dt><dd className="max-w-[65%] break-all text-right font-bold text-white">{value}</dd></div>)}
          </dl>
          <div className="mt-4"><EvidenceLink reference={validation?.lastGovernedEvidenceReference} sourceCommit={sourceCommit} /></div>
        </DashboardCard>
      </div>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Canonical record drill-down"
          title="Allowlisted BeastFusion source records"
          description="Only paths included in the validated projection manifest are linked at the exact source commit. Arbitrary repository paths are not accepted."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(canonical.records ?? []).map((record) => (
            <div key={record.id} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7f8da3]">{canonicalStatusLabel(record.role)}</p>
              <div className="mt-2"><EvidenceLink reference={record.path} sourceCommit={sourceCommit} /></div>
              <p className="mt-2 break-all font-mono text-[11px] text-slate-500">{record.digest}</p>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
