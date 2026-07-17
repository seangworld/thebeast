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
  importance?: number;
  urgency?: number;
  preferenceWeight?: number;
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

export type TodayPriorityScore = {
  contributionId: string;
  urgency: number;
  importance: number;
  effort: number;
  preference: number;
  score: number;
  explanation: string;
};

export type TodayItemActionType =
  | "Dismiss"
  | "Snooze"
  | "Complete"
  | "Reschedule";

export type TodayItemActionRequest = {
  id: string;
  contributionId: string;
  source: TodayContributionSource;
  action: TodayItemActionType;
  requestedAt: string;
  sourceEvidenceIds: string[];
  dispatchMode: "module-contract-event";
  reason: string;
  snoozedUntil?: string;
  rescheduledFor?: string;
};

export type TodayItemActionAvailability = Record<TodayItemActionType, boolean>;

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
  "Dismiss, snooze, complete, and reschedule requests must dispatch through the owning module or service contract instead of mutating source records directly.",
];

export const todayItemActionTypes: TodayItemActionType[] = [
  "Dismiss",
  "Snooze",
  "Complete",
  "Reschedule",
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

function clampScore(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(10, Math.round(value)));
}

function defaultUrgency(timing: TodayContributionTiming) {
  if (timing === "Overdue") return 10;
  if (timing === "Due Today") return 8;
  if (timing === "Active") return 6;
  if (timing === "Upcoming") return 3;
  return 1;
}

function defaultImportance(priority: TodayContributionPriority) {
  if (priority === "Critical") return 10;
  if (priority === "High") return 8;
  if (priority === "Medium") return 5;
  return 2;
}

function effortScore(minutes?: number) {
  if (typeof minutes !== "number" || Number.isNaN(minutes)) return 5;
  if (minutes <= 10) return 10;
  if (minutes <= 30) return 7;
  if (minutes <= 60) return 4;
  return 2;
}

function parseIsoTimestamp(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`Today item action ${label} timestamp is required.`);
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Today item action ${label} timestamp must be valid.`);
  }

  return parsed;
}

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

export function getTodayItemActionAvailability(
  contribution: TodayContribution
): TodayItemActionAvailability {
  const normalized = buildTodayContribution(contribution);
  const isActive = normalized.status === "Active";
  const hasSourceEvidence = normalized.sourceEvidenceIds.length > 0;
  const canRouteAction = isActive && hasSourceEvidence;

  return {
    Dismiss: canRouteAction && normalized.dismissible,
    Snooze: canRouteAction,
    Complete: canRouteAction,
    Reschedule: canRouteAction,
  };
}

export function buildTodayItemActionRequest({
  contribution,
  action,
  requestedAt,
  reason,
  snoozedUntil,
  rescheduledFor,
}: {
  contribution: TodayContribution;
  action: TodayItemActionType;
  requestedAt: string;
  reason: string;
  snoozedUntil?: string;
  rescheduledFor?: string;
}): TodayItemActionRequest {
  const normalized = buildTodayContribution(contribution);

  if (!todayItemActionTypes.includes(action)) {
    throw new Error(`Unsupported Today item action: ${action}`);
  }

  if (!reason.trim()) {
    throw new Error("Today item action reason is required.");
  }

  const requestedAtTime = parseIsoTimestamp(requestedAt, "requestedAt");

  if (action === "Snooze" && !snoozedUntil) {
    throw new Error("Snooze actions require a snoozedUntil timestamp.");
  }

  if (action === "Reschedule" && !rescheduledFor) {
    throw new Error("Reschedule actions require a rescheduledFor timestamp.");
  }

  const snoozedUntilTime =
    action === "Snooze" && snoozedUntil
      ? parseIsoTimestamp(snoozedUntil, "snoozedUntil")
      : null;
  const rescheduledForTime =
    action === "Reschedule" && rescheduledFor
      ? parseIsoTimestamp(rescheduledFor, "rescheduledFor")
      : null;

  if (snoozedUntilTime !== null && snoozedUntilTime <= requestedAtTime) {
    throw new Error("Snooze actions require a future snoozedUntil timestamp.");
  }

  if (rescheduledForTime !== null && rescheduledForTime <= requestedAtTime) {
    throw new Error("Reschedule actions require a future rescheduledFor timestamp.");
  }

  const availability = getTodayItemActionAvailability(normalized);
  if (!availability[action]) {
    throw new Error(`${action} is not available for this Today contribution.`);
  }

  return {
    id: `${normalized.id}:${action.toLowerCase()}:${requestedAt}`,
    contributionId: normalized.id,
    source: normalized.source,
    action,
    requestedAt,
    sourceEvidenceIds: [...normalized.sourceEvidenceIds],
    dispatchMode: "module-contract-event",
    reason,
    snoozedUntil: action === "Snooze" ? snoozedUntil : undefined,
    rescheduledFor: action === "Reschedule" ? rescheduledFor : undefined,
  };
}

export function sortTodayContributions(
  contributions: TodayContribution[]
): TodayContribution[] {
  return contributions
    .map(buildTodayContribution)
    .sort((left, right) => {
      const scoreDelta =
        getTodayPriorityScore(right).score - getTodayPriorityScore(left).score;
      if (scoreDelta !== 0) return scoreDelta;

      const timingDelta = timingRank[left.timing] - timingRank[right.timing];
      if (timingDelta !== 0) return timingDelta;

      const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
      if (priorityDelta !== 0) return priorityDelta;

      return (left.dueTime || "23:59").localeCompare(right.dueTime || "23:59");
    });
}

export function getTodayPriorityScore(
  contribution: TodayContribution
): TodayPriorityScore {
  const normalized = buildTodayContribution(contribution);
  const urgency = clampScore(
    normalized.urgency,
    defaultUrgency(normalized.timing)
  );
  const importance = clampScore(
    normalized.importance,
    defaultImportance(normalized.priority)
  );
  const effort = effortScore(normalized.estimatedMinutes);
  const preference = clampScore(normalized.preferenceWeight, 5);
  const score = Math.round(
    urgency * 0.35 + importance * 0.35 + effort * 0.15 + preference * 0.15
  );

  return {
    contributionId: normalized.id,
    urgency,
    importance,
    effort,
    preference,
    score,
    explanation: `${normalized.title} ranks from urgency ${urgency}, importance ${importance}, effort ${effort}, and preference ${preference}.`,
  };
}

export function getRankedTodayContributions(
  contributions: TodayContribution[]
) {
  return sortTodayContributions(contributions).map((contribution, index) => ({
    rank: index + 1,
    contribution,
    priorityScore: getTodayPriorityScore(contribution),
  }));
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
