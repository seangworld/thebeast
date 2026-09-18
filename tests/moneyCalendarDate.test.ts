import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { moneyCalendarDate } from "../src/lib/moneyCalendarDate";

test("Money date-only labels retain their day across time zones and DST boundaries", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/New_York", "America/Los_Angeles", "Asia/Manila"]) {
      process.env.TZ = zone;
      for (const value of ["2026-09-22", "2026-03-08", "2026-11-01", "2027-01-01"]) {
        const date = moneyCalendarDate(value);
        assert.equal(date.getFullYear(), Number(value.slice(0,4)));
        assert.equal(date.getMonth()+1, Number(value.slice(5,7)));
        assert.equal(date.getDate(), Number(value.slice(8,10)));
        assert.equal(date.getHours(), 0);
      }
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test("invalid calendar dates are not silently normalized", () => {
  for (const value of ["", "2026-02-30", "not-a-date", "2026-09-22T00:00:00Z"]) {
    assert.ok(Number.isNaN(moneyCalendarDate(value).getTime()));
  }
});

test("Money dashboard uses calendar parsing for bill and income dates", () => {
  const source = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");
  assert.doesNotMatch(source, /new Date\((?:bill\.next_due_date_after_payment|income\.next_date)\)/);
  assert.match(source, /moneyCalendarDate\(bill\.next_due_date_after_payment\)/);
  assert.match(source, /moneyCalendarDate\(income\.next_date\)/);
});
