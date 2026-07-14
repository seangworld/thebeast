import type { PlatformModule } from "./types";

export type SharedGoalStatus =
  | "Proposed"
  | "Active"
  | "Paused"
  | "Blocked"
  | "Completed"
  | "Archived";

export type SharedPlanStatus =
  | "Draft"
  | "Active"
  | "Paused"
  | "Blocked"
  | "Review due"
  | "Completed"
  | "Archived"
  | "Superseded";

export type SharedGoalCategory =
  | "Education"
  | "Career"
  | "Money"
  | "Personal"
  | "Project"
  | "Home"
  | "Health"
  | "Other";

export type SharedGoal = {
  id: string;
  ownerId: string;
  title: string;
  category: SharedGoalCategory;
  status: SharedGoalStatus;
  summary?: string;
  targetDate?: string;
  sourceModule?: PlatformModule;
  planIds: string[];
  contributionIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SharedPlan = {
  id: string;
  ownerId: string;
  title: string;
  status: SharedPlanStatus;
  summary?: string;
  goalIds: string[];
  sourceModule?: PlatformModule;
  currentStep?: string;
  nextAction?: string;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type GoalPlanContributionKind =
  | "progress"
  | "recommendation"
  | "milestone"
  | "evidence"
  | "review";

export type GoalPlanContribution = {
  id: string;
  goalId?: string;
  planId?: string;
  module: PlatformModule;
  kind: GoalPlanContributionKind;
  title: string;
  summary: string;
  actionUrl?: string;
  occurredAt: string;
};

export type GoalPlanModel = {
  goals: SharedGoal[];
  plans: SharedPlan[];
  contributions: GoalPlanContribution[];
};

export type GoalPlanSummary = {
  activeGoals: number;
  activePlans: number;
  orphanPlans: SharedPlan[];
  duplicateOwnershipWarnings: string[];
  nextActions: string[];
};

const activeGoalStatuses = new Set<SharedGoalStatus>(["Proposed", "Active", "Blocked"]);
const activePlanStatuses = new Set<SharedPlanStatus>([
  "Draft",
  "Active",
  "Blocked",
  "Review due",
]);

export function buildGoalPlanContribution(
  contribution: GoalPlanContribution
): GoalPlanContribution {
  if (!contribution.goalId && !contribution.planId) {
    throw new Error("Goal or plan reference is required for a contribution.");
  }

  return contribution;
}

export function buildGoalPlanModel({
  goals,
  plans,
  contributions,
}: GoalPlanModel): GoalPlanModel {
  const goalIds = new Set(goals.map((goal) => goal.id));

  return {
    goals: goals.map((goal) => ({
      ...goal,
      planIds: goal.planIds.filter((planId) =>
        plans.some((plan) => plan.id === planId)
      ),
      contributionIds: goal.contributionIds.filter((contributionId) =>
        contributions.some((contribution) => contribution.id === contributionId)
      ),
    })),
    plans: plans.map((plan) => ({
      ...plan,
      goalIds: plan.goalIds.filter((goalId) => goalIds.has(goalId)),
      evidenceIds: plan.evidenceIds.filter((contributionId) =>
        contributions.some((contribution) => contribution.id === contributionId)
      ),
    })),
    contributions: contributions.filter(
      (contribution) =>
        !contribution.goalId || goalIds.has(contribution.goalId)
    ),
  };
}

export function summarizeGoalPlanModel(model: GoalPlanModel): GoalPlanSummary {
  const normalized = buildGoalPlanModel(model);
  const plansByGoal = new Map<string, SharedPlan[]>();

  normalized.plans.forEach((plan) => {
    plan.goalIds.forEach((goalId) => {
      plansByGoal.set(goalId, [...(plansByGoal.get(goalId) || []), plan]);
    });
  });

  const duplicateOwnershipWarnings = normalized.goals.flatMap((goal) => {
    const sourceModules = new Set(
      (plansByGoal.get(goal.id) || [])
        .map((plan) => plan.sourceModule)
        .filter(Boolean)
    );

    if (sourceModules.size <= 1) return [];

    return [
      `${goal.title} has plans from multiple modules. BeastOS owns the shared goal; modules own only their domain plan details.`,
    ];
  });

  return {
    activeGoals: normalized.goals.filter((goal) =>
      activeGoalStatuses.has(goal.status)
    ).length,
    activePlans: normalized.plans.filter((plan) =>
      activePlanStatuses.has(plan.status)
    ).length,
    orphanPlans: normalized.plans.filter((plan) => plan.goalIds.length === 0),
    duplicateOwnershipWarnings,
    nextActions: normalized.plans
      .filter((plan) => activePlanStatuses.has(plan.status) && plan.nextAction)
      .map((plan) => plan.nextAction as string),
  };
}

export const goalPlanOwnershipRules = [
  "Goals describe outcomes and belong to BeastOS Personal Hub.",
  "Plans describe the executable path and belong to BeastOS as shared records.",
  "Modules may contribute progress, evidence, and recommendations without owning shared Goals or Plans.",
  "Learning keeps curriculum, mastery, lessons, and Mentor behavior.",
  "Money keeps cash-flow, debt, forecasting, and financial decision logic.",
];
