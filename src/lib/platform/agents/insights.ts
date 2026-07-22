export type InsightPriority = "low" | "medium" | "high" | "critical";
export type InsightSeverity = "info" | "success" | "warning" | "critical";
export type InsightConfidence = "low" | "medium" | "high";
export type InsightLifecycleState =
  | "New"
  | "Active"
  | "Reviewed"
  | "Dismissed"
  | "Accepted"
  | "Completed"
  | "Expired"
  | "Archived";
export type InsightStatus<TExtension extends string = never> =
  | InsightLifecycleState
  | TExtension;

export type InsightPriorityFactor =
  | "urgency"
  | "financialImpact"
  | "healthImpact"
  | "educationalImpact"
  | "confidence"
  | "dueDate"
  | "userGoals"
  | "unresolvedStatus"
  | "recurrence"
  | (string & {});

export type InsightSupportingDatum = {
  label: string;
  value: string | number | boolean | null;
  source?: string;
};

export type InsightEvidenceRecord = {
  entityType: string;
  entityId: string;
  source: string;
  observedAt: string;
  fields?: readonly string[];
};

export type InsightProvenance = {
  originatingData: string;
  calculationOrRule: string;
  timestamp: string;
  supportingRecords: readonly InsightEvidenceRecord[];
  confidence: InsightConfidence;
  limitations: readonly string[];
};

export type InsightExplainWhy = {
  reason: string;
  supportingData: readonly InsightSupportingDatum[];
  calculations: readonly string[];
  assumptions: readonly string[];
  limitations: readonly string[];
};

export type InsightAction = {
  id: string;
  label: string;
  type: "navigate" | "review" | "accept" | "dismiss" | "complete" | "custom";
  target?: string;
  requiresConfirmation?: boolean;
};

export type InsightRenderingMetadata = {
  icon?: string;
  badge?: string;
  accentColor?: string;
  cardSize?: "compact" | "standard" | "wide";
  expandableSections?: readonly string[];
  actionButtons?: readonly InsightAction[];
  relatedLinks?: readonly { label: string; href: string }[];
};

export type InsightDismissalMode =
  | "once"
  | "until-changed"
  | "remind-later"
  | "never-show-again";

export type InsightDismissal = {
  mode: InsightDismissalMode;
  dismissedAt: string;
  dismissedBy: string;
  reason?: string;
  remindAt?: string;
  evidenceVersion?: string;
};

export type InsightTimePeriod = {
  label: string;
  startsAt?: string;
  endsAt?: string;
};

export type InsightRelatedEntity = {
  type: string;
  id: string;
  label?: string;
};

export type Insight<TStatus extends string = never> = {
  id: string;
  ownerId: string;
  specialist: string;
  category: string;
  priority: InsightPriority;
  priorityScore: number;
  priorityFactors: Readonly<Record<string, number>>;
  severity: InsightSeverity;
  confidence: InsightConfidence;
  title: string;
  summary: string;
  detailedExplanation: string;
  supportingData: readonly InsightSupportingDatum[];
  provenance: InsightProvenance;
  generatedAt: string;
  applicablePeriod: InsightTimePeriod;
  expiresAt?: string;
  relatedEntities: readonly InsightRelatedEntity[];
  action?: InsightAction;
  navigationTarget?: string;
  explainWhy?: InsightExplainWhy;
  rendering?: InsightRenderingMetadata;
  status: InsightStatus<TStatus>;
  dismissal?: InsightDismissal;
  deduplicationKey?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type CreateInsightInput<TStatus extends string = never> = Omit<
  Insight<TStatus>,
  "status" | "createdAt" | "updatedAt" | "revision"
> & {
  status?: InsightStatus<TStatus>;
};

export type InsightPriorityConfiguration = {
  weights: Readonly<Record<string, number>>;
  thresholds?: Partial<Record<InsightPriority, number>>;
};

export type InsightDeduplicationStrategy<TStatus extends string = never> = {
  keyFor: (insight: CreateInsightInput<TStatus>) => string | undefined;
  merge: (
    existing: Insight<TStatus>,
    incoming: CreateInsightInput<TStatus>
  ) => CreateInsightInput<TStatus>;
};

export type InsightHistoryRecord<TStatus extends string = never> = {
  insightId: string;
  ownerId: string;
  specialist: string;
  from?: InsightStatus<TStatus>;
  to: InsightStatus<TStatus>;
  timestamp: string;
  reason?: string;
  revision: number;
};

const defaultThresholds: Record<InsightPriority, number> = {
  low: 0,
  medium: 35,
  high: 65,
  critical: 85,
};

function required(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
}

function boundedScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function calculateInsightPriority(
  factors: Readonly<Record<string, number>>,
  configuration: InsightPriorityConfiguration
) {
  const entries = Object.entries(configuration.weights).filter(
    ([, weight]) => Number.isFinite(weight) && weight > 0
  );
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const score = totalWeight === 0
    ? 0
    : entries.reduce(
        (sum, [factor, weight]) => sum + boundedScore(factors[factor] || 0) * weight,
        0
      ) / totalWeight;
  const roundedScore = Math.round(score * 100) / 100;
  const thresholds = { ...defaultThresholds, ...configuration.thresholds };
  const priority: InsightPriority =
    roundedScore >= thresholds.critical
      ? "critical"
      : roundedScore >= thresholds.high
        ? "high"
        : roundedScore >= thresholds.medium
          ? "medium"
          : "low";
  return { score: roundedScore, priority };
}

export function validateInsight<TStatus extends string = never>(
  insight: CreateInsightInput<TStatus>
) {
  required(insight.id, "Insight id");
  required(insight.ownerId, "Insight owner id");
  required(insight.specialist, "Insight specialist");
  required(insight.category, "Insight category");
  required(insight.title, "Insight title");
  required(insight.summary, "Insight summary");
  required(insight.detailedExplanation, "Insight detailed explanation");
  required(insight.provenance.originatingData, "Insight originating data");
  required(insight.provenance.calculationOrRule, "Insight calculation or rule");
  required(insight.provenance.timestamp, "Insight provenance timestamp");
  required(insight.generatedAt, "Insight generated timestamp");
  required(insight.applicablePeriod.label, "Insight applicable period");
  if (insight.confidence !== insight.provenance.confidence) {
    throw new Error("Insight confidence must match provenance confidence.");
  }
  if (insight.priorityScore < 0 || insight.priorityScore > 100) {
    throw new Error("Insight priority score must be between 0 and 100.");
  }
  return insight;
}

export class SharedInsightEngine<TStatus extends string = never> {
  private readonly insights = new Map<string, Insight<TStatus>>();
  private readonly historyRecords: InsightHistoryRecord<TStatus>[] = [];

  constructor(
    private readonly deduplication?: InsightDeduplicationStrategy<TStatus>,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  create(input: CreateInsightInput<TStatus>) {
    validateInsight(input);
    const deduplicationKey = input.deduplicationKey || this.deduplication?.keyFor(input);
    const duplicate = deduplicationKey
      ? Array.from(this.insights.values()).find(
          (item) =>
            item.ownerId === input.ownerId &&
            item.specialist === input.specialist &&
            item.deduplicationKey === deduplicationKey &&
            !["Archived", "Expired"].includes(item.status)
        )
      : undefined;
    if (duplicate) {
      const merged = this.deduplication
        ? this.deduplication.merge(duplicate, { ...input, deduplicationKey })
        : { ...input, id: duplicate.id, deduplicationKey };
      return this.update(duplicate.ownerId, duplicate.id, merged);
    }
    if (this.insights.has(input.id)) throw new Error(`Insight ${input.id} already exists.`);
    const timestamp = this.now();
    const stored: Insight<TStatus> = {
      ...input,
      deduplicationKey,
      status: input.status || "New",
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 1,
    };
    this.insights.set(stored.id, stored);
    this.record(undefined, stored.status, stored);
    return stored;
  }

  update(
    ownerId: string,
    insightId: string,
    patch: Partial<CreateInsightInput<TStatus>> & { status?: InsightStatus<TStatus> }
  ) {
    const current = this.requireOwned(ownerId, insightId);
    const candidate = { ...current, ...patch } as CreateInsightInput<TStatus>;
    validateInsight(candidate);
    const updated: Insight<TStatus> = {
      ...current,
      ...patch,
      id: current.id,
      ownerId: current.ownerId,
      updatedAt: this.now(),
      revision: current.revision + 1,
    };
    this.insights.set(insightId, updated);
    if (updated.status !== current.status) this.record(current.status, updated.status, updated);
    return updated;
  }

  archive(ownerId: string, insightId: string, reason?: string) {
    return this.transition(ownerId, insightId, "Archived", reason);
  }

  dismiss(
    ownerId: string,
    insightId: string,
    dismissal: Omit<InsightDismissal, "dismissedAt">
  ) {
    if (dismissal.mode === "remind-later" && !dismissal.remindAt) {
      throw new Error("A remind-at timestamp is required for remind-later dismissals.");
    }
    return this.update(ownerId, insightId, {
      status: "Dismissed",
      dismissal: { ...dismissal, dismissedAt: this.now() },
    });
  }

  transition(
    ownerId: string,
    insightId: string,
    status: InsightStatus<TStatus>,
    reason?: string
  ) {
    const updated = this.update(ownerId, insightId, { status });
    if (reason) {
      const last = this.historyRecords[this.historyRecords.length - 1];
      if (last?.insightId === insightId && last.revision === updated.revision) last.reason = reason;
    }
    return updated;
  }

  active(input: { ownerId: string; specialist?: string; at?: string }) {
    const at = Date.parse(input.at || this.now());
    return Array.from(this.insights.values())
      .filter((item) => item.ownerId === input.ownerId)
      .filter((item) => !input.specialist || item.specialist === input.specialist)
      .filter((item) => ["New", "Active", "Reviewed", "Accepted"].includes(item.status))
      .filter((item) => !item.expiresAt || Date.parse(item.expiresAt) > at)
      .sort((a, b) => b.priorityScore - a.priorityScore || a.generatedAt.localeCompare(b.generatedAt));
  }

  historical(input: { ownerId: string; specialist?: string }) {
    return Array.from(this.insights.values())
      .filter((item) => item.ownerId === input.ownerId)
      .filter((item) => !input.specialist || item.specialist === input.specialist)
      .filter((item) => ["Dismissed", "Completed", "Expired", "Archived"].includes(item.status))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  history(input: { ownerId: string; specialist?: string; insightId?: string }) {
    return this.historyRecords.filter(
      (item) =>
        item.ownerId === input.ownerId &&
        (!input.specialist || item.specialist === input.specialist) &&
        (!input.insightId || item.insightId === input.insightId)
    );
  }

  private requireOwned(ownerId: string, insightId: string) {
    const insight = this.insights.get(insightId);
    if (!insight || insight.ownerId !== ownerId) {
      throw new Error(`Insight ${insightId} is not available for this owner.`);
    }
    return insight;
  }

  private record(
    from: InsightStatus<TStatus> | undefined,
    to: InsightStatus<TStatus>,
    insight: Insight<TStatus>
  ) {
    this.historyRecords.push({
      insightId: insight.id,
      ownerId: insight.ownerId,
      specialist: insight.specialist,
      from,
      to,
      timestamp: insight.updatedAt,
      revision: insight.revision,
    });
  }
}
