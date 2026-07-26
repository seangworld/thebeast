"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { getBeastAdminProfessionalName } from "@/lib/beastAdminAIAnalytics";
import {
  diagnoseBeastAdminExecutiveMetricsFailure,
  formatBeastAdminMetricRate,
  getBeastAdminSupabaseProjectRef,
  getBeastAdminGrowthDelta,
  normalizeBeastAdminExecutiveMetrics,
  type BeastAdminExecutiveMetricsDiagnostic,
  type BeastAdminExecutiveMetricsSnapshot,
} from "@/lib/beastAdminExecutiveMetrics";
import { createClient } from "@/lib/supabase/client";

const windowOptions = [7, 30, 90] as const;
const supabaseProjectRef = getBeastAdminSupabaseProjectRef(
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function growthDetail(current: number, previous: number) {
  const delta = getBeastAdminGrowthDelta(current, previous);
  if (delta.percentage === null) {
    return `${current} this period · no prior baseline`;
  }
  if (delta.percentage === 0) {
    return `${current} this period · unchanged`;
  }
  return `${current} this period · ${Math.abs(delta.percentage)}% ${
    delta.direction === "up" ? "up" : "down"
  }`;
}

function Bar({
  value,
  maximum,
  tone = "amber",
}: {
  value: number;
  maximum: number;
  tone?: "amber" | "blue" | "purple";
}) {
  const width = maximum > 0 ? Math.max(0, Math.min(100, (value / maximum) * 100)) : 0;
  const barClass =
    tone === "blue"
      ? "bg-sky-300"
      : tone === "purple"
        ? "bg-violet-300"
        : "bg-amber-300";

  return (
    <div
      className="mt-3 h-2 overflow-hidden rounded-full bg-[#202938]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={maximum}
      aria-valuenow={value}
    >
      <div
        className={`h-full rounded-full transition-[width] ${barClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function BeastAdminExecutiveMetricsWorkspace() {
  const [windowDays, setWindowDays] = useState<(typeof windowOptions)[number]>(
    30
  );
  const [snapshot, setSnapshot] =
    useState<BeastAdminExecutiveMetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] =
    useState<BeastAdminExecutiveMetricsDiagnostic | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      setLoading(true);
      setFailure(null);

      try {
        const supabase = createClient();
        const { data, error: metricsError } = await supabase.rpc(
          "get_beast_admin_executive_metrics",
          { window_days: windowDays }
        );
        if (metricsError) throw metricsError;

        const nextSnapshot = normalizeBeastAdminExecutiveMetrics(data);
        if (!nextSnapshot) {
          throw {
            code: "BEAST_METRICS_INVALID_RESPONSE",
            message: "The Executive Metrics response was invalid.",
          };
        }
        if (active) setSnapshot(nextSnapshot);
      } catch (metricsError) {
        if (active) {
          setSnapshot(null);
          setFailure(
            diagnoseBeastAdminExecutiveMetricsFailure(metricsError, {
              projectRef: supabaseProjectRef,
            })
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMetrics();
    return () => {
      active = false;
    };
  }, [refreshKey, windowDays]);

  const maximumDailyActive = useMemo(
    () =>
      snapshot
        ? Math.max(
            1,
            ...snapshot.dailyActivity.map((day) => day.activeMemberCount)
          )
        : 1,
    [snapshot]
  );

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Executive Metrics"
          title="Measuring ecosystem growth"
          description="BeastAdmin is aggregating owner-authorized product activity without loading member content or financial values."
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

  if (failure || !snapshot) {
    const diagnostic =
      failure ||
      diagnoseBeastAdminExecutiveMetricsFailure(
        {
          code: "BEAST_METRICS_INVALID_RESPONSE",
          message: "BeastAdmin did not receive a valid aggregate snapshot.",
        },
        { projectRef: supabaseProjectRef }
      );

    return (
      <DashboardCard accent="red">
        <SectionHeader
          eyebrow="Executive Metrics"
          title={diagnostic.title}
          description={diagnostic.summary}
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <div className="rounded-xl border border-red-300/25 bg-red-300/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-100">
              Recommended action
            </p>
            <p className="mt-2 text-sm leading-6 text-[#e6edf7]">
              {diagnostic.action}
            </p>
            <button
              type="button"
              className="beast-button mt-4"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Retry request
            </button>
          </div>
          <div className="min-w-0 rounded-xl border border-[#344052] bg-[#111827] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9aa7b8]">
              Owner diagnostics
            </p>
            <dl className="mt-3 grid gap-3 text-sm">
              <div>
                <dt className="font-black text-white">Detected state</dt>
                <dd className="mt-1 break-words text-[#c7cfdb]">
                  {diagnostic.kind.replaceAll("_", " ")}
                </dd>
              </div>
              <div>
                <dt className="font-black text-white">Supabase project</dt>
                <dd className="mt-1 break-all font-mono text-xs text-[#c7cfdb]">
                  {diagnostic.projectRef}
                </dd>
              </div>
              <div>
                <dt className="font-black text-white">API code</dt>
                <dd className="mt-1 font-mono text-xs text-[#c7cfdb]">
                  {diagnostic.code || "Not returned"}
                </dd>
              </div>
            </dl>
            <details className="mt-4 border-t border-[#2a3242] pt-4">
              <summary className="cursor-pointer text-sm font-black text-amber-100">
                Technical details
              </summary>
              <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#9aa7b8]">
                {diagnostic.technicalDetails.map((detail) => (
                  <li key={detail} className="break-words font-mono">
                    {detail}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </DashboardCard>
    );
  }

  const maximumModuleMembers = Math.max(
    1,
    snapshot.members.total,
    ...snapshot.moduleAdoption.map((module) => module.memberCount)
  );
  const maximumProfessionalConversations = Math.max(
    1,
    ...snapshot.professionalUsage.map(
      (professional) => professional.conversationCount
    )
  );
  const maximumFeatureUsage = Math.max(
    1,
    ...snapshot.featureUsage.map((feature) => feature.usageCount)
  );

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader
            eyebrow="Growth window"
            title={`Last ${snapshot.windowDays} days`}
            description="Window metrics compare with the immediately preceding period. DAU and WAU always represent the latest 1 and 7 days."
          />
          <div className="flex flex-wrap items-center gap-2">
            {windowOptions.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={windowDays === days}
                onClick={() => setWindowDays(days)}
                className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-black transition ${
                  windowDays === days
                    ? "border-amber-200 bg-amber-200/20 text-amber-100"
                    : "border-[#344052] bg-[#111827] text-[#c7cfdb] hover:border-amber-200"
                }`}
              >
                {days} days
              </button>
            ))}
            <button
              type="button"
              className="beast-button-secondary min-h-11"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Refresh
            </button>
          </div>
        </div>
        <p className="mt-4 border-t border-[#2a3242] pt-4 text-xs text-[#7f8da3]">
          Generated{" "}
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(snapshot.generatedAt))}
        </p>
      </DashboardCard>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Executive growth metrics"
      >
        <MetricTile
          label="Members"
          value={String(snapshot.members.total)}
          detail={growthDetail(
            snapshot.members.newInWindow,
            snapshot.members.newInPreviousWindow
          )}
          icon="M"
          tone="blue"
        />
        <MetricTile
          label="Daily active users"
          value={String(snapshot.activity.dailyActiveUsers)}
          detail="Members with recorded activity in the latest 24 hours"
          icon="D"
          tone="green"
        />
        <MetricTile
          label="Weekly active users"
          value={String(snapshot.activity.weeklyActiveUsers)}
          detail="Members with recorded activity in the latest 7 days"
          icon="W"
          tone="purple"
        />
        <MetricTile
          label="Weekly retention"
          value={formatBeastAdminMetricRate(snapshot.activity.retentionRate)}
          detail={
            snapshot.activity.retentionEligibleMembers
              ? `${snapshot.activity.retainedMembers} of ${snapshot.activity.retentionEligibleMembers} prior-week members returned`
              : "No prior-week activity cohort exists yet"
          }
          icon="R"
          tone="yellow"
        />
        <MetricTile
          label="Conversation volume"
          value={String(snapshot.conversations.count)}
          detail={growthDetail(
            snapshot.conversations.count,
            snapshot.conversations.previousCount
          )}
          icon="C"
          tone="purple"
        />
        <MetricTile
          label="Conversation messages"
          value={String(snapshot.conversations.messageCount)}
          detail="Persisted messages in conversations started this period"
          icon="A"
          tone="blue"
        />
        <MetricTile
          label="Engaged members"
          value={String(snapshot.activity.trackedMemberCount)}
          detail={`Members with ${snapshot.activity.trackedEventCount} recorded actions`}
          icon="E"
          tone="green"
        />
        <MetricTile
          label="Revenue metrics"
          value="Not connected"
          detail="Reserved for recognized revenue evidence"
          icon="$"
          tone="yellow"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Activity"
            title="Recorded active members by day"
            description="Distinct members with meaningful persisted actions. This is not login or page-view telemetry."
          />
          <div className="mt-5">
            {snapshot.dailyActivity.length ? (
              <div className="flex h-64 items-end gap-1 overflow-x-auto rounded-xl border border-[#2a3242] bg-[#111827] px-3 pb-3 pt-6">
                {snapshot.dailyActivity.map((day) => {
                  const height = Math.max(
                    8,
                    (day.activeMemberCount / maximumDailyActive) * 100
                  );
                  return (
                    <div
                      key={day.date}
                      className="group flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-2"
                      title={`${formatDate(day.date)}: ${day.activeMemberCount} active members, ${day.eventCount} events`}
                    >
                      <span className="text-[10px] font-black text-[#c7cfdb]">
                        {day.activeMemberCount}
                      </span>
                      <div
                        className="w-full max-w-8 rounded-t bg-amber-300/80 transition group-hover:bg-amber-200"
                        style={{ height: `${height}%` }}
                      />
                      <span className="hidden text-[10px] text-[#7f8da3] sm:block">
                        {formatDate(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#344052] p-6 text-center text-sm leading-6 text-[#9aa7b8]">
                No meaningful product activity was persisted during this
                period.
              </p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard accent="yellow">
          <SectionHeader
            eyebrow="Future revenue metrics"
            title="Revenue source not connected"
            description="BeastAdmin will not estimate MRR or ARR from subscription labels or assumed prices."
          />
          <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-5">
            <p className="text-sm font-black text-amber-100">
              Monthly recurring revenue: Not measured
            </p>
            <p className="mt-2 text-sm font-black text-amber-100">
              Annual recurring revenue: Not measured
            </p>
            <p className="mt-4 text-sm leading-6 text-[#dbe3ef]">
              {snapshot.revenue.evidence}
            </p>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Module adoption"
            title="Where members are building history"
            description="A member adopts a module after creating at least one meaningful persisted record in that area."
          />
          <div className="mt-5 grid gap-4">
            {snapshot.moduleAdoption.map((module) => (
              <div
                key={module.moduleId}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-white">{module.moduleLabel}</p>
                  <p className="text-sm font-black text-[#dbe3ef]">
                    {module.memberCount} ·{" "}
                    {module.adoptionRate === null
                      ? "No members"
                      : `${Math.round(module.adoptionRate * 100)}%`}
                  </p>
                </div>
                <Bar
                  value={module.memberCount}
                  maximum={maximumModuleMembers}
                  tone="blue"
                />
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Most popular professionals"
            title="Conversation demand"
            description={`Professionals ranked by conversations started during the last ${snapshot.windowDays} days.`}
          />
          <div className="mt-5 grid gap-4">
            {snapshot.professionalUsage.length ? (
              snapshot.professionalUsage.map((professional, index) => (
                <div
                  key={professional.agentId}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">
                        {index + 1}.{" "}
                        {getBeastAdminProfessionalName(professional.agentId)}
                      </p>
                      <p className="mt-1 text-xs text-[#7f8da3]">
                        {professional.memberCount} engaged member
                        {professional.memberCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[#dbe3ef]">
                      {professional.conversationCount} conversation
                      {professional.conversationCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Bar
                    value={professional.conversationCount}
                    maximum={maximumProfessionalConversations}
                    tone="purple"
                  />
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-[#344052] p-6 text-center text-sm leading-6 text-[#9aa7b8]">
                No professional conversations were started during this period.
              </p>
            )}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Feature usage"
          title="Meaningful actions across Beast"
          description={`Persisted feature actions during the last ${snapshot.windowDays} days, ranked by recorded use.`}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {snapshot.featureUsage.map((feature) => (
            <div
              key={feature.featureId}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">
                    {feature.featureLabel}
                  </p>
                  <p className="mt-1 text-xs text-[#7f8da3]">
                    {feature.memberCount} member
                    {feature.memberCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="text-2xl font-black text-white">
                  {feature.usageCount}
                </p>
              </div>
              <Bar value={feature.usageCount} maximum={maximumFeatureUsage} />
            </div>
          ))}
        </div>
      </DashboardCard>

      <p className="text-xs leading-5 text-[#7f8da3]">
        Executive Metrics returns aggregate counts only. It does not expose
        member identities, conversation content, document contents, balances,
        payment amounts, health information, or unverified revenue.
      </p>
    </div>
  );
}
