import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildTodayContribution,
  getTodayContributionEmptyState,
  sortTodayContributions,
  summarizeTodayContributions,
  todayContributionContractRules,
  todayContributionPriorities,
  todayContributionSources,
  todayContributionStatuses,
  todayContributionTimings,
  todayContributionTypes,
  type TodayContribution,
} from "../src/lib/platform/today";

const learningContribution: TodayContribution = {
  id: "learning-ready-activity",
  source: "learning",
  type: "Resume",
  title: "Continue your Mentor session",
  summary: "A ready learning activity is waiting.",
  reason: "BeastLearning supplied the ready activity from its own engine.",
  recommendedAction: "Continue with Mentor",
  actionUrl: "/dashboard/learning#mentor-session",
  activeDate: "2026-07-16",
  timing: "Active",
  priority: "Medium",
  estimatedMinutes: 20,
  relatedPlanId: "learning-plan",
  dismissible: false,
  status: "Active",
  sourceEvidenceIds: ["learning-activity-1"],
};

const moneyContribution: TodayContribution = {
  id: "money-bill-due",
  source: "money",
  type: "Required Action",
  title: "Review bill due today",
  summary: "A BeastMoney obligation is due today.",
  reason: "BeastMoney supplied the date and obligation status.",
  recommendedAction: "Open cash flow",
  actionUrl: "/dashboard/money/cashflow",
  dueDate: "2026-07-16",
  dueTime: "09:00",
  timing: "Due Today",
  priority: "Critical",
  estimatedMinutes: 5,
  dismissible: false,
  status: "Active",
  sourceEvidenceIds: ["bill-1"],
};

test("BO-25 Today defines the shared cross-module contribution contract", () => {
  const todayPage = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const sorted = sortTodayContributions([
    learningContribution,
    moneyContribution,
  ]);
  const summary = summarizeTodayContributions(sorted);

  assert.deepEqual(todayContributionSources, [
    "learning",
    "money",
    "calendar",
    "notifications",
    "goals",
    "plans",
    "beastos",
  ]);
  assert.deepEqual(todayContributionTypes, [
    "Required Action",
    "Resume",
    "Recommendation",
    "Event",
    "Notification",
    "Goal Action",
    "Plan Step",
    "Information",
  ]);
  assert.deepEqual(todayContributionPriorities, [
    "Critical",
    "High",
    "Medium",
    "Low",
  ]);
  assert.deepEqual(todayContributionTimings, [
    "Overdue",
    "Due Today",
    "Active",
    "Upcoming",
    "Informational",
  ]);
  assert.deepEqual(todayContributionStatuses, [
    "Active",
    "Completed",
    "Dismissed",
    "Blocked",
  ]);
  assert.equal(sorted[0].id, "money-bill-due");
  assert.equal(summary.total, 2);
  assert.equal(summary.active, 2);
  assert.equal(summary.critical, 1);
  assert.equal(summary.dueToday, 1);
  assert.deepEqual(summary.sources, ["learning", "money"]);
  assert.equal(
    getTodayContributionEmptyState([]),
    "No urgent work is waiting in Today. Continue learning, review money, check Calendar, review Notifications, or confirm a Goal."
  );
  assert.throws(
    () => buildTodayContribution({ ...learningContribution, actionUrl: "" }),
    /action URL is required/
  );
  assert.match(todayContributionContractRules[1], /Modules own source calculations/);
  assert.match(todayPage, /Cross-module contribution contract/);
  assert.match(todayPage, /todayContributionContractRules/);
  assert.doesNotMatch(
    todayPage,
    /recompute learning mastery|recompute bill cycles|cash-flow risk/
  );
});
