import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatBeastFullDate,
  formatBeastMonthYear,
  getBeastDateKey,
  getBeastGreeting,
  getBeastRuntimeDateParts,
  getBeastRuntimeToday,
  isSameBeastDay,
} from "../src/lib/runtimeDate";

test("BeastOS runtime today resolves dynamically in America/New_York", () => {
  const july4 = new Date("2026-07-04T16:00:00.000Z");
  const july7 = new Date("2026-07-07T16:00:00.000Z");

  assert.deepEqual(getBeastRuntimeDateParts(july4), {
    year: 2026,
    monthIndex: 6,
    dayOfMonth: 4,
    hour: 12,
  });
  assert.deepEqual(getBeastRuntimeDateParts(july7), {
    year: 2026,
    monthIndex: 6,
    dayOfMonth: 7,
    hour: 12,
  });
  assert.equal(getBeastRuntimeToday(july4).getDate(), 4);
  assert.equal(getBeastRuntimeToday(july7).getDate(), 7);
  assert.equal(getBeastDateKey(july7), "2026-07-07");
  assert.equal(isSameBeastDay(july4, july7), false);
});

test("BeastOS date helpers use runtime time for greeting and labels", () => {
  const morning = new Date("2026-07-07T13:00:00.000Z");
  const afternoon = new Date("2026-07-07T19:00:00.000Z");
  const evening = new Date("2026-07-08T01:00:00.000Z");

  assert.equal(getBeastGreeting(morning), "Good Morning");
  assert.equal(getBeastGreeting(afternoon), "Good Afternoon");
  assert.equal(getBeastGreeting(evening), "Good Evening");
  assert.equal(formatBeastFullDate(afternoon), "Tuesday, July 7, 2026");
  assert.equal(formatBeastMonthYear(afternoon), "July 2026");
});

test("dashboard calendar does not hardcode July 4 as today", () => {
  const calendarPage = readFileSync("src/app/dashboard/calendar/page.tsx", "utf8");
  const spacedRepetition = readFileSync("src/lib/learning/spacedRepetition.ts", "utf8");
  const dashboardContent = readFileSync("src/lib/learning/dashboardContent.ts", "utf8");

  assert.doesNotMatch(calendarPage, /calendarYear\s*=\s*2026/);
  assert.doesNotMatch(calendarPage, /calendarMonthIndex\s*=\s*6/);
  assert.doesNotMatch(calendarPage, /dayOfMonth\s*===\s*4/);
  assert.match(calendarPage, /getBeastRuntimeDateParts/);
  assert.doesNotMatch(
    spacedRepetition,
    /today\s*=\s*"2026-07-04"/
  );
  assert.doesNotMatch(
    dashboardContent,
    /today\s*=\s*"2026-07-04"/
  );
});
