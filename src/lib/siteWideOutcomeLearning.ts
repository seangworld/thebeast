import type {
  IntelligenceMetric,
  SeangworldIntelligenceSnapshot,
  SeangworldProviderSnapshot,
} from "./seangworldIntelligence";

export const siteWideOutcomeSources = [
  "growth_aggregate_outcome_evidence",
  "news_aggregate_outcome_evidence",
  "ux_aggregate_outcome_evidence",
] as const;

export type SiteWideOutcomeSource = (typeof siteWideOutcomeSources)[number];
export type SiteWideWorkstreamId = "growth" | "news" | "ux";
export type SiteWideOutcomeDecision = "Continue" | "Modify" | "Investigate";

export type SiteWideWorkstreamOutcome = {
  id: SiteWideWorkstreamId;
  label: "Growth" | "News" | "UX";
  source: SiteWideOutcomeSource;
  product: string;
  decision: SiteWideOutcomeDecision;
  confidence: "low" | "medium" | "high";
  evidence: string[];
  evidenceStatus?: "comparable" | "insufficient_history" | "provider_unavailable" | "malformed_evidence";
  limitations: string[];
  comparisonPeriod: string;
  fingerprint: string;
  recommendation: string;
  ownerApprovalRequired: true;
  executable: false;
  causalClaim: false;
};

export type SiteWideOutcomeSnapshot = {
  version: 1;
  observedAt: string;
  workstreams: SiteWideWorkstreamOutcome[];
  ownerGates: readonly [
    "execution",
    "spending",
    "publication",
    "production_change",
  ];
  executable: false;
  causalClaim: false;
};

export type SiteWideOutcomeHistoryRow = {
  status: string;
  started_at: string;
  completed_at: string | null;
  findings: unknown;
};

export type SiteWideOutcomeReport = {
  observedAt: string;
  workstreams: Array<SiteWideWorkstreamOutcome & {
    observedCycles: number;
    sameDecisionCycles: number;
    priorDecision: SiteWideOutcomeDecision | null;
  }>;
  validation: {
    status: "pending" | "validated";
    requiredCycles: 3;
    observedCycles: number;
    distinctScheduledDays: string[];
    explanation: string;
  };
  ownerGates: SiteWideOutcomeSnapshot["ownerGates"];
  executable: false;
  causalClaim: false;
};

type BuildInput = {
  ecosystem: SeangworldIntelligenceSnapshot;
  news: SeangworldIntelligenceSnapshot;
  beast: SeangworldIntelligenceSnapshot;
  observedAt: string;
};

const ownerGates = [
  "execution",
  "spending",
  "publication",
  "production_change",
] as const;
const workstreamIdentity = {
  growth: { label: "Growth", source: "growth_aggregate_outcome_evidence", product: "SEANGWORLD ecosystem" },
  news: { label: "News", source: "news_aggregate_outcome_evidence", product: "SEANGWORLDNEWS" },
  ux: { label: "UX", source: "ux_aggregate_outcome_evidence", product: "The Beast" },
} as const;
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const validTime = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const finiteNonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

function providerReady(
  snapshot: SeangworldIntelligenceSnapshot,
  id: SeangworldProviderSnapshot["id"],
) {
  const provider = snapshot.providers.find((item) => item.id === id);
  return Boolean(
    provider &&
      provider.status === "configured" &&
      provider.connectionStatus === "connected" &&
      ["current", "recent"].includes(provider.freshness),
  );
}

function comparable(metric: IntelligenceMetric | null, minimumBaseline = 1) {
  return Boolean(
    metric &&
      finiteNonnegative(metric.value) &&
      finiteNonnegative(metric.previousValue) &&
      metric.previousValue >= minimumBaseline,
  );
}

function change(metric: IntelligenceMetric) {
  return (metric.value - metric.previousValue!) / metric.previousValue!;
}

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
}

function metricEvidence(label: string, metric: IntelligenceMetric) {
  return `${label}: ${metric.value.toLocaleString()} now versus ${metric.previousValue!.toLocaleString()} previously (${percent(change(metric))}).`;
}

function outcome(input: Omit<SiteWideWorkstreamOutcome, "ownerApprovalRequired" | "executable" | "causalClaim">): SiteWideWorkstreamOutcome {
  return {
    evidenceStatus: "comparable",
    ...input,
    ownerApprovalRequired: true,
    executable: false,
    causalClaim: false,
  };
}

function baselineEvidence(snapshot: SeangworldIntelligenceSnapshot, ids: Array<"ga4" | "search_console">, metrics: Array<[string, IntelligenceMetric | null]>) {
  const ready = ids.some((id) => providerReady(snapshot, id));
  const complete = metrics.every(([, metric]) => metric && finiteNonnegative(metric.value) &&
    (metric.previousValue === null || finiteNonnegative(metric.previousValue)));
  const evidenceStatus = !ready ? "provider_unavailable" as const : !complete ? "malformed_evidence" as const : "insufficient_history" as const;
  return {
    evidenceStatus,
    evidence: ready && complete ? metrics.map(([label, metric]) => `${label}: ${metric!.value} now; previous ${metric!.previousValue === null ? "unavailable" : metric!.previousValue}. Comparison sample is insufficient.`) : [],
    limitations: [evidenceStatus === "provider_unavailable"
      ? "Required provider is unavailable or stale; this is a retrieval failure, not evidence of low traffic."
      : evidenceStatus === "malformed_evidence" ? "Required current metric evidence is missing or malformed."
      : "Current provider evidence is available, but comparable history is insufficient for a performance recommendation."],
  };
}

function growthOutcome(snapshot: SeangworldIntelligenceSnapshot) {
  const sessions = snapshot.data.sessions;
  const clicks = snapshot.data.clicks;
  const usableSessions = providerReady(snapshot, "ga4") && comparable(sessions, 30);
  const usableClicks = providerReady(snapshot, "search_console") && comparable(clicks, 10);
  const evidence = [
    ...(usableSessions ? [metricEvidence("Ecosystem sessions", sessions!)] : []),
    ...(usableClicks ? [metricEvidence("Organic search clicks", clicks!)] : []),
  ];
  if (!usableSessions && !usableClicks) {
    return outcome({
      id: "growth", label: "Growth", source: "growth_aggregate_outcome_evidence", product: "SEANGWORLD ecosystem",
      decision: "Investigate", confidence: "low",
      comparisonPeriod: snapshot.comparisonPeriod,
      fingerprint: "growth:investigate:baseline-unavailable",
      ...baselineEvidence(snapshot, ["ga4", "search_console"], providerReady(snapshot, "ga4") ? [["Ecosystem sessions", sessions]] : [["Organic search clicks", clicks]]),
      recommendation: "Investigate provider freshness and baseline coverage before changing a growth initiative.",
    });
  }
  const declines = [
    ...(usableSessions && change(sessions!) <= -0.15 ? ["sessions"] : []),
    ...(usableClicks && change(clicks!) <= -0.15 ? ["search clicks"] : []),
  ];
  const decision = declines.length ? "Modify" : "Continue";
  return outcome({
    id: "growth", label: "Growth", source: "growth_aggregate_outcome_evidence", product: "SEANGWORLD ecosystem",
    decision, confidence: usableSessions && usableClicks ? "high" : "medium", evidence,
    limitations: ["Aggregate traffic movements can be associated with many factors and do not prove that a specific initiative caused the change."],
    comparisonPeriod: snapshot.comparisonPeriod,
    fingerprint: `growth:${decision.toLowerCase()}:${declines.sort().join("+") || "no-material-decline"}`,
    recommendation: declines.length
      ? `Modify only after owner review of the ${declines.join(" and ")} decline and the affected sources or pages.`
      : "Continue the current growth initiative while monitoring qualified traffic and conversions at the existing cadence.",
  });
}

function newsOutcome(snapshot: SeangworldIntelligenceSnapshot) {
  const sessions = snapshot.data.sessions;
  const engagement = snapshot.data.engagementRate;
  const usableSessions = providerReady(snapshot, "ga4") && comparable(sessions, 20);
  const usableEngagement = providerReady(snapshot, "ga4") && comparable(engagement, 0.01);
  const evidence = [
    ...(usableSessions ? [metricEvidence("News sessions", sessions!)] : []),
    ...(usableEngagement ? [metricEvidence("News engagement rate", engagement!)] : []),
  ];
  if (!usableSessions || !usableEngagement) {
    return outcome({
      id: "news", label: "News", source: "news_aggregate_outcome_evidence", product: "SEANGWORLDNEWS",
      decision: "Investigate", confidence: "low",
      comparisonPeriod: snapshot.comparisonPeriod,
      fingerprint: "news:investigate:baseline-unavailable",
      ...baselineEvidence(snapshot, ["ga4"], [["News sessions", sessions], ["News engagement rate", engagement]]),
      recommendation: "Investigate News analytics coverage before changing sourcing, clustering, or publishing behavior.",
    });
  }
  const reasons = [
    ...(change(sessions!) <= -0.15 ? ["sessions"] : []),
    ...(engagement!.value <= engagement!.previousValue! - 0.1 ? ["engagement"] : []),
  ];
  const decision = reasons.length ? "Modify" : "Continue";
  return outcome({
    id: "news", label: "News", source: "news_aggregate_outcome_evidence", product: "SEANGWORLDNEWS",
    decision, confidence: "high", evidence,
    limitations: ["The scoped metrics describe News usage; they do not establish which story, source, or product change caused a movement."],
    comparisonPeriod: snapshot.comparisonPeriod,
    fingerprint: `news:${decision.toLowerCase()}:${reasons.sort().join("+") || "no-material-decline"}`,
    recommendation: reasons.length
      ? `Modify only after owner review identifies whether the ${reasons.join(" and ")} decline is concentrated in specific sources, devices, or entry pages.`
      : "Continue the current News operation and monitor scoped traffic, engagement, and downstream actions.",
  });
}

function uxOutcome(snapshot: SeangworldIntelligenceSnapshot) {
  const sessions = snapshot.data.sessions;
  const engagement = snapshot.data.engagementRate;
  const usableSessions = providerReady(snapshot, "ga4") && comparable(sessions, 20);
  const usableEngagement = providerReady(snapshot, "ga4") && comparable(engagement, 0.01);
  const evidence = [
    ...(usableSessions ? [metricEvidence("Beast sessions", sessions!)] : []),
    ...(usableEngagement ? [metricEvidence("Beast engagement rate", engagement!)] : []),
  ];
  if (!usableSessions || !usableEngagement) {
    return outcome({
      id: "ux", label: "UX", source: "ux_aggregate_outcome_evidence", product: "The Beast",
      decision: "Investigate", confidence: "low",
      comparisonPeriod: snapshot.comparisonPeriod,
      fingerprint: "ux:investigate:baseline-unavailable",
      ...baselineEvidence(snapshot, ["ga4"], [["Beast sessions", sessions], ["Beast engagement rate", engagement]]),
      recommendation: "Investigate product analytics coverage before changing navigation, onboarding, or interaction design.",
    });
  }
  const mobile = snapshot.data.deviceEngagement;
  const mobileGap = mobile && mobile.mobileSessions + mobile.desktopSessions >= 50
    ? mobile.desktopEngagementRate - mobile.mobileEngagementRate
    : null;
  if (mobileGap !== null) evidence.push(`Mobile versus desktop engagement gap: ${Math.round(mobileGap * 100)} percentage points across ${mobile!.mobileSessions + mobile!.desktopSessions} sessions.`);
  const reasons = [
    ...(engagement!.value <= engagement!.previousValue! - 0.1 ? ["overall engagement"] : []),
    ...(mobileGap !== null && mobileGap >= 0.15 ? ["mobile engagement"] : []),
  ];
  const decision = reasons.length ? "Modify" : "Continue";
  return outcome({
    id: "ux", label: "UX", source: "ux_aggregate_outcome_evidence", product: "The Beast",
    decision, confidence: mobileGap === null ? "medium" : "high", evidence,
    limitations: ["Aggregate engagement indicates possible friction but does not identify a cause or justify a Production change by itself."],
    comparisonPeriod: snapshot.comparisonPeriod,
    fingerprint: `ux:${decision.toLowerCase()}:${reasons.sort().join("+") || "no-material-friction"}`,
    recommendation: reasons.length
      ? `Modify only after owner review and targeted UX investigation of ${reasons.join(" and ")}; validate any proposed change separately.`
      : "Continue the current UX direction while monitoring engagement and device-specific friction.",
  });
}

export function buildSiteWideOutcomeSnapshot(input: BuildInput): SiteWideOutcomeSnapshot {
  if (!validTime(input.observedAt)) throw new Error("site_wide_outcome_time_invalid");
  return {
    version: 1,
    observedAt: input.observedAt,
    workstreams: [growthOutcome(input.ecosystem), newsOutcome(input.news), uxOutcome(input.beast)],
    ownerGates,
    executable: false,
    causalClaim: false,
  };
}

export function buildSiteWideObservationSources(snapshot: SiteWideOutcomeSnapshot) {
  return snapshot.workstreams.map((item) => ({
    source: item.source,
    available: item.evidenceStatus === "insufficient_history" || item.decision !== "Investigate",
    changed: item.decision === "Modify",
    summary: `${item.label}: ${item.decision}. ${item.recommendation}`,
    confidence: item.confidence,
    impact: item.decision === "Modify" ? "medium" as const : "none" as const,
    fingerprint: item.fingerprint,
    affectedProducts: [item.product],
  }));
}

export function normalizeSiteWideOutcomeSnapshot(value: unknown): SiteWideOutcomeSnapshot | null {
  const snapshot = record(value);
  if (snapshot.version !== 1 || !validTime(snapshot.observedAt) || snapshot.executable !== false || snapshot.causalClaim !== false) return null;
  if (!Array.isArray(snapshot.ownerGates) || snapshot.ownerGates.join("|") !== ownerGates.join("|")) return null;
  if (!Array.isArray(snapshot.workstreams) || snapshot.workstreams.length !== 3) return null;
  const ids = new Set<SiteWideWorkstreamId>();
  for (const raw of snapshot.workstreams) {
    const item = record(raw);
    if (!["growth", "news", "ux"].includes(item.id as string) || ids.has(item.id as SiteWideWorkstreamId)) return null;
    const identity = workstreamIdentity[item.id as SiteWideWorkstreamId];
    if (item.label !== identity.label || item.source !== identity.source || item.product !== identity.product) return null;
    if (!["Continue", "Modify", "Investigate"].includes(item.decision as string)) return null;
    if (!["low", "medium", "high"].includes(item.confidence as string) || !Array.isArray(item.evidence) || !item.evidence.every((entry) => typeof entry === "string") || !Array.isArray(item.limitations) || !item.limitations.every((entry) => typeof entry === "string")) return null;
    if (item.evidenceStatus !== undefined && !["comparable", "insufficient_history", "provider_unavailable", "malformed_evidence"].includes(item.evidenceStatus as string)) return null;
    if (item.ownerApprovalRequired !== true || item.executable !== false || item.causalClaim !== false) return null;
    if (![item.label, item.product, item.comparisonPeriod, item.fingerprint, item.recommendation].every((entry) => typeof entry === "string" && entry.length > 0 && entry.length <= 4000)) return null;
    ids.add(item.id as SiteWideWorkstreamId);
  }
  return snapshot as unknown as SiteWideOutcomeSnapshot;
}

function operationallyValid(snapshot: SiteWideOutcomeSnapshot) {
  return normalizeSiteWideOutcomeSnapshot(snapshot) !== null && snapshot.workstreams.every((item) =>
    item.evidence.length > 0 && item.evidence.every((entry) => entry.trim().length > 0) &&
    (item.evidenceStatus === "insufficient_history" ? item.decision === "Investigate"
      : (item.evidenceStatus === undefined || item.evidenceStatus === "comparable") && item.decision !== "Investigate"));
}

function siteSnapshotFromEnvelope(value: unknown) {
  const envelope = record(value);
  return envelope.version === 2 ? normalizeSiteWideOutcomeSnapshot(envelope.siteOutcomes) : null;
}

export function assessSiteWideOutcomes(current: SiteWideOutcomeSnapshot, history: SiteWideOutcomeHistoryRow[]): SiteWideOutcomeReport {
  const now = Date.parse(current.observedAt);
  const currentDay = current.observedAt.slice(0, 10);
  const byDay = new Map<string, SiteWideOutcomeSnapshot>(operationallyValid(current) ? [[currentDay, current]] : []);
  for (const row of [...history].sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))) {
    if (!["clean", "findings", "duplicate_skipped"].includes(row.status) || !row.completed_at) continue;
    const started = Date.parse(row.started_at); const completed = Date.parse(row.completed_at);
    if (!Number.isFinite(started) || !Number.isFinite(completed) || started >= now || completed < started || completed > now) continue;
    const snapshot = siteSnapshotFromEnvelope(row.findings);
    if (!snapshot || !operationallyValid(snapshot) || Date.parse(snapshot.observedAt) !== started) continue;
    const day = row.started_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, snapshot);
  }
  const expectedDays = Array.from({ length: 3 }, (_, index) => new Date(Date.parse(`${currentDay}T00:00:00Z`) - index * 86_400_000).toISOString().slice(0, 10));
  const scheduled: SiteWideOutcomeSnapshot[] = [];
  for (const day of expectedDays) {
    const snapshot = byDay.get(day);
    if (!snapshot) break;
    scheduled.push(snapshot);
  }
  const observedCycles = scheduled.length;
  const validationStatus = observedCycles === 3 ? "validated" : "pending";
  return {
    observedAt: current.observedAt,
    workstreams: current.workstreams.map((item) => {
      const prior = scheduled.slice(1).map((snapshot) => snapshot.workstreams.find((candidate) => candidate.id === item.id)).filter((candidate): candidate is SiteWideWorkstreamOutcome => Boolean(candidate));
      return {
        ...item,
        observedCycles: (operationallyValid(current) ? 1 : 0) + prior.length,
        sameDecisionCycles: (operationallyValid(current) ? 1 : 0) + prior.filter((candidate) => candidate.decision === item.decision).length,
        priorDecision: prior[0]?.decision || null,
      };
    }),
    validation: {
      status: validationStatus,
      requiredCycles: 3,
      observedCycles,
      distinctScheduledDays: scheduled.map((snapshot) => snapshot.observedAt.slice(0, 10)),
      explanation: validationStatus === "validated"
        ? "Three distinct consecutive scheduled days produced valid, non-executable Growth, News, and UX outcomes."
        : `${3 - observedCycles} more consecutive scheduled cycle(s) are required; missing or failed days do not count.`,
    },
    ownerGates: current.ownerGates,
    executable: false,
    causalClaim: false,
  };
}
