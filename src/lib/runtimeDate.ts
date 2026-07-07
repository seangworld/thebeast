export const BEASTOS_TIME_ZONE = "America/New_York";

export type BeastRuntimeDateParts = {
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  hour: number;
};

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value || "0";
}

export function getBeastRuntimeDateParts(
  date: Date = new Date(),
  timeZone = BEASTOS_TIME_ZONE
): BeastRuntimeDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    year: Number(getPart(parts, "year")),
    monthIndex: Number(getPart(parts, "month")) - 1,
    dayOfMonth: Number(getPart(parts, "day")),
    hour: Number(getPart(parts, "hour")),
  };
}

export function getBeastRuntimeToday(date: Date = new Date()) {
  const parts = getBeastRuntimeDateParts(date);
  return new Date(parts.year, parts.monthIndex, parts.dayOfMonth);
}

export function isSameBeastDay(date: Date, compareTo: Date = new Date()) {
  const left = getBeastRuntimeDateParts(date);
  const right = getBeastRuntimeDateParts(compareTo);

  return (
    left.year === right.year &&
    left.monthIndex === right.monthIndex &&
    left.dayOfMonth === right.dayOfMonth
  );
}

export function getBeastGreeting(date: Date = new Date()) {
  const { hour } = getBeastRuntimeDateParts(date);
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function formatBeastFullDate(date: Date = new Date()) {
  return date.toLocaleDateString("en-US", {
    timeZone: BEASTOS_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBeastMonthYear(date: Date = new Date()) {
  return date.toLocaleDateString("en-US", {
    timeZone: BEASTOS_TIME_ZONE,
    month: "long",
    year: "numeric",
  });
}

export function getBeastDateKey(date: Date = new Date()) {
  const parts = getBeastRuntimeDateParts(date);

  return [
    parts.year,
    String(parts.monthIndex + 1).padStart(2, "0"),
    String(parts.dayOfMonth).padStart(2, "0"),
  ].join("-");
}
