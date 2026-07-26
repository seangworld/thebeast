import {
  normalizeBeastAdminAIAnalytics,
  type BeastAdminAIAnalyticsSnapshot,
} from "./beastAdminAIAnalytics";
import {
  normalizeBeastAdminDevelopmentConsoleSnapshot,
  type BeastAdminDevelopmentConsoleSnapshot,
} from "./beastAdminDevelopmentConsole";
import {
  normalizeBeastAdminFeedbackItems,
  type BeastAdminFeedbackItem,
} from "./beastAdminFeedback";
import {
  normalizeBeastAdminMemberDirectory,
  type BeastAdminMemberDirectoryEntry,
} from "./beastAdminMemberTimeline";
import type { BeastAdminPlatformHealthSnapshot } from "./beastAdminPlatformHealth";
import {
  normalizeBeastFeatureFlags,
  type BeastFeatureFlag,
} from "./beastFeatureFlags";

export const beastAdminCEOSourceIds = [
  "roadmap",
  "releases",
  "feedback",
  "members",
  "betaTesting",
  "aiActivity",
  "aiRecommendations",
] as const;

export type BeastAdminCEOSourceId = (typeof beastAdminCEOSourceIds)[number];
export type BeastAdminCEOSourceState = "available" | "unavailable";

export type BeastAdminCEOAIRecommendation = {
  id: string;
  professionalName: string;
  recommendation: string;
  whySurfaced: string;
  createdAt: string;
};

export type BeastAdminCEOSourceSnapshot = {
  generatedAt: string;
  development: BeastAdminDevelopmentConsoleSnapshot;
  feedback: BeastAdminFeedbackItem[];
  members: BeastAdminMemberDirectoryEntry[];
  aiAnalytics: BeastAdminAIAnalyticsSnapshot | null;
  featureFlags: BeastFeatureFlag[];
  aiRecommendations: {
    state: BeastAdminCEOSourceState;
    detail: string;
    items: BeastAdminCEOAIRecommendation[];
  };
  sources: Record<BeastAdminCEOSourceId, BeastAdminCEOSourceState>;
};

export type BeastAdminCEOArea =
  | "Development"
  | "Feedback"
  | "Errors"
  | "Members"
  | "Beta testing"
  | "Releases"
  | "Roadmap"
  | "AI";

export type BeastAdminCEODailyItem = {
  id: string;
  area: BeastAdminCEOArea;
  title: string;
  detail: string;
  occurredAt: string;
  href: string;
};

export type BeastAdminCEOAction = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  area: BeastAdminCEOArea;
  title: string;
  why: string;
  href: string;
  actionLabel: string;
};

export type BeastAdminCEOModeSnapshot = {
  generatedAt: string;
  greeting: string;
  dateLabel: string;
  windowLabel: string;
  happenedYesterday: BeastAdminCEODailyItem[];
  changedOvernight: BeastAdminCEODailyItem[];
  needsAttention: BeastAdminCEOAction[];
  workNext: BeastAdminCEOAction[];
  summaries: {
    development: {
      currentSprint: number | null;
      openPrompts: number | null;
      completedPrompts: number | null;
      upcomingWork: number | null;
    };
    feedback: {
      total: number | null;
      new: number | null;
      open: number | null;
      changedYesterday: number | null;
    };
    errors: {
      status: BeastAdminPlatformHealthSnapshot["overallStatus"] | "unavailable";
      errors: number | null;
      warnings: number | null;
    };
    members: {
      total: number | null;
      newYesterday: number | null;
      activeOvernight: number | null;
    };
    betaTesting: {
      flags: number | null;
      assignments: number | null;
      activeAssignments: number | null;
    };
    releases: {
      total: number | null;
      releasedYesterday: number | null;
      latestLabel: string;
    };
    roadmap: {
      planned: number | null;
      inProgress: number | null;
      testing: number | null;
      released: number | null;
    };
    aiRecommendations: BeastAdminCEOSourceSnapshot["aiRecommendations"];
    aiActivity: {
      conversations: number | null;
      abandoned: number | null;
      yesterday: number | null;
    };
  };
  sources: Record<BeastAdminCEOSourceId | "platformHealth", BeastAdminCEOSourceState>;
  sourceGaps: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function normalizeSourceStates(
  value: unknown
): Record<BeastAdminCEOSourceId, BeastAdminCEOSourceState> | null {
  if (!isRecord(value)) return null;
  const entries = beastAdminCEOSourceIds.map((sourceId) => [
    sourceId,
    value[sourceId],
  ] as const);
  if (
    entries.some(
      ([, state]) => state !== "available" && state !== "unavailable"
    )
  ) {
    return null;
  }
  return Object.fromEntries(entries) as Record<
    BeastAdminCEOSourceId,
    BeastAdminCEOSourceState
  >;
}

function normalizeAIRecommendations(
  value: unknown
): BeastAdminCEOSourceSnapshot["aiRecommendations"] | null {
  if (
    !isRecord(value) ||
    (value.state !== "available" && value.state !== "unavailable") ||
    typeof value.detail !== "string" ||
    !Array.isArray(value.items)
  ) {
    return null;
  }
  const items = value.items.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.professionalName !== "string" ||
      typeof item.recommendation !== "string" ||
      !item.recommendation.trim() ||
      typeof item.whySurfaced !== "string" ||
      !item.whySurfaced.trim() ||
      !isTimestamp(item.createdAt)
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        professionalName: item.professionalName,
        recommendation: item.recommendation,
        whySurfaced: item.whySurfaced,
        createdAt: item.createdAt,
      },
    ];
  });
  if (items.length !== value.items.length) return null;
  if (value.state === "unavailable" && items.length) return null;
  return {
    state: value.state,
    detail: value.detail,
    items,
  };
}

export function normalizeBeastAdminCEOSourceSnapshot(
  value: unknown
): BeastAdminCEOSourceSnapshot | null {
  if (!isRecord(value) || !isTimestamp(value.generatedAt)) return null;
  const development = normalizeBeastAdminDevelopmentConsoleSnapshot(
    value.development
  );
  const feedback = normalizeBeastAdminFeedbackItems(value.feedback);
  const members = normalizeBeastAdminMemberDirectory(value.members);
  const featureFlags = normalizeBeastFeatureFlags(value.featureFlags);
  const aiAnalytics =
    value.aiAnalytics === null
      ? null
      : normalizeBeastAdminAIAnalytics(value.aiAnalytics);
  const aiRecommendations = normalizeAIRecommendations(
    value.aiRecommendations
  );
  const sources = normalizeSourceStates(value.sources);
  if (
    !development ||
    !feedback ||
    !members ||
    !featureFlags ||
    (value.aiAnalytics !== null && !aiAnalytics) ||
    !aiRecommendations ||
    !sources
  ) {
    return null;
  }
  return {
    generatedAt: value.generatedAt,
    development,
    feedback,
    members,
    aiAnalytics,
    featureFlags,
    aiRecommendations,
    sources,
  };
}

const operationalTimeZone = "America/New_York";

function zonedParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: operationalTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: "year" | "month" | "day" | "hour" | "minute") =>
    parts.find((entry) => entry.type === type)?.value || "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function previousDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isYesterday(timestamp: string, yesterdayKey: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    return timestamp === yesterdayKey;
  }
  return zonedParts(new Date(timestamp)).date === yesterdayKey;
}

function isOvernight(
  timestamp: string,
  yesterdayKey: string,
  todayKey: string,
  currentMinutes: number
) {
  if (!isTimestamp(timestamp)) return false;
  const parts = zonedParts(new Date(timestamp));
  const overnightEnd = Math.min(currentMinutes, 8 * 60);
  return (
    (parts.date === yesterdayKey && parts.minutes >= 18 * 60) ||
    (parts.date === todayKey && parts.minutes <= overnightEnd)
  );
}

function uniqueDevelopmentPrompts(
  development: BeastAdminDevelopmentConsoleSnapshot
) {
  return Array.from(
    new Map(
      [...development.openPrompts, ...development.completedPrompts].map(
        (prompt) => [prompt.id, prompt]
      )
    ).values()
  );
}

function sortDaily(items: BeastAdminCEODailyItem[]) {
  return items.sort(
    (left, right) =>
      right.occurredAt.localeCompare(left.occurredAt) ||
      left.title.localeCompare(right.title)
  );
}

function sourceGapLabel(sourceId: BeastAdminCEOSourceId) {
  const labels: Record<BeastAdminCEOSourceId, string> = {
    roadmap: "Roadmap",
    releases: "Release Center",
    feedback: "Beta Feedback",
    members: "Member directory",
    betaTesting: "Feature Flags",
    aiActivity: "AI Analytics",
    aiRecommendations: "AI recommendation feed",
  };
  return labels[sourceId];
}

export function buildBeastAdminCEOModeSnapshot({
  source,
  platformHealth,
  platformHealthAvailable,
  now = new Date(source.generatedAt),
}: {
  source: BeastAdminCEOSourceSnapshot;
  platformHealth: BeastAdminPlatformHealthSnapshot | null;
  platformHealthAvailable: boolean;
  now?: Date;
}): BeastAdminCEOModeSnapshot {
  const nowParts = zonedParts(now);
  const yesterdayKey = previousDateKey(nowParts.date);
  const prompts = uniqueDevelopmentPrompts(source.development);
  const happenedYesterday: BeastAdminCEODailyItem[] = [];
  const changedOvernight: BeastAdminCEODailyItem[] = [];

  for (const prompt of prompts) {
    const item: BeastAdminCEODailyItem = {
      id: `roadmap-${prompt.id}`,
      area: "Roadmap",
      title: `${prompt.productLabel}: ${prompt.title}`,
      detail: `Roadmap status: ${prompt.statusLabel}.`,
      occurredAt: prompt.updatedAt,
      href: "/dashboard/admin/roadmap",
    };
    if (isYesterday(prompt.updatedAt, yesterdayKey)) happenedYesterday.push(item);
    if (
      isOvernight(
        prompt.updatedAt,
        yesterdayKey,
        nowParts.date,
        nowParts.minutes
      )
    ) {
      changedOvernight.push(item);
    }
  }

  for (const item of source.feedback) {
    const event: BeastAdminCEODailyItem = {
      id: `feedback-${item.id}`,
      area: "Feedback",
      title:
        item.submittedAt === item.updatedAt
          ? `Feedback received from ${item.memberName}`
          : `Feedback moved to ${item.status}`,
      detail: item.message,
      occurredAt: item.updatedAt,
      href: "/dashboard/admin/feedback",
    };
    if (isYesterday(item.updatedAt, yesterdayKey)) happenedYesterday.push(event);
    if (
      isOvernight(
        item.updatedAt,
        yesterdayKey,
        nowParts.date,
        nowParts.minutes
      )
    ) {
      changedOvernight.push(event);
    }
  }

  for (const member of source.members) {
    if (isYesterday(member.registeredAt, yesterdayKey)) {
      happenedYesterday.push({
        id: `member-registered-${member.id}`,
        area: "Members",
        title: `${member.displayName} registered`,
        detail: "A new authenticated Beast member profile was created.",
        occurredAt: member.registeredAt,
        href: "/dashboard/admin/members",
      });
    }
    if (
      member.lastActivityAt &&
      isOvernight(
        member.lastActivityAt,
        yesterdayKey,
        nowParts.date,
        nowParts.minutes
      )
    ) {
      changedOvernight.push({
        id: `member-activity-${member.id}`,
        area: "Members",
        title: `${member.displayName} had recorded activity`,
        detail: `${member.eventCount} permissioned journey events are currently indexed.`,
        occurredAt: member.lastActivityAt,
        href: "/dashboard/admin/members",
      });
    }
  }

  for (const release of source.development.recentlyReleased) {
    if (!isYesterday(release.releaseDate, yesterdayKey)) continue;
    happenedYesterday.push({
      id: `release-${release.id}`,
      area: "Releases",
      title: `${release.productLabel} v${release.version} released`,
      detail: `${release.validationLabel} · ${release.deploymentLabel}`,
      occurredAt: `${release.releaseDate}T12:00:00.000Z`,
      href: "/dashboard/admin/releases",
    });
  }

  const assignments = source.featureFlags.flatMap((flag) =>
    flag.assignments.map((assignment) => ({ flag, assignment }))
  );
  for (const { flag, assignment } of assignments) {
    const item: BeastAdminCEODailyItem = {
      id: `beta-${assignment.id}`,
      area: "Beta testing",
      title: `${flag.name}: ${assignment.stage}`,
      detail: `A ${assignment.scopeType} feature assignment changed.`,
      occurredAt: assignment.updatedAt,
      href: "/dashboard/admin/flags",
    };
    if (isYesterday(assignment.updatedAt, yesterdayKey)) {
      happenedYesterday.push(item);
    }
    if (
      isOvernight(
        assignment.updatedAt,
        yesterdayKey,
        nowParts.date,
        nowParts.minutes
      )
    ) {
      changedOvernight.push(item);
    }
  }

  const yesterdayAIConversations =
    source.aiAnalytics?.dailyActivity.find(
      (activity) => activity.date === yesterdayKey
    )?.conversationCount ?? null;
  if (yesterdayAIConversations && yesterdayAIConversations > 0) {
    happenedYesterday.push({
      id: `ai-activity-${yesterdayKey}`,
      area: "AI",
      title: `${yesterdayAIConversations} professional conversation${
        yesterdayAIConversations === 1 ? "" : "s"
      } started`,
      detail: "Privacy-bounded AI Analytics recorded conversation activity.",
      occurredAt: `${yesterdayKey}T12:00:00.000Z`,
      href: "/dashboard/admin/analytics",
    });
  }

  const needsAttention: BeastAdminCEOAction[] = [];
  for (const issue of platformHealth?.errors || []) {
    needsAttention.push({
      id: `health-error-${issue.serviceId}`,
      priority: "critical",
      area: "Errors",
      title: `${issue.serviceLabel}: ${issue.message}`,
      why: "A current live or configured platform-health signal is critical.",
      href: "/dashboard/admin/health",
      actionLabel: "Investigate",
    });
  }
  for (const issue of platformHealth?.warnings || []) {
    needsAttention.push({
      id: `health-warning-${issue.serviceId}`,
      priority: "high",
      area: "Errors",
      title: `${issue.serviceLabel}: ${issue.message}`,
      why: "The service is warning or lacks a connected monitoring source.",
      href: "/dashboard/admin/health",
      actionLabel: "Review health",
    });
  }

  const newFeedback = source.feedback.filter((item) => item.status === "New");
  if (source.sources.feedback === "available" && newFeedback.length) {
    needsAttention.push({
      id: "new-feedback",
      priority: "high",
      area: "Feedback",
      title: `${newFeedback.length} new feedback item${
        newFeedback.length === 1 ? "" : "s"
      }`,
      why: "New member feedback has not been acknowledged.",
      href: "/dashboard/admin/feedback",
      actionLabel: "Review feedback",
    });
  }

  if (
    source.sources.aiActivity === "available" &&
    source.aiAnalytics &&
    source.aiAnalytics.abandonedCount > 0
  ) {
    needsAttention.push({
      id: "abandoned-conversations",
      priority: "medium",
      area: "AI",
      title: `${source.aiAnalytics.abandonedCount} potentially abandoned conversation${
        source.aiAnalytics.abandonedCount === 1 ? "" : "s"
      }`,
      why: "Persisted conversation evidence shows a member message without a timely professional response.",
      href: "/dashboard/admin/analytics",
      actionLabel: "Inspect AI activity",
    });
  }

  const failedReleases = source.development.recentlyReleased.filter(
    (release) =>
      /failed|rolled back/i.test(
        `${release.validationLabel} ${release.deploymentLabel}`
      )
  );
  for (const release of failedReleases) {
    needsAttention.push({
      id: `failed-release-${release.id}`,
      priority: "critical",
      area: "Releases",
      title: `${release.productLabel} v${release.version}: ${release.deploymentLabel}`,
      why: "Release Center recorded a failed validation, deployment, or rollback state.",
      href: "/dashboard/admin/releases",
      actionLabel: "Open release",
    });
  }

  for (const sourceId of beastAdminCEOSourceIds) {
    if (source.sources[sourceId] === "available") continue;
    needsAttention.push({
      id: `source-${sourceId}`,
      priority: sourceId === "aiRecommendations" ? "low" : "medium",
      area: sourceId.startsWith("ai") ? "AI" : "Development",
      title: `${sourceGapLabel(sourceId)} is unavailable`,
      why:
        sourceId === "aiRecommendations"
          ? source.aiRecommendations.detail
          : "CEO Mode cannot verify this part of the daily operating picture.",
      href:
        sourceId === "aiActivity"
          ? "/dashboard/admin/analytics"
          : sourceId === "feedback"
            ? "/dashboard/admin/feedback"
            : sourceId === "members"
              ? "/dashboard/admin/members"
              : sourceId === "betaTesting"
                ? "/dashboard/admin/flags"
                : "/dashboard/admin/development",
      actionLabel: "Review source",
    });
  }
  if (!platformHealthAvailable) {
    needsAttention.push({
      id: "source-platform-health",
      priority: "high",
      area: "Errors",
      title: "Platform Health is unavailable",
      why: "Current service errors and warnings could not be verified.",
      href: "/dashboard/admin/health",
      actionLabel: "Open health",
    });
  }

  const workNext: BeastAdminCEOAction[] = [];
  const critical = needsAttention.find((item) => item.priority === "critical");
  if (critical) workNext.push(critical);
  if (newFeedback.length) {
    workNext.push({
      id: "next-feedback",
      priority: "high",
      area: "Feedback",
      title: `Triage ${newFeedback.length} new feedback item${
        newFeedback.length === 1 ? "" : "s"
      }`,
      why: "Closing the feedback loop gives member evidence a clear product outcome.",
      href: "/dashboard/admin/feedback",
      actionLabel: "Start triage",
    });
  }
  const testingPrompt = source.development.currentSprint.find(
    (prompt) => prompt.status === "testing"
  );
  if (testingPrompt) {
    workNext.push({
      id: `next-testing-${testingPrompt.id}`,
      priority: "high",
      area: "Development",
      title: `Validate ${testingPrompt.title}`,
      why: "This roadmap item is already in Testing and is closest to release.",
      href: "/dashboard/admin/development",
      actionLabel: "Open console",
    });
  }
  const activePrompt = source.development.currentSprint.find(
    (prompt) => prompt.status === "in_progress"
  );
  if (activePrompt) {
    workNext.push({
      id: `next-active-${activePrompt.id}`,
      priority: "medium",
      area: "Development",
      title: `Continue ${activePrompt.title}`,
      why: "This is the most recently updated in-progress roadmap item.",
      href: "/dashboard/admin/development",
      actionLabel: "Continue work",
    });
  }
  if (!workNext.length && source.development.upcomingWork[0]) {
    const upcoming = source.development.upcomingWork[0];
    workNext.push({
      id: `next-planned-${upcoming.id}`,
      priority: "medium",
      area: "Roadmap",
      title: `Start ${upcoming.title}`,
      why: "No testing or in-progress item is ahead of this planned work.",
      href: "/dashboard/admin/roadmap",
      actionLabel: "Open roadmap",
    });
  }
  if (!workNext.length && needsAttention[0]) workNext.push(needsAttention[0]);

  const roadmapCounts = prompts.reduce(
    (counts, prompt) => {
      if (prompt.status === "planned") counts.planned += 1;
      if (prompt.status === "in_progress") counts.inProgress += 1;
      if (prompt.status === "testing") counts.testing += 1;
      if (prompt.status === "released") counts.released += 1;
      return counts;
    },
    { planned: 0, inProgress: 0, testing: 0, released: 0 }
  );
  const openFeedback = source.feedback.filter(
    (item) => !["Released", "Declined"].includes(item.status)
  );
  const releasedYesterday = source.development.recentlyReleased.filter(
    (release) => isYesterday(release.releaseDate, yesterdayKey)
  ).length;
  const activeBetaAssignments = assignments.filter(({ assignment }) =>
    ["internal_testing", "beta"].includes(assignment.stage)
  ).length;
  const sourceGaps = needsAttention
    .filter((item) => item.id.startsWith("source-"))
    .map((item) => item.title);

  return {
    generatedAt: source.generatedAt,
    greeting:
      nowParts.minutes < 12 * 60
        ? "Good morning"
        : nowParts.minutes < 17 * 60
          ? "Good afternoon"
          : "Good evening",
    dateLabel: new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeZone: operationalTimeZone,
    }).format(now),
    windowLabel:
      "Yesterday is the prior calendar day. Overnight is 6:00 PM yesterday through 8:00 AM today, America/New_York.",
    happenedYesterday: sortDaily(happenedYesterday).slice(0, 12),
    changedOvernight: sortDaily(changedOvernight).slice(0, 12),
    needsAttention: needsAttention
      .sort(
        (left, right) =>
          ["critical", "high", "medium", "low"].indexOf(left.priority) -
            ["critical", "high", "medium", "low"].indexOf(right.priority) ||
          left.title.localeCompare(right.title)
      )
      .slice(0, 12),
    workNext: workNext
      .filter(
        (item, index, all) =>
          all.findIndex((candidate) => candidate.id === item.id) === index
      )
      .slice(0, 4),
    summaries: {
      development: {
        currentSprint:
          source.sources.roadmap === "available"
            ? source.development.currentSprint.length
            : null,
        openPrompts:
          source.sources.roadmap === "available"
            ? source.development.openPrompts.length
            : null,
        completedPrompts:
          source.sources.roadmap === "available"
            ? source.development.completedPrompts.length
            : null,
        upcomingWork:
          source.sources.roadmap === "available"
            ? source.development.upcomingWork.length
            : null,
      },
      feedback: {
        total:
          source.sources.feedback === "available"
            ? source.feedback.length
            : null,
        new:
          source.sources.feedback === "available" ? newFeedback.length : null,
        open:
          source.sources.feedback === "available" ? openFeedback.length : null,
        changedYesterday:
          source.sources.feedback === "available"
            ? source.feedback.filter((item) =>
                isYesterday(item.updatedAt, yesterdayKey)
              ).length
            : null,
      },
      errors: {
        status: platformHealthAvailable
          ? platformHealth?.overallStatus || "unavailable"
          : "unavailable",
        errors: platformHealthAvailable
          ? platformHealth?.errors.length ?? null
          : null,
        warnings: platformHealthAvailable
          ? platformHealth?.warnings.length ?? null
          : null,
      },
      members: {
        total:
          source.sources.members === "available" ? source.members.length : null,
        newYesterday:
          source.sources.members === "available"
            ? source.members.filter((member) =>
                isYesterday(member.registeredAt, yesterdayKey)
              ).length
            : null,
        activeOvernight:
          source.sources.members === "available"
            ? source.members.filter((member) =>
                member.lastActivityAt
                  ? isOvernight(
                      member.lastActivityAt,
                      yesterdayKey,
                      nowParts.date,
                      nowParts.minutes
                    )
                  : false
              ).length
            : null,
      },
      betaTesting: {
        flags:
          source.sources.betaTesting === "available"
            ? source.featureFlags.length
            : null,
        assignments:
          source.sources.betaTesting === "available"
            ? assignments.length
            : null,
        activeAssignments:
          source.sources.betaTesting === "available"
            ? activeBetaAssignments
            : null,
      },
      releases: {
        total:
          source.sources.releases === "available"
            ? source.development.versionHistory.length
            : null,
        releasedYesterday:
          source.sources.releases === "available" ? releasedYesterday : null,
        latestLabel: source.development.recentlyReleased[0]
          ? `${source.development.recentlyReleased[0].productLabel} v${source.development.recentlyReleased[0].version}`
          : source.sources.releases === "available"
            ? "No releases recorded"
            : "Unavailable",
      },
      roadmap:
        source.sources.roadmap === "available"
          ? roadmapCounts
          : {
              planned: null,
              inProgress: null,
              testing: null,
              released: null,
            },
      aiRecommendations: source.aiRecommendations,
      aiActivity: {
        conversations:
          source.sources.aiActivity === "available"
            ? source.aiAnalytics?.conversationCount ?? 0
            : null,
        abandoned:
          source.sources.aiActivity === "available"
            ? source.aiAnalytics?.abandonedCount ?? 0
            : null,
        yesterday:
          source.sources.aiActivity === "available"
            ? yesterdayAIConversations ?? 0
            : null,
      },
    },
    sources: {
      ...source.sources,
      platformHealth: platformHealthAvailable ? "available" : "unavailable",
    },
    sourceGaps,
  };
}
