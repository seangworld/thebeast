import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getGoalProgressPercent, mockGoals } from "../src/lib/platform/goals";
import { goalReviewDate, goalReviewDue, goalDraftError, goalFollowup, milestonePatch, safeGoalLink, matchesGoalArea, matchesGoalHorizon } from "../src/lib/platform/goalEditing";
import { getGoalConnections, suggestGoalConnections, goalTagsWithConnections, visibleGoalTags, advisorGoalFilters } from "../src/lib/platform/goalConnections";
import { contextualWorkspaceConfigs, goalMatchesContext } from "../src/lib/platform/contextualWorkspaces";
import { createClient } from "@supabase/supabase-js";
const draft = { title: "Test", category: "Personal", status: "Proposed", progress: "", targetDate: "", customCategory: "" };
test("goal progress validates integer boundaries and dates before writing", () => {
  for (const value of ["", "0", "100", "25"]) assert.equal(goalDraftError({ ...draft, progress: value }), null);
  for (const value of ["-1", "101", "3.5", "NaN", "Infinity"]) assert.ok(goalDraftError({ ...draft, progress: value }));
  assert.ok(goalDraftError({ ...draft, targetDate: "2026-02-30" }));
  assert.equal(goalDraftError({ ...draft, targetDate: "2028-02-29" }), null);
});
test("progress uses completed status, then explicit manual value, then milestones", () => {
  assert.equal(getGoalProgressPercent({ ...mockGoals[0], status: "Completed", progress: 30 }), 100);
  assert.equal(getGoalProgressPercent({ ...mockGoals[0], progress: 25 }), 25);
  assert.equal(getGoalProgressPercent({ ...mockGoals[0], progress: undefined }), 50);
  assert.equal(getGoalProgressPercent({ ...mockGoals[0], progress: undefined, milestones: [] }), null);
});
test("milestone completion timestamps survive edits and clear when reopened or skipped", () => {
  assert.equal(milestonePatch("Step", "Completed", "", "now").completed_at, "now");
  assert.equal(milestonePatch("Renamed", "Completed", "", "now", "before").completed_at, "before");
  assert.equal(milestonePatch("Step", "In Progress", "", "now", "before").completed_at, null);
  assert.equal(milestonePatch("Step", "Skipped", "", "now", "before").completed_at, null);
  assert.throws(() => milestonePatch(" ", "Completed", "", "now"));
  assert.throws(() => milestonePatch("Step", "Completed", "2026-02-30", "now"));
});
test("follow-up failures never reject an already-saved goal", async () => {
  assert.equal(await goalFollowup(async () => ({ error: null })), false);
  assert.equal(await goalFollowup(async () => ({ error: "failed" })), true);
  assert.equal(await goalFollowup(async () => { throw new Error("Network"); }), true);
});
test("resource links reject scripts and protocol-relative URLs", () => {
  for (const value of ["javascript:alert(1)", "//evil.test", "/\\evil.test", "data:text/html,hi"]) assert.equal(safeGoalLink(value), null);
  assert.equal(safeGoalLink("/dashboard/uploads"), "/dashboard/uploads");
  assert.equal(safeGoalLink("https://va.gov"), "https://va.gov/");
});
test("income goals connect to Money and Education without duplicate records", () => {
  const suggested = suggestGoalConnections("I want to make $60,000 per year", "Personal");
  assert.deepEqual(suggested, ["money", "learning"]);
  const goal = { ...mockGoals[0], category: "Personal" as const, sourceModule: undefined, references: [], contributions: [], tags: goalTagsWithConnections("salary", suggested) };
  assert.ok(goalMatchesContext(goal, contextualWorkspaceConfigs.money));
  assert.ok(goalMatchesContext(goal, contextualWorkspaceConfigs.education));
  assert.equal(goalMatchesContext(goal, contextualWorkspaceConfigs.health), false);
  assert.deepEqual(visibleGoalTags(goal.tags), ["salary"]);
  assert.ok(matchesGoalArea(goal, "Finances")); assert.ok(matchesGoalArea(goal, "Career"));
});
test("weight goal belongs in Health and Weight; optional connections can be removed", () => {
  const connections = suggestGoalConnections("Lose 20 pounds", "Health");
  assert.deepEqual(connections, ["health"]);
  const goal = { ...mockGoals[0], title: "Lose 20 pounds", category: "Health" as const, tags: goalTagsWithConnections("weight", connections) };
  assert.ok(matchesGoalArea(goal, "Weight")); assert.ok(matchesGoalArea(goal, "Health"));
  assert.deepEqual(getGoalConnections({ category: "Money", tags: goalTagsWithConnections("goal-connection:learning", ["money"]) }), ["money"]);
});
test("timeframe filters distinguish nearer deadlines, overdue and undated goals", () => {
  const today = new Date(2026, 8, 18, 12);
  const goal = { ...mockGoals[0], targetDate: "2029-09-18", status: "Active" as const };
  assert.equal(matchesGoalHorizon(goal, "Next year", today), false);
  assert.equal(matchesGoalHorizon(goal, "Next 5 years", today), true);
  assert.equal(matchesGoalHorizon(goal, "Next 10 years", today), true);
  assert.equal(matchesGoalHorizon({ ...goal, targetDate: undefined }, "No target date", today), true);
  assert.equal(matchesGoalHorizon({ ...goal, targetDate: "2026-09-17" }, "Overdue", today), true);
  assert.equal(matchesGoalHorizon({ ...goal, targetDate: "2026-09-17", status: "Completed" }, "Overdue", today), false);
  assert.equal(matchesGoalHorizon({ ...goal, targetDate: "2027-09-18" }, "Next year", today), true);
});
test("advisor goal queries retain owner scope and omit deleted/archived goals", async () => {
  const urls: URL[] = [];
  const client = createClient("https://test.invalid", "test-key", { auth: { persistSession: false }, global: { fetch: async input => { urls.push(new URL(String(input))); return Response.json([]); } } });
  for (const filter of Object.values(advisorGoalFilters)) await client.from("beast_goals").select("id").eq("owner_id", "owner").or(filter).is("deleted_at", null).neq("status", "Archived").limit(20);
  for (const url of urls) { assert.equal(url.searchParams.get("owner_id"), "eq.owner"); assert.equal(url.searchParams.get("deleted_at"), "is.null"); assert.match(url.searchParams.get("or")!, /goal-connection:/); }
});
test("member Goals page omits internal ownership and database explanations", () => {
  const page = readFileSync("src/app/dashboard/goals/page.tsx", "utf8");
  const hub = readFileSync("src/app/dashboard/goals/LifePlanningHub.tsx", "utf8");
  assert.doesNotMatch(page, /BeastOS Owned|BeastOS Shared Service|eyebrow="Database"|BO-15|owner-controlled/);
  assert.doesNotMatch(hub, /BO-501|Title source:|>Module</);
  assert.match(hub, /Where this goal matters/); assert.match(hub, /Goal categories/);
});

test("quarterly review uses calendar months and excludes finished goals", () => {
  const goal = {...mockGoals[0], status: "Active" as const, updatedAt: "2026-11-30T12:00:00Z"};
  assert.equal(goalReviewDate(goal), "2027-02-28");
  assert.equal(goalReviewDue(goal, new Date("2027-02-27T12:00:00Z")), false);
  assert.equal(goalReviewDue(goal, new Date("2027-02-28T12:00:00Z")), true);
  assert.equal(goalReviewDate({...goal, updatedAt: "2027-02-28T12:00:00Z"}), "2027-05-28");
  for (const status of ["Completed", "Archived"] as const) assert.equal(goalReviewDate({...goal,status}), null);
  assert.equal(goalReviewDate({...goal, deletedAt: "2026-12-01T00:00:00Z"}), null);
});
