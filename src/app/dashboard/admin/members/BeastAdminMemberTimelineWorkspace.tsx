"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminMemberTimelineCategories,
  beastAdminMemberTimelineCategoryLabels,
  buildBeastAdminMemberTimelineCounts,
  filterBeastAdminMemberTimelineEvents,
  normalizeBeastAdminMemberDirectory,
  normalizeBeastAdminMemberTimeline,
  type BeastAdminMemberDirectoryEntry,
  type BeastAdminMemberTimelineCategory,
  type BeastAdminMemberTimelineSnapshot,
} from "@/lib/beastAdminMemberTimeline";
import { createClient } from "@/lib/supabase/client";

const categoryClasses: Record<BeastAdminMemberTimelineCategory, string> = {
  registration: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  module: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  conversation: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  goals: "border-yellow-300/35 bg-yellow-300/10 text-yellow-100",
  learning: "border-indigo-300/35 bg-indigo-300/10 text-indigo-100",
  money: "border-green-300/35 bg-green-300/10 text-green-100",
  health: "border-red-300/35 bg-red-300/10 text-red-100",
  documents: "border-slate-300/35 bg-slate-300/10 text-slate-100",
};

function humanizeTimelineError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    /get_beast_admin_member_|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "Member timelines are not available yet. Apply the BA-104 Supabase migration, then retry.";
  }
  if (/permission|owner access|required|42501/i.test(message)) {
    return "Member timelines are restricted to the Beast owner.";
  }
  if (/not available|P0002/i.test(message)) {
    return "That member is no longer available in the owner directory.";
  }

  return "BeastAdmin could not load the member timeline. No journey events were estimated.";
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function TimelineLoadingState({ title }: { title: string }) {
  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Member Timeline"
        title={title}
        description="BeastAdmin is assembling permissioned journey metadata from each source application."
      />
      <div className="mt-5 grid gap-3" aria-busy="true">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
          />
        ))}
      </div>
    </DashboardCard>
  );
}

export function BeastAdminMemberTimelineWorkspace() {
  const [members, setMembers] = useState<BeastAdminMemberDirectoryEntry[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [timeline, setTimeline] =
    useState<BeastAdminMemberTimelineSnapshot | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<
    BeastAdminMemberTimelineCategory | "all"
  >("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDirectory() {
      setDirectoryLoading(true);
      setError("");

      try {
        const supabase = createClient();
        const { data, error: directoryError } = await supabase.rpc(
          "get_beast_admin_member_directory"
        );
        if (directoryError) throw directoryError;

        const nextMembers = normalizeBeastAdminMemberDirectory(data);
        if (!nextMembers) throw new Error("Member directory data was invalid.");
        if (!active) return;

        setMembers(nextMembers);
        setSelectedMemberId((current) => {
          if (current && nextMembers.some((member) => member.id === current)) {
            return current;
          }
          return nextMembers[0]?.id || "";
        });
      } catch (directoryError) {
        if (active) {
          setMembers([]);
          setSelectedMemberId("");
          setTimeline(null);
          setError(humanizeTimelineError(directoryError));
        }
      } finally {
        if (active) setDirectoryLoading(false);
      }
    }

    loadDirectory();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;

    async function loadTimeline() {
      if (!selectedMemberId) {
        setTimeline(null);
        return;
      }

      setTimelineLoading(true);
      setError("");
      setCategory("all");

      try {
        const supabase = createClient();
        const { data, error: timelineError } = await supabase.rpc(
          "get_beast_admin_member_timeline",
          {
            selected_member_id: selectedMemberId,
            event_limit: 200,
          }
        );
        if (timelineError) throw timelineError;

        const nextTimeline = normalizeBeastAdminMemberTimeline(data);
        if (!nextTimeline) throw new Error("Member timeline data was invalid.");
        if (active) setTimeline(nextTimeline);
      } catch (timelineError) {
        if (active) {
          setTimeline(null);
          setError(humanizeTimelineError(timelineError));
        }
      } finally {
        if (active) setTimelineLoading(false);
      }
    }

    loadTimeline();

    return () => {
      active = false;
    };
  }, [selectedMemberId]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return members;

    return members.filter((member) =>
      [member.displayName, member.email || "", member.role].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery)
      )
    );
  }, [members, query]);
  const visibleEvents = useMemo(
    () =>
      timeline
        ? filterBeastAdminMemberTimelineEvents(timeline.events, category)
        : [],
    [category, timeline]
  );
  const categoryCounts = useMemo(
    () =>
      buildBeastAdminMemberTimelineCounts(timeline?.events || []),
    [timeline]
  );
  const selectedDirectoryMember = members.find(
    (member) => member.id === selectedMemberId
  );

  if (directoryLoading) {
    return <TimelineLoadingState title="Loading owner member directory" />;
  }

  if (error && !members.length) {
    return (
      <DashboardCard accent="red">
        <SectionHeader
          eyebrow="Member Timeline"
          title="Member journeys unavailable"
          description={error}
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

  if (!members.length) {
    return (
      <DashboardCard accent="admin">
        <div className="py-6 text-center">
          <p className="beast-kicker">Owner member directory</p>
          <h2 className="mt-2 text-2xl font-black text-white">
            No members are registered
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#9aa7b8]">
            A member timeline will begin with registration after the first
            authenticated profile is created. BeastAdmin does not display
            configured sample members here.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Members"
            title={`${members.length} registered`}
            description="Select a member to review their permissioned journey."
          />
          <label className="mt-4 grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Search members
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, or role"
              className="min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15"
            />
          </label>
          <div className="mt-4 grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                aria-pressed={selectedMemberId === member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedMemberId === member.id
                    ? "border-amber-200 bg-amber-200/15"
                    : "border-[#2a3242] bg-[#111827] hover:border-amber-200/60"
                }`}
              >
                <p className="truncate font-black text-white">
                  {member.displayName}
                </p>
                <p className="mt-1 truncate text-xs text-[#9aa7b8]">
                  {member.email || "No email available"}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-[#7f8da3]">
                  <span>{member.eventCount} events</span>
                  <span>{formatShortDate(member.lastActivityAt)}</span>
                </div>
              </button>
            ))}
            {!filteredMembers.length ? (
              <p className="rounded-xl border border-dashed border-[#344052] p-4 text-center text-sm text-[#9aa7b8]">
                No members match this search.
              </p>
            ) : null}
          </div>
        </DashboardCard>
      </aside>

      <div className="min-w-0 space-y-6">
        {timelineLoading ? (
          <TimelineLoadingState
            title={`Loading ${selectedDirectoryMember?.displayName || "member"}’s journey`}
          />
        ) : error || !timeline ? (
          <DashboardCard accent="red">
            <SectionHeader
              eyebrow="Member Timeline"
              title="Journey unavailable"
              description={
                error ||
                "BeastAdmin did not receive a valid member timeline."
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
        ) : (
          <>
            <DashboardCard accent="admin">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="beast-kicker">Member journey</p>
                  <h2 className="mt-2 break-words text-3xl font-black text-white">
                    {timeline.member.displayName}
                  </h2>
                  <p className="mt-2 break-all text-sm text-[#9aa7b8]">
                    {timeline.member.email || "No email available"} ·{" "}
                    {timeline.member.role}
                  </p>
                </div>
                <button
                  type="button"
                  className="beast-button-secondary min-h-11"
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  Refresh journey
                </button>
              </div>
            </DashboardCard>

            <section
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Member journey summary"
            >
              <MetricTile
                label="Registered"
                value={formatShortDate(timeline.member.registeredAt)}
                detail="Authenticated Beast profile"
                icon="R"
                tone="blue"
              />
              <MetricTile
                label="Journey Events"
                value={String(timeline.eventCount)}
                detail={`${timeline.events.length} loaded in this view`}
                icon="J"
                tone="purple"
              />
              <MetricTile
                label="Applications Used"
                value={String(categoryCounts.module)}
                detail="Based on first persisted activity"
                icon="A"
                tone="yellow"
              />
              <MetricTile
                label="Latest Activity"
                value={formatShortDate(
                  timeline.events[0]?.occurredAt ||
                    timeline.member.registeredAt
                )}
                detail="Latest permissioned journey event"
                icon="L"
                tone="green"
              />
            </section>

            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Timeline"
                title="From registration to today"
                description={`${visibleEvents.length} event${visibleEvents.length === 1 ? "" : "s"} shown. Select a category to focus the journey.`}
              />
              <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  aria-pressed={category === "all"}
                  onClick={() => setCategory("all")}
                  className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
                    category === "all"
                      ? "border-amber-200 bg-amber-200/20 text-amber-100"
                      : "border-[#344052] text-[#c7cfdb]"
                  }`}
                >
                  All · {timeline.events.length}
                </button>
                {beastAdminMemberTimelineCategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                    className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
                      category === item
                        ? categoryClasses[item]
                        : "border-[#344052] text-[#c7cfdb]"
                    }`}
                  >
                    {beastAdminMemberTimelineCategoryLabels[item]} ·{" "}
                    {categoryCounts[item]}
                  </button>
                ))}
              </div>

              {visibleEvents.length ? (
                <ol className="relative mt-5 grid gap-4 before:absolute before:bottom-6 before:left-[1.15rem] before:top-6 before:w-px before:bg-[#344052]">
                  {visibleEvents.map((event) => (
                    <li
                      key={event.id}
                      className="relative grid grid-cols-[2.4rem_minmax(0,1fr)] gap-3"
                    >
                      <div
                        className={`z-10 flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black uppercase ${categoryClasses[event.category]}`}
                        aria-hidden="true"
                      >
                        {
                          beastAdminMemberTimelineCategoryLabels[
                            event.category
                          ][0]
                        }
                      </div>
                      <article className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-black text-white">{event.title}</p>
                            <p className="mt-1 text-sm leading-6 text-[#c7cfdb]">
                              {event.detail}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${categoryClasses[event.category]}`}
                          >
                            {
                              beastAdminMemberTimelineCategoryLabels[
                                event.category
                              ]
                            }
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-bold text-[#7f8da3]">
                          {formatTimelineDate(event.occurredAt)}
                        </p>
                      </article>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-[#344052] p-6 text-center">
                  <p className="font-black text-white">
                    No {category === "all" ? "" : beastAdminMemberTimelineCategoryLabels[category].toLowerCase()} events
                  </p>
                  <p className="mt-2 text-sm text-[#9aa7b8]">
                    BeastAdmin will not create a timeline event without a
                    persisted source record.
                  </p>
                </div>
              )}

              {timeline.hasMore ? (
                <p className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
                  This member has more than 200 journey events. The newest 200
                  are shown.
                </p>
              ) : null}
            </DashboardCard>

            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Permission and Source Coverage"
                title="What this timeline can confirm"
                description="Every category names its evidence boundary so incomplete coverage is not mistaken for inactivity."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {timeline.coverage.map((item) => (
                  <article
                    key={item.category}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-white">
                        {
                          beastAdminMemberTimelineCategoryLabels[
                            item.category
                          ]
                        }
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${
                          item.state === "available"
                            ? "border-green-300/35 bg-green-300/10 text-green-100"
                            : "border-amber-300/35 bg-amber-300/10 text-amber-100"
                        }`}
                      >
                        {item.state}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                      {item.detail}
                    </p>
                  </article>
                ))}
              </div>
              <p className="mt-5 border-t border-[#2a3242] pt-4 text-xs leading-5 text-[#7f8da3]">
                Owner-only boundary: raw conversation content, financial
                balances and amounts, clinical details, and document contents
                are excluded from this workspace.
              </p>
            </DashboardCard>
          </>
        )}
      </div>
    </div>
  );
}
