"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildBeastAdminCEOModeSnapshot,
  normalizeBeastAdminCEOSourceSnapshot,
  type BeastAdminCEOAction,
  type BeastAdminCEODailyItem,
  type BeastAdminCEOModeSnapshot,
} from "@/lib/beastAdminCEOMode";
import {
  normalizeBeastAdminPlatformHealthSnapshot,
  type BeastAdminPlatformHealthSnapshot,
} from "@/lib/beastAdminPlatformHealth";
import type { RevenueSnapshot } from "@/lib/revenueCenter";

function humanizeCEOError(status: number) {
  if (status === 401) return "Sign in again to open CEO Mode.";
  if (status === 403) return "CEO Mode is restricted to the Beast owner.";
  return "CEO Mode could not load its verified operating sources.";
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
}

function countValue(value: number | null) {
  if (value === null) return "Unavailable";
  return value === 0 ? "None" : String(value);
}

function countPhrase(
  value: number | null,
  singular: string,
  plural = `${singular}s`
) {
  if (value === null) return `${plural} unavailable`;
  if (value === 0) return `No ${plural}`;
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatRevenue(value: number | null, currency = "USD") {
  if (value === null) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function WorkspaceLink({
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

function EmptyOperatingState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[#344055] bg-[#111827]/70 px-4 py-5 text-sm leading-6 text-[#9aa7b8]">
      {children}
    </p>
  );
}

function CompactMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | null;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-3">
      <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-white">{countValue(value)}</p>
      <p className="mt-1 text-xs leading-5 text-[#7f8da3]">{detail}</p>
    </div>
  );
}

function DailyItemList({ items }: { items: BeastAdminCEODailyItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-amber-200">
                {item.area}
              </p>
              <p className="mt-1 font-black text-white">{item.title}</p>
            </div>
            <time
              dateTime={item.occurredAt}
              className="text-xs text-[#7f8da3]"
            >
              {formatTimestamp(item.occurredAt)}
            </time>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
            {item.detail}
          </p>
          <Link
            href={item.href}
            className="mt-3 inline-flex text-sm font-black text-amber-100 hover:text-white"
          >
            Open {item.area} →
          </Link>
        </li>
      ))}
    </ol>
  );
}

const priorityClasses: Record<BeastAdminCEOAction["priority"], string> = {
  critical: "border-red-300/35 bg-red-300/10 text-red-100",
  high: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  medium: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  low: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

const opportunityRecommendationNames = [
  "Money Coach",
  "Guidance Counselor",
  "Health Advisor",
  "Goals Coach",
  "Future professionals",
] as const;

function ActionList({ items }: { items: BeastAdminCEOAction[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                {item.area}
              </p>
              <p className="mt-1 font-black text-white">{item.title}</p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-black capitalize ${priorityClasses[item.priority]}`}
            >
              {item.priority}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">{item.why}</p>
          <WorkspaceLink href={item.href}>{item.actionLabel}</WorkspaceLink>
        </li>
      ))}
    </ol>
  );
}

function SummaryCard({
  eyebrow,
  title,
  description,
  href,
  actionLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <DashboardCard accent="admin" className="h-full">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <div className="mt-5">{children}</div>
      <div className="mt-5">
        <WorkspaceLink href={href}>{actionLabel}</WorkspaceLink>
      </div>
    </DashboardCard>
  );
}

export function BeastAdminCEOModeWorkspace() {
  const [snapshot, setSnapshot] = useState<BeastAdminCEOModeSnapshot | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [revenue, setRevenue] = useState<RevenueSnapshot | null>(null);

  const loadCEOBriefing = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const [sourceResponse, healthResponse, revenueResponse] = await Promise.all([
        fetch("/api/admin/ceo-mode", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        fetch("/api/admin/platform-health", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        fetch("/api/admin/revenue", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
      ]);

      if (!sourceResponse.ok) {
        throw new Error(humanizeCEOError(sourceResponse.status));
      }
      const source = normalizeBeastAdminCEOSourceSnapshot(
        (await sourceResponse.json()) as unknown
      );
      if (!source) throw new Error("CEO Mode returned an invalid snapshot.");

      let platformHealth: BeastAdminPlatformHealthSnapshot | null = null;
      let platformHealthAvailable = false;
      if (healthResponse.ok) {
        platformHealth = normalizeBeastAdminPlatformHealthSnapshot(
          (await healthResponse.json()) as unknown
        );
        platformHealthAvailable = Boolean(platformHealth);
      }
      if (revenueResponse.ok) {
        const revenuePayload = (await revenueResponse.json()) as RevenueSnapshot;
        setRevenue(
          revenuePayload?.provider === "adsense" ? revenuePayload : null
        );
      } else {
        setRevenue(null);
      }

      setSnapshot(
        buildBeastAdminCEOModeSnapshot({
          source,
          platformHealth,
          platformHealthAvailable,
          now: new Date(source.generatedAt),
        })
      );

      if (!platformHealthAvailable) {
        setError(
          "Platform Health could not be verified. The rest of the daily briefing remains current."
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "CEO Mode could not load."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCEOBriefing(true);
  }, [loadCEOBriefing]);

  if (loading && !snapshot) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Morning operating brief"
          title="Assembling CEO Mode"
          description="BeastAdmin is reading canonical BeastFusion governance, verified repository and release evidence, and owner-scoped operational signals."
        />
        <div
          className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          aria-busy="true"
          aria-label="Loading CEO Mode"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
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
          eyebrow="CEO Mode"
          title="The daily operating brief is unavailable"
          description={
            error || "BeastAdmin did not receive a valid owner-scoped snapshot."
          }
        />
        <button
          type="button"
          className="beast-button mt-5"
          onClick={() => void loadCEOBriefing()}
        >
          Retry
        </button>
      </DashboardCard>
    );
  }

  const attentionItems = [
    ...snapshot.operationalErrors,
    ...snapshot.needsAttention,
  ];
  const attentionAccent = attentionItems.some(
    (item) => item.priority === "critical"
  )
    ? "red"
    : attentionItems.length
      ? "yellow"
      : "green";

  return (
    <div className="space-y-6">
      <DashboardCard accent={attentionAccent}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <p className="beast-kicker">SEANGWORLD · Daily operating brief</p>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              {snapshot.greeting}, Sean.
            </h2>
            <p className="mt-3 text-lg font-bold text-[#dbe3ef]">
              {snapshot.dateLabel}
            </p>
            <p className="mt-3 max-w-3xl leading-7 text-[#9aa7b8]">
              Start here for the verified changes, risks, and next work across
              the Beast ecosystem. Missing feeds remain visibly unavailable;
              absence is never reported as zero.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <button
              type="button"
              className="beast-button min-h-11"
              disabled={refreshing}
              onClick={() => void loadCEOBriefing()}
            >
              {refreshing ? "Refreshing…" : "Refresh briefing"}
            </button>
            <p className="text-xs text-[#7f8da3]">
              Updated {formatTimestamp(snapshot.generatedAt)}
            </p>
            <WorkspaceLink href="/dashboard/admin/metrics">
              Open Executive Metrics
            </WorkspaceLink>
          </div>
        </div>
        <p className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] px-4 py-3 text-xs leading-5 text-[#9aa7b8]">
          {snapshot.windowLabel}
        </p>
      </DashboardCard>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100"
        >
          {error}
        </p>
      ) : null}

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Sprint snapshot"
          title="Current delivery position"
          description="A compact view of roadmap work and synchronized release history."
        />
        {snapshot.sources.canonicalGovernance !== "available" ? (
          <div className="mt-5">
            <EmptyOperatingState>
              Canonical roadmap and release data are unavailable or stale.
              CEO Mode will not substitute legacy BeastAdmin records.
            </EmptyOperatingState>
          </div>
        ) : snapshot.sources.canonicalGovernance === "available" &&
          snapshot.summaries.development.openPrompts === 0 &&
          snapshot.summaries.development.completedPrompts === 0 &&
          snapshot.summaries.releases.total === 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <EmptyOperatingState>
              The accepted BeastFusion projection contains no canonical roadmap
              items.
            </EmptyOperatingState>
            <EmptyOperatingState>
              The accepted BeastFusion projection contains no canonical release
              records.
            </EmptyOperatingState>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <CompactMetric
              label="Current sprint"
              value={snapshot.summaries.development.currentSprint}
              detail={
                snapshot.sources.canonicalGovernance === "available"
                  ? "In progress or testing"
                  : "Roadmap source unavailable"
              }
            />
            <CompactMetric
              label="Completed"
              value={snapshot.summaries.development.completedPrompts}
              detail={
                snapshot.sources.canonicalGovernance === "available"
                  ? "Completed roadmap items"
                  : "Roadmap source unavailable"
              }
            />
            <CompactMetric
              label="Testing"
              value={snapshot.summaries.roadmap.testing}
              detail={
                snapshot.sources.canonicalGovernance === "available"
                  ? "Awaiting validation"
                  : "Roadmap source unavailable"
              }
            />
            <CompactMetric
              label="Released"
              value={snapshot.summaries.releases.total}
              detail={
                snapshot.sources.canonicalGovernance === "available"
                  ? "Synchronized release records"
                  : "Release source unavailable"
              }
            />
            <CompactMetric
              label="Open"
              value={snapshot.summaries.development.openPrompts}
              detail={
                snapshot.sources.canonicalGovernance === "available"
                  ? "Planned, active, or testing"
                  : "Roadmap source unavailable"
              }
            />
          </div>
        )}
      </DashboardCard>

      <section
        className="grid gap-4 xl:grid-cols-2"
        aria-label="Configuration and operational errors"
      >
        <DashboardCard accent="blue">
          <SectionHeader
            eyebrow="Configuration"
            title={
              snapshot.configurationItems.length
                ? `${snapshot.configurationItems.length} setup item${
                    snapshot.configurationItems.length === 1 ? "" : "s"
                  }`
                : "Connected sources are configured"
            }
            description="Missing credentials, monitoring, and source connections remain actionable without being presented as service failures."
          />
          <div className="mt-5">
            {snapshot.configurationItems.length ? (
              <ActionList items={snapshot.configurationItems} />
            ) : (
              <EmptyOperatingState>
                No missing CEO Mode configuration was detected in the connected
                sources.
              </EmptyOperatingState>
            )}
          </div>
        </DashboardCard>

        <DashboardCard
          accent={snapshot.operationalErrors.length ? "red" : "green"}
        >
          <SectionHeader
            eyebrow="Operational errors"
            title={
              snapshot.operationalErrors.length
                ? `${snapshot.operationalErrors.length} verified issue${
                    snapshot.operationalErrors.length === 1 ? "" : "s"
                  }`
                : "No verified operational errors"
            }
            description="Only confirmed failures, failed jobs, degraded live signals, outages, and broken integrations appear here."
          />
          <div className="mt-5">
            {snapshot.operationalErrors.length ? (
              <ActionList items={snapshot.operationalErrors} />
            ) : (
              <EmptyOperatingState>
                Connected operational sources have not reported a current
                failure. Configuration gaps are tracked separately.
              </EmptyOperatingState>
            )}
          </div>
        </DashboardCard>
      </section>

      <section
        className="grid gap-4 xl:grid-cols-2"
        aria-label="CEO morning questions"
      >
        <DashboardCard accent="blue">
          <SectionHeader
            eyebrow="Yesterday"
            title="What happened yesterday?"
            description="Meaningful recorded changes during the prior calendar day."
          />
          <div className="mt-5">
            {snapshot.happenedYesterday.length ? (
              <DailyItemList items={snapshot.happenedYesterday} />
            ) : (
              <EmptyOperatingState>
                No verified development, feedback, member, beta, release, or AI
                activity was recorded yesterday in the connected sources.
              </EmptyOperatingState>
            )}
          </div>
        </DashboardCard>

        <DashboardCard accent="purple">
          <SectionHeader
            eyebrow="Since last evening"
            title="What changed overnight?"
            description="Recorded changes from 6:00 PM yesterday through this morning."
          />
          <div className="mt-5">
            {snapshot.changedOvernight.length ? (
              <DailyItemList items={snapshot.changedOvernight} />
            ) : (
              <EmptyOperatingState>
                No connected source recorded a meaningful overnight change.
              </EmptyOperatingState>
            )}
          </div>
        </DashboardCard>

        <DashboardCard accent={attentionAccent}>
          <SectionHeader
            eyebrow="Owner attention"
            title="What needs attention?"
            description="Canonical governance, operational, member, feedback, and AI-quality signals that need an owner decision."
          />
          <div className="mt-5">
            {snapshot.needsAttention.length ? (
              <ActionList items={snapshot.needsAttention} />
            ) : (
              <EmptyOperatingState>
                No current owner-attention items were found in the connected
                sources.
              </EmptyOperatingState>
            )}
          </div>
        </DashboardCard>

        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Recommended sequence"
            title="What should I work on next?"
            description="A deterministic owner priority that honors canonical authorization, blockers, dependencies, and provider freshness."
          />
          <div className="mt-5">
            {snapshot.workNext.length ? (
              <ActionList items={snapshot.workNext} />
            ) : (
              <EmptyOperatingState>
                No next action is supported by current canonical evidence. CEO
                Mode will not infer execution from planned work.
              </EmptyOperatingState>
            )}
          </div>
        </DashboardCard>
      </section>

      <section aria-labelledby="ceo-operating-summary">
        <SectionHeader
          eyebrow="Operational headquarters"
          title="Ecosystem summary"
          description="Eight focused views connect the morning brief to the BeastAdmin system of record."
        />
        <h2 id="ceo-operating-summary" className="sr-only">
          CEO operating summary
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            eyebrow="Development"
            title="Delivery pipeline"
            description="Current sprint, open prompts, completed prompts, and upcoming work."
            href="/dashboard/admin/development"
            actionLabel="Open Development Console"
          >
            {snapshot.sources.canonicalGovernance !== "available" ? (
              <EmptyOperatingState>
                Roadmap data is unavailable, so CEO Mode cannot verify the
                delivery pipeline.
              </EmptyOperatingState>
            ) : snapshot.summaries.development.openPrompts === 0 &&
              snapshot.summaries.development.completedPrompts === 0 ? (
              <EmptyOperatingState>
                The accepted BeastFusion projection contains no canonical
                roadmap items.
              </EmptyOperatingState>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <CompactMetric
                  label="Current sprint"
                  value={snapshot.summaries.development.currentSprint}
                  detail="In progress or testing"
                />
                <CompactMetric
                  label="Open prompts"
                  value={snapshot.summaries.development.openPrompts}
                  detail={countPhrase(
                    snapshot.summaries.development.upcomingWork,
                    "planned item"
                  )}
                />
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            eyebrow="Feedback"
            title="Member signal"
            description="New, open, and recently changed beta feedback."
            href="/dashboard/admin/feedback"
            actionLabel="Review Beta Feedback"
          >
            {snapshot.sources.feedback === "unavailable" ? (
              <EmptyOperatingState>
                Beta Feedback is unavailable, so member signal cannot be
                summarized.
              </EmptyOperatingState>
            ) : snapshot.summaries.feedback.total === 0 ? (
              <EmptyOperatingState>
                No beta feedback has been recorded yet. New and open feedback
                will appear after members submit it.
              </EmptyOperatingState>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <CompactMetric
                  label="New"
                  value={snapshot.summaries.feedback.new}
                  detail="Awaiting acknowledgement"
                />
                <CompactMetric
                  label="Open"
                  value={snapshot.summaries.feedback.open}
                  detail="Not released or declined"
                />
                <CompactMetric
                  label="Yesterday"
                  value={snapshot.summaries.feedback.changedYesterday}
                  detail="Changed in the prior day"
                />
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            eyebrow="Operational errors"
            title="Platform operations"
            description="Verified failures and degraded live signals. Configuration is summarized separately."
            href="/dashboard/admin/platform-health"
            actionLabel="Open Platform Health"
          >
            {snapshot.summaries.errors.status === "unavailable" ? (
              <EmptyOperatingState>
                Platform Health is unavailable, so CEO Mode cannot verify
                current operational errors.
              </EmptyOperatingState>
            ) : snapshot.summaries.errors.errors === 0 &&
              snapshot.summaries.errors.warnings === 0 ? (
              <div>
                <p className="text-xl font-black text-green-100">
                  No verified operational errors
                </p>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                  {countPhrase(
                    snapshot.summaries.errors.configurationItems,
                    "configuration item"
                  )}{" "}
                  tracked separately.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-black capitalize text-white">
                  {snapshot.summaries.errors.status}
                </p>
                <p className="mt-2 text-sm text-[#c7cfdb]">
                  {countPhrase(snapshot.summaries.errors.errors, "error")} ·{" "}
                  {countPhrase(snapshot.summaries.errors.warnings, "warning")}
                </p>
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            eyebrow="Members"
            title="Member movement"
            description="Owner-visible directory totals without exposing private content."
            href="/dashboard/admin/members"
            actionLabel="Open Member Timeline"
          >
            {snapshot.sources.members === "unavailable" ? (
              <EmptyOperatingState>
                The member directory is unavailable, so member movement cannot
                be verified.
              </EmptyOperatingState>
            ) : snapshot.summaries.members.total === 0 ? (
              <EmptyOperatingState>
                No member records are available yet. Movement will appear after
                the first authenticated member activity.
              </EmptyOperatingState>
            ) : (
              <div>
                <p className="text-3xl font-black text-white">
                  {snapshot.summaries.members.total}
                </p>
                <p className="mt-2 text-sm text-[#c7cfdb]">
                  {countPhrase(
                    snapshot.summaries.members.newYesterday,
                    "new member"
                  )}{" "}
                  yesterday ·{" "}
                  {countPhrase(
                    snapshot.summaries.members.activeOvernight,
                    "active member"
                  )}{" "}
                  overnight
                </p>
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            eyebrow="Beta testing"
            title="Controlled release activity"
            description="Feature flags and active internal-testing or beta assignments."
            href="/dashboard/admin/flags"
            actionLabel="Manage Feature Flags"
          >
            {snapshot.sources.betaTesting === "unavailable" ? (
              <EmptyOperatingState>
                Feature Flags are unavailable, so controlled-release activity
                cannot be verified.
              </EmptyOperatingState>
            ) : snapshot.summaries.betaTesting.flags === 0 ? (
              <EmptyOperatingState>
                No feature flags have been configured yet. Assignments will
                appear after a controlled-release flag exists.
              </EmptyOperatingState>
            ) : (
              <div>
                <p className="text-3xl font-black text-white">
                  {countValue(
                    snapshot.summaries.betaTesting.activeAssignments
                  )}
                </p>
                <p className="mt-2 text-sm text-[#c7cfdb]">
                  {countPhrase(
                    snapshot.summaries.betaTesting.activeAssignments,
                    "active assignment"
                  )}{" "}
                  across{" "}
                  {countPhrase(
                    snapshot.summaries.betaTesting.flags,
                    "feature flag"
                  )}
                </p>
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            eyebrow="Releases"
            title="Release movement"
            description="Canonical BeastFusion release records and the latest governed product version."
            href="/dashboard/admin/releases"
            actionLabel="Open Release Center"
          >
            {snapshot.sources.canonicalGovernance !== "available" ? (
              <EmptyOperatingState>
                Canonical release truth is unavailable, so release movement
                cannot be verified.
              </EmptyOperatingState>
            ) : snapshot.summaries.releases.total === 0 ? (
              <EmptyOperatingState>
                The accepted BeastFusion projection contains no canonical
                release records.
              </EmptyOperatingState>
            ) : (
              <div>
                <p className="text-lg font-black text-white">
                  {snapshot.summaries.releases.latestLabel}
                </p>
                <p className="mt-2 text-sm text-[#c7cfdb]">
                  {countPhrase(
                    snapshot.summaries.releases.releasedYesterday,
                    "release"
                  )}{" "}
                  yesterday ·{" "}
                  {countPhrase(
                    snapshot.summaries.releases.total,
                    "release record"
                  )}{" "}
                  synchronized
                </p>
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            eyebrow="Roadmap progress"
            title="Feature flow"
            description="Roadmap items grouped by their current delivery state."
            href="/dashboard/admin/roadmap"
            actionLabel="Open Canonical Roadmap"
          >
            {snapshot.sources.canonicalGovernance !== "available" ? (
              <EmptyOperatingState>
                Roadmap data is unavailable, so feature flow cannot be
                summarized.
              </EmptyOperatingState>
            ) : [
                snapshot.summaries.roadmap.planned,
                snapshot.summaries.roadmap.inProgress,
                snapshot.summaries.roadmap.testing,
                snapshot.summaries.roadmap.released,
              ].every((value) => value === 0) ? (
              <EmptyOperatingState>
                The accepted BeastFusion projection contains no canonical
                roadmap items.
              </EmptyOperatingState>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <CompactMetric
                  label="Planned"
                  value={snapshot.summaries.roadmap.planned}
                  detail="Not started"
                />
                <CompactMetric
                  label="In progress"
                  value={snapshot.summaries.roadmap.inProgress}
                  detail="Actively being built"
                />
                <CompactMetric
                  label="Testing"
                  value={snapshot.summaries.roadmap.testing}
                  detail="Awaiting validation"
                />
                <CompactMetric
                  label="Released"
                  value={snapshot.summaries.roadmap.released}
                  detail="Completed roadmap items"
                />
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            eyebrow="Opportunity recommendations"
            title="Advisory opportunities"
            description="Source-cited, owner-reviewed opportunities may appear here, but never select or authorize execution."
            href="/dashboard/admin/analytics"
            actionLabel="Open AI Analytics"
          >
            {snapshot.summaries.opportunityRecommendations.state === "available" &&
            snapshot.summaries.opportunityRecommendations.items.length ? (
              <ul className="space-y-3">
                {snapshot.summaries.opportunityRecommendations.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-3"
                  >
                    <p className="font-black text-white">
                      {item.professionalName}
                    </p>
                    <p className="mt-1 text-sm text-[#c7cfdb]">
                      {item.recommendation}
                    </p>
                    <p className="mt-2 text-xs text-[#7f8da3]">
                      Why: {item.whySurfaced}
                    </p>
                  </li>
                ))}
              </ul>
            ) : snapshot.summaries.opportunityRecommendations.state === "available" ? (
              <div className="space-y-4">
                <EmptyOperatingState>
                  The recommendation source is connected, but no owner-reviewed
                  professional recommendations have been recorded yet.
                </EmptyOperatingState>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    Prepared for
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {opportunityRecommendationNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-[#344055] bg-[#111827] px-3 py-1.5 text-xs font-bold text-[#c7cfdb]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <EmptyOperatingState>
                  Opportunity recommendations remain unavailable until a
                  persisted, source-cited, owner-reviewed feed is approved.
                </EmptyOperatingState>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    Prepared for
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {opportunityRecommendationNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-[#344055] bg-[#111827] px-3 py-1.5 text-xs font-bold text-[#c7cfdb]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SummaryCard>

          <SummaryCard
            eyebrow="Revenue"
            title="Revenue intelligence"
            description="Connected AdSense reporting, projections, source readiness, and owner-governed placements."
            href="/dashboard/admin/ads"
            actionLabel="Open Revenue Center"
          >
            {revenue?.state === "available" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    Today
                  </p>
                  <p className="mt-2 text-lg font-black text-white">
                    {formatRevenue(
                      revenue.periods.today?.estimatedEarnings ?? null,
                      revenue.periods.today?.currency || "USD"
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    This month
                  </p>
                  <p className="mt-2 text-lg font-black text-white">
                    {formatRevenue(
                      revenue.periods.month?.estimatedEarnings ?? null,
                      revenue.periods.month?.currency || "USD"
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    Sources
                  </p>
                  <p className="mt-2 font-black text-white">1 connected</p>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    AdSense share
                  </p>
                  <p className="mt-2 font-black text-white">100%</p>
                </div>
                <p className="col-span-2 text-xs leading-5 text-[#9aa7b8]">
                  Trend:{" "}
                  {revenue.periods.today?.estimatedEarnings !== null &&
                  revenue.periods.today?.estimatedEarnings !== undefined &&
                  revenue.periods.yesterday?.estimatedEarnings !== null &&
                  revenue.periods.yesterday?.estimatedEarnings !== undefined
                    ? revenue.periods.today.estimatedEarnings >=
                      revenue.periods.yesterday.estimatedEarnings
                      ? "today is at or above yesterday"
                      : "today is below yesterday"
                    : "unavailable until both daily periods are reported"}
                  . Values are estimated.
                </p>
              </div>
            ) : (
              <EmptyOperatingState>
                {revenue?.diagnostic ||
                  "Revenue reporting is unavailable. No earnings are inferred."}
              </EmptyOperatingState>
            )}
          </SummaryCard>
        </div>
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Repository status"
          title="Read-only source control visibility"
          description="CEO Mode uses the read-only 1B provider snapshot. Missing or stale provider evidence remains explicit, and hosted worktree state is never inferred."
        />
        <div
          className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Repository Status"
        >
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
                  aria-label={`${repository.repository} worktree status: ${
                    repository.worktree === "planning"
                      ? "Planning"
                      : repository.worktree === "unavailable"
                        ? "Unavailable"
                        : repository.worktree
                  }`}
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                    repository.worktree === "clean"
                      ? "border-green-300/35 bg-green-300/10 text-green-100"
                      : repository.worktree === "dirty"
                        ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                        : repository.worktree === "planning"
                          ? "border-sky-300/35 bg-sky-300/10 text-sky-100"
                          : "border-slate-300/30 bg-slate-300/10 text-slate-200"
                  }`}
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
                    Current branch
                  </dt>
                  <dd className="mt-1 break-words text-[#dbe3ef]">
                    {repository.branch || "Not available"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-[#68768b]">
                    Ahead / Behind
                  </dt>
                  <dd className="mt-1 text-[#dbe3ef]">
                    {repository.ahead === null || repository.behind === null
                      ? "Not available"
                      : `${repository.ahead} ahead · ${repository.behind} behind`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-[#68768b]">
                    Latest commit
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs text-[#dbe3ef]">
                    {repository.latestCommit || "Not available"}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-[#2a3242] pt-3 text-xs leading-5 text-[#7f8da3]">
                {repository.detail}
              </p>
            </article>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
