"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildMonthGrid, weekdayLabels } from "@/lib/calendar";
import type { MemberCalendarEvent } from "@/lib/calendar/memberSchedule";
const labels = { all: "All", money: "Money", goals: "Goals", health: "Health" };
export default function CalendarPage() {
  const [month, setMonth] = useState("");
  const [today, setToday] = useState("");
  const [selected, setSelected] = useState("");
  const [source, setSource] = useState<keyof typeof labels>("all");
  const [events, setEvents] = useState<MemberCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    setToday(date);
    setMonth(date.slice(0, 7));
  }, []);
  useEffect(() => {
    if (!month) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setEvents([]);
    setWarnings([]);
    fetch(
      `/api/calendar?month=${month}&timeZone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setEvents(data.events);
        setWarnings(data.warnings);
        setToday(data.today);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause.message || "Calendar unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, refresh]);
  const grid = useMemo(
    () =>
      month
        ? buildMonthGrid(Number(month.slice(0, 4)), Number(month.slice(5)) - 1)
        : [],
    [month],
  );
  const filtered = events.filter(
    (event) => source === "all" || source === event.source,
  );
  const agenda = filtered.filter(
    (event) => !selected || event.date === selected,
  );
  function shift(delta: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    const next = date.toISOString().slice(0, 7);
    if (next >= "1900-01" && next <= "2200-12") {
      setMonth(next);
      setSelected("");
    }
  }
  return (
    <main className="beast-page" data-mobile-shared-service="calendar">
      <div className="beast-container min-w-0 break-words space-y-6">
        <header className="beast-page-header">
          <h1 className="beast-title">Your calendar</h1>
          <p className="beast-subtitle">
            Bills, goal dates, and health appointments in one place. Open an
            item to update it where you saved it.
          </p>
          <Link
            href="/dashboard/settings/notifications"
            className="text-sky-300 underline"
          >
            Set up device reminders
          </Link>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              className="beast-button-secondary"
              disabled={!month}
              aria-label="Previous month"
              onClick={() => shift(-1)}
            >
              Previous
            </button>
            <button
              className="beast-button-secondary"
              onClick={() => {
                setMonth(today.slice(0, 7));
                setSelected(today);
              }}
            >
              Today
            </button>
            <button
              className="beast-button-secondary"
              disabled={!month}
              aria-label="Next month"
              onClick={() => shift(1)}
            >
              Next
            </button>
          </div>
          <h2 className="text-xl font-bold">
            {month &&
              new Date(`${month}-01T12:00:00Z`).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
          </h2>
          <button
            className="beast-button-secondary"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Calendar filters">
          {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => (
            <button
              key={key}
              className={
                key === source ? "beast-button" : "beast-button-secondary"
              }
              aria-pressed={key === source}
              onClick={() => setSource(key)}
            >
              {labels[key]}
            </button>
          ))}
        </div>
        {loading && <p role="status">Loading your calendar…</p>}
        {error && (
          <p role="alert" className="text-red-200">
            {error}
          </p>
        )}
        {warnings.map((warning) => (
          <p key={warning} role="status" className="text-amber-100">
            {warning}
          </p>
        ))}
        <section aria-label="Month" className="beast-card p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1">
            {weekdayLabels.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs text-slate-400"
              >
                {day}
              </div>
            ))}
            {grid.map((day) => {
              const count = filtered.filter(
                (event) => event.date === day.key,
              ).length;
              return (
                <button
                  key={day.key}
                  disabled={!day.inCurrentMonth || loading}
                  onClick={() =>
                    setSelected(selected === day.key ? "" : day.key)
                  }
                  aria-pressed={selected === day.key}
                  aria-label={`${day.key}, ${count} items`}
                  className={`min-h-16 rounded-lg border p-1 text-center sm:min-h-24 ${selected === day.key ? "border-sky-300 bg-sky-300/10" : "border-slate-700"} ${day.inCurrentMonth ? "text-white" : "text-slate-600"}`}
                >
                  <span
                    className={
                      day.key === today
                        ? "rounded-full bg-sky-300 px-1.5 py-0.5 font-bold text-slate-950"
                        : ""
                    }
                  >
                    {day.dayOfMonth}
                  </span>
                  {count > 0 && (
                    <span className="mt-2 block text-xs text-sky-300">
                      {count}
                      <span className="hidden sm:inline">
                        {" "}
                        {count === 1 ? "item" : "items"}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
        <section aria-label="Calendar agenda" className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold">
              {selected ? `On ${selected}` : "This month"}
            </h2>
            {selected && (
              <button
                className="text-sky-300 underline"
                onClick={() => setSelected("")}
              >
                Show whole month
              </button>
            )}
          </div>
          {!loading && !error && !agenda.length && (
            <p className="text-slate-400">
              No saved dates for this selection. Add bills in Money, target
              dates in Goals, or appointments in Health.
            </p>
          )}
          {agenda.map((event) => (
            <Link
              key={event.id}
              href={event.href}
              className="beast-card block space-y-2 p-4 hover:border-sky-300/50"
            >
              <p className="text-xs text-sky-300">
                {event.date} · {labels[event.source]}
                {event.done ? " · Complete" : ""}
              </p>
              <h3 className="break-words font-bold">{event.title}</h3>
              <p className="text-sm text-slate-300">{event.summary}</p>
            </Link>
          ))}
        </section>
        <p className="text-sm text-slate-400">
          Dates are shown without appointment times. Check Health for visit
          details. Device alerts currently cover bills and private messages.
        </p>
      </div>
    </main>
  );
}
