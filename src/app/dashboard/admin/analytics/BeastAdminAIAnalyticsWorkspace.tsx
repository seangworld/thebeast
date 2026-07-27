"use client";

import { useEffect, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  formatBeastAdminAnalyticsRate,
  formatBeastAdminSessionLength,
  getBeastAdminAbandonmentRate,
  getBeastAdminProfessionalName,
  normalizeBeastAdminAIAnalytics,
  type BeastAdminAIAnalyticsSnapshot,
} from "@/lib/beastAdminAIAnalytics";
import { createClient } from "@/lib/supabase/client";

const windowOptions = [7, 30, 90] as const;

const usageMetricDefinitions = [
  {
    title: "Conversation Count",
    detail:
      "Counts persisted conversation threads created during the selected measurement window.",
  },
  {
    title: "Average Session Length",
    detail:
      "Measures elapsed time between the first and last persisted message for conversations with at least two messages.",
  },
  {
    title: "Messages",
    detail:
      "Counts persisted member and professional messages attached to conversations created during the selected window.",
  },
  {
    title: "Abandoned Conversations",
    detail:
      "Counts conversations with a member message and no professional reply, or an unanswered latest member message older than 24 hours.",
  },
] as const;

const futureQualityMetrics = [
  {
    title: "Member satisfaction",
    detail:
      "Requires explicit, purpose-built member feedback linked to the experience being measured.",
  },
  {
    title: "Correction rate",
    detail:
      "Requires recorded corrections confirmed through member or professional review.",
  },
  {
    title: "Escalation rate",
    detail:
      "Requires reviewed escalation events with a defined reason and outcome.",
  },
  {
    title: "Resolution rate",
    detail:
      "Requires a member- or professional-confirmed resolution outcome.",
  },
] as const;

function humanizeAnalyticsError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    /get_beast_admin_ai_analytics|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "AI analytics are not available yet. Verify BA-ANA-101 using 20260726000100_add_beast_admin_ai_analytics.sql, then retry.";
  }
  if (/permission|owner access|required|42501/i.test(message)) {
    return "AI analytics are restricted to the Beast owner.";
  }

  return "BeastAdmin could not load AI analytics right now. No usage totals were estimated.";
}

function formatActivityDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function EmptyAnalyticsState() {
  return (
    <DashboardCard accent="admin">
      <div className="py-6 text-center">
        <p className="beast-kicker">No recorded conversations</p>
        <h2 className="mt-2 text-2xl font-black text-white">
          There is no AI activity in this period
        </h2>
        <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#9aa7b8]">
          BeastAdmin will begin reporting usage after members start persisted
          conversations with a Beast professional. Zero is shown only when the
          analytics source confirms zero.
        </p>
      </div>
    </DashboardCard>
  );
}

export function BeastAdminAIAnalyticsWorkspace() {
  const [windowDays, setWindowDays] = useState<(typeof windowOptions)[number]>(
    30
  );
  const [snapshot, setSnapshot] =
    useState<BeastAdminAIAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();
        const { data, error: analyticsError } = await supabase.rpc(
          "get_beast_admin_ai_analytics",
          { window_days: windowDays }
        );
        if (analyticsError) throw analyticsError;

        const nextSnapshot = normalizeBeastAdminAIAnalytics(data);
        if (!nextSnapshot) {
          throw new Error("The AI analytics response was invalid.");
        }
        if (active) setSnapshot(nextSnapshot);
      } catch (analyticsError) {
        if (active) {
          setSnapshot(null);
          setError(humanizeAnalyticsError(analyticsError));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      active = false;
    };
  }, [refreshKey, windowDays]);

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="AI Analytics"
          title="Measuring professional conversations"
          description="BeastAdmin is aggregating platform usage without loading raw conversation content into this workspace."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      </DashboardCard>
    );
  }

  if (error || !snapshot) {
    return (
      <DashboardCard accent="red">
        <SectionHeader
          eyebrow="AI Analytics"
          title="Analytics unavailable"
          description={
            error ||
            "BeastAdmin did not receive a valid aggregate analytics response."
          }
        />
        <button
          type="button"
          className="beast-button mt-5"
          onClick={() => setRefreshKey((current) => current + 1)}
        >
          Retry
        </button>
      </DashboardCard>
    );
  }

  const abandonmentRate = getBeastAdminAbandonmentRate(snapshot);
  const maxProfessionalConversations = Math.max(
    1,
    ...snapshot.professionalUsage.map((item) => item.conversationCount)
  );
  const maxDailyConversations = Math.max(
    1,
    ...snapshot.dailyActivity.map((item) => item.conversationCount)
  );

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader
            eyebrow="Measurement Window"
            title={`Last ${snapshot.windowDays} days`}
            description="Conversation counts include conversations started during the selected period. Metrics refresh from persisted Beast Agent records."
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

      {snapshot.conversationCount === 0 ? (
        <EmptyAnalyticsState />
      ) : (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="AI usage metrics"
          >
            <MetricTile
              label="Conversations"
              value={String(snapshot.conversationCount)}
              detail={`${snapshot.engagedMemberCount} engaged member${snapshot.engagedMemberCount === 1 ? "" : "s"}`}
              icon="C"
              tone="blue"
            />
            <MetricTile
              label="Average Session Length"
              value={formatBeastAdminSessionLength(
                snapshot.averageSessionSeconds
              )}
              detail="First-to-last persisted message span"
              icon="S"
              tone="purple"
            />
            <MetricTile
              label="Messages"
              value={String(snapshot.messageCount)}
              detail={`${snapshot.archivedCount} archived conversation${snapshot.archivedCount === 1 ? "" : "s"}`}
              icon="M"
              tone="green"
            />
            <MetricTile
              label="Abandoned Conversations"
              value={String(snapshot.abandonedCount)}
              detail={`${Math.round(abandonmentRate * 100)}% of conversations`}
              icon="A"
              tone={snapshot.abandonedCount ? "yellow" : "green"}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Professional Usage"
                title="Where conversations are happening"
                description="Conversation and message totals grouped by the professional recorded on each thread."
              />
              {snapshot.professionalUsage.length ? (
                <div className="mt-5 grid gap-4">
                  {snapshot.professionalUsage.map((professional) => (
                    <div
                      key={professional.agentId}
                      className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-white">
                            {getBeastAdminProfessionalName(
                              professional.agentId
                            )}
                          </p>
                          <p className="mt-1 text-xs text-[#7f8da3]">
                            {professional.messageCount} message
                            {professional.messageCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <p className="text-lg font-black text-amber-100">
                          {professional.conversationCount}
                        </p>
                      </div>
                      <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-[#242d3b]"
                        aria-label={`${professional.conversationCount} conversations`}
                      >
                        <div
                          className="h-full rounded-full bg-amber-300"
                          style={{
                            width: `${Math.max(
                              4,
                              (professional.conversationCount /
                                maxProfessionalConversations) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-dashed border-[#344052] p-5 text-sm text-[#9aa7b8]">
                  No professional usage groups are available for this period.
                </p>
              )}
            </DashboardCard>

            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Most Common Topics"
                title="What members are discussing"
                description="Topics come only from explicit conversation tags. BeastAdmin does not infer topics from private message content."
              />
              {snapshot.commonTopics.length ? (
                <ol className="mt-5 divide-y divide-[#2a3242]">
                  {snapshot.commonTopics.map((topic, index) => (
                    <li
                      key={topic.topic}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-xs font-black text-amber-100">
                          {index + 1}
                        </span>
                        <p className="truncate font-bold capitalize text-white">
                          {topic.topic}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-[#dbe3ef]">
                        {topic.conversationCount}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-[#344052] p-5">
                  <p className="font-black text-white">No tagged topics yet</p>
                  <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                    Conversations exist, but none in this period have explicit
                    topic tags. Message content was not analyzed as a fallback.
                  </p>
                </div>
              )}
            </DashboardCard>
          </section>

          <DashboardCard accent="admin">
            <SectionHeader
              eyebrow="Conversation Activity"
              title="When new conversations began"
              description="Daily conversation starts within the selected period. Days with no starts remain empty rather than being filled with estimated activity."
            />
            {snapshot.dailyActivity.length ? (
              <div className="mt-5 flex min-h-48 items-end gap-2 overflow-x-auto pb-2">
                {snapshot.dailyActivity.map((day) => (
                  <div
                    key={day.date}
                    className="flex min-w-16 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <p className="text-xs font-black text-white">
                      {day.conversationCount}
                    </p>
                    <div className="flex h-28 w-full items-end rounded-lg bg-[#111827] px-2 pt-2">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-amber-500 to-amber-200"
                        style={{
                          height: `${Math.max(
                            8,
                            (day.conversationCount / maxDailyConversations) *
                              100
                          )}%`,
                        }}
                        aria-label={`${day.conversationCount} conversations on ${day.date}`}
                      />
                    </div>
                    <p className="text-[11px] font-bold text-[#7f8da3]">
                      {formatActivityDate(day.date)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </DashboardCard>
        </>
      )}

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Metric Interpretation"
          title="How usage is measured"
          description="Each metric comes from persisted conversation records. Definitions are shown explicitly so activity is not mistaken for quality."
        />
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {usageMetricDefinitions.map((metric) => (
            <div
              key={metric.title}
              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <dt className="font-black text-white">{metric.title}</dt>
              <dd className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                {metric.detail}
              </dd>
            </div>
          ))}
        </dl>
      </DashboardCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardCard accent="yellow">
          <SectionHeader
            eyebrow="Outcome Coverage"
            title="Completion rate"
            description={formatBeastAdminAnalyticsRate(
              snapshot.completionRate
            )}
          />
          <p className="mt-4 text-sm leading-6 text-[#c7cfdb]">
            Completion is intentionally not inferred. Beast does not currently
            record an explicit resolved or completed conversation outcome, and
            archiving describes organization rather than success.
          </p>
        </DashboardCard>

        <DashboardCard accent="yellow">
          <SectionHeader
            eyebrow="Response Feedback"
            title="Helpful response rate"
            description={formatBeastAdminAnalyticsRate(
              snapshot.helpfulResponseRate
            )}
          />
          <p className="mt-4 text-sm leading-6 text-[#c7cfdb]">
            Explicit response-linked feedback is required before this rate can
            be measured. Product feedback and lesson grading are different
            signals, so BeastAdmin never estimates response quality from them.
          </p>
        </DashboardCard>
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Future"
          title="Quality metrics need explicit evidence"
          description="BA-103 establishes the usage baseline. Future quality reporting should be added only with reviewed, purpose-built signals."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {futureQualityMetrics.map((metric) => (
            <article
              key={metric.title}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-white">{metric.title}</h3>
                <span className="rounded-full border border-[#344052] bg-[#0b1220] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#7f8da3]">
                  Not collected
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                {metric.detail}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-5 border-t border-[#2a3242] pt-4 text-xs leading-5 text-[#7f8da3]">
          Privacy boundary: this workspace receives aggregate counts only. Raw
          conversation content and member-level conversation records are not
          rendered in BeastAdmin analytics.
        </p>
      </DashboardCard>
    </div>
  );
}
