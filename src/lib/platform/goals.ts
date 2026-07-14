import type { PlatformModule } from "./types";

export type GoalStatus =
  | "Proposed"
  | "Active"
  | "Paused"
  | "Blocked"
  | "Completed"
  | "Archived";

export type GoalCategory =
  | "Education"
  | "Career"
  | "Money"
  | "Personal"
  | "Project"
  | "Home"
  | "Health"
  | "Other";

export type Goal = {
  id: string;
  ownerId: string;
  title: string;
  category: GoalCategory;
  status: GoalStatus;
  summary?: string;
  targetDate?: string;
  currentStep?: string;
  sourceModule?: PlatformModule;
  createdAt: string;
  updatedAt: string;
};

export type GoalDatabaseColumn = {
  name: string;
  type: string;
  required: boolean;
};

export type GoalOverviewSummary = {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  blockedGoals: number;
  archivedGoals: number;
  nextSteps: string[];
};

const activeGoalStatuses = new Set<GoalStatus>(["Proposed", "Active", "Blocked"]);

export const goalStatuses: GoalStatus[] = [
  "Proposed",
  "Active",
  "Paused",
  "Blocked",
  "Completed",
  "Archived",
];

export const goalCategories: GoalCategory[] = [
  "Education",
  "Career",
  "Money",
  "Personal",
  "Project",
  "Home",
  "Health",
  "Other",
];

export const goalDatabaseTableName = "beast_goals";

export const goalDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "title", type: "text", required: true },
  { name: "category", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "summary", type: "text", required: false },
  { name: "target_date", type: "date", required: false },
  { name: "current_step", type: "text", required: false },
  { name: "source_module", type: "text", required: false },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const goalOwnershipRules = [
  "Goals belong to BeastOS as shared Personal Hub data.",
  "Goals are outcomes, not module-owned task lists.",
  "Modules may suggest goals and contribute progress without owning shared goals.",
  "BeastGoals remains superseded as a standalone customer-facing module.",
];

export const mockGoals: Goal[] = [
  {
    id: "goal-security-plus",
    ownerId: "member-owner",
    title: "Earn Security+",
    category: "Education",
    status: "Active",
    summary: "Prepare for the Security+ certification.",
    targetDate: "2026-10-01",
    currentStep: "Continue the next Mentor mission.",
    sourceModule: "learning",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "goal-debt-free",
    ownerId: "member-owner",
    title: "Become debt free",
    category: "Money",
    status: "Proposed",
    summary: "Use BeastMoney planning to reduce debt safely.",
    currentStep: "Review the next safe extra payment.",
    sourceModule: "money",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
];

export function isGoalStatus(status: unknown): status is GoalStatus {
  return goalStatuses.includes(status as GoalStatus);
}

export function isGoalCategory(category: unknown): category is GoalCategory {
  return goalCategories.includes(category as GoalCategory);
}

export function buildGoal(goal: Goal): Goal {
  if (!goal.title.trim()) {
    throw new Error("Goal title is required.");
  }

  if (!isGoalStatus(goal.status)) {
    throw new Error(`Unsupported goal status: ${goal.status}`);
  }

  if (!isGoalCategory(goal.category)) {
    throw new Error(`Unsupported goal category: ${goal.category}`);
  }

  return goal;
}

export function buildGoalCollection(goals: Goal[]) {
  return goals.map(buildGoal);
}

export function summarizeGoals(goals: Goal[]): GoalOverviewSummary {
  const normalized = buildGoalCollection(goals);

  return {
    totalGoals: normalized.length,
    activeGoals: normalized.filter((goal) => activeGoalStatuses.has(goal.status))
      .length,
    completedGoals: normalized.filter((goal) => goal.status === "Completed")
      .length,
    blockedGoals: normalized.filter((goal) => goal.status === "Blocked").length,
    archivedGoals: normalized.filter((goal) => goal.status === "Archived").length,
    nextSteps: normalized
      .filter((goal) => activeGoalStatuses.has(goal.status) && goal.currentStep)
      .map((goal) => goal.currentStep as string),
  };
}
