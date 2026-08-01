import type { PlatformModule } from "./types";
import type {
  Goal,
  GoalCategory,
  GoalPriority,
  GoalStatus,
} from "./goals";

export type LifePlanningCategory =
  | "Education & Career"
  | "Financial"
  | "Health"
  | "Home"
  | "Family"
  | "Personal"
  | "Project"
  | "Other";

export type GoalProfessionalId =
  | "guidance-counselor"
  | "money-coach"
  | "health-advisor";

export type GoalFilter = {
  search?: string;
  category?: LifePlanningCategory | "All";
  module?: PlatformModule | "All";
  timeline?: string | "All";
  priority?: GoalPriority | "All";
  professional?: string | "All";
  status?: GoalStatus | "All";
};

export const lifePlanningCategories: LifePlanningCategory[] = [
  "Education & Career",
  "Financial",
  "Health",
  "Home",
  "Family",
  "Personal",
  "Project",
  "Other",
];

export const professionalGoalAccess: Record<
  GoalProfessionalId,
  {
    label: string;
    categories: GoalCategory[];
    module: PlatformModule;
    mayRecommend: boolean;
    mayUpdateProgress: boolean;
  }
> = {
  "guidance-counselor": {
    label: "Guidance Counselor",
    categories: ["Education", "Career"],
    module: "learning",
    mayRecommend: true,
    mayUpdateProgress: true,
  },
  "money-coach": {
    label: "Money Coach",
    categories: ["Money"],
    module: "money",
    mayRecommend: true,
    mayUpdateProgress: true,
  },
  "health-advisor": {
    label: "Health Advisor",
    categories: ["Health"],
    module: "health",
    mayRecommend: true,
    mayUpdateProgress: true,
  },
};

export function lifePlanningCategoryForGoal(
  goal: Pick<Goal, "category">
): LifePlanningCategory {
  if (goal.category === "Education" || goal.category === "Career") {
    return "Education & Career";
  }
  if (goal.category === "Money") return "Financial";
  return goal.category;
}

export function canProfessionalUseGoal(
  professional: GoalProfessionalId,
  goal: Pick<Goal, "category">
) {
  return professionalGoalAccess[professional].categories.includes(goal.category);
}

export function goalSyncPointer(goal: Pick<Goal, "id" | "ownerId">) {
  return {
    canonicalTable: "beast_goals" as const,
    goalId: goal.id,
    ownerId: goal.ownerId,
    linkTable: "beast_goal_references" as const,
    contributionTable: "beast_goal_contributions" as const,
    duplicatesGoalData: false as const,
  };
}

const priorityWeight: Record<GoalPriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function includesSearch(goal: Goal, search: string) {
  const value = search.trim().toLowerCase();
  if (!value) return true;
  return [
    goal.title,
    goal.summary,
    goal.description,
    goal.notes,
    goal.currentStep,
    goal.customCategory,
    ...(goal.tags || []),
  ]
    .filter(Boolean)
    .some((item) => String(item).toLowerCase().includes(value));
}

export function filterLifePlanningGoals(goals: Goal[], filter: GoalFilter) {
  return goals.filter((goal) => {
    if (goal.deletedAt) return false;
    if (!includesSearch(goal, filter.search || "")) return false;
    if (
      filter.category &&
      filter.category !== "All" &&
      lifePlanningCategoryForGoal(goal) !== filter.category
    ) {
      return false;
    }
    if (
      filter.module &&
      filter.module !== "All" &&
      goal.sourceModule !== filter.module
    ) {
      return false;
    }
    if (
      filter.timeline &&
      filter.timeline !== "All" &&
      goal.timeline !== filter.timeline
    ) {
      return false;
    }
    if (
      filter.priority &&
      filter.priority !== "All" &&
      (goal.priority || "Medium") !== filter.priority
    ) {
      return false;
    }
    if (
      filter.professional &&
      filter.professional !== "All" &&
      goal.linkedProfessional !== filter.professional
    ) {
      return false;
    }
    return !filter.status || filter.status === "All" || goal.status === filter.status;
  });
}

export function rankGoalsForToday(goals: Goal[], today = new Date()) {
  const todayKey = today.toISOString().slice(0, 10);
  const activeStatuses = new Set<GoalStatus>([
    "Proposed",
    "Active",
    "Blocked",
    "Paused",
  ]);

  return goals
    .filter((goal) => activeStatuses.has(goal.status) && !goal.deletedAt)
    .map((goal) => {
      const overdueMilestones = goal.milestones.filter(
        (milestone) =>
          milestone.status !== "Completed" &&
          milestone.status !== "Skipped" &&
          Boolean(milestone.targetDate && milestone.targetDate < todayKey)
      ).length;
      const deadlineScore = goal.targetDate
        ? Math.max(0, 30 - Math.floor((Date.parse(goal.targetDate) - Date.parse(todayKey)) / 86400000))
        : 0;
      return {
        goal,
        overdueMilestones,
        score:
          priorityWeight[goal.priority || "Medium"] * 100 +
          overdueMilestones * 60 +
          (goal.status === "Blocked" ? 40 : 0) +
          deadlineScore,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.goal.updatedAt.localeCompare(left.goal.updatedAt)
    );
}

export function getGoalProvenanceLabel(goal: Goal, fieldName: string) {
  const fieldSource = goal.fieldSources?.find(
    (source) => source.fieldName === fieldName
  );
  return fieldSource?.sourceLabel || goal.sourceLabel || "Member";
}
