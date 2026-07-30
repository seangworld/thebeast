import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const today = readFileSync("src/app/dashboard/today/page.tsx", "utf8");

test("BO-308 makes Today the BeastOS command center", () => {
  const sections = [
    "Today's Priorities",
    "Professional Recommendations",
    "Recent Activity",
    "Upcoming Events",
    "Goals Progress",
    "Quick Actions",
  ];

  for (const section of sections) {
    assert.match(today, new RegExp(section));
  }

  assert.ok(
    today.indexOf("Today's Priorities") <
      today.indexOf("Professional Recommendations")
  );
  assert.ok(
    today.indexOf("Professional Recommendations") <
      today.indexOf("Recent Activity")
  );
  assert.match(today, /What needs my attention/);
  assert.match(today, /What changed today/);
  assert.match(today, /What should I do next/);
  assert.match(today, /What are my professionals recommending/);
});

test("BO-308 professional recommendations use personalized source-owned evidence", () => {
  assert.match(today, /buildBeastOSIntelligence/);
  assert.match(today, /loadUserGoals/);
  assert.match(today, /getGoalProgressPercent/);
  assert.match(today, /sourceEvidenceIds: \[recommendation\.id\]/);
  assert.match(today, /buildEducationPlanningContributions/);
  assert.match(today, /buildHealthTodayContributions/);
  assert.match(today, /Only recommendations supported by your current module records/);
  assert.match(today, /Money Coach/);
  assert.match(today, /getTodayProfessionalLabel/);
  assert.match(today, /Why this matters:/);
  assert.match(today, /href=\{item\.actionUrl\}/);
  assert.doesNotMatch(today, /Your Home Depot promotion expires/);
  assert.doesNotMatch(today, /HVAC filter replacement/);
  assert.doesNotMatch(today, /record your blood pressure/);
});

test("BO-308 aggregates existing modules without taking over their logic", () => {
  assert.match(today, /\.from\("debts"\)/);
  assert.match(today, /\.from\("bill_events"\)/);
  assert.match(today, /\.from\("income_events"\)/);
  assert.match(today, /\.eq\("user_id", authUser\.id\)/);
  assert.match(today, /buildTodayItemActionRequest/);
  assert.match(today, /request sent to/);
  assert.doesNotMatch(today, /module contract events/);
  assert.doesNotMatch(today, /\.from\("debts"\)\s*\.update/);
  assert.doesNotMatch(today, /\.from\("bill_events"\)\s*\.update/);
  assert.doesNotMatch(today, /signInWithOtp|signInWithPassword|signUp/);
});

test("BO-308 keeps Today concise while preserving supporting workflows", () => {
  assert.match(today, /How Today decides what to show/);
  assert.match(today, /Education planning/);
  assert.doesNotMatch(today, /activityList\.map/);
  assert.doesNotMatch(today, /learning_activities|learning_sessions|learning_plans/);
  assert.match(today, /manualTodayItems/);
  assert.match(today, /data-mobile-shared-service="today"/);
  assert.match(today, /md:hidden/);
  assert.match(today, /min-w-0/);
  assert.match(today, /break-words/);
});
