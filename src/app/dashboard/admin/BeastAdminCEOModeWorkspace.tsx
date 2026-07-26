"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  DashboardCard,
  MetricTile,
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
  return value === null ? "Unavailable" : String(value);
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

  const loadCEOBriefing = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const [sourceResponse, healthResponse] = await Promise.all([
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
          description="BeastAdmin is reading owner-scoped development, feedback, member, beta, release, roadmap, AI activity, and platform-health evidence."
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

  const attentionAccent = snapshot.needsAttention.some(
    (item) => item.priority === "critical"
  )
    ? "red"
    : snapshot.needsAttention.length
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
            description="Current risks, unacknowledged member evidence, and unavailable operating feeds."
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
            description="A deterministic owner priority based on critical health, feedback, testing, and in-progress roadmap evidence."
          />
          <div className="mt-5">
            {snapshot.workNext.length ? (
              <ActionList items={snapshot.workNext} />
            ) : (
              <EmptyOperatingState>
                No next task is supported by the currently connected evidence.
                Open the roadmap to choose planned work.
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
            <div className="grid grid-cols-2 gap-3">
              <MetricTile
                label="Current sprint"
                value={countValue(snapshot.summaries.development.currentSprint)}
                detail="In progress or testing"
                icon="D"
                tone="yellow"
              />
              <MetricTile
                label="Open prompts"
                value={countValue(snapshot.summaries.development.openPrompts)}
                detail={`${countValue(snapshot.summaries.development.upcomingWork)} planned next`}
                icon="P"
                tone="blue"
              />
            </div>
          </SummaryCard>

          <SummaryCard
            eyebrow="Feedback"
            title="Member signal"
            description="New, open, and recently changed beta feedback."
            href="/dashboard/admin/feedback"
            actionLabel="Review Beta Feedback"
          >
            <div className="grid grid-cols-3 gap-3">
              {[
                ["New", snapshot.summaries.feedback.new],
                ["Open", snapshot.summaries.feedback.open],
                ["Yesterday", snapshot.summaries.feedback.changedYesterday],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-3"
                >
                  <p className="text-xs font-black uppercase text-[#7f8da3]">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    {countValue(value as number | null)}
                  </p>
                </div>
              ))}
            </div>
          </SummaryCard>

          <SummaryCard
            eyebrow="Errors"
            title="Platform health"
            description="Current live, configuration, and not-connected service signals."
            href="/dashboard/admin/health"
            actionLabel="Open Platform Health"
          >
            <p className="text-2xl font-black capitalize text-white">
              {snapshot.summaries.errors.status}
            </p>
            <p className="mt-2 text-sm text-[#c7cfdb]">
              {countValue(snapshot.summaries.errors.errors)} errors ·{" "}
              {countValue(snapshot.summaries.errors.warnings)} warnings
            </p>
          </SummaryCard>

          <SummaryCard
            eyebrow="Members"
            title="Member movement"
            description="Owner-visible directory totals without exposing private content."
            href="/dashboard/admin/members"
            actionLabel="Open Member Timeline"
          >
            <p className="text-3xl font-black text-white">
              {countValue(snapshot.summaries.members.total)}
            </p>
            <p className="mt-2 text-sm text-[#c7cfdb]">
              {countValue(snapshot.summaries.members.newYesterday)} new
              yesterday ·{" "}
              {countValue(snapshot.summaries.members.activeOvernight)} active
              overnight
            </p>
          </SummaryCard>

          <SummaryCard
            eyebrow="Beta testing"
            title="Controlled release activity"
            description="Feature flags and active internal-testing or beta assignments."
            href="/dashboard/admin/flags"
            actionLabel="Manage Feature Flags"
          >
            <p className="text-3xl font-black text-white">
              {countValue(snapshot.summaries.betaTesting.activeAssignments)}
            </p>
            <p className="mt-2 text-sm text-[#c7cfdb]">
              active assignments across{" "}
              {countValue(snapshot.summaries.betaTesting.flags)} flags
            </p>
          </SummaryCard>

          <SummaryCard
            eyebrow="Releases"
            title="Release movement"
            description="Verified Release Center records and the latest recorded product version."
            href="/dashboard/admin/releases"
            actionLabel="Open Release Center"
          >
            <p className="text-lg font-black text-white">
              {snapshot.summaries.releases.latestLabel}
            </p>
            <p className="mt-2 text-sm text-[#c7cfdb]">
              {countValue(snapshot.summaries.releases.releasedYesterday)}{" "}
              released yesterday ·{" "}
              {countValue(snapshot.summaries.releases.total)} total records
            </p>
          </SummaryCard>

          <SummaryCard
            eyebrow="Roadmap progress"
            title="Feature flow"
            description="Roadmap items grouped by their current delivery state."
            href="/dashboard/admin/roadmap"
            actionLabel="Manage Product Roadmap"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Planned", snapshot.summaries.roadmap.planned],
                ["In progress", snapshot.summaries.roadmap.inProgress],
                ["Testing", snapshot.summaries.roadmap.testing],
                ["Released", snapshot.summaries.roadmap.released],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-3"
                >
                  <p className="text-xs font-black uppercase text-[#7f8da3]">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-black text-white">
                    {countValue(value as number | null)}
                  </p>
                </div>
              ))}
            </div>
          </SummaryCard>

          <SummaryCard
            eyebrow="AI recommendations"
            title="Professional recommendations"
            description="Owner-reviewed recommendations will appear only when a persisted source is connected."
            href="/dashboard/admin/analytics"
            actionLabel="Open AI Analytics"
          >
            {snapshot.summaries.aiRecommendations.state === "available" &&
            snapshot.summaries.aiRecommendations.items.length ? (
              <ul className="space-y-3">
                {snapshot.summaries.aiRecommendations.items.map((item) => (
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
            ) : (
              <EmptyOperatingState>
                {snapshot.summaries.aiRecommendations.detail}
              </EmptyOperatingState>
            )}
          </SummaryCard>
        </div>
      </section>

      <DashboardCard accent={snapshot.sourceGaps.length ? "yellow" : "green"}>
        <SectionHeader
          eyebrow="Source coverage"
          title={
            snapshot.sourceGaps.length
              ? `${snapshot.sourceGaps.length} operating source gap${
                  snapshot.sourceGaps.length === 1 ? "" : "s"
                }`
              : "All CEO Mode sources are connected"
          }
          description="CEO Mode is read-only and respects the owner-scoped permissions of every source."
        />
        {snapshot.sourceGaps.length ? (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {snapshot.sourceGaps.map((gap) => (
              <li
                key={gap}
                className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100"
              >
                {gap}
              </li>
            ))}
          </ul>
        ) : null}
      </DashboardCard>
    </div>
  );
}
