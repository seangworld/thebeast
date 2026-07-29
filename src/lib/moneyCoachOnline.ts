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
  summary: string;
  changes: readonly {
    id: string;
    title: string;
    detail: string;
    href?: string;
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
}: {
  model: MoneyCoachExperienceModel;
  history?: ProfessionalExecutionHistory;
  conversations?: readonly AgentConversationThread[];
  activeConversationId?: string;
}): MoneyCoachSessionBriefing {
  const changes = model.morningBriefing.items.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.title,
    detail: item.detail,
    href: item.href,
  }));
  const continuity: string[] = [];
  const priorConversation = [...conversations]
    .filter(
      (thread) =>
        thread.id !== activeConversationId &&
        thread.messageCount > 0 &&
        thread.summary.overview &&
        thread.summary.overview !== "No conversation summary yet."
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (priorConversation) {
    continuity.push(`Last time we discussed ${priorConversation.summary.overview.replace(/^Discussed\s+/i, "")}.`);
  }

  const latestRecommendation = [...(history?.recommendations || [])]
    .filter((recommendation) =>
      ["accepted", "declined", "completed"].includes(recommendation.status)
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
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
    summary: changes.length
      ? `I've reviewed your financial picture. ${model.morningBriefing.summary}`
      : "I've reviewed your current financial picture. I did not find a material change since your last review.",
    changes,
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
