"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
} from "@/app/components/design/DashboardPrimitives";
import {
  ModuleFilterRail,
  PlatformServiceHero,
  ServiceEventCard,
  serviceEvents,
  serviceModules,
} from "@/app/dashboard/platformServices";
import {
  buildCalendarReminders,
  buildCalendarRescheduleRequest,
  buildCalendarViews,
  buildMonthGrid,
  buildRecurringCalendarEvents,
  calendarContractRules,
  detectCalendarConflicts,
  weekdayLabels,
  type CalendarEvent,
} from "@/lib/calendar";
import { useRuntimeToday } from "@/lib/hooks/useRuntimeToday";
import { formatBeastMonthYear, getBeastRuntimeDateParts } from "@/lib/runtimeDate";
import { buildMobileCalendarCards } from "@/lib/mobileSharedServices";

const moneyEventDays = new Set([3, 7, 14, 21, 28]);

const sharedCalendarEvents: CalendarEvent[] = [
  {
    id: "calendar-money-bill",
    source: "money",
    sourceRecordId: "bill-rent",
    title: "Review rent payment",
    summary: "BeastMoney owns the bill date and payment state.",
    startsAt: "2026-07-16T13:00:00.000Z",
    endsAt: "2026-07-16T13:30:00.000Z",
    timeZone: "America/New_York",
    permissionScope: "Owner",
    actionUrl: "/dashboard/money/cashflow",
    recurrence: "Monthly",
    reminderMinutesBefore: [60, 15],
  },
  {
    id: "calendar-learning-review",
    source: "learning",
    sourceRecordId: "mentor-review",
    title: "Weekly Guidance Counselor review",
    summary: "BeastEducation owns review readiness and learning cadence.",
    startsAt: "2026-07-16T13:15:00.000Z",
    endsAt: "2026-07-16T13:45:00.000Z",
    timeZone: "America/New_York",
    permissionScope: "Owner",
    actionUrl: "/dashboard/learning#weekly-review",
    recurrence: "Weekly",
    reminderMinutesBefore: [30],
  },
];

export default function CalendarPage() {
  const { now } = useRuntimeToday();
  const todayParts = getBeastRuntimeDateParts(now);
  const calendarDays = useMemo(
    () => buildMonthGrid(todayParts.year, todayParts.monthIndex),
    [todayParts.monthIndex, todayParts.year]
  );
  const calendarViews = useMemo(
    () => buildCalendarViews({ events: sharedCalendarEvents, today: now.toISOString() }),
    [now]
  );
  const recurringPreview = buildRecurringCalendarEvents({
    event: sharedCalendarEvents[1],
    occurrences: 3,
  });
  const reschedulePreview = buildCalendarRescheduleRequest({
    event: sharedCalendarEvents[0],
    requestedAt: now.toISOString(),
    newStartsAt: "2026-07-17T13:00:00.000Z",
    newEndsAt: "2026-07-17T13:30:00.000Z",
    reason: "Drag reschedule preview routes to the source contract.",
  });
  const reminders = buildCalendarReminders(sharedCalendarEvents[0]);
  const conflicts = detectCalendarConflicts(sharedCalendarEvents);
  const agendaItems = serviceEvents.slice(0, 6);
  const mobileCalendarCards = buildMobileCalendarCards({
    events: sharedCalendarEvents,
    today: now.toISOString(),
    limit: 3,
  });

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="calendar"
          eyebrow="Shared Service"
          title="BeastOS Calendar"
          description="One calendar for the current Money and Learning experience."
        />

        <section
          className="space-y-3 md:hidden"
          data-mobile-shared-service="calendar"
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Today", calendarViews.day.length],
              ["Week", calendarViews.week.length],
              ["Conflicts", conflicts.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-lg border border-[#2a3242] bg-[#111827] p-3"
              >
                <div className="truncate text-[10px] font-black uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-1 text-xl font-black text-white">{value}</div>
              </div>
            ))}
          </div>

          {mobileCalendarCards.map((card) => (
            <article
              key={card.id}
              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ModuleBadge module={card.source} />
                {card.metadata.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#2a3242] px-2.5 py-1 text-[11px] font-bold text-[#c7cfdb]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 break-words text-lg font-black text-white">
                {card.title}
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-[#c7cfdb]">
                {card.summary}
              </p>
              <Link href={card.href} className="mt-4 flex w-full justify-center beast-button">
                {card.actionLabel}
              </Link>
            </article>
          ))}
        </section>

        <DashboardCard accent="calendar">
          <SectionHeader
            eyebrow="Filters"
            title="Module event layers"
            description="Use module layers to keep Money and Learning events organized in one place."
          />
          <div className="mt-5">
            <ModuleFilterRail modules={serviceModules} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {([
              ["Month", calendarViews.month.length],
              ["Week", calendarViews.week.length],
              ["Day", calendarViews.day.length],
              ["Agenda", calendarViews.agenda.length],
            ] as const).map(([label, count]) => (
              <div
                key={label}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-2 text-2xl font-black text-white">{count}</div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <DashboardCard accent="calendar">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <SectionHeader
                eyebrow="Monthly View"
                title={formatBeastMonthYear(now)}
                description="A shared month grid with module color indicators."
              />
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <ModuleBadge module="money" label="Money" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-[#7f8da3]">
              {weekdayLabels.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((calendarDay) => {
                const hasMoneyEvent =
                  calendarDay.inCurrentMonth && moneyEventDays.has(calendarDay.dayOfMonth);
                const isToday =
                  calendarDay.year === todayParts.year &&
                  calendarDay.monthIndex === todayParts.monthIndex &&
                  calendarDay.dayOfMonth === todayParts.dayOfMonth;

                return (
                  <div
                    key={calendarDay.key}
                    className={`min-h-[92px] rounded-xl border p-2 text-left ${
                      calendarDay.inCurrentMonth
                        ? "bg-[#111827]"
                        : "bg-[#0f1419] opacity-55"
                    } ${
                      isToday
                        ? "border-[#38bdf8]/60"
                        : "border-[#2a3242]"
                    }`}
                  >
                    <div
                      className={`text-sm font-black ${
                        calendarDay.inCurrentMonth ? "text-white" : "text-[#596579]"
                      }`}
                    >
                      {calendarDay.dayOfMonth}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {hasMoneyEvent ? (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: moduleAccents.money.color }}
                        />
                      ) : null}
                    </div>
                    {hasMoneyEvent ? (
                      <div className="mt-3 rounded border border-green-400/25 bg-green-400/10 px-2 py-1 text-[11px] font-bold text-green-100">
                        Money
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </DashboardCard>

          <DashboardCard accent="timeline">
            <SectionHeader
              eyebrow="Agenda"
              title="Upcoming"
              description="A shared agenda fed by module events."
            />
            <div className="mt-5 space-y-3">
              {agendaItems.map((event) => (
                <ServiceEventCard key={event.id} event={event} />
              ))}
            </div>
          </DashboardCard>
        </section>

        <DashboardCard accent="calendar">
          <SectionHeader
            eyebrow="Calendar Contracts"
            title="Ownership-safe scheduling"
            description="BeastOS assembles shared calendar state while source modules keep their own scheduling rules."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Recurrence
              </div>
              <div className="mt-3 space-y-2">
                {recurringPreview.map((event) => (
                  <div key={event.id} className="text-sm font-bold text-white">
                    {new Date(event.startsAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Reschedule
              </div>
              <div className="mt-3 text-sm font-bold text-white">
                {reschedulePreview.dispatchMode}
              </div>
              <div className="mt-2 text-xs font-semibold text-[#9aa6b6]">
                Source: {reschedulePreview.source}
              </div>
              <div className="mt-1 text-xs font-semibold text-[#9aa6b6]">
                Rules preserved: {String(reschedulePreview.sourceRulesPreserved)}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Reminders
              </div>
              <div className="mt-3 space-y-2">
                {reminders.map((reminder) => (
                  <div
                    key={`${reminder.eventId}-${reminder.minutesBefore}`}
                    className="text-sm font-bold text-white"
                  >
                    {reminder.minutesBefore} minutes before
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Conflicts
              </div>
              <div className="mt-3 text-2xl font-black text-white">
                {conflicts.length}
              </div>
              <div className="mt-2 text-xs font-semibold text-[#9aa6b6]">
                Time zone: America/New_York
              </div>
              <div className="mt-1 text-xs font-semibold text-[#9aa6b6]">
                Scope: Owner
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {calendarContractRules.map((rule) => (
              <div
                key={rule}
                className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 text-sm font-semibold text-[#d8dee8]"
              >
                {rule}
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
