import {
  isExecutionHistoryStatus,
  isRecommendationLifecycleStatus,
  type ExecutionHistoryStatus,
  type RecommendationLifecycleStatus,
} from "./platform/agents/executionHistory";

export type BeastAdminExecutionHistoryItem = {
  id: string;
  ownerId: string;
  professionalId: string;
  title: string;
  requestType: string;
  status: ExecutionHistoryStatus;
  actionClassification: string;
  limitations: string[];
  createdAt: string;
  updatedAt: string;
  auditEvents: number;
  approvals: number;
  results: number;
  outcomes: number;
  followUps: number;
  recommendations: {
    id: string;
    title: string;
    status: RecommendationLifecycleStatus;
    confidence: unknown;
    limitations: string[];
    updatedAt: string;
  }[];
};

export type BeastAdminExecutionHistorySnapshot = {
  requests: BeastAdminExecutionHistoryItem[];
  counts: Record<ExecutionHistoryStatus, number>;
  generatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

export function normalizeBeastAdminExecutionHistorySnapshot(
  value: unknown
): BeastAdminExecutionHistorySnapshot | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.requests) ||
    !isRecord(value.counts) ||
    !isDate(value.generatedAt)
  ) {
    return null;
  }

  const requests = value.requests.flatMap((request) => {
    const limitations = isRecord(request)
      ? stringArray(request.limitations)
      : null;
    if (
      !isRecord(request) ||
      typeof request.id !== "string" ||
      typeof request.ownerId !== "string" ||
      typeof request.professionalId !== "string" ||
      typeof request.title !== "string" ||
      typeof request.requestType !== "string" ||
      !isExecutionHistoryStatus(request.status) ||
      typeof request.actionClassification !== "string" ||
      !limitations ||
      !isDate(request.createdAt) ||
      !isDate(request.updatedAt) ||
      !isInteger(request.auditEvents) ||
      !isInteger(request.approvals) ||
      !isInteger(request.results) ||
      !isInteger(request.outcomes) ||
      !isInteger(request.followUps) ||
      !Array.isArray(request.recommendations)
    ) {
      return [];
    }
    const recommendations = request.recommendations.flatMap((recommendation) => {
      const recommendationLimitations = isRecord(recommendation)
        ? stringArray(recommendation.limitations)
        : null;
      if (
        !isRecord(recommendation) ||
        typeof recommendation.id !== "string" ||
        typeof recommendation.title !== "string" ||
        !isRecommendationLifecycleStatus(recommendation.status) ||
        !recommendationLimitations ||
        !isDate(recommendation.updatedAt)
      ) {
        return [];
      }
      return [{
        id: recommendation.id,
        title: recommendation.title,
        status: recommendation.status,
        confidence: recommendation.confidence,
        limitations: recommendationLimitations,
        updatedAt: recommendation.updatedAt,
      }];
    });
    if (recommendations.length !== request.recommendations.length) return [];
    return [{
      id: request.id,
      ownerId: request.ownerId,
      professionalId: request.professionalId,
      title: request.title,
      requestType: request.requestType,
      status: request.status,
      actionClassification: request.actionClassification,
      limitations,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      auditEvents: request.auditEvents,
      approvals: request.approvals,
      results: request.results,
      outcomes: request.outcomes,
      followUps: request.followUps,
      recommendations,
    }];
  });
  if (requests.length !== value.requests.length) return null;

  const counts = {} as Record<ExecutionHistoryStatus, number>;
  for (const status of [
    "queued", "analyzing", "awaiting_context", "awaiting_approval", "approved",
    "executing", "completed", "partially_completed", "blocked", "failed", "canceled",
  ] as const) {
    if (!isInteger(value.counts[status])) return null;
    counts[status] = value.counts[status] as number;
  }
  return { requests, counts, generatedAt: value.generatedAt };
}
