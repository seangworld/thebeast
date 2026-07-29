import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const coach = readFileSync(
  "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
  "utf8"
);
const briefing = readFileSync(
  "src/app/dashboard/money/components/MorningFinancialBriefing.tsx",
  "utf8"
);
const model = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");

test("BP-230 makes Money Coach the compact primary BeastMoney experience", () => {
  assert.match(coach, /Executive Briefing/);
  assert.match(coach, /MorningFinancialBriefingPanel/);
  assert.match(briefing, /Daily Briefing/);
  assert.match(coach, /Ask Money Coach/);
  assert.match(coach, /Recommendation Cards/);
  assert.match(coach, /Notifications/);
  assert.match(coach, /Learning from Outcomes/);
  assert.match(coach, /!gap-4/);
  assert.match(coach, /!p-3/);
  assert.match(coach, /rounded-xl border border-white\/10 bg-black\/15 p-3/);
  assert.doesNotMatch(coach, /h-\[36rem\]/);
});

test("BP-230 groups compact summaries without introducing financial calculations", () => {
  for (const label of [
    "Financial Snapshot",
    "Cash Flow",
    "Debt",
    "Future Planning",
    "Financial Health",
    "Monthly Surplus",
    "Cash Available",
    "Debt Remaining",
    "Emergency Fund",
    "Retirement",
  ]) {
    assert.match(coach, new RegExp(label));
  }
  assert.match(model, /totalDebt: input\.totalDebt/);
  assert.match(coach, /model\.financialContext\.totalDebt/);
  assert.doesNotMatch(coach, /reduce\(\(sum, debt\)/);
});

test("BP-230 keeps the transparent score formula collapsed by default", () => {
  assert.match(coach, /<details className="mt-3 border-t/);
  assert.doesNotMatch(coach, /<details[^>]*open[^>]*data-financial-health-formula/);
  assert.match(coach, /How is my score calculated\?/);
  assert.match(coach, /financialHealth\.formula/);
  assert.match(coach, /financialHealth\.components/);
  assert.match(coach, /financialHealth\.disclaimer/);
});

test("BP-230 promotes a dense record-backed Daily Briefing", () => {
  assert.match(briefing, /data-money-morning-briefing="true"/);
  assert.match(briefing, /Since your last review/);
  assert.match(briefing, /Daily Briefing/);
  assert.match(briefing, /sm:grid-cols-2/);
  assert.match(briefing, /briefing\.items/);
  assert.match(briefing, /briefing\.recommendedFocus/);
  assert.match(briefing, /briefing\.freshness/);
});
