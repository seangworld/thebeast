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
  goalContributionDatabaseColumns,
  goalContributionDatabaseTableName,
  goalContributionStatuses,
  goalContributionTypes,
  goalDatabaseColumns,
  goalDatabaseTableName,
  goalLifecycleEventDatabaseColumns,
  goalLifecycleEventDatabaseTableName,
  goalLifecycleEventTypes,
  goalMilestoneDatabaseColumns,
  goalMilestoneDatabaseTableName,
  goalMilestoneStatuses,
  goalOwnershipRules,
  goalReferenceDatabaseColumns,
  goalReferenceDatabaseTableName,
  goalReferenceStatuses,
  goalReferenceTypes,
  goalRecommendationDatabaseColumns,
  goalRecommendationDatabaseTableName,
  goalRecommendationStatuses,
  goalRecommendationTypes,
  goalSupportItemDatabaseColumns,
  goalSupportItemDatabaseTableName,
  goalSupportItemStatuses,
  goalSupportItemTypes,
  goalStatuses,
  getCurrentGoalMilestone,
  getGoalProgressPercent,
  loadUserGoals,
  type BeastGoalDataClient,
  mockGoals,
  summarizeGoals,
} from "../src/lib/platform/goals";
import type {
  BeastGoal,
  BeastGoalContribution,
  BeastGoalLifecycleEvent,
  BeastGoalMilestone,
  BeastGoalRecommendation,
  BeastGoalReference,
  BeastGoalSupportItem,
} from "../src/lib/types/database";

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
      nextAction: "Continue the next Guidance Counselor mission.",
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
      dependencies: [
        {
          id: "dependency-exam-registration",
          planId: "plan-learning",
          kind: "dependency",
          title: "Register for exam window",
          status: "Needed",
          summary: "The study path needs a target date before the final review.",
        },
      ],
      blockers: [
        {
          id: "blocker-practice-score",
          planId: "plan-learning",
          title: "Practice score below target",
          status: "Open",
          summary: "Review weak domains before scheduling the exam.",
        },
      ],
      recurringActions: [
        {
          id: "routine-study",
          planId: "plan-learning",
          title: "Study three focused sessions",
          cadence: "Weekly",
          nextDueDate: "2026-07-20",
          active: true,
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
      dependencies: [
        {
          id: "prerequisite-paycheck-plan",
          planId: "plan-money",
          kind: "prerequisite",
          title: "Confirm next paycheck amount",
          status: "In Progress",
        },
      ],
      blockers: [],
      recurringActions: [],
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
      actionUrl: "/dashboard/education",
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
    "Continue the next Guidance Counselor mission.",
    "Review next paycheck allocation.",
  ]);
  assert.equal(summary.openBlockers.length, 1);
  assert.equal(summary.unsatisfiedDependencies.length, 2);
  assert.equal(summary.activeRecurringActions.length, 1);
  assert.equal(summary.openBlockers[0].title, "Practice score below target");
  assert.equal(summary.duplicateOwnershipWarnings.length, 1);
  assert.match(
    summary.duplicateOwnershipWarnings[0],
    /BeastOS owns the shared goal/
  );
});

test("Settings profile preserves goals and plans as shared BeastOS data", () => {
  const profilePage = readFileSync("src/app/dashboard/profile/page.tsx", "utf8");
  const settingsProfilePage = readFileSync(
    "src/app/dashboard/settings/profile/page.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(profilePage, /Shared Goals and Plans/);
  assert.match(profilePage, /Goals are outcomes\. Plans are paths\./);
  assert.match(settingsProfilePage, /\.\.\/\.\.\/profile\/page/);
  assert.doesNotMatch(navigation, /label: "Personal Hub"/);
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
  assert.equal(goalSupportItemDatabaseTableName, "beast_goal_support_items");
  assert.deepEqual(goalSupportItemTypes, [
    "Dependency",
    "Prerequisite",
    "Blocker",
    "Recurring Action",
  ]);
  assert.deepEqual(goalSupportItemStatuses, [
    "Needed",
    "In Progress",
    "Satisfied",
    "Blocked",
    "Open",
    "Resolved",
    "Active",
    "Paused",
  ]);
  assert.deepEqual(
    goalSupportItemDatabaseColumns.map((column) => [column.name, column.required]),
    [
      ["id", true],
      ["owner_id", true],
      ["goal_id", true],
      ["item_type", true],
      ["title", true],
      ["status", true],
      ["summary", false],
      ["cadence", false],
      ["next_due_date", false],
      ["resolved_at", false],
      ["sort_order", true],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.equal(goalReferenceDatabaseTableName, "beast_goal_references");
  assert.deepEqual(goalReferenceTypes, [
    "Note",
    "Document",
    "Event",
    "Module Record",
    "Today",
    "Calendar",
  ]);
  assert.deepEqual(goalReferenceStatuses, ["Active", "Archived"]);
  assert.deepEqual(
    goalReferenceDatabaseColumns.map((column) => [column.name, column.required]),
    [
      ["id", true],
      ["owner_id", true],
      ["goal_id", true],
      ["reference_type", true],
      ["title", true],
      ["status", true],
      ["summary", false],
      ["url", false],
      ["reference_id", false],
      ["reference_date", false],
      ["source_module", false],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.equal(goalContributionDatabaseTableName, "beast_goal_contributions");
  assert.deepEqual(goalContributionTypes, [
    "Progress",
    "Recommendation",
    "Milestone",
    "Evidence",
    "Review",
  ]);
  assert.deepEqual(goalContributionStatuses, [
    "Active",
    "Dismissed",
    "Archived",
  ]);
  assert.deepEqual(
    goalContributionDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["goal_id", true],
      ["source_module", true],
      ["contribution_type", true],
      ["status", true],
      ["title", true],
      ["summary", true],
      ["action_url", false],
      ["occurred_at", true],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.equal(goalRecommendationDatabaseTableName, "beast_goal_recommendations");
  assert.deepEqual(goalRecommendationTypes, [
    "Next Action",
    "Review",
    "Milestone",
    "Risk",
    "Opportunity",
  ]);
  assert.deepEqual(goalRecommendationStatuses, [
    "Suggested",
    "Accepted",
    "Dismissed",
    "Completed",
    "Archived",
  ]);
  assert.deepEqual(
    goalRecommendationDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["goal_id", true],
      ["source_module", false],
      ["recommendation_type", true],
      ["status", true],
      ["title", true],
      ["reason", true],
      ["action_label", false],
      ["action_url", false],
      ["review_due_date", false],
      ["dismissed_at", false],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.equal(
    goalLifecycleEventDatabaseTableName,
    "beast_goal_lifecycle_events"
  );
  assert.deepEqual(goalLifecycleEventTypes, [
    "Completed",
    "Abandoned",
    "Revised",
    "Archived",
    "Superseded",
  ]);
  assert.deepEqual(
    goalLifecycleEventDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["goal_id", true],
      ["event_type", true],
      ["title", true],
      ["reason", false],
      ["previous_status", false],
      ["next_status", false],
      ["superseded_by_goal_id", false],
      ["source_module", false],
      ["occurred_at", true],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
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
  assert.ok(
    goalOwnershipRules.some((rule) => /BeastGoals remains superseded/.test(rule))
  );
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
  const supportMigration = readFileSync(
    "migrations/20260715_add_beast_goal_support_items.sql",
    "utf8"
  );
  const referenceMigration = readFileSync(
    "migrations/20260715_add_beast_goal_references.sql",
    "utf8"
  );
  const contributionMigration = readFileSync(
    "migrations/20260715_add_beast_goal_contributions.sql",
    "utf8"
  );
  const recommendationMigration = readFileSync(
    "migrations/20260715_add_beast_goal_recommendations.sql",
    "utf8"
  );
  const lifecycleMigration = readFileSync(
    "migrations/20260715_add_beast_goal_lifecycle_events.sql",
    "utf8"
  );
  const summary = summarizeGoals(mockGoals);

  assert.equal(summary.totalGoals, 2);
  assert.equal(summary.activeGoals, 2);
  assert.equal(summary.totalMilestones, 2);
  assert.equal(summary.completedMilestones, 1);
  assert.equal(summary.openBlockers, 0);
  assert.equal(summary.activeRecurringActions, 0);
  assert.equal(summary.unsatisfiedRequirements, 0);
  assert.equal(summary.linkedReferences, 0);
  assert.equal(summary.crossModuleContributions, 0);
  assert.equal(summary.activeRecommendations, 0);
  assert.equal(summary.lifecycleEvents, 0);
  assert.equal(summary.overallProgressPercent, 50);
  assert.deepEqual(summary.nextSteps, [
    "Continue the next Guidance Counselor mission.",
    "Review the next safe extra payment.",
  ]);
  assert.equal(getGoalProgressPercent(mockGoals[0]), 50);
  assert.equal(getCurrentGoalMilestone(mockGoals[0])?.title, "Complete first practice checkpoint");
  assert.equal(getGoalProgressPercent(mockGoals[1]), null);
  assert.match(goalsPage, /BeastOS Shared Service/);
  assert.match(goalsPage, /BeastOS Owned/);
  assert.match(goalsPage, /goalDatabaseTableName/);
  assert.match(goalsPage, /goalMilestoneDatabaseTableName/);
  assert.match(goalsPage, /goalSupportItemDatabaseTableName/);
  assert.match(goalsPage, /goalReferenceDatabaseTableName/);
  assert.match(goalsPage, /goalContributionDatabaseTableName/);
  assert.match(goalsPage, /goalRecommendationDatabaseTableName/);
  assert.match(goalsPage, /goalLifecycleEventDatabaseTableName/);
  assert.match(goalsPage, /Milestone Progress/);
  assert.match(goalsPage, /Requirements And Routines/);
  assert.match(
    goalsPage,
    /Support, references, contributions, review, and lifecycle/
  );
  assert.match(goalsPage, /Linked References/);
  assert.match(goalsPage, /Module Contributions/);
  assert.match(goalsPage, /Recommendations And Review/);
  assert.match(goalsPage, /Lifecycle History/);
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
  assert.match(supportMigration, /create table if not exists public\.beast_goal_support_items/);
  assert.match(
    supportMigration,
    /foreign key \(goal_id, owner_id\)\s+references public\.beast_goals \(id, owner_id\) on delete cascade/
  );
  assert.match(supportMigration, /item_type in \('Dependency', 'Prerequisite', 'Blocker', 'Recurring Action'\)/);
  assert.match(supportMigration, /enable row level security/);
  assert.match(supportMigration, /auth\.uid\(\) = owner_id/);
  assert.match(referenceMigration, /create table if not exists public\.beast_goal_references/);
  assert.match(
    referenceMigration,
    /foreign key \(goal_id, owner_id\)\s+references public\.beast_goals \(id, owner_id\) on delete cascade/
  );
  assert.match(
    referenceMigration,
    /reference_type in \('Note', 'Document', 'Event', 'Module Record', 'Today', 'Calendar'\)/
  );
  assert.match(referenceMigration, /enable row level security/);
  assert.match(referenceMigration, /auth\.uid\(\) = owner_id/);
  assert.match(contributionMigration, /create table if not exists public\.beast_goal_contributions/);
  assert.match(
    contributionMigration,
    /foreign key \(goal_id, owner_id\)\s+references public\.beast_goals \(id, owner_id\) on delete cascade/
  );
  assert.match(
    contributionMigration,
    /contribution_type in \('Progress', 'Recommendation', 'Milestone', 'Evidence', 'Review'\)/
  );
  assert.match(contributionMigration, /enable row level security/);
  assert.match(contributionMigration, /auth\.uid\(\) = owner_id/);
  assert.match(recommendationMigration, /create table if not exists public\.beast_goal_recommendations/);
  assert.match(
    recommendationMigration,
    /foreign key \(goal_id, owner_id\)\s+references public\.beast_goals \(id, owner_id\) on delete cascade/
  );
  assert.match(
    recommendationMigration,
    /recommendation_type in \('Next Action', 'Review', 'Milestone', 'Risk', 'Opportunity'\)/
  );
  assert.match(recommendationMigration, /status = 'Dismissed' and dismissed_at is not null/);
  assert.match(recommendationMigration, /enable row level security/);
  assert.match(recommendationMigration, /auth\.uid\(\) = owner_id/);
  assert.match(
    lifecycleMigration,
    /create table if not exists public\.beast_goal_lifecycle_events/
  );
  assert.match(
    lifecycleMigration,
    /event_type in \('Completed', 'Abandoned', 'Revised', 'Archived', 'Superseded'\)/
  );
  assert.match(lifecycleMigration, /superseded_by_goal_id is not null/);
  assert.match(lifecycleMigration, /enable row level security/);
  assert.match(lifecycleMigration, /auth\.uid\(\) = owner_id/);
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
    supportRows?: BeastGoalSupportItem[] | null;
    supportQueryError?: boolean;
    referenceRows?: BeastGoalReference[] | null;
    referenceQueryError?: boolean;
    contributionRows?: BeastGoalContribution[] | null;
    contributionQueryError?: boolean;
    recommendationRows?: BeastGoalRecommendation[] | null;
    recommendationQueryError?: boolean;
    lifecycleRows?: BeastGoalLifecycleEvent[] | null;
    lifecycleQueryError?: boolean;
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
        table === goalDatabaseTableName ||
          table === goalMilestoneDatabaseTableName ||
          table === goalSupportItemDatabaseTableName ||
          table === goalReferenceDatabaseTableName ||
          table === goalContributionDatabaseTableName ||
          table === goalRecommendationDatabaseTableName ||
          table === goalLifecycleEventDatabaseTableName
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
                  } else if (table === goalMilestoneDatabaseTableName) {
                    assert.equal(columnName, "sort_order");
                    assert.deepEqual(orderOptions, { ascending: true });
                  } else if (table === goalSupportItemDatabaseTableName) {
                    assert.equal(table, goalSupportItemDatabaseTableName);
                    assert.equal(columnName, "sort_order");
                    assert.deepEqual(orderOptions, { ascending: true });
                  } else if (table === goalContributionDatabaseTableName) {
                    assert.equal(columnName, "occurred_at");
                    assert.deepEqual(orderOptions, { ascending: false });
                  } else if (table === goalRecommendationDatabaseTableName) {
                    assert.equal(columnName, "created_at");
                    assert.deepEqual(orderOptions, { ascending: false });
                  } else if (table === goalLifecycleEventDatabaseTableName) {
                    assert.equal(columnName, "occurred_at");
                    assert.deepEqual(orderOptions, { ascending: false });
                  } else {
                    assert.equal(table, goalReferenceDatabaseTableName);
                    assert.equal(columnName, "created_at");
                    assert.deepEqual(orderOptions, { ascending: false });
                  }

                  return {
                    data: (() => {
                      if (table === goalDatabaseTableName) return rows;
                      if (table === goalMilestoneDatabaseTableName) {
                        return options.milestoneRows ?? [];
                      }
                      if (table === goalSupportItemDatabaseTableName) {
                        return options.supportRows ?? [];
                      }
                      if (table === goalContributionDatabaseTableName) {
                        return options.contributionRows ?? [];
                      }
                      if (table === goalRecommendationDatabaseTableName) {
                        return options.recommendationRows ?? [];
                      }
                      if (table === goalLifecycleEventDatabaseTableName) {
                        return options.lifecycleRows ?? [];
                      }
                      return options.referenceRows ?? [];
                    })(),
                    error: (() => {
                      if (table === goalDatabaseTableName) {
                        return options.queryError
                          ? { message: "Table unavailable" }
                          : null;
                      }

                      if (table === goalMilestoneDatabaseTableName) {
                        return options.milestoneQueryError
                          ? { message: "Milestones unavailable" }
                          : null;
                      }

                      if (table === goalSupportItemDatabaseTableName) {
                        return options.supportQueryError
                          ? { message: "Support unavailable" }
                          : null;
                      }

                      if (table === goalContributionDatabaseTableName) {
                        return options.contributionQueryError
                          ? { message: "Contributions unavailable" }
                          : null;
                      }

                      if (table === goalRecommendationDatabaseTableName) {
                        return options.recommendationQueryError
                          ? { message: "Recommendations unavailable" }
                          : null;
                      }

                      if (table === goalLifecycleEventDatabaseTableName) {
                        return options.lifecycleQueryError
                          ? { message: "Lifecycle unavailable" }
                          : null;
                      }

                      return options.referenceQueryError
                        ? { message: "References unavailable" }
                        : null;
                    })(),
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
        supportRows: [
          {
            id: "real-support",
            owner_id: "member-real",
            goal_id: "real-goal",
            item_type: "Blocker",
            title: "Waiting on owner review",
            status: "Open",
            summary: "The next step needs review before the plan can continue.",
            cadence: null,
            next_due_date: null,
            resolved_at: null,
            sort_order: 1,
            created_at: "2026-07-14T00:00:00.000Z",
            updated_at: "2026-07-14T00:00:00.000Z",
          },
          {
            id: "real-routine",
            owner_id: "member-real",
            goal_id: "real-goal",
            item_type: "Recurring Action",
            title: "Weekly check-in",
            status: "Active",
            summary: null,
            cadence: "Weekly",
            next_due_date: "2026-07-21",
            resolved_at: null,
            sort_order: 2,
            created_at: "2026-07-14T00:00:00.000Z",
            updated_at: "2026-07-14T00:00:00.000Z",
          },
        ],
        referenceRows: [
          {
            id: "real-reference-today",
            owner_id: "member-real",
            goal_id: "real-goal",
            reference_type: "Today",
            title: "Review today's goal action",
            status: "Active",
            summary: null,
            url: "/dashboard/today",
            reference_id: "today-1",
            reference_date: "2026-07-15",
            source_module: "beastos",
            created_at: "2026-07-15T01:00:00.000Z",
            updated_at: "2026-07-15T01:00:00.000Z",
          },
          {
            id: "real-reference-document",
            owner_id: "member-real",
            goal_id: "real-goal",
            reference_type: "Document",
            title: "Certification outline",
            status: "Active",
            summary: "Linked from the shared Documents service.",
            url: "/dashboard/documents",
            reference_id: "document-1",
            reference_date: null,
            source_module: "beastos",
            created_at: "2026-07-15T00:00:00.000Z",
            updated_at: "2026-07-15T00:00:00.000Z",
          },
        ],
        contributionRows: [
          {
            id: "real-contribution-learning",
            owner_id: "member-real",
            goal_id: "real-goal",
            source_module: "learning",
            contribution_type: "Progress",
            status: "Active",
            title: "Completed a learning checkpoint",
            summary: "BeastEducation contributed progress without owning the shared goal.",
            action_url: "/dashboard/education",
            occurred_at: "2026-07-15T02:00:00.000Z",
            created_at: "2026-07-15T02:00:00.000Z",
            updated_at: "2026-07-15T02:00:00.000Z",
          },
          {
            id: "real-contribution-money",
            owner_id: "member-real",
            goal_id: "real-goal",
            source_module: "money",
            contribution_type: "Recommendation",
            status: "Active",
            title: "Review savings allocation",
            summary: "BeastMoney suggested funding support without owning the shared goal.",
            action_url: "/dashboard/money",
            occurred_at: "2026-07-15T03:00:00.000Z",
            created_at: "2026-07-15T03:00:00.000Z",
            updated_at: "2026-07-15T03:00:00.000Z",
          },
        ],
        recommendationRows: [
          {
            id: "real-recommendation-review",
            owner_id: "member-real",
            goal_id: "real-goal",
            source_module: "beastos",
            recommendation_type: "Review",
            status: "Suggested",
            title: "Review this goal this week",
            reason: "This goal has new module evidence, so it is ready for review.",
            action_label: "Review goal",
            action_url: "/dashboard/goals",
            review_due_date: "2026-07-20",
            dismissed_at: null,
            created_at: "2026-07-15T04:00:00.000Z",
            updated_at: "2026-07-15T04:00:00.000Z",
          },
          {
            id: "real-recommendation-dismissed",
            owner_id: "member-real",
            goal_id: "real-goal",
            source_module: "money",
            recommendation_type: "Opportunity",
            status: "Dismissed",
            title: "Consider a savings boost",
            reason: "BeastMoney found extra capacity, but the user dismissed it.",
            action_label: null,
            action_url: null,
            review_due_date: null,
            dismissed_at: "2026-07-15T05:00:00.000Z",
            created_at: "2026-07-15T03:30:00.000Z",
            updated_at: "2026-07-15T05:00:00.000Z",
          },
        ],
        lifecycleRows: [
          {
            id: "real-lifecycle-revised",
            owner_id: "member-real",
            goal_id: "real-goal",
            event_type: "Revised",
            title: "Goal plan revised",
            reason: "The target step changed after module evidence was reviewed.",
            previous_status: "Active",
            next_status: "Active",
            superseded_by_goal_id: null,
            source_module: "beastos",
            occurred_at: "2026-07-15T06:00:00.000Z",
            created_at: "2026-07-15T06:00:00.000Z",
            updated_at: "2026-07-15T06:00:00.000Z",
          },
          {
            id: "real-lifecycle-completed",
            owner_id: "member-real",
            goal_id: "real-goal",
            event_type: "Completed",
            title: "Goal completed",
            reason: "The learner finished the shared outcome.",
            previous_status: "Active",
            next_status: "Completed",
            superseded_by_goal_id: null,
            source_module: "learning",
            occurred_at: "2026-07-15T05:30:00.000Z",
            created_at: "2026-07-15T05:30:00.000Z",
            updated_at: "2026-07-15T05:30:00.000Z",
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
  assert.equal(result.goals[0].supportItems.length, 2);
  assert.equal(result.goals[0].supportItems[0].title, "Waiting on owner review");
  assert.equal(result.goals[0].references.length, 2);
  assert.equal(result.goals[0].references[0].title, "Review today's goal action");
  assert.equal(result.goals[0].references[1].title, "Certification outline");
  assert.equal(result.goals[0].contributions.length, 2);
  assert.equal(result.goals[0].contributions[0].title, "Review savings allocation");
  assert.equal(result.goals[0].contributions[1].title, "Completed a learning checkpoint");
  assert.equal(result.goals[0].recommendations.length, 2);
  assert.equal(result.goals[0].recommendations[0].title, "Review this goal this week");
  assert.equal(result.goals[0].recommendations[1].title, "Consider a savings boost");
  assert.equal(result.goals[0].lifecycleEvents.length, 2);
  assert.equal(result.goals[0].lifecycleEvents[0].title, "Goal plan revised");
  assert.equal(result.goals[0].lifecycleEvents[1].title, "Goal completed");
  assert.equal(summarizeGoals(result.goals).openBlockers, 1);
  assert.equal(summarizeGoals(result.goals).activeRecurringActions, 1);
  assert.equal(summarizeGoals(result.goals).linkedReferences, 2);
  assert.equal(summarizeGoals(result.goals).documentReferences, 1);
  assert.equal(summarizeGoals(result.goals).todayReferences, 1);
  assert.equal(summarizeGoals(result.goals).crossModuleContributions, 2);
  assert.deepEqual(summarizeGoals(result.goals).contributingModules, [
    "learning",
    "money",
  ]);
  assert.equal(summarizeGoals(result.goals).contributionRecommendations, 1);
  assert.equal(summarizeGoals(result.goals).activeRecommendations, 1);
  assert.equal(summarizeGoals(result.goals).dismissedRecommendations, 1);
  assert.equal(summarizeGoals(result.goals).reviewDueRecommendations, 1);
  assert.equal(summarizeGoals(result.goals).lifecycleEvents, 2);
  assert.equal(summarizeGoals(result.goals).completedLifecycleEvents, 1);
  assert.equal(summarizeGoals(result.goals).revisedLifecycleEvents, 1);
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

test("BO-11 Goals loader tolerates unavailable support items", async () => {
  const result = await loadUserGoals(
    createGoalClient(
      [
        {
          id: "real-goal",
          owner_id: "member-real",
          title: "Goal without support table",
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
      { userId: "member-real", supportQueryError: true }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.goals.length, 1);
  assert.equal(result.goals[0].supportItems.length, 0);
  assert.equal(summarizeGoals(result.goals).openBlockers, 0);
});

test("BO-12 Goals loader tolerates unavailable reference records", async () => {
  const result = await loadUserGoals(
    createGoalClient(
      [
        {
          id: "real-goal",
          owner_id: "member-real",
          title: "Goal without reference table",
          category: "Personal",
          status: "Active",
          summary: null,
          target_date: null,
          current_step: null,
          source_module: null,
          created_at: "2026-07-15T00:00:00.000Z",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
      { userId: "member-real", referenceQueryError: true }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.goals.length, 1);
  assert.equal(result.goals[0].references.length, 0);
  assert.equal(summarizeGoals(result.goals).linkedReferences, 0);
});

test("BO-13 Goals loader tolerates unavailable contribution records", async () => {
  const result = await loadUserGoals(
    createGoalClient(
      [
        {
          id: "real-goal",
          owner_id: "member-real",
          title: "Goal without contribution table",
          category: "Personal",
          status: "Active",
          summary: null,
          target_date: null,
          current_step: null,
          source_module: null,
          created_at: "2026-07-15T00:00:00.000Z",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
      { userId: "member-real", contributionQueryError: true }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.goals.length, 1);
  assert.equal(result.goals[0].contributions.length, 0);
  assert.equal(summarizeGoals(result.goals).crossModuleContributions, 0);
});

test("BO-14 Goals loader tolerates unavailable recommendation records", async () => {
  const result = await loadUserGoals(
    createGoalClient(
      [
        {
          id: "real-goal",
          owner_id: "member-real",
          title: "Goal without recommendation table",
          category: "Personal",
          status: "Active",
          summary: null,
          target_date: null,
          current_step: null,
          source_module: null,
          created_at: "2026-07-15T00:00:00.000Z",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
      { userId: "member-real", recommendationQueryError: true }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.goals.length, 1);
  assert.equal(result.goals[0].recommendations.length, 0);
  assert.equal(summarizeGoals(result.goals).activeRecommendations, 0);
});

test("BO-15 Goals loader tolerates unavailable lifecycle records", async () => {
  const result = await loadUserGoals(
    createGoalClient(
      [
        {
          id: "real-goal",
          owner_id: "member-real",
          title: "Goal without lifecycle table",
          category: "Personal",
          status: "Active",
          summary: null,
          target_date: null,
          current_step: null,
          source_module: null,
          created_at: "2026-07-15T00:00:00.000Z",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
      { userId: "member-real", lifecycleQueryError: true }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.goals.length, 1);
  assert.equal(result.goals[0].lifecycleEvents.length, 0);
  assert.equal(summarizeGoals(result.goals).lifecycleEvents, 0);
});
