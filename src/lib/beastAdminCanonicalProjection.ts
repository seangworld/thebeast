import type { BeastFusionCommandProjection } from "./beastFusionCommandProjection";

export const beastFusionProviderStatuses = [
  "not_configured",
  "no_snapshot",
  "connected",
  "stale",
  "drift_detected",
  "error",
] as const;

export type BeastFusionProviderStatus = (typeof beastFusionProviderStatuses)[number];
export type BeastAdminLegacyClassification = "canonical_projection" | "legacy" | "intake" | "annotation" | "archive" | "placeholder" | "derived";

export type BeastFusionStoredSnapshot = {
  projectionId: string;
  projectionVersion: string;
  payloadHash: string;
  canonicalInputDigest: string;
  sourceCommit: string;
  generatedAt: string;
  acceptedAt: string;
  lastConfirmedAt: string;
  payload: BeastFusionCommandProjection;
};

export type BeastAdminCanonicalReadModel = {
  provider: { status: BeastFusionProviderStatus; detail: string; projectionId: string | null; generatedAt: string | null; acceptedAt: string | null; lastConfirmedAt: string | null };
  cursor: { path: string[]; mode: string; executableWorkAvailable: boolean; selectedPackage: string | null; selectedProduct: string | null; recommendedDirective: string | null };
  projection?: { projectionId: string; projectionVersion: string; payloadHash: string; canonicalInputDigest: string; sourceCommit: string; generatedAt: string; acceptedAt: string; lastConfirmedAt: string; repository: string; branch: string };
  products: Array<{ id: string; name: string; parent: string | null; lifecycle: string; version: string | null; buildId: string | null; releaseDate: string | null; channel?: string | null; declaredDeployment: string; ownerRepository: string | null; activeRoadmap?: string | null; source: "beastfusion" }>;
  roadmap: Array<{ id: string; product: string; title: string; summary?: string; status: string; priority: string; roadmapOrder?: number; dependencies: string[]; blockerCodes?: string[]; blocked: boolean; executable: boolean; ownerApproved: boolean; executionAuthorized: boolean; prerequisitesComplete?: boolean; ownerAction?: string | null; sourceReference?: string | null; evidenceReferences?: string[]; source: "beastfusion" }>;
  execution: Array<{ id: string; package: string | null; product: string; status: string; occurredAt: string | null; startedAt: string | null; completedAt: string | null; candidateCommit: string | null; result: string; blocker: string | null; source: "beastfusion" }>;
  executionOverview?: {
    current: { package: string | null; product: string | null; reason: string | null } | null;
    nextFive: Array<{ package: string | null; product: string | null; reason: string | null; priority: string | null; phase: string | null }>;
    blocked: Array<{ package: string | null; product: string | null; reason: string | null; ownerDecisionRequired: boolean; blockingDependencies: string[] }>;
    waiting: Array<{ package: string | null; product: string | null; reason: string | null; ownerDecisionRequired: boolean; blockingDependencies: string[] }>;
    recentlyCompleted: Array<{ package: string | null; product: string | null; reason: string | null; priority: string | null; phase: string | null }>;
    reconciliation: { reconciledAt: string | null; total: number; completed: number; remaining: number; currentExecutableProduct: string | null; currentExecutablePackage: string | null; warningCount: number };
  };
  releases: Array<{ id: string; product: string; module?: string | null; version: string | null; type?: string; status: string; releaseDate: string | null; ownerApproved?: boolean; validationState: string | null; dependencies?: string[]; blockers?: string[]; evidenceSummary?: string; evidenceReference: string | null; preview: "not_in_projection_v1"; production: "not_in_projection_v1"; servedCommit: null; declaredDeployment: string; source: "beastfusion" }>;
  governance?: { registryVersion: string; packageRegistryVersion: string; executionStateVersion: string; automationEnabled: boolean; autonomousExecution: boolean; deploymentCapability: boolean; beastShieldState: string; beastShieldMeaning: string; dependencyIntegrity: string; validatorState: string; warningCodes: string[]; errorCodes: string[] };
  validation?: { projectionSchema: string; projectionGenerated: boolean; canonicalConsistency: string; lastGovernedEvidenceReference: string | null; lastGovernedEvidenceDate: string | null; testCount: number | null; warnings: string[] };
  records?: Array<{ id: string; label: string; path: string; role: string; digest: string; updatedAt: string | null }>;
  attention: Array<{ id: string; kind: "blocker" | "warning" | "failure" | "drift" | "missing_evidence" | "measurement"; detail: string; source: "beastfusion" }>;
};

export function normalizeBeastAdminCanonicalReadModel(
  value: unknown
): BeastAdminCanonicalReadModel | null {
  const candidate = record(value);
  const provider = record(candidate.provider);
  const cursor = record(candidate.cursor);
  if (
    !beastFusionProviderStatuses.includes(
      provider.status as BeastFusionProviderStatus
    ) ||
    typeof provider.detail !== "string" ||
    !Array.isArray(cursor.path) ||
    cursor.path.some((item) => typeof item !== "string") ||
    typeof cursor.mode !== "string" ||
    typeof cursor.executableWorkAvailable !== "boolean" ||
    !Array.isArray(candidate.products) ||
    !Array.isArray(candidate.roadmap) ||
    !Array.isArray(candidate.execution) ||
    !Array.isArray(candidate.releases) ||
    !Array.isArray(candidate.attention)
  ) {
    return null;
  }
  const requiredStrings = (items: unknown[], keys: string[]) =>
    items.every((item) => {
      const entry = record(item);
      return keys.every((key) => typeof entry[key] === "string");
    });
  if (
    !requiredStrings(candidate.products, ["id", "name", "lifecycle", "source"]) ||
    !requiredStrings(candidate.roadmap, ["id", "product", "title", "status", "priority", "source"]) ||
    !requiredStrings(candidate.execution, ["id", "product", "status", "result", "source"]) ||
    !requiredStrings(candidate.releases, ["id", "product", "status", "declaredDeployment", "source"]) ||
    !requiredStrings(candidate.attention, ["id", "kind", "detail", "source"])
  ) {
    return null;
  }
  return value as BeastAdminCanonicalReadModel;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function classifyLegacyBeastAdminRecord(input: { sourceType?: string | null; classification?: string | null; archived?: boolean }): BeastAdminLegacyClassification {
  if (input.classification && ["canonical_projection", "legacy", "intake", "annotation", "archive", "placeholder", "derived"].includes(input.classification)) return input.classification as BeastAdminLegacyClassification;
  if (input.archived) return "archive";
  if (input.sourceType === "beast_hunter") return "intake";
  return "legacy";
}

export function resolveBeastFusionProviderStatus(input: { configured: boolean; snapshot: BeastFusionStoredSnapshot | null; validationError?: string | null; drift?: boolean; now?: Date; staleAfterMs?: number }): BeastAdminCanonicalReadModel["provider"] {
  if (!input.configured) return { status: "not_configured", detail: "The server-only BeastFusion publication boundary is not configured.", projectionId: null, generatedAt: null, acceptedAt: null, lastConfirmedAt: null };
  if (input.validationError) return { status: input.drift ? "drift_detected" : "error", detail: input.validationError, projectionId: input.snapshot?.projectionId ?? null, generatedAt: input.snapshot?.generatedAt ?? null, acceptedAt: input.snapshot?.acceptedAt ?? null, lastConfirmedAt: input.snapshot?.lastConfirmedAt ?? null };
  if (!input.snapshot) return { status: "no_snapshot", detail: "No valid canonical BeastFusion projection has been accepted.", projectionId: null, generatedAt: null, acceptedAt: null, lastConfirmedAt: null };
  const age = (input.now ?? new Date()).getTime() - new Date(input.snapshot.lastConfirmedAt).getTime();
  if (age > (input.staleAfterMs ?? 26 * 60 * 60 * 1000)) return { status: "stale", detail: "The last valid canonical projection is retained, but its publication heartbeat is stale.", projectionId: input.snapshot.projectionId, generatedAt: input.snapshot.generatedAt, acceptedAt: input.snapshot.acceptedAt, lastConfirmedAt: input.snapshot.lastConfirmedAt };
  return { status: "connected", detail: "A valid immutable BeastFusion canonical projection is current.", projectionId: input.snapshot.projectionId, generatedAt: input.snapshot.generatedAt, acceptedAt: input.snapshot.acceptedAt, lastConfirmedAt: input.snapshot.lastConfirmedAt };
}

export function buildBeastAdminCanonicalReadModel(snapshot: BeastFusionStoredSnapshot, options: { configured?: boolean; now?: Date } = {}): BeastAdminCanonicalReadModel {
  const projection = snapshot.payload;
  const summary = record(projection.summary);
  const execution = record(projection.execution);
  const roadmap = record(projection.roadmap);
  const governance = record(projection.governance);
  const validation = record(projection.validation);
  const attention: BeastAdminCanonicalReadModel["attention"] = [];

  for (const item of (Array.isArray(execution.blocked) ? execution.blocked : []).map(record)) attention.push({ id: `blocked:${String(item.package ?? item.product ?? attention.length)}`, kind: "blocker", detail: String(item.reason ?? "Canonical work is blocked."), source: "beastfusion" });
  strings(roadmap.warnings).forEach((detail, index) => attention.push({ id: `roadmap-warning:${index}`, kind: "warning", detail, source: "beastfusion" }));
  strings(governance.warningCodes).forEach((detail) => attention.push({ id: `governance-warning:${detail}`, kind: "warning", detail, source: "beastfusion" }));
  strings(governance.errorCodes).forEach((detail) => attention.push({ id: `governance-error:${detail}`, kind: "failure", detail, source: "beastfusion" }));
  strings(validation.warnings).forEach((detail, index) => attention.push({ id: `validation-warning:${index}`, kind: "missing_evidence", detail, source: "beastfusion" }));
  if (summary.ownerDecisionRequired === true) attention.push({ id: "owner-decision", kind: "warning", detail: String(summary.ownerDecisionReason ?? "Canonical governance requires an owner decision."), source: "beastfusion" });
  (Array.isArray(roadmap.items) ? roadmap.items : []).map(record).filter((item) => item.canonicalState === "validation").forEach((item) => attention.push({ id: `measurement:${String(item.id)}`, kind: "measurement", detail: `${String(item.id)} is in canonical validation or measurement.`, source: "beastfusion" }));

  return {
    provider: resolveBeastFusionProviderStatus({ configured: options.configured ?? true, snapshot, now: options.now }),
    projection: {
      projectionId: snapshot.projectionId,
      projectionVersion: snapshot.projectionVersion,
      payloadHash: snapshot.payloadHash,
      canonicalInputDigest: snapshot.canonicalInputDigest,
      sourceCommit: snapshot.sourceCommit,
      generatedAt: snapshot.generatedAt,
      acceptedAt: snapshot.acceptedAt,
      lastConfirmedAt: snapshot.lastConfirmedAt,
      repository: projection.source.repository,
      branch: projection.source.branch,
    },
    cursor: {
      path: strings(summary.cursorPath),
      mode: String(summary.cursorMode ?? "unknown"),
      executableWorkAvailable: summary.executableWorkAvailable === true,
      selectedPackage: typeof summary.selectedPackage === "string" ? summary.selectedPackage : null,
      selectedProduct: typeof summary.selectedProduct === "string" ? summary.selectedProduct : null,
      recommendedDirective: typeof summary.recommendedDirective === "string" ? summary.recommendedDirective : null,
    },
    products: projection.portfolio.map(record).map((item) => ({
      id: String(item.id), name: String(item.name), parent: typeof item.parent === "string" ? item.parent : null, lifecycle: String(item.lifecycle), version: typeof item.version === "string" ? item.version : null, buildId: typeof item.buildId === "string" ? item.buildId : null, releaseDate: typeof item.releaseDate === "string" ? item.releaseDate : null, channel: typeof item.channel === "string" ? item.channel : null, declaredDeployment: String(item.declaredDeployment), ownerRepository: typeof item.ownerRepository === "string" ? item.ownerRepository : null, activeRoadmap: typeof item.activeRoadmap === "string" ? item.activeRoadmap : null, source: "beastfusion" as const,
    })),
    roadmap: (Array.isArray(roadmap.items) ? roadmap.items : []).map(record).map((item) => ({
      id: String(item.id), product: String(item.product), title: String(item.title), summary: String(item.summary ?? ""), status: String(item.canonicalState), priority: String(item.priority), roadmapOrder: Number.isInteger(item.roadmapOrder) ? Number(item.roadmapOrder) : 0, dependencies: strings(item.dependencies), blockerCodes: strings(item.blockerCodes), blocked: item.blocked === true, executable: item.executable === true, ownerApproved: item.ownerApproved === true, executionAuthorized: item.executionAuthorized === true, prerequisitesComplete: item.prerequisitesComplete === true, ownerAction: typeof item.ownerAction === "string" ? item.ownerAction : null, sourceReference: typeof item.sourceReference === "string" ? item.sourceReference : null, evidenceReferences: strings(item.evidenceReferences), source: "beastfusion" as const,
    })),
    execution: (Array.isArray(execution.events) ? execution.events : []).map(record).map((item) => {
      const status = String(item.type);
      const occurredAt = typeof item.occurredAt === "string" ? item.occurredAt : null;
      return {
        id: String(item.id), package: typeof item.package === "string" ? item.package : null, product: String(item.product), status, occurredAt,
        startedAt: /start|resume|in_progress/i.test(status) ? occurredAt : null,
        completedAt: /complet|release|validat|reconcil/i.test(status) ? occurredAt : null,
        candidateCommit: typeof item.evidenceReference === "string" && item.evidenceReference.startsWith("commit:") ? item.evidenceReference.slice(7) : null,
        result: String(item.summary ?? ""), blocker: /block|fail/i.test(status) ? String(item.summary ?? "Canonical execution blocker.") : null, source: "beastfusion" as const,
      };
    }),
    executionOverview: {
      current: execution.current === null ? null : (() => { const item = record(execution.current); return { package: typeof item.package === "string" ? item.package : null, product: typeof item.product === "string" ? item.product : null, reason: typeof item.reason === "string" ? item.reason : null }; })(),
      nextFive: (Array.isArray(execution.nextFive) ? execution.nextFive : []).map(record).map((item) => ({ package: typeof item.package === "string" ? item.package : null, product: typeof item.product === "string" ? item.product : null, reason: typeof item.reason === "string" ? item.reason : null, priority: typeof item.priority === "string" ? item.priority : null, phase: typeof item.phase === "string" ? item.phase : null })),
      blocked: (Array.isArray(execution.blocked) ? execution.blocked : []).map(record).map((item) => ({ package: typeof item.package === "string" ? item.package : null, product: typeof item.product === "string" ? item.product : null, reason: typeof item.reason === "string" ? item.reason : null, ownerDecisionRequired: item.ownerDecisionRequired === true, blockingDependencies: strings(item.blockingDependencies) })),
      waiting: (Array.isArray(execution.waiting) ? execution.waiting : []).map(record).map((item) => ({ package: typeof item.package === "string" ? item.package : null, product: typeof item.product === "string" ? item.product : null, reason: typeof item.reason === "string" ? item.reason : null, ownerDecisionRequired: item.ownerDecisionRequired === true, blockingDependencies: strings(item.blockingDependencies) })),
      recentlyCompleted: (Array.isArray(execution.recentlyCompleted) ? execution.recentlyCompleted : []).map(record).map((item) => ({ package: typeof item.package === "string" ? item.package : null, product: typeof item.product === "string" ? item.product : null, reason: typeof item.reason === "string" ? item.reason : null, priority: typeof item.priority === "string" ? item.priority : null, phase: typeof item.phase === "string" ? item.phase : null })),
      reconciliation: (() => { const item = record(execution.packageReconciliation); return { reconciledAt: typeof item.reconciledAt === "string" ? item.reconciledAt : null, total: Number.isInteger(item.total) ? Number(item.total) : 0, completed: Number.isInteger(item.completed) ? Number(item.completed) : 0, remaining: Number.isInteger(item.remaining) ? Number(item.remaining) : 0, currentExecutableProduct: typeof item.currentExecutableProduct === "string" ? item.currentExecutableProduct : null, currentExecutablePackage: typeof item.currentExecutablePackage === "string" ? item.currentExecutablePackage : null, warningCount: Number.isInteger(item.warningCount) ? Number(item.warningCount) : 0 }; })(),
    },
    releases: projection.releases.map(record).map((item) => ({
      id: String(item.id), product: String(item.product), module: typeof item.module === "string" ? item.module : null, version: typeof item.version === "string" ? item.version : null, type: String(item.type ?? ""), status: String(item.state), releaseDate: typeof item.releaseDate === "string" ? item.releaseDate : null, ownerApproved: item.ownerApproved === true, validationState: typeof item.validationState === "string" ? item.validationState : null, dependencies: strings(item.dependencies), blockers: strings(item.blockers), evidenceSummary: String(item.evidenceSummary ?? ""), evidenceReference: typeof item.evidenceReference === "string" ? item.evidenceReference : null, preview: "not_in_projection_v1" as const, production: "not_in_projection_v1" as const, servedCommit: null, declaredDeployment: String(item.declaredDeployment), source: "beastfusion" as const,
    })),
    governance: {
      registryVersion: String(governance.registryVersion ?? ""), packageRegistryVersion: String(governance.packageRegistryVersion ?? ""), executionStateVersion: String(governance.executionStateVersion ?? ""), automationEnabled: governance.automationEnabled === true, autonomousExecution: governance.autonomousExecution === true, deploymentCapability: governance.deploymentCapability === true, beastShieldState: String(governance.beastShieldState ?? ""), beastShieldMeaning: String(governance.beastShieldMeaning ?? ""), dependencyIntegrity: String(governance.dependencyIntegrity ?? ""), validatorState: String(governance.validatorState ?? ""), warningCodes: strings(governance.warningCodes), errorCodes: strings(governance.errorCodes),
    },
    validation: {
      projectionSchema: String(validation.projectionSchema ?? ""), projectionGenerated: validation.projectionGenerated === true, canonicalConsistency: String(validation.canonicalConsistency ?? ""), lastGovernedEvidenceReference: typeof validation.lastGovernedEvidenceReference === "string" ? validation.lastGovernedEvidenceReference : null, lastGovernedEvidenceDate: typeof validation.lastGovernedEvidenceDate === "string" ? validation.lastGovernedEvidenceDate : null, testCount: Number.isInteger(validation.testCount) ? Number(validation.testCount) : null, warnings: strings(validation.warnings),
    },
    records: projection.sourceManifest.map(record).map((item) => ({ id: `record:${String(item.path)}`, label: String(item.path), path: String(item.path), role: String(item.role), digest: String(item.digest), updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null })),
    attention,
  };
}

export function reconcileCanonicalAndLegacy<T extends { id: string }>(canonical: T[], legacy: Array<T & { classification?: BeastAdminLegacyClassification }>) {
  const canonicalIds = new Set(canonical.map((item) => item.id));
  return {
    canonical,
    legacy: legacy.map((item) => ({ ...item, classification: (item.classification ?? "legacy") as BeastAdminLegacyClassification })),
    conflicts: legacy.filter((item) => canonicalIds.has(item.id)).map((item) => ({ id: item.id, resolution: "beastfusion_wins" as const })),
  };
}
