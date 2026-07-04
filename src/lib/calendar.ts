export type CalendarGridDay = {
  key: string;
  date: Date;
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  weekday: number;
  inCurrentMonth: boolean;
};

export const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
