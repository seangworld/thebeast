import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canProfessionalUseGoal,
  filterLifePlanningGoals,
  goalSyncPointer,
  lifePlanningCategoryForGoal,
  professionalGoalAccess,
  rankGoalsForToday,
} from "../src/lib/platform/lifePlanning";
import { mockGoals, type Goal } from "../src/lib/platform/goals";

const migration = readFileSync(
  "supabase/migrations/20260801000700_transform_beast_goals_life_planning_hub.sql",
  "utf8"
);
const workspace = readFileSync("src/app/dashboard/goals/LifePlanningHub.tsx", "utf8");
const today = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
const documentation = readFileSync("docs/BO-501-BEASTGOALS-LIFE-PLANNING-HUB.md", "utf8");

function goal(overrides: Partial<Goal>): Goal {
  return {
    ...mockGoals[0],
    id: overrides.id || "goal-test",
    title: overrides.title || "Test goal",
    priority: "Medium",
    tags: [],
    fieldSources: [],
    ...overrides,
  };
}

test("BO-501 keeps BeastGoals canonical and adds owner-scoped field provenance", () => {
  assert.match(migration, /alter table public\.beast_goals/);
  assert.match(migration, /create table if not exists public\.beast_goal_field_sources/);
  assert.match(migration, /foreign key \(goal_id, owner_id\)[\s\S]*references public\.beast_goals \(id, owner_id\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /using \(auth\.uid\(\) = owner_id\)/);
  assert.match(migration, /with check \(auth\.uid\(\) = owner_id\)/);
  assert.doesNotMatch(migration, /to anon|using \(true\)/);
  assert.match(documentation, /single owner-controlled planning record/);
  assert.match(documentation, /do not keep a second goal copy/);
});

test("BO-501 provides required categories and extensible professional access", () => {
  assert.equal(lifePlanningCategoryForGoal(goal({ category: "Education" })), "Education & Career");
  assert.equal(lifePlanningCategoryForGoal(goal({ category: "Money" })), "Financial");
  assert.equal(lifePlanningCategoryForGoal(goal({ category: "Family" })), "Family");
  assert.equal(canProfessionalUseGoal("guidance-counselor", goal({ category: "Career" })), true);
  assert.equal(canProfessionalUseGoal("money-coach", goal({ category: "Health" })), false);
  assert.deepEqual(professionalGoalAccess["health-advisor"].categories, ["Health"]);
});

test("BO-501 filters search, tags, module, timeline, priority, professional, and status", () => {
  const goals = [
    goal({ id: "career", title: "Cloud security architect", category: "Career", priority: "High", timeline: "Next", linkedProfessional: "guidance-counselor", sourceModule: "learning", tags: ["remote", "security"], status: "Active" }),
    goal({ id: "health", title: "Walk daily", category: "Health" }),
  ];
  assert.deepEqual(
    filterLifePlanningGoals(goals, { search: "security", category: "Education & Career", module: "learning", timeline: "Next", priority: "High", professional: "guidance-counselor", status: "Active" }).map((item) => item.id),
    ["career"]
  );
});

test("BO-501 ranks critical goals and overdue milestones for Today", () => {
  const ranked = rankGoalsForToday([
    goal({ id: "low", priority: "Low", updatedAt: "2026-08-01T00:00:00Z" }),
    goal({ id: "urgent", priority: "Critical", milestones: [{ ...mockGoals[0].milestones[0], id: "late", status: "In Progress", targetDate: "2026-07-01" }] }),
  ], new Date("2026-08-01T12:00:00Z"));
  assert.equal(ranked[0].goal.id, "urgent");
  assert.equal(ranked[0].overdueMilestones, 1);
});

test("BO-501 module synchronization uses canonical pointers instead of duplicate storage", () => {
  assert.deepEqual(goalSyncPointer(goal({ id: "canonical" })), {
    canonicalTable: "beast_goals",
    goalId: "canonical",
    ownerId: "member-owner",
    linkTable: "beast_goal_references",
    contributionTable: "beast_goal_contributions",
    duplicatesGoalData: false,
  });
});

test("BO-501 hub exposes lifecycle, milestone, responsive, and accessible controls", () => {
  for (const label of ["Add goal", "Edit", "Pause", "Resume", "Complete", "Archive", "Delete", "Merge", "Split", "Add milestone"]) {
    assert.match(workspace, new RegExp(label));
  }
  assert.match(workspace, /role="dialog"/);
  assert.match(workspace, /aria-modal="true"/);
  assert.match(workspace, /event\.key === "Escape"/);
  assert.match(workspace, /sm:grid-cols-2/);
  assert.match(workspace, /min-w-0/);
});

test("BO-501 Today includes ranked goals, updates, recommendations, and deadlines", () => {
  assert.match(today, /rankGoalsForToday/);
  assert.match(today, /lifePlanningContributions/);
  assert.match(today, /goal-update-/);
  assert.match(today, /goal-deadline-/);
  assert.match(today, /goal-milestone-/);
});
