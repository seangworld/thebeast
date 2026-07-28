import type { SupabaseClient } from "@supabase/supabase-js";

export const executionHistoryStatuses = [
  "queued",
  "analyzing",
  "awaiting_context",
  "awaiting_approval",
  "approved",
  "executing",
  "completed",
  "partially_completed",
  "blocked",
  "failed",
  "canceled",
] as const;

export const recommendationLifecycleStatuses = [
  "proposed",
  "accepted",
  "declined",
  "deferred",
  "superseded",
  "completed",
] as const;

export type ExecutionHistoryStatus = (typeof executionHistoryStatuses)[number];
export type RecommendationLifecycleStatus =
  (typeof recommendationLifecycleStatuses)[number];

export type ExecutionHistoryRequest = {
  id: string;
  ownerId: string;
  professionalId: string;
  requestType: string;
  title: string;
  status: ExecutionHistoryStatus;
  actionClassification:
    | "informational"
    | "recommendation_only"
    | "member_confirmed"
    | "owner_approved"
    | "prohibited";
  contextReferences: readonly unknown[];
  limitations: readonly string[];
  createdAt: string;
  updatedAt: string;
};

export type ExecutionAuditEvent = {
  id: string;
  requestId: string;
  actorType: "member" | "owner" | "professional" | "system";
  eventType: string;
  previousStatus: ExecutionHistoryStatus | null;
  status: ExecutionHistoryStatus | null;
  decision: Record<string, unknown>;
  supportingEvidence: readonly unknown[];
  occurredAt: string;
};

export type ExecutionHistoryReplay = {
  request: ExecutionHistoryRequest;
  events: readonly ExecutionAuditEvent[];
  currentStatus: ExecutionHistoryStatus;
};

export type ExecutionRecommendationRecord = {
  id: string;
  ownerId: string;
  requestId: string;
  professionalId: string;
  title: string;
  recommendation: string;
  status: RecommendationLifecycleStatus;
  confidence: Record<string, unknown>;
  limitations: readonly string[];
  supportingEvidence: readonly unknown[];
  createdAt: string;
  updatedAt: string;
};

export type ExecutionOutcomeRecord = {
  id: string;
  requestId: string;
  outcomeStatus: "successful" | "neutral" | "unsuccessful" | "inconclusive";
  expectedResult: Record<string, unknown>;
  actualResult: Record<string, unknown> | null;
  memberLearning: readonly string[];
  limitations: readonly string[];
  supportingEvidence: readonly unknown[];
  observedAt: string | null;
  recordedAt: string;
};

export type ProfessionalExecutionHistory = {
  requests: readonly ExecutionHistoryRequest[];
  recommendations: readonly ExecutionRecommendationRecord[];
  outcomes: readonly ExecutionOutcomeRecord[];
};

type RequestRow = {
  id: string;
  owner_id: string;
  professional_id: string;
  request_type: string;
  title: string;
  status: ExecutionHistoryStatus;
  action_classification: ExecutionHistoryRequest["actionClassification"];
  context_references: unknown[];
  limitations: string[];
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: string;
  request_id: string;
  actor_type: ExecutionAuditEvent["actorType"];
  event_type: string;
  previous_status: ExecutionHistoryStatus | null;
  status: ExecutionHistoryStatus | null;
  decision: Record<string, unknown>;
  supporting_evidence: unknown[];
  occurred_at: string;
};

type RecommendationRow = {
  id: string;
  owner_id: string;
  request_id: string;
  professional_id: string;
  title: string;
  recommendation: string;
  status: RecommendationLifecycleStatus;
  confidence: Record<string, unknown>;
  limitations: string[];
  supporting_evidence: unknown[];
  created_at: string;
  updated_at: string;
};

type OutcomeRow = {
  id: string;
  request_id: string;
  outcome_status: ExecutionOutcomeRecord["outcomeStatus"];
  expected_result: Record<string, unknown>;
  actual_result: Record<string, unknown> | null;
  member_learning: string[];
  limitations: string[];
  supporting_evidence: unknown[];
  observed_at: string | null;
  recorded_at: string;
};

function mapRequest(row: RequestRow): ExecutionHistoryRequest {
  return {
    id: row.id,
    ownerId: row.owner_id,
    professionalId: row.professional_id,
    requestType: row.request_type,
    title: row.title,
    status: row.status,
    actionClassification: row.action_classification,
    contextReferences: row.context_references || [],
    limitations: row.limitations || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAudit(row: AuditRow): ExecutionAuditEvent {
  return {
    id: row.id,
    requestId: row.request_id,
    actorType: row.actor_type,
    eventType: row.event_type,
    previousStatus: row.previous_status,
    status: row.status,
    decision: row.decision || {},
    supportingEvidence: row.supporting_evidence || [],
    occurredAt: row.occurred_at,
  };
}

function mapRecommendation(
  row: RecommendationRow
): ExecutionRecommendationRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    requestId: row.request_id,
    professionalId: row.professional_id,
    title: row.title,
    recommendation: row.recommendation,
    status: row.status,
    confidence: row.confidence || {},
    limitations: row.limitations || [],
    supportingEvidence: row.supporting_evidence || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOutcome(row: OutcomeRow): ExecutionOutcomeRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    outcomeStatus: row.outcome_status,
    expectedResult: row.expected_result || {},
    actualResult: row.actual_result,
    memberLearning: row.member_learning || [],
    limitations: row.limitations || [],
    supportingEvidence: row.supporting_evidence || [],
    observedAt: row.observed_at,
    recordedAt: row.recorded_at,
  };
}

export class SupabaseExecutionHistoryStore {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: {
    professionalId: string;
    requestType: string;
    title: string;
    actionClassification: ExecutionHistoryRequest["actionClassification"];
    contextReferences?: readonly unknown[];
    limitations?: readonly string[];
  }) {
    const { data, error } = await this.client.rpc("create_execution_request", {
      selected_professional_id: input.professionalId,
      selected_request_type: input.requestType,
      selected_title: input.title,
      selected_action_classification: input.actionClassification,
      selected_context_references: [...(input.contextReferences || [])],
      selected_limitations: [...(input.limitations || [])],
    });
    if (error) throw error;
    if (typeof data !== "string") {
      throw new Error("Execution request persistence did not return an identifier.");
    }
    return data;
  }

  async transition(
    requestId: string,
    status: ExecutionHistoryStatus,
    actorType: ExecutionAuditEvent["actorType"],
    decision: Record<string, unknown> = {},
    supportingEvidence: readonly unknown[] = []
  ) {
    const { data, error } = await this.client.rpc(
      "transition_execution_request",
      {
        selected_request_id: requestId,
        next_status: status,
        selected_actor_type: actorType,
        selected_decision: decision,
        selected_supporting_evidence: [...supportingEvidence],
      }
    );
    if (error) throw error;
    return data;
  }

  async transitionRecommendation(input: {
    recommendationId: string;
    status: RecommendationLifecycleStatus;
    reason?: string;
    confidence?: unknown;
    limitations?: readonly string[];
    supportingEvidence?: readonly unknown[];
  }) {
    const { data, error } = await this.client.rpc(
      "transition_execution_recommendation",
      {
        selected_recommendation_id: input.recommendationId,
        next_status: input.status,
        selected_reason: input.reason || null,
        selected_confidence: input.confidence ?? null,
        selected_limitations: input.limitations
          ? [...input.limitations]
          : null,
        selected_supporting_evidence: input.supportingEvidence
          ? [...input.supportingEvidence]
          : null,
      }
    );
    if (error) throw error;
    return data;
  }

  async createRecommendation(input: {
    ownerId: string;
    requestId: string;
    professionalId: string;
    title: string;
    recommendation: string;
    confidence: Record<string, unknown>;
    limitations?: readonly string[];
    supportingEvidence?: readonly unknown[];
  }): Promise<ExecutionRecommendationRecord> {
    const { data, error } = await this.client
      .from("execution_recommendations")
      .insert({
        owner_id: input.ownerId,
        request_id: input.requestId,
        professional_id: input.professionalId,
        title: input.title,
        recommendation: input.recommendation,
        confidence: input.confidence,
        limitations: [...(input.limitations || [])],
        supporting_evidence: [...(input.supportingEvidence || [])],
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRecommendation(data as RecommendationRow);
  }

  async recordDecision(input: {
    ownerId: string;
    requestId: string;
    decisionScope: "member" | "owner";
    decision: "approved" | "declined" | "deferred";
    reason: string;
    limitationsAcknowledged?: readonly string[];
  }) {
    const { error } = await this.client.from("execution_approvals").insert({
      owner_id: input.ownerId,
      request_id: input.requestId,
      decision_scope: input.decisionScope,
      decision: input.decision,
      decided_by: input.ownerId,
      reason: input.reason,
      limitations_acknowledged: [
        ...(input.limitationsAcknowledged || []),
      ],
    });
    if (error) throw error;
  }

  async recordResultAndOutcome(input: {
    ownerId: string;
    requestId: string;
    outcomeStatus: ExecutionOutcomeRecord["outcomeStatus"];
    recommendationTitle: string;
    memberLearning: readonly string[];
    actualResult: Record<string, unknown>;
    limitations?: readonly string[];
    supportingEvidence?: readonly unknown[];
  }) {
    const { data: result, error: resultError } = await this.client
      .from("execution_results")
      .insert({
        owner_id: input.ownerId,
        request_id: input.requestId,
        result_status: "completed",
        summary: `Member reviewed the outcome for ${input.recommendationTitle}.`,
        output: { source: "member_reported_outcome" },
        limitations: [...(input.limitations || [])],
        supporting_evidence: [...(input.supportingEvidence || [])],
        external_action_verified: false,
      })
      .select("id")
      .single();
    if (resultError) throw resultError;
    const { error: outcomeError } = await this.client
      .from("execution_outcomes")
      .insert({
        owner_id: input.ownerId,
        request_id: input.requestId,
        result_id: (result as { id: string }).id,
        outcome_status: input.outcomeStatus,
        expected_result: {
          recommendation: input.recommendationTitle,
        },
        actual_result: input.actualResult,
        member_learning: [...input.memberLearning],
        limitations: [...(input.limitations || [])],
        supporting_evidence: [...(input.supportingEvidence || [])],
        observed_at: new Date().toISOString(),
      });
    if (outcomeError) throw outcomeError;
  }

  async listProfessionalHistory(
    ownerId: string,
    professionalId: string
  ): Promise<ProfessionalExecutionHistory> {
    const recommendationResult = await this.client
      .from("execution_recommendations")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("professional_id", professionalId)
      .order("updated_at", { ascending: false });
    if (recommendationResult.error) throw recommendationResult.error;
    const recommendations = (
      (recommendationResult.data || []) as RecommendationRow[]
    ).map(mapRecommendation);
    const requestIds = Array.from(
      new Set(recommendations.map((item) => item.requestId))
    );
    if (requestIds.length === 0) {
      return { requests: [], recommendations: [], outcomes: [] };
    }
    const [requestResult, outcomeResult] = await Promise.all([
      this.client
        .from("execution_requests")
        .select("*")
        .eq("owner_id", ownerId)
        .in("id", requestIds)
        .order("updated_at", { ascending: false }),
      this.client
        .from("execution_outcomes")
        .select("*")
        .eq("owner_id", ownerId)
        .in("request_id", requestIds)
        .order("recorded_at", { ascending: false }),
    ]);
    if (requestResult.error) throw requestResult.error;
    if (outcomeResult.error) throw outcomeResult.error;
    return {
      requests: ((requestResult.data || []) as RequestRow[]).map(mapRequest),
      recommendations,
      outcomes: ((outcomeResult.data || []) as OutcomeRow[]).map(mapOutcome),
    };
  }

  async list(ownerId: string) {
    const { data, error } = await this.client
      .from("execution_requests")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data || []) as RequestRow[]).map(mapRequest);
  }

  async replay(ownerId: string, requestId: string): Promise<ExecutionHistoryReplay> {
    const [requestResult, auditResult] = await Promise.all([
      this.client
        .from("execution_requests")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("id", requestId)
        .maybeSingle(),
      this.client
        .from("execution_audit_events")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("request_id", requestId)
        .order("occurred_at", { ascending: true }),
    ]);
    if (requestResult.error) throw requestResult.error;
    if (auditResult.error) throw auditResult.error;
    if (!requestResult.data) {
      throw new Error("Execution request is not available for this owner.");
    }
    const request = mapRequest(requestResult.data as RequestRow);
    const events = ((auditResult.data || []) as AuditRow[]).map(mapAudit);
    return { request, events, currentStatus: events.at(-1)?.status || request.status };
  }
}

export function isExecutionHistoryStatus(
  value: unknown
): value is ExecutionHistoryStatus {
  return executionHistoryStatuses.includes(value as ExecutionHistoryStatus);
}

export function isRecommendationLifecycleStatus(
  value: unknown
): value is RecommendationLifecycleStatus {
  return recommendationLifecycleStatuses.includes(
    value as RecommendationLifecycleStatus
  );
}
