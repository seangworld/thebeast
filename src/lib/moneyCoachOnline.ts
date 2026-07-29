import type { MoneyCoachExperienceModel } from "./moneyCoachExperience";
import type {
  AgentConversationThread,
  ExecutionOutcomeRecord,
  ExecutionRecommendationRecord,
  ProfessionalExecutionHistory,
} from "./platform/agents";

export const moneyCoachProfessionalId = "beastmoney.money-coach";

export type MoneyCoachRecommendation = {
  sourceInsightId: string;
  title: string;
  recommendation: string;
  whyItExists: string;
  whyItMatters: string;
  href: string;
  confidence: {
    label: "low" | "medium" | "high";
    score: number;
    basis: string;
  };
  limitations: readonly string[];
  supportingEvidence: readonly {
    label: string;
    value: string | number | boolean | null;
    source?: string;
  }[];
  lifecycle?: ExecutionRecommendationRecord;
};

export type MoneyCoachNotification = {
  id: string;
  title: string;
  detail: string;
  kind: "attention" | "change" | "progress";
  href?: string;
};

export type MoneyCoachOutcomeLearning = {
  id: string;
  recommendationTitle: string;
  status: ExecutionOutcomeRecord["outcomeStatus"];
  learning: readonly string[];
  recordedAt: string;
};

export type MoneyCoachSessionBriefing = {
  visit: {
    firstVisit: boolean;
    lastReviewAt?: string;
    timeSinceLastReview: string;
  };
  summary: string;
  changes: readonly {
    id: string;
    title: string;
    detail: string;
    href?: string;
  }[];
  upcomingEvents: readonly {
    id: string;
    title: string;
    detail: string;
    href?: string;
  }[];
  completedMilestones: readonly {
    id: string;
    title: string;
    detail: string;
  }[];
  historicalRecommendations: readonly {
    id: string;
    title: string;
    status: ExecutionRecommendationRecord["status"];
    updatedAt: string;
  }[];
  completedOutcomes: readonly {
    id: string;
    title: string;
    detail: string;
    recordedAt: string;
  }[];
  continuity: readonly string[];
  recommendedFocus: {
    title: string;
    detail: string;
    href: string;
  };
  sources: readonly string[];
};

function evidenceSourceId(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const source = value as { sourceInsightId?: unknown };
  return typeof source.sourceInsightId === "string"
    ? source.sourceInsightId
    : "";
}

function validTimestamp(value?: string | null) {
  return Boolean(value && Number.isFinite(Date.parse(value)));
}

function latestTimestamp(values: readonly (string | undefined | null)[]) {
  return values
    .filter((value): value is string => validTimestamp(value))
    .sort((left, right) => right.localeCompare(left))[0];
}

export function describeTimeSince(
  timestamp: string | undefined,
  now: Date
) {
  if (!validTimestamp(timestamp)) return "No previous review is recorded.";
  const elapsed = Math.max(0, now.getTime() - Date.parse(timestamp || ""));
  const hours = Math.floor(elapsed / (60 * 60 * 1000));
  const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));
  if (hours < 1) return "Less than an hour ago";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return `${weeks} weeks ago`;
  return new Date(timestamp || "").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      new Date(timestamp || "").getFullYear() === now.getFullYear()
        ? undefined
        : "numeric",
  });
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function buildMoneyCoachRecommendations(
  model: MoneyCoachExperienceModel,
  history?: ProfessionalExecutionHistory
): MoneyCoachRecommendation[] {
  return model.insights
    .filter((insight) => Boolean(insight.navigationTarget))
    .slice(0, 4)
    .map((insight) => {
      const lifecycle = history?.recommendations.find((item) =>
        item.supportingEvidence.some(
          (evidence) => evidenceSourceId(evidence) === insight.id
        )
      );
      const score = Math.max(
        0,
        Math.min(100, Number(insight.priorityFactors.confidence || 0))
      );
      return {
        sourceInsightId: insight.id,
        title: insight.title,
        recommendation: insight.detailedExplanation,
        whyItExists: insight.summary,
        whyItMatters: insight.detailedExplanation,
        href: insight.navigationTarget || "/dashboard/money",
        confidence: {
          label: insight.confidence,
          score,
          basis: insight.provenance.calculationOrRule,
        },
        limitations: insight.provenance.limitations,
        supportingEvidence: insight.supportingData,
        lifecycle,
      };
    });
}

export function buildMoneyCoachSessionBriefing({
  model,
  history,
  conversations = [],
  activeConversationId,
  now = new Date(model.morningBriefing.generatedAt),
}: {
  model: MoneyCoachExperienceModel;
  history?: ProfessionalExecutionHistory;
  conversations?: readonly AgentConversationThread[];
  activeConversationId?: string;
  now?: Date;
}): MoneyCoachSessionBriefing {
  const priorConversations = [...conversations]
    .filter(
      (thread) =>
        thread.id !== activeConversationId &&
        thread.messageCount > 0
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const recordedPriorVisit = model.morningBriefing.firstReview
    ? undefined
    : model.morningBriefing.since;
  const relationshipActivityAt = latestTimestamp([
    priorConversations[0]?.updatedAt,
    ...(history?.recommendations || [])
      .filter((item) =>
        ["accepted", "declined", "completed"].includes(item.status)
      )
      .map((item) => item.updatedAt),
    ...(history?.outcomes || []).map((item) => item.recordedAt),
  ]);
  const lastReviewAt = recordedPriorVisit || relationshipActivityAt;
  const firstVisit = !lastReviewAt;
  const timeSinceLastReview = describeTimeSince(lastReviewAt, now);
  const changes = (firstVisit ? [] : model.morningBriefing.items)
    .filter(
      (item) =>
        item.id !== "current-data:upcoming-bills" &&
        !item.id.startsWith("goal:")
    )
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      href: item.href,
    }));
  const upcomingEvents = [
    ...model.financialContext.billsDueSoon.map((bill, index) => ({
      id: `upcoming-bill:${index}:${bill.name}`,
      title: bill.name,
      detail: `${money(bill.amount)} · ${bill.status || `Due ${bill.dueDate}`}`,
      href: "/dashboard/money/cashflow#bills",
    })),
    ...model.financialContext.upcomingIncome.map((income, index) => ({
      id: `upcoming-income:${index}:${income.name}`,
      title: income.name,
      detail: `${money(income.amount)}${income.date ? ` · Expected ${income.date}` : ""}`,
      href: "/dashboard/money/cashflow#income-planning",
    })),
    ...model.morningBriefing.items
      .filter((item) => item.id.startsWith("goal:"))
      .map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        href: item.href,
      })),
  ]
    .filter(
      (event, index, events) =>
        events.findIndex(
          (candidate) =>
            candidate.title === event.title &&
            candidate.detail === event.detail
        ) === index
    )
    .slice(0, 4);
  const completedMilestones = [
    ...model.morningBriefing.completedMilestones.map((milestone) => ({
      id: `goal:${milestone.id}`,
      title: milestone.title,
      detail: milestone.completedAt
        ? `Completed ${new Date(milestone.completedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`
        : "Recorded as completed",
    })),
    ...model.observations
      .filter(
        (observation) =>
          observation.type === "Milestone" &&
          (!lastReviewAt ||
            Date.parse(observation.time.observedAt) >= Date.parse(lastReviewAt))
      )
      .map((observation) => ({
        id: `observation:${observation.id}`,
        title: observation.presentation.title,
        detail: observation.presentation.summary,
      })),
  ]
    .filter(
      (milestone, index, milestones) =>
        milestones.findIndex(
          (candidate) => candidate.title === milestone.title
        ) === index
    )
    .slice(0, 3);
  const historicalRecommendations = [...(history?.recommendations || [])]
    .filter((recommendation) =>
      ["accepted", "declined", "completed"].includes(recommendation.status)
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 3)
    .map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      status: recommendation.status,
      updatedAt: recommendation.updatedAt,
    }));
  const completedOutcomes = [...(history?.outcomes || [])]
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
    .slice(0, 3)
    .map((outcome) => ({
      id: outcome.id,
      title:
        history?.recommendations.find(
          (recommendation) => recommendation.requestId === outcome.requestId
        )?.title || "Money Coach recommendation",
      detail:
        outcome.memberLearning.join(" ") ||
        `${outcome.outcomeStatus} outcome recorded.`,
      recordedAt: outcome.recordedAt,
    }));
  const continuity: string[] = [];
  const priorConversation = priorConversations.find(
    (thread) =>
      thread.summary.overview &&
      thread.summary.overview !== "No conversation summary yet."
  );
  if (priorConversation) {
    continuity.push(`Last time we discussed ${priorConversation.summary.overview.replace(/^Discussed\s+/i, "")}.`);
  }

  const latestRecommendation = historicalRecommendations[0];
  if (latestRecommendation) {
    const statusCopy =
      latestRecommendation.status === "accepted"
        ? "You previously accepted"
        : latestRecommendation.status === "declined"
          ? "You previously declined"
          : "You completed";
    continuity.push(`${statusCopy} “${latestRecommendation.title}.”`);
  }

  return {
    visit: {
      firstVisit,
      lastReviewAt,
      timeSinceLastReview,
    },
    summary: firstVisit
      ? "This is our first financial review. I've reviewed the current BeastMoney records available to me, and we'll build continuity from here."
      : changes.length
        ? `Welcome back. I've reviewed your financial picture and the verified activity since our last review ${timeSinceLastReview.toLowerCase()}.`
        : `Welcome back. I've reviewed your current financial picture. I did not find a material change since our last review ${timeSinceLastReview.toLowerCase()}.`,
    changes,
    upcomingEvents,
    completedMilestones,
    historicalRecommendations,
    completedOutcomes,
    continuity: continuity.slice(0, 2),
    recommendedFocus: model.morningBriefing.recommendedFocus,
    sources: [
      "Current BeastMoney records",
      ...(model.morningBriefing.sourcesConsulted.includes(
        "observation-intelligence"
      )
        ? ["Observation history"]
        : []),
      ...(conversations.length ? ["Conversation history"] : []),
      ...(history?.recommendations.length ? ["Recommendation history"] : []),
      ...(history?.outcomes.length ? ["Completed outcome history"] : []),
      ...(history?.recommendations.some(
        (recommendation) => Object.keys(recommendation.confidence).length > 0
      )
        ? ["Recommendation confidence history"]
        : []),
    ],
  };
}

export function buildMoneyCoachNotifications(
  model: MoneyCoachExperienceModel
): MoneyCoachNotification[] {
  const changes = model.morningBriefing.items
    .slice(0, 2)
    .map((item) => ({
      id: `change:${item.id}`,
      title: item.title,
      detail: item.detail,
      kind: "change" as const,
      href: item.href,
    }));
  const attention = model.insights
    .filter((item) => ["critical", "warning"].includes(item.severity))
    .slice(0, 3)
    .map((item) => ({
      id: `attention:${item.id}`,
      title: item.title,
      detail: item.summary,
      kind: "attention" as const,
      href: item.navigationTarget,
    }));
  const progress = model.wins.slice(0, 2).map((detail, index) => ({
    id: `progress:${index}`,
    title: "Progress noted",
    detail,
    kind: "progress" as const,
  }));
  return [...changes, ...attention, ...progress].filter(
    (item, index, items) =>
      items.findIndex(
        (candidate) =>
          candidate.title === item.title && candidate.detail === item.detail
      ) === index
  );
}

export function buildMoneyCoachOutcomeLearning(
  history?: ProfessionalExecutionHistory
): MoneyCoachOutcomeLearning[] {
  if (!history) return [];
  return history.outcomes.slice(0, 5).map((outcome) => ({
    id: outcome.id,
    recommendationTitle:
      history.recommendations.find(
        (recommendation) =>
          recommendation.requestId === outcome.requestId
      )?.title || "Money Coach recommendation",
    status: outcome.outcomeStatus,
    learning: outcome.memberLearning,
    recordedAt: outcome.recordedAt,
  }));
}
