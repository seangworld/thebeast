"use client";

import { useMemo } from "react";
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
import { buildMonthGrid, weekdayLabels } from "@/lib/calendar";
import { useRuntimeToday } from "@/lib/hooks/useRuntimeToday";
import { formatBeastMonthYear, getBeastRuntimeDateParts } from "@/lib/runtimeDate";

const moneyEventDays = new Set([3, 7, 14, 21, 28]);
const futureEventDays = new Set([10, 16, 24, 31]);

export default function CalendarPage() {
  const { now } = useRuntimeToday();
  const todayParts = getBeastRuntimeDateParts(now);
  const calendarDays = useMemo(
    () => buildMonthGrid(todayParts.year, todayParts.monthIndex),
    [todayParts.monthIndex, todayParts.year]
  );
  const agendaItems = serviceEvents.slice(0, 6);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="calendar"
          eyebrow="Shared Service"
          title="BeastOS Calendar"
          description="One calendar for the whole operating system. Money contributes the first events; Learning, Health, Home, Projects, Vehicles, Family, and Goals are ready to join."
        />

        <DashboardCard accent="calendar">
          <SectionHeader
            eyebrow="Filters"
            title="Module event layers"
            description="Every future module can contribute events without creating a separate calendar."
          />
          <div className="mt-5">
            <ModuleFilterRail modules={serviceModules} />
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
                <ModuleBadge module="health" label="Future" comingSoon />
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
                const hasFutureEvent =
                  calendarDay.inCurrentMonth && futureEventDays.has(calendarDay.dayOfMonth);
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
                      {hasFutureEvent ? (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: moduleAccents.projects.color }}
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
      </div>
    </main>
  );
}
