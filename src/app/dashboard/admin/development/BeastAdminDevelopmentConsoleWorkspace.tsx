"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  normalizeBeastAdminDevelopmentConsoleSnapshot,
  type BeastAdminDevelopmentConsoleSnapshot,
  type BeastAdminDevelopmentPrompt,
} from "@/lib/beastAdminDevelopmentConsole";
import type { BeastAdminRoadmapStatus } from "@/lib/beastAdminRoadmap";

const statusClasses: Record<BeastAdminRoadmapStatus, string> = {
  planned: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  in_progress: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  testing: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  released: "border-green-300/35 bg-green-300/10 text-green-100",
  archived: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

const repositoryStatusClasses = {
  clean: "border-green-300/30 bg-green-300/10 text-green-100",
  dirty: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  unavailable: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  planning: "border-sky-300/30 bg-sky-300/10 text-sky-100",
} as const;

function ConsoleLink({
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function humanizeConsoleError(status: number) {
  if (status === 401) return "Sign in again to open the Development Console.";
  if (status === 403) {
    return "The Development Console is restricted to the Beast owner.";
  }
  return "The Development Console could not load its verified sources. Retry in a moment.";
}

function PromptCard({
  prompt,
  compact = false,
}: {
  prompt: BeastAdminDevelopmentPrompt;
  compact?: boolean;
}) {
  return (
    <article className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
            {prompt.productLabel}
          </p>
          <h3 className="mt-1 font-black text-white">{prompt.title}</h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClasses[prompt.status]}`}
        >
          {prompt.statusLabel}
        </span>
      </div>
      {!compact && prompt.summary ? (
        <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
          {prompt.summary}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-[#68768b]">
        Updated {formatTimestamp(prompt.updatedAt)}
      </p>
    </article>
  );
}

function DevelopmentMetric({
  label,
  count,
  available,
  detail,
}: {
  label: string;
  count: number;
  available: boolean;
  detail: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">
        {available ? (count ? count : "None") : "Unavailable"}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">{detail}</p>
    </article>
  );
}

function MilestoneValue({
  label,
  value,
  empty,
}: {
  label: string;
  value: string | null;
  empty: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
        {label}
      </p>
      <p className="mt-2 break-words font-black text-white">{value || empty}</p>
    </div>
  );
}

export function BeastAdminDevelopmentConsoleWorkspace() {
  const [snapshot, setSnapshot] =
    useState<BeastAdminDevelopmentConsoleSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadConsole = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const response = await fetch("/api/admin/development-console", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(humanizeConsoleError(response.status));
      const payload = (await response.json()) as unknown;
      const normalized =
        normalizeBeastAdminDevelopmentConsoleSnapshot(payload);
      if (!normalized) {
        throw new Error("Development Console returned an invalid snapshot.");
      }
      setSnapshot(normalized);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The Development Console could not load."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadConsole(true);
  }, [loadConsole]);

  const openByStatus = useMemo(
    () => ({
      planned:
        snapshot?.openPrompts.filter((prompt) => prompt.status === "planned")
          .length || 0,
      inProgress:
        snapshot?.openPrompts.filter(
          (prompt) => prompt.status === "in_progress"
        ).length || 0,
      testing:
        snapshot?.openPrompts.filter((prompt) => prompt.status === "testing")
          .length || 0,
    }),
    [snapshot]
  );
  const activeSprintSummary = [
    openByStatus.inProgress
      ? `${openByStatus.inProgress} in progress`
      : "",
    openByStatus.testing ? `${openByStatus.testing} in testing` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  if (loading && !snapshot) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Development Console"
          title="Assembling delivery context"
          description="BeastAdmin is reading the owner roadmap, release history, generated versions, and deployment evidence."
        />
        <div
          className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-busy="true"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      </DashboardCard>
    );
  }

  if (!snapshot) {
    return (
      <DashboardCard accent="red">
        <SectionHeader
          eyebrow="Development Console"
          title="Development context unavailable"
          description={
            error ||
            "BeastAdmin did not receive a valid development snapshot."
          }
        />
        <button
          type="button"
          className="beast-button mt-5"
          onClick={() => void loadConsole()}
        >
          Retry
        </button>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard
        accent={snapshot.currentSprint.length ? "admin" : "yellow"}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <p className="beast-kicker">Current sprint</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {snapshot.currentSprint.length
                ? `${snapshot.currentSprint.length} roadmap item${
                    snapshot.currentSprint.length === 1 ? "" : "s"
                  } in active delivery`
                : snapshot.sources.roadmap === "unavailable"
                  ? "Current sprint unavailable"
                  : snapshot.completedPrompts.length
                    ? "The previous sprint has completed"
                    : snapshot.upcomingWork.length
                      ? "Awaiting selection of the next sprint"
                      : "No sprint has been defined yet"}
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-[#dbe3ef]">
              {snapshot.currentSprint.length
                ? `${activeSprintSummary}. Roadmap status remains the source of truth.`
                : snapshot.sources.roadmap === "available"
                  ? snapshot.upcomingWork.length
                    ? "Planned roadmap work is ready, but no item has been selected for active delivery."
                    : snapshot.completedPrompts.length
                      ? "No roadmap items are currently In Progress. Select the next milestone when planning is ready."
                      : "Add a roadmap milestone before beginning the first sprint."
                  : "The roadmap source must be restored before BeastAdmin can identify current sprint work."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ConsoleLink href="/dashboard/admin/roadmap">
              Manage Roadmap
            </ConsoleLink>
            <button
              type="button"
              className="beast-button-secondary min-h-10"
              disabled={refreshing}
              onClick={() => void loadConsole()}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        {snapshot.currentSprint.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.currentSprint.slice(0, 6).map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        ) : null}
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Current milestone"
          title="Development focus"
          description="The current focus comes from the most recently updated active roadmap item. Missing fields remain explicit."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MilestoneValue
            label="Current generation"
            value={snapshot.milestone.currentGeneration}
            empty="Not recorded in the active roadmap"
          />
          <MilestoneValue
            label="Current product"
            value={snapshot.milestone.currentProduct}
            empty="Awaiting sprint selection"
          />
          <MilestoneValue
            label="Current milestone"
            value={snapshot.milestone.currentMilestone}
            empty="No active milestone"
          />
          <MilestoneValue
            label="Next planned milestone"
            value={snapshot.milestone.nextPlannedMilestone}
            empty={
              snapshot.sources.roadmap === "available"
                ? "No planned milestone"
                : "Roadmap source unavailable"
            }
          />
        </div>
      </DashboardCard>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300/35 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100"
        >
          {error} The last successful snapshot remains visible.
        </p>
      ) : null}

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Development pipeline totals"
      >
        <DevelopmentMetric
          label="Open prompts"
          count={snapshot.openPrompts.length}
          available={snapshot.sources.roadmap === "available"}
          detail={
            snapshot.sources.roadmap === "unavailable"
              ? "Roadmap data is unavailable."
              : snapshot.openPrompts.length
                ? [
                    openByStatus.planned
                      ? `${openByStatus.planned} planned`
                      : "",
                    openByStatus.inProgress
                      ? `${openByStatus.inProgress} active`
                      : "",
                    openByStatus.testing
                      ? `${openByStatus.testing} testing`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "No roadmap items are currently open."
          }
        />
        <DevelopmentMetric
          label="Completed prompts"
          count={snapshot.completedPrompts.length}
          available={snapshot.sources.roadmap === "available"}
          detail={
            snapshot.sources.roadmap === "unavailable"
              ? "Released roadmap work cannot be verified."
              : snapshot.completedPrompts.length
                ? "Roadmap items marked Released."
                : "No roadmap items have reached Released."
          }
        />
        <DevelopmentMetric
          label="Upcoming work"
          count={snapshot.upcomingWork.length}
          available={snapshot.sources.roadmap === "available"}
          detail={
            snapshot.sources.roadmap === "unavailable"
              ? "Planned roadmap work cannot be verified."
              : snapshot.upcomingWork.length
                ? "Planned roadmap items awaiting active delivery."
                : "Awaiting selection of the next sprint."
          }
        />
        <DevelopmentMetric
          label="Recently released"
          count={snapshot.recentlyReleased.length}
          available={snapshot.sources.releases === "available"}
          detail={
            snapshot.sources.releases === "unavailable"
              ? "Release Center data is unavailable."
              : snapshot.recentlyReleased.length
                ? "Latest canonical Release Center records."
                : "No release history has been synchronized."
          }
        />
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Repository summary"
          title="Read-only repository evidence"
          description="Branch, worktree, and commit values appear only when connected evidence can verify them."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.repositories.map((repository) => (
            <article
              key={repository.repository}
              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-black text-white">
                  {repository.repository}
                </h3>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${repositoryStatusClasses[repository.worktree]}`}
                >
                  {repository.worktree === "planning"
                    ? "Planning"
                    : repository.worktree === "unavailable"
                      ? "Status unavailable"
                      : repository.worktree === "clean"
                        ? "Clean"
                        : "Dirty"}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-[#68768b]">
                    Branch
                  </dt>
                  <dd className="mt-1 break-words text-[#dbe3ef]">
                    {repository.branch || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-[#68768b]">
                    Latest commit
                  </dt>
                  <dd className="mt-1 break-all font-mono text-[#dbe3ef]">
                    {repository.latestCommit || "Not available"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-5 text-[#7f8da3]">
                {repository.detail}
              </p>
            </article>
          ))}
        </div>
      </DashboardCard>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Open prompts"
            title="Delivery pipeline"
            description="Planned, in-progress, and testing roadmap items. Development prompts remain managed in Product Roadmap."
            action={
              <ConsoleLink href="/dashboard/admin/roadmap">
                Open Roadmap
              </ConsoleLink>
            }
          />
          <div className="mt-5 grid gap-3">
            {snapshot.openPrompts.length ? (
              snapshot.openPrompts
                .slice(0, 8)
                .map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} compact />
                ))
            ) : (
              <p className="rounded-xl border border-dashed border-[#344052] p-5 text-sm leading-6 text-[#9aa7b8]">
                {snapshot.sources.roadmap === "available"
                  ? snapshot.upcomingWork.length
                    ? "No roadmap items are currently In Progress or Testing. Planned work is awaiting sprint selection."
                    : "No roadmap items are currently open."
                  : "Open prompts cannot be verified while the roadmap source is unavailable."}
              </p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Completed prompts"
            title="Released roadmap work"
            description="Completion is shown only after the canonical roadmap item reaches Released."
          />
          <div className="mt-5 grid gap-3">
            {snapshot.completedPrompts.length ? (
              snapshot.completedPrompts
                .slice(0, 8)
                .map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} compact />
                ))
            ) : (
              <p className="rounded-xl border border-dashed border-[#344052] p-5 text-sm leading-6 text-[#9aa7b8]">
                {snapshot.sources.roadmap === "available"
                  ? "No roadmap items have reached Released. Completed work will appear here after roadmap status is updated."
                  : "Completed prompts cannot be verified while the roadmap source is unavailable."}
              </p>
            )}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Upcoming work"
            title="Planned queue"
            description="The most recently updated planned prompts ready for future sprint selection."
          />
          <div className="mt-5 grid gap-3">
            {snapshot.upcomingWork.length ? (
              snapshot.upcomingWork
                .slice(0, 6)
                .map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} compact />
                ))
            ) : (
              <p className="rounded-xl border border-dashed border-[#344052] p-5 text-sm leading-6 text-[#9aa7b8]">
                {snapshot.sources.roadmap === "available"
                  ? "Awaiting selection of the next sprint. Add or move a roadmap item to Planned when future work is ready."
                  : "Upcoming work cannot be verified while the roadmap source is unavailable."}
              </p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Recently released"
            title="Latest release records"
            description="Release identity, validation, and deployment state come directly from Release Center."
            action={
              <ConsoleLink href="/dashboard/admin/releases">
                Open Release Center
              </ConsoleLink>
            }
          />
          <div className="mt-5 grid gap-3">
            {snapshot.recentlyReleased.length ? (
              snapshot.recentlyReleased.map((release) => (
                <article
                  key={release.id}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                        {release.productLabel} · v{release.version}
                      </p>
                      <h3 className="mt-1 font-black text-white">
                        {release.title}
                      </h3>
                    </div>
                    <p className="text-xs font-bold text-[#c7cfdb]">
                      {formatDate(release.releaseDate)}
                    </p>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#9aa7b8]">
                    {release.validationLabel} · {release.deploymentLabel}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-[#344052] p-5 text-sm leading-6 text-[#9aa7b8]">
                {snapshot.sources.releases === "available"
                  ? "No release history has been synchronized. Release records will appear after Release Center captures a validated release."
                  : "Recent releases cannot be verified while Release Center is unavailable."}
              </p>
            )}
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Git references"
            title="Verified deployment identities"
            description="Only Git-shaped references from hosting metadata or Release Center are displayed."
          />
          <div className="mt-5 grid gap-3">
            {snapshot.gitReferences.length ? (
              snapshot.gitReferences.map((reference) => (
                <div
                  key={reference.reference}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <p className="break-all font-mono text-sm font-black text-amber-100">
                    {reference.shortReference}
                  </p>
                  <p className="mt-2 font-bold text-white">{reference.title}</p>
                  <p className="mt-2 text-xs leading-5 text-[#7f8da3]">
                    {reference.source === "current_deployment"
                      ? "Current deployment"
                      : "Release Center"}
                    {reference.branch ? ` · ${reference.branch}` : ""}
                    {reference.repository ? ` · ${reference.repository}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-[#344052] p-5 text-sm leading-6 text-[#9aa7b8]">
                No verified Git SHA or ref is available from this deployment or
                Release Center.
              </p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Version history"
            title="Recorded product releases"
            description="Historical versions come from owner-managed Release Center records, not inferred build dates."
          />
          <div
            className="mt-5 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            tabIndex={0}
            role="region"
            aria-label="Version history table, horizontally scrollable"
          >
            {snapshot.versionHistory.length ? (
              <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-[#7f8da3]">
                    <th className="border-b border-[#2a3242] px-3 py-3">
                      Product
                    </th>
                    <th className="border-b border-[#2a3242] px-3 py-3">
                      Version
                    </th>
                    <th className="border-b border-[#2a3242] px-3 py-3">
                      Released
                    </th>
                    <th className="border-b border-[#2a3242] px-3 py-3">
                      Validation
                    </th>
                    <th className="border-b border-[#2a3242] px-3 py-3">
                      Deployment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.versionHistory.slice(0, 12).map((release) => (
                    <tr key={release.id} className="text-[#dbe3ef]">
                      <td className="border-b border-[#202938] px-3 py-3 font-black text-white">
                        {release.productLabel}
                      </td>
                      <td className="border-b border-[#202938] px-3 py-3">
                        v{release.version}
                      </td>
                      <td className="border-b border-[#202938] px-3 py-3">
                        {formatDate(release.releaseDate)}
                      </td>
                      <td className="border-b border-[#202938] px-3 py-3">
                        {release.validationLabel}
                      </td>
                      <td className="border-b border-[#202938] px-3 py-3">
                        {release.deploymentLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="rounded-xl border border-dashed border-[#344052] p-5 text-sm leading-6 text-[#9aa7b8]">
                {snapshot.sources.releases === "available"
                  ? "No release history has been synchronized. Version history will appear after Release Center records a release."
                  : "Version history cannot be verified while Release Center is unavailable."}
              </p>
            )}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Current versions"
          title="Generated ecosystem identities"
          description="Current version, channel, and build identity come from the canonical generated Beast manifest."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {snapshot.currentVersions.map((version) => (
            <article
              key={version.buildId}
              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">{version.product}</p>
                  <p className="mt-1 text-sm font-bold text-amber-100">
                    v{version.version} · {version.channel}
                  </p>
                </div>
                <p className="text-xs text-[#7f8da3]">
                  {version.releaseDate
                    ? formatDate(version.releaseDate)
                    : "Undated"}
                </p>
              </div>
              <p className="mt-3 break-all font-mono text-xs text-[#68768b]">
                {version.buildId}
              </p>
            </article>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Future operational signals"
          title="Reserved development intelligence"
          description="These areas are intentionally reserved until authoritative sources are connected."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Release velocity",
              detail:
                "Available after Release Center has enough dated history for a meaningful trend.",
            },
            {
              label: "Sprint statistics",
              detail:
                "Available after sprint boundaries and outcomes are explicitly recorded.",
            },
            {
              label: "Recent validation",
              detail:
                "Available after validation evidence is connected as a current operating signal.",
            },
            {
              label: "Build health",
              detail:
                "Available after a read-only continuous integration health source is connected.",
            },
          ].map((signal) => (
            <article
              key={signal.label}
              className="min-w-0 rounded-xl border border-dashed border-[#344052] bg-[#111827]/70 p-4"
            >
              <p className="font-black text-white">{signal.label}</p>
              <p className="mt-2 text-sm font-bold text-[#9aa7b8]">
                Not connected
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7f8da3]">
                {signal.detail}
              </p>
            </article>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard accent={snapshot.sourceGaps.length ? "yellow" : "green"}>
        <SectionHeader
          eyebrow="Source coverage"
          title={
            snapshot.sourceGaps.length
              ? `${snapshot.sourceGaps.length} development source gaps`
              : "All development sources available"
          }
          description="The console reports missing evidence instead of treating unavailable development data as an empty queue."
          action={
            <ConsoleLink href="/dashboard/admin/prompts">
              Open AI Prompt Library
            </ConsoleLink>
          }
        />
        <div className="mt-5 grid gap-3">
          {snapshot.sourceGaps.length ? (
            snapshot.sourceGaps.map((gap) => (
              <p
                key={gap}
                className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100"
              >
                {gap}
              </p>
            ))
          ) : (
            <p className="rounded-xl border border-green-300/25 bg-green-300/10 p-4 text-sm text-green-100">
              Roadmap, Release Center, and verified Git evidence are available.
            </p>
          )}
        </div>
      </DashboardCard>

      <p className="text-xs leading-5 text-[#7f8da3]">
        Development prompts are roadmap work items. Managed AI prompts remain a
        separate governed asset library. This console does not execute Git,
        change roadmap state, deploy releases, or infer completion.
      </p>
    </div>
  );
}
