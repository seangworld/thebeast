import type { PlatformModule } from "./types";
import type {
  BeastGoal as BeastGoalRow,
  BeastGoalMilestone as BeastGoalMilestoneRow,
} from "@/lib/types/database";

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

export type GoalMilestoneStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Skipped";

export type GoalMilestone = {
  id: string;
  ownerId: string;
  goalId: string;
  title: string;
  status: GoalMilestoneStatus;
  targetDate?: string;
  completedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

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
  milestones: GoalMilestone[];
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
  totalMilestones: number;
  completedMilestones: number;
  overallProgressPercent: number | null;
  nextSteps: string[];
};

export type GoalLoadStatus = "ready" | "signed-out" | "unavailable";

export type GoalLoadResult = {
  goals: Goal[];
  status: GoalLoadStatus;
  message?: string;
};

export type BeastGoalDataClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => Promise<{
          data: BeastGoalRow[] | BeastGoalMilestoneRow[] | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
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

export const goalMilestoneStatuses: GoalMilestoneStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Skipped",
];

export const goalDatabaseTableName = "beast_goals";
export const goalMilestoneDatabaseTableName = "beast_goal_milestones";

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

export const goalMilestoneDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "goal_id", type: "uuid", required: true },
  { name: "title", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "target_date", type: "date", required: false },
  { name: "completed_at", type: "timestamptz", required: false },
  { name: "sort_order", type: "integer", required: true },
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
    milestones: [
      {
        id: "milestone-security-basics",
        ownerId: "member-owner",
        goalId: "goal-security-plus",
        title: "Finish networking foundations",
        status: "Completed",
        sortOrder: 1,
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
      {
        id: "milestone-security-practice",
        ownerId: "member-owner",
        goalId: "goal-security-plus",
        title: "Complete first practice checkpoint",
        status: "In Progress",
        targetDate: "2026-08-01",
        sortOrder: 2,
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
    ],
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
    milestones: [],
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
];

export const exampleGoals = mockGoals;

function toPlatformModule(module: string | null | undefined) {
  return module ? (module as PlatformModule) : undefined;
}

export function mapGoalRow(row: BeastGoalRow): Goal {
  return buildGoal({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    category: row.category,
    status: row.status,
    summary: row.summary ?? undefined,
    targetDate: row.target_date ?? undefined,
    currentStep: row.current_step ?? undefined,
    sourceModule: toPlatformModule(row.source_module),
    milestones: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function isGoalMilestoneStatus(
  status: unknown
): status is GoalMilestoneStatus {
  return goalMilestoneStatuses.includes(status as GoalMilestoneStatus);
}

export function mapGoalMilestoneRow(
  row: BeastGoalMilestoneRow
): GoalMilestone {
  if (!isGoalMilestoneStatus(row.status)) {
    throw new Error(`Unsupported goal milestone status: ${row.status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    goalId: row.goal_id,
    title: row.title,
    status: row.status,
    targetDate: row.target_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadUserGoals(
  client: BeastGoalDataClient
): Promise<GoalLoadResult> {
  try {
    const { data: userData, error: userError } = await client.auth.getUser();

    if (userError) {
      return {
        goals: [],
        status: "unavailable",
        message: "Goals could not be loaded right now.",
      };
    }

    if (!userData.user) {
      return {
        goals: [],
        status: "signed-out",
        message: "Sign in to view your goals.",
      };
    }

    const { data, error } = await client
      .from(goalDatabaseTableName)
      .select(
        "id, owner_id, title, category, status, summary, target_date, current_step, source_module, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        goals: [],
        status: "unavailable",
        message:
          "Goals are not available yet. The database may still need its foundation migration.",
      };
    }

    const milestoneResult = await client
      .from(goalMilestoneDatabaseTableName)
      .select(
        "id, owner_id, goal_id, title, status, target_date, completed_at, sort_order, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("sort_order", { ascending: true });

    const milestones = milestoneResult.error
      ? []
      : ((milestoneResult.data ?? []) as BeastGoalMilestoneRow[]).map(
          mapGoalMilestoneRow
        );
    const milestonesByGoal = new Map<string, GoalMilestone[]>();

    milestones.forEach((milestone) => {
      milestonesByGoal.set(milestone.goalId, [
        ...(milestonesByGoal.get(milestone.goalId) || []),
        milestone,
      ]);
    });

    return {
      goals: ((data ?? []) as BeastGoalRow[]).map((row) => {
        const goal = mapGoalRow(row);

        return {
          ...goal,
          milestones: milestonesByGoal.get(goal.id) || [],
        };
      }),
      status: "ready",
    };
  } catch {
    return {
      goals: [],
      status: "unavailable",
      message: "Goals could not be loaded right now.",
    };
  }
}

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

  goal.milestones.forEach((milestone) => {
    if (!milestone.title.trim()) {
      throw new Error("Goal milestone title is required.");
    }

    if (!isGoalMilestoneStatus(milestone.status)) {
      throw new Error(`Unsupported goal milestone status: ${milestone.status}`);
    }
  });

  return goal;
}

export function buildGoalCollection(goals: Goal[]) {
  return goals.map(buildGoal);
}

export function getGoalProgressPercent(goal: Goal) {
  const measurable = goal.milestones.filter(
    (milestone) => milestone.status !== "Skipped"
  );

  if (measurable.length === 0) return null;

  const completed = measurable.filter(
    (milestone) => milestone.status === "Completed"
  ).length;

  return Math.round((completed / measurable.length) * 100);
}

export function getCurrentGoalMilestone(goal: Goal) {
  return (
    goal.milestones.find((milestone) => milestone.status === "In Progress") ||
    goal.milestones.find((milestone) => milestone.status === "Not Started") ||
    null
  );
}

export function summarizeGoals(goals: Goal[]): GoalOverviewSummary {
  const normalized = buildGoalCollection(goals);
  const milestones = normalized.flatMap((goal) => goal.milestones);
  const measurableMilestones = milestones.filter(
    (milestone) => milestone.status !== "Skipped"
  );
  const completedMilestones = measurableMilestones.filter(
    (milestone) => milestone.status === "Completed"
  ).length;

  return {
    totalGoals: normalized.length,
    activeGoals: normalized.filter((goal) => activeGoalStatuses.has(goal.status))
      .length,
    completedGoals: normalized.filter((goal) => goal.status === "Completed")
      .length,
    blockedGoals: normalized.filter((goal) => goal.status === "Blocked").length,
    archivedGoals: normalized.filter((goal) => goal.status === "Archived").length,
    totalMilestones: measurableMilestones.length,
    completedMilestones,
    overallProgressPercent:
      measurableMilestones.length > 0
        ? Math.round((completedMilestones / measurableMilestones.length) * 100)
        : null,
    nextSteps: normalized
      .filter((goal) => activeGoalStatuses.has(goal.status) && goal.currentStep)
      .map((goal) => goal.currentStep as string),
  };
}
