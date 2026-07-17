import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildTodayContribution,
  buildTodayItemActionRequest,
  getTodayContributionExplanation,
  getRankedTodayContributions,
  getTodayPriorityScore,
  getTodayContributionEmptyState,
  getTodayItemActionAvailability,
  sortTodayContributions,
  summarizeTodayContributions,
  todayContributionContractRules,
  todayContributionPriorities,
  todayContributionSources,
  todayContributionStatuses,
  todayContributionTimings,
  todayContributionTypes,
  todayItemActionTypes,
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
  assert.throws(
    () => buildTodayContribution({ ...learningContribution, reason: " " }),
    /reason is required/
  );
  assert.match(todayContributionContractRules[1], /Modules own source calculations/);
  assert.match(todayPage, /Cross-module contribution contract/);
  assert.match(todayPage, /todayContributionContractRules/);
  assert.doesNotMatch(
    todayPage,
    /recompute learning mastery|recompute bill cycles|cash-flow risk/
  );
});

test("BO-26 Today ranks work by urgency importance effort and preference", () => {
  const todayPage = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const quickCritical = {
    ...moneyContribution,
    id: "money-critical-quick",
    urgency: 10,
    importance: 10,
    preferenceWeight: 6,
    estimatedMinutes: 5,
  };
  const importantLong = {
    ...learningContribution,
    id: "learning-important-long",
    urgency: 6,
    importance: 8,
    preferenceWeight: 7,
    estimatedMinutes: 90,
  };
  const ranked = getRankedTodayContributions([importantLong, quickCritical]);

  assert.equal(getTodayPriorityScore(quickCritical).score, 9);
  assert.equal(getTodayPriorityScore(importantLong).effort, 2);
  assert.equal(ranked[0].contribution.id, "money-critical-quick");
  assert.equal(ranked[0].rank, 1);
  assert.match(ranked[0].priorityScore.explanation, /urgency 10/);
  assert.match(todayPage, /Priority Engine/);
  assert.match(todayPage, /getTodayPriorityScore/);
});

test("BO-27 Today routes item actions through source-owned contracts", () => {
  const todayPage = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const availability = getTodayItemActionAvailability({
    ...learningContribution,
    dismissible: true,
  });
  const snoozeRequest = buildTodayItemActionRequest({
    contribution: { ...learningContribution, dismissible: true },
    action: "Snooze",
    requestedAt: "2026-07-17T09:00:00.000Z",
    reason: "User asked BeastOS Today to snooze the supplied item.",
    snoozedUntil: "2026-07-17T10:00:00.000Z",
  });
  const rescheduleRequest = buildTodayItemActionRequest({
    contribution: { ...learningContribution, dismissible: true },
    action: "Reschedule",
    requestedAt: "2026-07-17T09:00:00.000Z",
    reason: "User asked BeastOS Today to reschedule the supplied item.",
    rescheduledFor: "2026-07-18T13:00:00.000Z",
  });

  assert.deepEqual(todayItemActionTypes, [
    "Dismiss",
    "Snooze",
    "Complete",
    "Reschedule",
  ]);
  assert.equal(availability.Dismiss, true);
  assert.equal(availability.Snooze, true);
  assert.equal(availability.Complete, true);
  assert.equal(availability.Reschedule, true);
  assert.equal(snoozeRequest.dispatchMode, "module-contract-event");
  assert.equal(snoozeRequest.source, "learning");
  assert.equal(snoozeRequest.snoozedUntil, "2026-07-17T10:00:00.000Z");
  assert.equal(rescheduleRequest.rescheduledFor, "2026-07-18T13:00:00.000Z");
  assert.throws(
    () =>
      buildTodayItemActionRequest({
        contribution: learningContribution,
        action: "Snooze",
        requestedAt: "2026-07-17T09:00:00.000Z",
        reason: "Missing snooze target.",
      }),
    /snoozedUntil/
  );
  assert.deepEqual(
    getTodayItemActionAvailability({
      ...learningContribution,
      sourceEvidenceIds: [],
    }),
    {
      Dismiss: false,
      Snooze: false,
      Complete: false,
      Reschedule: false,
    }
  );
  assert.throws(
    () =>
      buildTodayItemActionRequest({
        contribution: { ...learningContribution, dismissible: true },
        action: "Complete",
        requestedAt: "not-a-date",
        reason: "Invalid request timestamp.",
      }),
    /requestedAt/
  );
  assert.throws(
    () =>
      buildTodayItemActionRequest({
        contribution: { ...learningContribution, dismissible: true },
        action: "Snooze",
        requestedAt: "2026-07-17T09:00:00.000Z",
        reason: "Snooze must move into the future.",
        snoozedUntil: "2026-07-17T08:00:00.000Z",
      }),
    /future snoozedUntil/
  );
  assert.throws(
    () =>
      buildTodayItemActionRequest({
        contribution: { ...learningContribution, dismissible: true },
        action: "Reschedule",
        requestedAt: "2026-07-17T09:00:00.000Z",
        reason: "Reschedule must move into the future.",
        rescheduledFor: "2026-07-17T08:00:00.000Z",
      }),
    /future rescheduledFor/
  );
  assert.match(todayContributionContractRules[4], /contract/);
  assert.match(todayPage, /Dismiss/);
  assert.match(todayPage, /Snooze 1h/);
  assert.match(todayPage, /Complete/);
  assert.match(todayPage, /Tomorrow/);
  assert.match(todayPage, /module contract events/);
  assert.doesNotMatch(todayPage, /from\("learning_activities"\)\s*\.update/);
});

test("BO-28 Today explains why each recommendation is shown", () => {
  const todayPage = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const explanation = getTodayContributionExplanation(moneyContribution);
  const learningExplanation =
    getTodayContributionExplanation(learningContribution);

  assert.equal(explanation.contributionId, "money-bill-due");
  assert.equal(explanation.source, "money");
  assert.equal(
    explanation.sourceReason,
    "BeastMoney supplied the date and obligation status."
  );
  assert.match(explanation.timingReason, /due today/);
  assert.match(explanation.priorityReason, /critical/);
  assert.match(explanation.actionReason, /Open cash flow/);
  assert.match(explanation.evidenceReason, /money supplied 1 source evidence item/);
  assert.match(explanation.scoreExplanation, /urgency/);
  assert.match(explanation.displayReason, /BeastMoney supplied/);
  assert.match(learningExplanation.displayReason, /BeastLearning supplied/);
  assert.match(todayContributionContractRules[5], /Explain why shown/);
  assert.match(todayPage, /Explain why shown/);
  assert.match(todayPage, /getTodayContributionExplanation/);
  assert.doesNotMatch(
    todayPage,
    /recompute learning mastery|recompute bill cycles|cash-flow risk/
  );
});
