"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { GuidedEmptyState } from "@/app/components/design/DashboardPrimitives";
import type { HealthRecord } from "@/lib/health/foundation";
import {
  buildLivingHealthTimeline,
  filterLivingHealthTimeline,
  findLivingTimelineDateTarget,
  formatLivingHealthEventType,
  livingHealthTimelineEventTypes,
  type LivingHealthTimelineEvent,
  type LivingHealthTimelineEventType,
  type LivingHealthTimelineLink,
} from "@/lib/health/livingTimeline";

type Props = {
  records: readonly HealthRecord[];
  loading: boolean;
  error: string;
};

function formatDate(value: string) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function uniqueLinks(events: readonly LivingHealthTimelineEvent[], key: "providers" | "conditions") {
  return Array.from(
    new Map(events.flatMap((event) => event[key]).map((link) => [link.id, link])).values()
  ).sort((left, right) => left.label.localeCompare(right.label));
}

function TimelineLinks({
  label,
  links,
}: {
  label: string;
  links: readonly LivingHealthTimelineLink[];
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-black uppercase tracking-wide text-[#8f9cad]">{label}</dt>
      <dd className="mt-1 flex min-w-0 flex-wrap gap-1.5">
        {links.length ? (
          links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="max-w-full truncate rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              {link.label}
            </Link>
          ))
        ) : (
          <span className="text-xs text-[#8f9cad]">None linked</span>
        )}
      </dd>
    </div>
  );
}

export function LivingHealthTimeline({ records, loading, error }: Props) {
  const events = useMemo(() => buildLivingHealthTimeline(records), [records]);
  const [query, setQuery] = useState("");
  const [eventType, setEventType] = useState<LivingHealthTimelineEventType | "all">("all");
  const [jumpDate, setJumpDate] = useState("");
  const [providerId, setProviderId] = useState("");
  const [conditionId, setConditionId] = useState("");
  const [jumpStatus, setJumpStatus] = useState("");
  const visibleEvents = useMemo(
    () => filterLivingHealthTimeline(events, { query, eventType }),
    [eventType, events, query]
  );
  const providers = useMemo(() => uniqueLinks(events, "providers"), [events]);
  const conditions = useMemo(() => uniqueLinks(events, "conditions"), [events]);

  function jumpToEvent(event: LivingHealthTimelineEvent, reason: string) {
    setQuery("");
    setEventType("all");
    setJumpStatus(`${reason}: ${event.title}, ${formatDate(event.date)}.`);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(`health-timeline-event-${event.id}`);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus({ preventScroll: true });
      });
    });
  }

  function submitDateJump(event: FormEvent) {
    event.preventDefault();
    const target = findLivingTimelineDateTarget(events, jumpDate);
    if (!target) {
      setJumpStatus("No saved timeline event is available for that date.");
      return;
    }
    jumpToEvent(
      target,
      target.dateKey === jumpDate ? "Jumped to date" : "Jumped to the closest saved date"
    );
  }

  function jumpToProvider() {
    const target = events.find((event) =>
      event.providers.some((provider) => provider.id === providerId)
    );
    if (target) jumpToEvent(target, "Jumped to provider");
  }

  function jumpToCondition() {
    const target = events.find((event) =>
      event.conditions.some((condition) => condition.id === conditionId)
    );
    if (target) jumpToEvent(target, "Jumped to condition");
  }

  if (loading) {
    return <p role="status" className="text-sm text-[#c7cfdb]">Loading your living health story…</p>;
  }

  if (!events.length) {
    return (
      <GuidedEmptyState
        title="Your health story starts with one saved event"
        description={
          error
            ? "Health records are unavailable, so BeastHealth cannot build the timeline."
            : "The timeline grows from dated records and confirmed Health Advisor conversations."
        }
        guidance="Beast shows only health events you saved. It does not make up missing activity."
        nextAction={{ label: "Open Health Overview", href: "/dashboard/health" }}
      />
    );
  }

  return (
    <div className="min-w-0">
      {error ? (
        <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-5 grid min-w-0 gap-4 rounded-2xl border border-white/10 bg-black/10 p-4" aria-label="Timeline controls">
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
            Search health story
            <input
              type="search"
              className="beast-input min-w-0"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search event, source, provider, condition…"
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
            Show only
            <select
              className="beast-input min-w-0"
              value={eventType}
              onChange={(event) =>
                setEventType(event.target.value as LivingHealthTimelineEventType | "all")
              }
            >
              <option value="all">All health events</option>
              {livingHealthTimelineEventTypes.map((type) => (
                <option key={type} value={type}>{formatLivingHealthEventType(type)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-3">
          <form className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={submitDateJump}>
            <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
              Go to date
              <input
                type="date"
                className="beast-input min-w-0"
                value={jumpDate}
                onChange={(event) => setJumpDate(event.target.value)}
              />
            </label>
            <button type="submit" className="beast-button-secondary min-h-11 self-end" disabled={!jumpDate}>
              Jump
            </button>
          </form>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
              Go to doctor or specialist
              <select className="beast-input min-w-0" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
                <option value="">Choose a doctor or specialist</option>
                {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
              </select>
            </label>
            <button type="button" className="beast-button-secondary min-h-11 self-end" disabled={!providerId} onClick={jumpToProvider}>
              Jump
            </button>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
              Go to condition
              <select className="beast-input min-w-0" value={conditionId} onChange={(event) => setConditionId(event.target.value)}>
                <option value="">Select condition</option>
                {conditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.label}</option>)}
              </select>
            </label>
            <button type="button" className="beast-button-secondary min-h-11 self-end" disabled={!conditionId} onClick={jumpToCondition}>
              Jump
            </button>
          </div>
        </div>
        <p className="text-xs text-[#9aa7b8]" aria-live="polite">{jumpStatus}</p>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-[#c7cfdb]">
        <p><strong className="text-white">{visibleEvents.length}</strong> of {events.length} saved events</p>
        {query || eventType !== "all" ? (
          <button type="button" className="font-bold text-cyan-200 underline underline-offset-4" onClick={() => { setQuery(""); setEventType("all"); }}>
            Clear filters
          </button>
        ) : null}
      </div>

      {visibleEvents.length ? (
        <ol className="mt-4 grid min-w-0 gap-4">
          {visibleEvents.map((event) => (
            <li key={event.id}>
              <article
                id={`health-timeline-event-${event.id}`}
                tabIndex={-1}
                className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/30 sm:p-5"
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-red-200">
                      {formatDate(event.date)} · {event.eventLabel}
                    </p>
                    <h2 className="mt-2 break-words text-lg font-black text-white">{event.title}</h2>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold capitalize text-[#c7cfdb]">
                    {event.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[#c7cfdb]">
                  <span className="font-bold text-white">Source:</span> {event.source || "Source not recorded"}
                </p>
                <dl className="mt-4 grid min-w-0 gap-4 border-t border-white/10 pt-4 md:grid-cols-2 xl:grid-cols-4">
                  <TimelineLinks label="Related records" links={event.linkedRecords} />
                  <TimelineLinks label="Health documents" links={event.documents} />
                  <TimelineLinks label="Doctors and specialists" links={event.providers} />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-black uppercase tracking-wide text-[#8f9cad]">Health Advisor conversations</dt>
                    <dd className="mt-1 flex min-w-0 flex-wrap gap-1.5">
                      {event.conversationReferences.length ? (
                        event.conversationReferences.map((reference) => (
                          <Link
                            key={reference}
                            href="/dashboard/health/ai-advisor"
                            className="max-w-full truncate rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                            title={reference}
                          >
                            Health Advisor conversation
                          </Link>
                        ))
                      ) : (
                        <span className="text-xs text-[#8f9cad]">None linked</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm leading-6 text-[#9aa7b8]">
          No saved timeline events match the current search and filter.
        </p>
      )}
    </div>
  );
}
