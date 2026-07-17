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

export type TodayContributionExplanation = {
  contributionId: string;
  source: TodayContributionSource;
  title: string;
  sourceReason: string;
  timingReason: string;
  priorityReason: string;
  actionReason: string;
  evidenceReason: string;
  scoreExplanation: string;
  displayReason: string;
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

export type TodayDayState =
  | "Empty"
  | "Active"
  | "Completed Day"
  | "Tomorrow Preview";

export type TodayOutlookItem = {
  label: string;
  contributionIds: string[];
  total: number;
  active: number;
};

export type TodayDayPlan = {
  state: TodayDayState;
  headline: string;
  summary: string;
  active: TodayContribution[];
  completed: TodayContribution[];
  tomorrow: TodayContribution[];
  weeklyOutlook: TodayOutlookItem[];
};

export type ManualTodayItemInput = {
  id: string;
  title: string;
  summary?: string;
  reason?: string;
  activeDate: string;
  priority?: TodayContributionPriority;
  estimatedMinutes?: number;
  relatedGoalId?: string;
  relatedPlanId?: string;
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
  "Dismiss, snooze, complete, and reschedule requests must dispatch through the owning module or service contract instead of mutating source records directly.",
  "Explain why shown must combine the source-owned reason with BeastOS ranking signals without recalculating source module readiness.",
  "Manual Today items are BeastOS-owned plan steps and must coexist with sourced module contributions without mutating module records.",
  "Completed-day, tomorrow, and weekly outlook states are display states only; source modules remain responsible for their own schedules and completion logic.",
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

function timingExplanation(timing: TodayContributionTiming) {
  if (timing === "Overdue") return "The source marked this item overdue.";
  if (timing === "Due Today") return "The source marked this item due today.";
  if (timing === "Active") return "The source marked this item active now.";
  if (timing === "Upcoming") return "The source marked this item upcoming.";
  return "The source marked this item informational.";
}

function priorityExplanation(priority: TodayContributionPriority) {
  if (priority === "Critical") return "The source marked this item critical.";
  if (priority === "High") return "The source marked this item high priority.";
  if (priority === "Medium") return "The source marked this item medium priority.";
  return "The source marked this item low priority.";
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

function parseDateOnly(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Today ${label} must use YYYY-MM-DD format.`);
  }

  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) {
    throw new Error(`Today ${label} must be a valid date.`);
  }

  return value;
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${parseDateOnly(date, "date")}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function dateForContribution(contribution: TodayContribution) {
  return contribution.dueDate || contribution.activeDate || "";
}

function dayLabel(today: string, date: string) {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return date;
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

  if (!contribution.reason.trim()) {
    throw new Error("Today contribution reason is required.");
  }

  return {
    ...contribution,
    reason: contribution.reason.trim(),
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

export function getTodayContributionExplanation(
  contribution: TodayContribution
): TodayContributionExplanation {
  const normalized = buildTodayContribution(contribution);
  const priorityScore = getTodayPriorityScore(normalized);
  const evidenceCount = normalized.sourceEvidenceIds.length;
  const evidenceReason =
    evidenceCount > 0
      ? `${normalized.source} supplied ${evidenceCount} source evidence item${evidenceCount === 1 ? "" : "s"}.`
      : `${normalized.source} did not supply source evidence, so Today can explain it but cannot route item actions.`;

  return {
    contributionId: normalized.id,
    source: normalized.source,
    title: normalized.title,
    sourceReason: normalized.reason,
    timingReason: timingExplanation(normalized.timing),
    priorityReason: priorityExplanation(normalized.priority),
    actionReason: `Today recommends: ${normalized.recommendedAction}.`,
    evidenceReason,
    scoreExplanation: priorityScore.explanation,
    displayReason: `${normalized.reason} ${timingExplanation(
      normalized.timing
    )} ${priorityScore.explanation}`,
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

export function buildManualTodayContribution(
  input: ManualTodayItemInput
): TodayContribution {
  const activeDate = parseDateOnly(input.activeDate, "manual item activeDate");
  const title = input.title.trim();

  if (!input.id.trim()) {
    throw new Error("Manual Today item id is required.");
  }

  if (!title) {
    throw new Error("Manual Today item title is required.");
  }

  return buildTodayContribution({
    id: input.id,
    source: "beastos",
    type: "Plan Step",
    title,
    summary: input.summary?.trim() || "Manually added to today's plan.",
    reason:
      input.reason?.trim() ||
      "The user manually added this BeastOS-owned Today item.",
    recommendedAction: "Work on manual item",
    actionUrl: "/dashboard/today",
    activeDate,
    timing: "Active",
    priority: input.priority || "Medium",
    estimatedMinutes: input.estimatedMinutes,
    relatedGoalId: input.relatedGoalId,
    relatedPlanId: input.relatedPlanId,
    dismissible: true,
    status: "Active",
    sourceEvidenceIds: [`manual:${input.id}`],
  });
}

export function assembleTodayDayPlan({
  contributions,
  today,
}: {
  contributions: TodayContribution[];
  today: string;
}): TodayDayPlan {
  const todayDate = parseDateOnly(today, "plan date");
  const tomorrowDate = addDays(todayDate, 1);
  const normalized = contributions.map(buildTodayContribution);
  const todaysItems = normalized.filter(
    (item) => dateForContribution(item) === todayDate || item.timing === "Overdue"
  );
  const active = sortTodayContributions(
    todaysItems.filter((item) => item.status === "Active")
  );
  const completed = sortTodayContributions(
    todaysItems.filter((item) => item.status === "Completed")
  );
  const tomorrow = sortTodayContributions(
    normalized.filter(
      (item) => dateForContribution(item) === tomorrowDate && item.status === "Active"
    )
  );
  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDays(todayDate, index)
  );
  const weeklyOutlook = weekDates.map((date) => {
    const dayItems = normalized.filter((item) => dateForContribution(item) === date);
    return {
      label: dayLabel(todayDate, date),
      contributionIds: dayItems.map((item) => item.id),
      total: dayItems.length,
      active: dayItems.filter((item) => item.status === "Active").length,
    };
  });
  const state: TodayDayState =
    active.length > 0
      ? "Active"
      : completed.length > 0
        ? "Completed Day"
        : tomorrow.length > 0
          ? "Tomorrow Preview"
          : "Empty";
  const headline =
    state === "Active"
      ? `${active.length} item${active.length === 1 ? "" : "s"} ready today`
      : state === "Completed Day"
        ? "Today is complete"
        : state === "Tomorrow Preview"
          ? "Nothing left today. Tomorrow is ready."
          : "No urgent work is waiting in Today";

  return {
    state,
    headline,
    summary:
      state === "Active"
        ? "Focus on the highest-ranked item first, then continue through the daily plan."
        : state === "Completed Day"
          ? "All scheduled Today items are complete. You can review tomorrow or add a manual item."
          : state === "Tomorrow Preview"
            ? "Today has no active items, so BeastOS is previewing tomorrow's plan."
            : getTodayContributionEmptyState(normalized),
    active,
    completed,
    tomorrow,
    weeklyOutlook,
  };
}
