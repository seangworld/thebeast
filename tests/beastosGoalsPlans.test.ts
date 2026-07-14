import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildGoalPlanContribution,
  buildGoalPlanModel,
  goalPlanOwnershipRules,
  summarizeGoalPlanModel,
  type GoalPlanModel,
} from "../src/lib/platform/goalsPlans";
import {
  buildGoal,
  goalCategories,
  goalDatabaseColumns,
  goalDatabaseTableName,
  goalOwnershipRules,
  goalStatuses,
  mockGoals,
  summarizeGoals,
} from "../src/lib/platform/goals";

const model: GoalPlanModel = {
  goals: [
    {
      id: "goal-learning",
      ownerId: "member-1",
      title: "Earn Security+",
      category: "Education",
      status: "Active",
      summary: "Prepare for the Security+ certification.",
      sourceModule: "beastos",
      planIds: ["plan-learning"],
      contributionIds: ["contribution-learning"],
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    },
  ],
  plans: [
    {
      id: "plan-learning",
      ownerId: "member-1",
      title: "Security+ study path",
      status: "Active",
      goalIds: ["goal-learning"],
      sourceModule: "learning",
      currentStep: "Network security basics",
      nextAction: "Continue the next Mentor mission.",
      evidenceIds: ["contribution-learning"],
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    },
    {
      id: "plan-money",
      ownerId: "member-1",
      title: "Certification savings plan",
      status: "Draft",
      goalIds: ["goal-learning"],
      sourceModule: "money",
      currentStep: "Set aside exam fee savings.",
      nextAction: "Review next paycheck allocation.",
      evidenceIds: [],
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    },
  ],
  contributions: [
    buildGoalPlanContribution({
      id: "contribution-learning",
      goalId: "goal-learning",
      planId: "plan-learning",
      module: "learning",
      kind: "progress",
      title: "Completed network security lesson",
      summary: "Learning contributed progress evidence without owning the shared goal.",
      actionUrl: "/dashboard/learning",
      occurredAt: "2026-07-13T00:00:00.000Z",
    }),
  ],
};

test("BeastOS goal and plan model separates outcomes from executable paths", () => {
  const normalized = buildGoalPlanModel(model);

  assert.equal(normalized.goals[0].title, "Earn Security+");
  assert.equal(normalized.goals[0].planIds.length, 1);
  assert.equal(normalized.plans[0].goalIds[0], "goal-learning");
  assert.equal(goalPlanOwnershipRules[0], "Goals describe outcomes and belong to BeastOS Personal Hub.");
  assert.equal(goalPlanOwnershipRules[1], "Plans describe the executable path and belong to BeastOS as shared records.");
});

test("BeastOS goal and plan summary preserves module boundaries", () => {
  const summary = summarizeGoalPlanModel(model);

  assert.equal(summary.activeGoals, 1);
  assert.equal(summary.activePlans, 2);
  assert.deepEqual(summary.nextActions, [
    "Continue the next Mentor mission.",
    "Review next paycheck allocation.",
  ]);
  assert.equal(summary.duplicateOwnershipWarnings.length, 1);
  assert.match(
    summary.duplicateOwnershipWarnings[0],
    /BeastOS owns the shared goal/
  );
});

test("Personal Hub exposes goals and plans as shared BeastOS data", () => {
  const profilePage = readFileSync("src/app/dashboard/profile/page.tsx", "utf8");
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(profilePage, /Shared Goals and Plans/);
  assert.match(profilePage, /Goals are outcomes\. Plans are paths\./);
  assert.match(navigation, /href: "\/dashboard\/goals"/);
  assert.match(navigation, /label: "Goals"/);
});

test("BG-001 creates a BeastOS-owned Goal model and database contract", () => {
  assert.equal(goalDatabaseTableName, "beast_goals");
  assert.deepEqual(goalStatuses, [
    "Proposed",
    "Active",
    "Paused",
    "Blocked",
    "Completed",
    "Archived",
  ]);
  assert.deepEqual(goalCategories, [
    "Education",
    "Career",
    "Money",
    "Personal",
    "Project",
    "Home",
    "Health",
    "Other",
  ]);
  assert.deepEqual(
    goalDatabaseColumns.map((column) => [column.name, column.required]),
    [
      ["id", true],
      ["owner_id", true],
      ["title", true],
      ["category", true],
      ["status", true],
      ["summary", false],
      ["target_date", false],
      ["current_step", false],
      ["source_module", false],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.equal(
    goalOwnershipRules[0],
    "Goals belong to BeastOS as shared Personal Hub data."
  );
  assert.match(goalOwnershipRules[3], /BeastGoals remains superseded/);
});

test("BG-001 Goals overview route stays BeastOS-owned", () => {
  const goalsPage = readFileSync("src/app/dashboard/goals/page.tsx", "utf8");
  const migration = readFileSync(
    "migrations/20260714_add_beast_goals.sql",
    "utf8"
  );
  const summary = summarizeGoals(mockGoals);

  assert.equal(summary.totalGoals, 2);
  assert.equal(summary.activeGoals, 2);
  assert.deepEqual(summary.nextSteps, [
    "Continue the next Mentor mission.",
    "Review the next safe extra payment.",
  ]);
  assert.match(goalsPage, /BeastOS Shared Service/);
  assert.match(goalsPage, /BeastOS Owned/);
  assert.match(goalsPage, /goalDatabaseTableName/);
  assert.match(migration, /create table if not exists public\.beast_goals/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = owner_id/);
  assert.throws(
    () =>
      buildGoal({
        ...mockGoals[0],
        title: "",
      }),
    /Goal title is required/
  );
});
