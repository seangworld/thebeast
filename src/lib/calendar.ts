export type CalendarGridDay = {
  key: string;
  date: Date;
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  weekday: number;
  inCurrentMonth: boolean;
};

export type CalendarEventSource =
  | "money"
  | "learning"
  | "goals"
  | "plans"
  | "documents"
  | "notifications"
  | "beastos";

export type CalendarPermissionScope = "Owner" | "Household" | "Shared";
export type CalendarRecurrenceFrequency = "None" | "Daily" | "Weekly" | "Monthly";

export type CalendarEvent = {
  id: string;
  source: CalendarEventSource;
  sourceRecordId: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  permissionScope: CalendarPermissionScope;
  actionUrl: string;
  recurrence: CalendarRecurrenceFrequency;
  reminderMinutesBefore: number[];
};

export type CalendarViewMode = "Month" | "Week" | "Day" | "Agenda";

export type CalendarViewSet = {
  month: CalendarEvent[];
  week: CalendarEvent[];
  day: CalendarEvent[];
  agenda: CalendarEvent[];
};

export type CalendarRescheduleRequest = {
  id: string;
  eventId: string;
  source: CalendarEventSource;
  sourceRecordId: string;
  requestedAt: string;
  newStartsAt: string;
  newEndsAt: string;
  dispatchMode: "source-contract-event";
  sourceRulesPreserved: true;
  reason: string;
};

export type CalendarConflict = {
  eventIds: string[];
  startsAt: string;
  endsAt: string;
  severity: "Overlap" | "Crowded";
};

export type CalendarReminder = {
  eventId: string;
  remindAt: string;
  minutesBefore: number;
};

export const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const calendarViewModes: CalendarViewMode[] = ["Month", "Week", "Day", "Agenda"];
export const calendarContractRules = [
  "BeastOS Calendar owns shared event display, view assembly, conflict detection, reminders, and reschedule routing.",
  "Source modules own source records, recurrence rules, due-date calculations, completion, and business-specific schedule changes.",
  "Calendar events must identify source module, source record, permission scope, action URL, and time zone.",
  "Drag rescheduling must dispatch a source contract event instead of mutating module-owned records directly.",
];

function toCalendarGridDay(date: Date, targetMonthIndex: number): CalendarGridDay {
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`,
    date,
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    dayOfMonth: date.getDate(),
    weekday: date.getDay(),
    inCurrentMonth: date.getMonth() === targetMonthIndex,
  };
}

export function getMonthLength(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getLocalCalendarDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day);
}

export function buildMonthGrid(year: number, monthIndex: number): CalendarGridDay[] {
  const firstOfMonth = getLocalCalendarDate(year, monthIndex, 1);
  const leadingDayCount = firstOfMonth.getDay();
  const monthLength = getMonthLength(year, monthIndex);
  const totalCells = Math.ceil((leadingDayCount + monthLength) / 7) * 7;
  const firstGridDate = getLocalCalendarDate(year, monthIndex, 1 - leadingDayCount);

  return Array.from({ length: totalCells }, (_, index) => {
    const date = getLocalCalendarDate(
      firstGridDate.getFullYear(),
      firstGridDate.getMonth(),
      firstGridDate.getDate() + index
    );

    return toCalendarGridDay(date, monthIndex);
  });
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new Error(`Calendar ${label} is required.`);
}

function parseTimestamp(value: string, label: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Calendar ${label} must be a valid timestamp.`);
  }

  return parsed;
}

function isoDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function addCalendarDays(timestamp: string, days: number) {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function addCalendarMonths(timestamp: string, months: number) {
  const date = new Date(timestamp);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

export function normalizeCalendarTimeZone(timeZone: string) {
  assertNonEmpty(timeZone, "time zone");

  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    throw new Error(`Unsupported Calendar time zone: ${timeZone}`);
  }
}

export function buildCalendarEvent(event: CalendarEvent): CalendarEvent {
  assertNonEmpty(event.id, "event id");
  assertNonEmpty(event.sourceRecordId, "source record id");
  assertNonEmpty(event.title, "title");
  assertNonEmpty(event.actionUrl, "action URL");
  normalizeCalendarTimeZone(event.timeZone);

  const start = parseTimestamp(event.startsAt, "startsAt");
  const end = parseTimestamp(event.endsAt, "endsAt");
  if (end <= start) throw new Error("Calendar endsAt must be after startsAt.");

  return {
    ...event,
    reminderMinutesBefore: [...event.reminderMinutesBefore].sort(
      (left, right) => left - right
    ),
  };
}

export function buildCalendarViews({
  events,
  today,
}: {
  events: CalendarEvent[];
  today: string;
}): CalendarViewSet {
  const normalized = events.map(buildCalendarEvent).sort((left, right) =>
    left.startsAt.localeCompare(right.startsAt)
  );
  const currentDate = isoDate(today);
  const current = new Date(today);
  const weekStart = new Date(today);
  weekStart.setUTCDate(current.getUTCDate() - current.getUTCDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    month: normalized.filter((event) => {
      const starts = new Date(event.startsAt);
      return (
        starts.getUTCFullYear() === current.getUTCFullYear() &&
        starts.getUTCMonth() === current.getUTCMonth()
      );
    }),
    week: normalized.filter((event) => {
      const starts = new Date(event.startsAt);
      return starts >= weekStart && starts <= weekEnd;
    }),
    day: normalized.filter((event) => isoDate(event.startsAt) === currentDate),
    agenda: normalized,
  };
}

export function buildRecurringCalendarEvents({
  event,
  occurrences,
}: {
  event: CalendarEvent;
  occurrences: number;
}) {
  const normalized = buildCalendarEvent(event);
  if (occurrences < 1) return [];

  return Array.from({ length: occurrences }, (_, index) => {
    const startsAt =
      normalized.recurrence === "Daily"
        ? addCalendarDays(normalized.startsAt, index)
        : normalized.recurrence === "Weekly"
          ? addCalendarDays(normalized.startsAt, index * 7)
          : normalized.recurrence === "Monthly"
            ? addCalendarMonths(normalized.startsAt, index)
            : normalized.startsAt;
    const endsAt =
      normalized.recurrence === "Daily"
        ? addCalendarDays(normalized.endsAt, index)
        : normalized.recurrence === "Weekly"
          ? addCalendarDays(normalized.endsAt, index * 7)
          : normalized.recurrence === "Monthly"
            ? addCalendarMonths(normalized.endsAt, index)
            : normalized.endsAt;

    return buildCalendarEvent({
      ...normalized,
      id: index === 0 ? normalized.id : `${normalized.id}:${index + 1}`,
      startsAt,
      endsAt,
    });
  });
}

export function buildCalendarRescheduleRequest({
  event,
  requestedAt,
  newStartsAt,
  newEndsAt,
  reason,
}: {
  event: CalendarEvent;
  requestedAt: string;
  newStartsAt: string;
  newEndsAt: string;
  reason: string;
}): CalendarRescheduleRequest {
  const normalized = buildCalendarEvent(event);
  parseTimestamp(requestedAt, "requestedAt");
  const start = parseTimestamp(newStartsAt, "newStartsAt");
  const end = parseTimestamp(newEndsAt, "newEndsAt");
  if (end <= start) throw new Error("Calendar reschedule end must be after start.");
  assertNonEmpty(reason, "reschedule reason");

  return {
    id: `${normalized.id}:reschedule:${requestedAt}`,
    eventId: normalized.id,
    source: normalized.source,
    sourceRecordId: normalized.sourceRecordId,
    requestedAt,
    newStartsAt,
    newEndsAt,
    dispatchMode: "source-contract-event",
    sourceRulesPreserved: true,
    reason,
  };
}

export function detectCalendarConflicts(events: CalendarEvent[]): CalendarConflict[] {
  const normalized = events.map(buildCalendarEvent).sort((left, right) =>
    left.startsAt.localeCompare(right.startsAt)
  );
  const conflicts: CalendarConflict[] = [];

  for (let index = 0; index < normalized.length - 1; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1];
    if (Date.parse(current.endsAt) > Date.parse(next.startsAt)) {
      conflicts.push({
        eventIds: [current.id, next.id],
        startsAt: next.startsAt,
        endsAt: current.endsAt < next.endsAt ? current.endsAt : next.endsAt,
        severity: "Overlap",
      });
    }
  }

  return conflicts;
}

export function buildCalendarReminders(event: CalendarEvent): CalendarReminder[] {
  const normalized = buildCalendarEvent(event);
  const start = Date.parse(normalized.startsAt);

  return normalized.reminderMinutesBefore.map((minutesBefore) => ({
    eventId: normalized.id,
    minutesBefore,
    remindAt: new Date(start - minutesBefore * 60 * 1000).toISOString(),
  }));
}
