import type { PlatformModule } from "./types";

export type TodayContributionSource =
  | PlatformModule
  | "calendar"
  | "notifications"
  | "goals"
  | "plans"
  | "beastos";

export type TodayContributionType =
  | "Required Action"
  | "Resume"
  | "Recommendation"
  | "Event"
  | "Notification"
  | "Goal Action"
  | "Plan Step"
  | "Information";

export type TodayContributionPriority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low";
export type TodayContributionStatus =
  | "Active"
  | "Completed"
  | "Dismissed"
  | "Blocked";
export type TodayContributionTiming =
  | "Overdue"
  | "Due Today"
  | "Active"
  | "Upcoming"
  | "Informational";

export type TodayContribution = {
  id: string;
  source: TodayContributionSource;
  type: TodayContributionType;
  title: string;
  summary: string;
  reason: string;
  recommendedAction: string;
  actionUrl: string;
  activeDate?: string;
  dueDate?: string;
  dueTime?: string;
  timing: TodayContributionTiming;
  priority: TodayContributionPriority;
  estimatedMinutes?: number;
  relatedGoalId?: string;
  relatedPlanId?: string;
  dismissible: boolean;
  status: TodayContributionStatus;
  sourceEvidenceIds: string[];
};

export type TodayContributionSummary = {
  total: number;
  active: number;
  completed: number;
  dismissed: number;
  critical: number;
  dueToday: number;
  overdue: number;
  sources: TodayContributionSource[];
};

export const todayContributionSources: TodayContributionSource[] = [
  "learning",
  "money",
  "calendar",
  "notifications",
  "goals",
  "plans",
  "beastos",
];

export const todayContributionTypes: TodayContributionType[] = [
  "Required Action",
  "Resume",
  "Recommendation",
  "Event",
  "Notification",
  "Goal Action",
  "Plan Step",
  "Information",
];

export const todayContributionPriorities: TodayContributionPriority[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
];

export const todayContributionStatuses: TodayContributionStatus[] = [
  "Active",
  "Completed",
  "Dismissed",
  "Blocked",
];

export const todayContributionTimings: TodayContributionTiming[] = [
  "Overdue",
  "Due Today",
  "Active",
  "Upcoming",
  "Informational",
];

export const todayContributionContractRules = [
  "BeastOS Today owns aggregation, ordering, de-duplication, display, empty states, completion routing, and permission filtering.",
  "Modules own source calculations such as bill cycles, cash-flow risk, learning mastery, review schedules, and readiness.",
  "Completion must route back to the owning module or service before BeastOS marks a contribution completed.",
  "Today contributions must carry source evidence so BeastOS does not invent tasks, progress, or placeholder work.",
];

const priorityRank: Record<TodayContributionPriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const timingRank: Record<TodayContributionTiming, number> = {
  Overdue: 0,
  "Due Today": 1,
  Active: 2,
  Upcoming: 3,
  Informational: 4,
};

export function buildTodayContribution(
  contribution: TodayContribution
): TodayContribution {
  if (!contribution.id.trim()) {
    throw new Error("Today contribution id is required.");
  }

  if (!todayContributionSources.includes(contribution.source)) {
    throw new Error(`Unsupported Today contribution source: ${contribution.source}`);
  }

  if (!todayContributionTypes.includes(contribution.type)) {
    throw new Error(`Unsupported Today contribution type: ${contribution.type}`);
  }

  if (!todayContributionTimings.includes(contribution.timing)) {
    throw new Error(`Unsupported Today contribution timing: ${contribution.timing}`);
  }

  if (!todayContributionPriorities.includes(contribution.priority)) {
    throw new Error(
      `Unsupported Today contribution priority: ${contribution.priority}`
    );
  }

  if (!todayContributionStatuses.includes(contribution.status)) {
    throw new Error(`Unsupported Today contribution status: ${contribution.status}`);
  }

  if (!contribution.title.trim()) {
    throw new Error("Today contribution title is required.");
  }

  if (!contribution.actionUrl.trim()) {
    throw new Error("Today contribution action URL is required.");
  }

  return {
    ...contribution,
    sourceEvidenceIds: [...contribution.sourceEvidenceIds],
  };
}

export function sortTodayContributions(
  contributions: TodayContribution[]
): TodayContribution[] {
  return contributions
    .map(buildTodayContribution)
    .sort((left, right) => {
      const timingDelta = timingRank[left.timing] - timingRank[right.timing];
      if (timingDelta !== 0) return timingDelta;

      const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
      if (priorityDelta !== 0) return priorityDelta;

      return (left.dueTime || "23:59").localeCompare(right.dueTime || "23:59");
    });
}

export function summarizeTodayContributions(
  contributions: TodayContribution[]
): TodayContributionSummary {
  const normalized = contributions.map(buildTodayContribution);
  const active = normalized.filter((item) => item.status === "Active");

  return {
    total: normalized.length,
    active: active.length,
    completed: normalized.filter((item) => item.status === "Completed").length,
    dismissed: normalized.filter((item) => item.status === "Dismissed").length,
    critical: active.filter((item) => item.priority === "Critical").length,
    dueToday: active.filter((item) => item.timing === "Due Today").length,
    overdue: active.filter((item) => item.timing === "Overdue").length,
    sources: Array.from(new Set(normalized.map((item) => item.source))).sort(),
  };
}

export function getTodayContributionEmptyState(
  contributions: TodayContribution[]
) {
  const summary = summarizeTodayContributions(contributions);

  return summary.active === 0
    ? "No urgent work is waiting in Today. Continue learning, review money, check Calendar, review Notifications, or confirm a Goal."
    : "";
}
