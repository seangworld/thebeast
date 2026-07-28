import type { MoneyCoachExperienceModel } from "./moneyCoachExperience";
import type {
  ExecutionOutcomeRecord,
  ExecutionRecommendationRecord,
  ProfessionalExecutionHistory,
} from "./platform/agents/executionHistory";

export const moneyCoachProfessionalId = "beastmoney.money-coach";

export type MoneyCoachRecommendation = {
  sourceInsightId: string;
  title: string;
  recommendation: string;
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
