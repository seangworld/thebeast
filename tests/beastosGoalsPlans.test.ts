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
  goalMilestoneDatabaseColumns,
  goalMilestoneDatabaseTableName,
  goalMilestoneStatuses,
  goalOwnershipRules,
  goalStatuses,
  getCurrentGoalMilestone,
  getGoalProgressPercent,
  loadUserGoals,
  type BeastGoalDataClient,
  mockGoals,
  summarizeGoals,
} from "../src/lib/platform/goals";
import type { BeastGoal, BeastGoalMilestone } from "../src/lib/types/database";

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
      targetDate: "2026-09-01",
      currentStep: "Network security basics",
      nextAction: "Continue the next Mentor mission.",
      milestones: [
        {
          id: "plan-learning-milestone-1",
          planId: "plan-learning",
          title: "Finish network security basics",
          status: "Completed",
          sortOrder: 1,
        },
        {
          id: "plan-learning-milestone-2",
          planId: "plan-learning",
          title: "Complete first Security+ checkpoint",
          status: "In Progress",
          targetDate: "2026-08-01",
          sortOrder: 2,
        },
      ],
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
      targetDate: "2026-08-15",
      currentStep: "Set aside exam fee savings.",
      nextAction: "Review next paycheck allocation.",
      milestones: [
        {
          id: "plan-money-milestone-1",
          planId: "plan-money",
          title: "Confirm exam fee target",
          status: "Completed",
          sortOrder: 1,
        },
        {
          id: "plan-money-milestone-2",
          planId: "plan-money",
          title: "Assign next paycheck allocation",
          status: "Not Started",
          sortOrder: 2,
        },
      ],
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
  assert.equal(normalized.plans[0].targetDate, "2026-09-01");
  assert.equal(normalized.plans[0].milestones.length, 2);
  assert.equal(goalPlanOwnershipRules[0], "Goals describe outcomes and belong to BeastOS Personal Hub.");
  assert.equal(goalPlanOwnershipRules[1], "Plans describe the executable path and belong to BeastOS as shared records.");
});

test("BeastOS goal and plan summary preserves module boundaries", () => {
  const summary = summarizeGoalPlanModel(model);

  assert.equal(summary.activeGoals, 1);
  assert.equal(summary.activePlans, 2);
  assert.equal(summary.totalPlanMilestones, 4);
  assert.equal(summary.completedPlanMilestones, 2);
  assert.equal(summary.planProgressPercent, 50);
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
  assert.equal(goalMilestoneDatabaseTableName, "beast_goal_milestones");
  assert.deepEqual(goalMilestoneStatuses, [
    "Not Started",
    "In Progress",
    "Completed",
    "Skipped",
  ]);
  assert.deepEqual(
    goalMilestoneDatabaseColumns.map((column) => [column.name, column.required]),
    [
      ["id", true],
      ["owner_id", true],
      ["goal_id", true],
      ["title", true],
      ["status", true],
      ["target_date", false],
      ["completed_at", false],
      ["sort_order", true],
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
  const milestoneMigration = readFileSync(
    "migrations/20260714_add_beast_goal_milestones.sql",
    "utf8"
  );
  const summary = summarizeGoals(mockGoals);

  assert.equal(summary.totalGoals, 2);
  assert.equal(summary.activeGoals, 2);
  assert.equal(summary.totalMilestones, 2);
  assert.equal(summary.completedMilestones, 1);
  assert.equal(summary.overallProgressPercent, 50);
  assert.deepEqual(summary.nextSteps, [
    "Continue the next Mentor mission.",
    "Review the next safe extra payment.",
  ]);
  assert.equal(getGoalProgressPercent(mockGoals[0]), 50);
  assert.equal(getCurrentGoalMilestone(mockGoals[0])?.title, "Complete first practice checkpoint");
  assert.equal(getGoalProgressPercent(mockGoals[1]), null);
  assert.match(goalsPage, /BeastOS Shared Service/);
  assert.match(goalsPage, /BeastOS Owned/);
  assert.match(goalsPage, /goalDatabaseTableName/);
  assert.match(goalsPage, /goalMilestoneDatabaseTableName/);
  assert.match(goalsPage, /Milestone Progress/);
  assert.doesNotMatch(goalsPage, /mockGoals/);
  assert.doesNotMatch(goalsPage, /Earn Security\+/);
  assert.doesNotMatch(goalsPage, /Become debt free/);
  assert.match(migration, /create table if not exists public\.beast_goals/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = owner_id/);
  assert.match(milestoneMigration, /create table if not exists public\.beast_goal_milestones/);
  assert.match(milestoneMigration, /beast_goals_id_owner_id_unique_idx/);
  assert.match(
    milestoneMigration,
    /foreign key \(goal_id, owner_id\)\s+references public\.beast_goals \(id, owner_id\) on delete cascade/
  );
  assert.match(milestoneMigration, /enable row level security/);
  assert.match(milestoneMigration, /auth\.uid\(\) = owner_id/);
  assert.throws(
    () =>
      buildGoal({
        ...mockGoals[0],
        title: "",
      }),
    /Goal title is required/
  );
});

function createGoalClient(
  rows: BeastGoal[] | null,
  options: {
    userId?: string;
    authError?: boolean;
    queryError?: boolean;
    milestoneRows?: BeastGoalMilestone[] | null;
    milestoneQueryError?: boolean;
  } = {}
): BeastGoalDataClient {
  return {
    auth: {
      async getUser() {
        return {
          data: { user: options.userId ? { id: options.userId } : null },
          error: options.authError ? { message: "Auth unavailable" } : null,
        };
      },
    },
    from(table) {
      assert.ok(
        table === goalDatabaseTableName || table === goalMilestoneDatabaseTableName
      );

      return {
        select() {
          return {
            eq(column, value) {
              assert.equal(column, "owner_id");
              assert.equal(value, options.userId);

              return {
                async order(columnName, orderOptions) {
                  if (table === goalDatabaseTableName) {
                    assert.equal(columnName, "created_at");
                    assert.deepEqual(orderOptions, { ascending: false });
                  } else {
                    assert.equal(columnName, "sort_order");
                    assert.deepEqual(orderOptions, { ascending: true });
                  }

                  return {
                    data:
                      table === goalDatabaseTableName
                        ? rows
                        : options.milestoneRows ?? [],
                    error:
                      table === goalDatabaseTableName
                        ? options.queryError
                          ? { message: "Table unavailable" }
                          : null
                        : options.milestoneQueryError
                          ? { message: "Milestones unavailable" }
                          : null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("BG-001 Goals loader uses only signed-in user records", async () => {
  const result = await loadUserGoals(
    createGoalClient(
      [
        {
          id: "real-goal",
          owner_id: "member-real",
          title: "Read one real goal",
          category: "Personal",
          status: "Active",
          summary: null,
          target_date: null,
          current_step: null,
          source_module: null,
          created_at: "2026-07-14T00:00:00.000Z",
          updated_at: "2026-07-14T00:00:00.000Z",
        },
      ],
      {
        userId: "member-real",
        milestoneRows: [
          {
            id: "real-milestone",
            owner_id: "member-real",
            goal_id: "real-goal",
            title: "Finish the first real step",
            status: "Completed",
            target_date: null,
            completed_at: "2026-07-14T00:00:00.000Z",
            sort_order: 1,
            created_at: "2026-07-14T00:00:00.000Z",
            updated_at: "2026-07-14T00:00:00.000Z",
          },
        ],
      }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.goals.length, 1);
  assert.equal(result.goals[0].title, "Read one real goal");
  assert.equal(result.goals[0].milestones.length, 1);
  assert.equal(result.goals[0].milestones[0].title, "Finish the first real step");
  assert.notEqual(result.goals[0].title, mockGoals[0].title);
});

test("BG-001 Goals loader fails safely without sample records", async () => {
  const unavailable = await loadUserGoals(
    createGoalClient(null, { userId: "member-real", queryError: true })
  );
  const signedOut = await loadUserGoals(createGoalClient(null));

  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.goals.length, 0);
  assert.equal(signedOut.status, "signed-out");
  assert.equal(signedOut.goals.length, 0);
});
