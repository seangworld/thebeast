import { createHash } from "node:crypto";

export const beastFusionProjectionVersion = "1.0.0";
export const beastFusionProjectionSchema =
  "beastfusion-command-center-projection.schema.json";
export const beastFusionProjectionMaxBytes = 1024 * 1024;

const shaPattern = /^[0-9a-f]{40}$/;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const projectionIdPattern = /^bfcp_[0-9a-f]{16}$/;
const dateOrTimestampPattern = /^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/;
const sourceRoles = new Set(["constitution", "governance_registry", "package_registry", "execution_state", "scheduler", "release_registry", "version_registry", "agent_registry", "active_roadmap", "planned_roadmap", "roadmap_source"]);
const canonicalStates = new Set(["planning", "approved_not_executable", "ready", "in_progress", "blocked", "validation", "released", "complete", "archived"]);
const requiredSourcePaths = new Set([
  "MANIFEST.md",
  "state/governance-registry.json",
  "state/beastfusion-package-registry.json",
  "state/ecosystem-execution-state.json",
  "state/ecosystem-work-scheduler.json",
  "state/ecosystem-release-registry.json",
  "state/ecosystem-version-registry.json",
  "state/shared-agent-registry.json",
  "versions/versions.json",
]);

const exactKeyContracts = {
  projection: ["$schema", "projectionVersion", "projectionId", "generatedAt", "source", "classification", "sourceManifest", "summary", "portfolio", "roadmap", "execution", "releases", "governance", "validation"],
  source: ["owner", "repository", "branch", "commit", "canonicalInputDigest", "generatorVersion"],
  classification: ["audience", "containsMemberData", "containsSecrets", "containsRawPrompts"],
  sourceManifestItem: ["path", "role", "digest", "updatedAt"],
  summary: ["cursorPath", "cursorMode", "executableWorkAvailable", "selectedPackage", "selectedProduct", "selectionReason", "recommendedDirective", "ownerDecisionRequired", "ownerDecisionReason", "warningCount", "errorCount"],
  roadmap: ["items", "documents", "warnings"],
  roadmapItem: ["id", "product", "title", "summary", "canonicalState", "ownerApproved", "executionAuthorized", "prerequisitesComplete", "blocked", "executable", "priority", "roadmapOrder", "dependencies", "blockerCodes", "ownerAction", "sourceReference", "evidenceReferences"],
  roadmapDocument: ["product", "title", "path", "classification", "ownerApproved", "digest", "indexedItemCount", "unindexedWarningCount"],
  execution: ["cursorPath", "terminalState", "current", "nextFive", "blocked", "waiting", "recentlyCompleted", "packageReconciliation", "events"],
  executionSelection: ["package", "product", "reason"],
  executionQueueItem: ["package", "product", "reason", "priority", "phase"],
  executionBlockedItem: ["package", "product", "reason", "ownerDecisionRequired", "blockingDependencies"],
  executionReconciliation: ["reconciledAt", "total", "completed", "remaining", "currentExecutableProduct", "currentExecutablePackage", "warningCount"],
  executionEvent: ["id", "type", "product", "package", "occurredAt", "summary", "authorizationClass", "evidenceReference"],
  releaseItem: ["id", "product", "module", "version", "type", "state", "releaseDate", "ownerApproved", "validationState", "dependencies", "blockers", "evidenceSummary", "evidenceReference", "declaredDeployment"],
  portfolioItem: ["id", "name", "parent", "ownerRepository", "lifecycle", "version", "buildId", "releaseDate", "channel", "declaredDeployment", "deploymentEvidenceType", "activeRoadmap"],
  governance: ["registryVersion", "packageRegistryVersion", "executionStateVersion", "automationEnabled", "autonomousExecution", "deploymentCapability", "beastShieldState", "beastShieldMeaning", "dependencyIntegrity", "validatorState", "warningCodes", "errorCodes"],
  validation: ["projectionSchema", "projectionGenerated", "canonicalConsistency", "lastGovernedEvidenceReference", "lastGovernedEvidenceDate", "testCount", "warnings"],
} as const;

type JsonRecord = Record<string, unknown>;

export type BeastFusionCommandProjection = JsonRecord & {
  $schema: string;
  projectionVersion: string;
  projectionId: string;
  generatedAt: string;
  source: {
    owner: string;
    repository: string;
    branch: string;
    commit: string;
    canonicalInputDigest: string;
    generatorVersion: string;
  };
  classification: {
    audience: string;
    containsMemberData: boolean;
    containsSecrets: boolean;
    containsRawPrompts: boolean;
  };
  sourceManifest: Array<{ path: string; role: string; digest: string; updatedAt: string | null }>;
  summary: JsonRecord;
  portfolio: JsonRecord[];
  roadmap: { items: JsonRecord[]; documents: JsonRecord[]; warnings: string[] };
  execution: JsonRecord & { events: JsonRecord[] };
  releases: JsonRecord[];
  governance: JsonRecord;
  validation: JsonRecord;
};

export type BeastFusionProjectionValidation =
  | { ok: true; projection: BeastFusionCommandProjection; payloadHash: string; canonicalInputDigest: string }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.endsWith("Z") && !Number.isNaN(Date.parse(value));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

export function stableProjectionString(value: unknown) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function exactKeys(value: unknown, expected: readonly string[], label: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())) {
    errors.push(`${label} contains missing or unknown fields.`);
  }
}

function array(value: unknown, label: string, errors: string[]): unknown[] {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return [];
  }
  return value;
}

function stringValue(value: unknown, label: string, errors: string[], options: { min?: number; max?: number; values?: Set<string>; nullable?: boolean; pattern?: RegExp } = {}) {
  if (value === null && options.nullable) return;
  if (typeof value !== "string" || (options.min !== undefined && value.length < options.min) || (options.max !== undefined && value.length > options.max) || (options.values && !options.values.has(value)) || (options.pattern && !options.pattern.test(value))) errors.push(`${label} is invalid.`);
}

function booleanValue(value: unknown, label: string, errors: string[], constant?: boolean) {
  if (typeof value !== "boolean" || (constant !== undefined && value !== constant)) errors.push(`${label} is invalid.`);
}

function integerValue(value: unknown, label: string, errors: string[], nullable = false) {
  if (value === null && nullable) return;
  if (!Number.isInteger(value) || Number(value) < 0) errors.push(`${label} must be a non-negative integer.`);
}

function nullableDate(value: unknown, label: string, errors: string[]) {
  if (value !== null && (typeof value !== "string" || !dateOrTimestampPattern.test(value))) errors.push(`${label} is invalid.`);
}

function stringArray(value: unknown, label: string, errors: string[], options: { maxItems?: number; maxLength?: number; nonEmpty?: boolean } = {}) {
  const values = array(value, label, errors);
  if (options.maxItems !== undefined && values.length > options.maxItems) errors.push(`${label} contains too many items.`);
  if (values.some((item) => typeof item !== "string" || item.length > (options.maxLength ?? 400) || (options.nonEmpty && item.length === 0)) || new Set(values).size !== values.length) errors.push(`${label} must contain unique valid strings.`);
}

function validatePrimitiveContract(projection: JsonRecord, errors: string[]) {
  const summary = recordForValidation(projection.summary);
  stringArray(summary.cursorPath, "summary.cursorPath", errors);
  stringValue(summary.cursorMode, "summary.cursorMode", errors, { max: 80 });
  booleanValue(summary.executableWorkAvailable, "summary.executableWorkAvailable", errors);
  for (const key of ["selectedPackage", "selectedProduct", "selectionReason", "recommendedDirective", "ownerDecisionReason"]) stringValue(summary[key], `summary.${key}`, errors, { nullable: true });
  booleanValue(summary.ownerDecisionRequired, "summary.ownerDecisionRequired", errors);
  integerValue(summary.warningCount, "summary.warningCount", errors);
  if (summary.errorCount !== 0) errors.push("summary.errorCount must be zero.");

  array(projection.sourceManifest, "sourceManifest", errors).forEach((raw, index) => {
    const item = recordForValidation(raw);
    stringValue(item.path, `sourceManifest[${index}].path`, errors, { min: 1, max: 300, pattern: /^(?!\/)(?!.*\.\.)/ });
    stringValue(item.role, `sourceManifest[${index}].role`, errors, { values: sourceRoles });
    stringValue(item.digest, `sourceManifest[${index}].digest`, errors, { pattern: digestPattern });
    stringValue(item.updatedAt, `sourceManifest[${index}].updatedAt`, errors, { nullable: true, max: 40 });
  });

  array(projection.portfolio, "portfolio", errors).forEach((raw, index) => {
    const item = recordForValidation(raw);
    stringValue(item.id, `portfolio[${index}].id`, errors, { min: 1, max: 80 });
    stringValue(item.name, `portfolio[${index}].name`, errors, { min: 1, max: 100 });
    for (const key of ["parent", "ownerRepository", "version", "buildId", "channel", "activeRoadmap"]) stringValue(item[key], `portfolio[${index}].${key}`, errors, { nullable: true });
    stringValue(item.lifecycle, `portfolio[${index}].lifecycle`, errors, { max: 80 });
    nullableDate(item.releaseDate, `portfolio[${index}].releaseDate`, errors);
    stringValue(item.declaredDeployment, `portfolio[${index}].declaredDeployment`, errors, { max: 80 });
    if (item.deploymentEvidenceType !== "canonical_declaration") errors.push(`portfolio[${index}].deploymentEvidenceType is invalid.`);
  });

  const roadmap = recordForValidation(projection.roadmap);
  stringArray(roadmap.warnings, "roadmap.warnings", errors, { nonEmpty: true });
  array(roadmap.items, "roadmap.items", errors).forEach((raw, index) => {
    const item = recordForValidation(raw);
    stringValue(item.id, `roadmap.items[${index}].id`, errors, { min: 2, max: 80 });
    stringValue(item.product, `roadmap.items[${index}].product`, errors, { min: 1, max: 80 });
    stringValue(item.title, `roadmap.items[${index}].title`, errors, { min: 1, max: 180 });
    stringValue(item.summary, `roadmap.items[${index}].summary`, errors, { min: 1, max: 320 });
    stringValue(item.canonicalState, `roadmap.items[${index}].canonicalState`, errors, { values: canonicalStates });
    for (const key of ["ownerApproved", "executionAuthorized", "prerequisitesComplete", "blocked", "executable"]) booleanValue(item[key], `roadmap.items[${index}].${key}`, errors);
    stringValue(item.priority, `roadmap.items[${index}].priority`, errors, { max: 40 });
    integerValue(item.roadmapOrder, `roadmap.items[${index}].roadmapOrder`, errors);
    for (const key of ["dependencies", "blockerCodes", "evidenceReferences"]) stringArray(item[key], `roadmap.items[${index}].${key}`, errors);
    stringValue(item.ownerAction, `roadmap.items[${index}].ownerAction`, errors, { nullable: true });
    stringValue(item.sourceReference, `roadmap.items[${index}].sourceReference`, errors, { min: 1, max: 300 });
  });
  array(roadmap.documents, "roadmap.documents", errors).forEach((raw, index) => {
    const item = recordForValidation(raw);
    stringValue(item.product, `roadmap.documents[${index}].product`, errors, { min: 1, max: 80 });
    stringValue(item.title, `roadmap.documents[${index}].title`, errors, { min: 1, max: 160 });
    stringValue(item.path, `roadmap.documents[${index}].path`, errors, { min: 1, max: 300 });
    stringValue(item.classification, `roadmap.documents[${index}].classification`, errors, { values: new Set(["active", "planned"]) });
    booleanValue(item.ownerApproved, `roadmap.documents[${index}].ownerApproved`, errors);
    stringValue(item.digest, `roadmap.documents[${index}].digest`, errors, { pattern: digestPattern });
    integerValue(item.indexedItemCount, `roadmap.documents[${index}].indexedItemCount`, errors);
    integerValue(item.unindexedWarningCount, `roadmap.documents[${index}].unindexedWarningCount`, errors);
  });

  const execution = recordForValidation(projection.execution);
  stringArray(execution.cursorPath, "execution.cursorPath", errors);
  stringValue(execution.terminalState, "execution.terminalState", errors, { max: 80 });
  if (execution.current !== null) validateExecutionSelection(recordForValidation(execution.current), "execution.current", errors);
  for (const key of ["nextFive", "recentlyCompleted"]) array(execution[key], `execution.${key}`, errors).forEach((raw, index) => validateExecutionQueue(recordForValidation(raw), `execution.${key}[${index}]`, errors));
  if (array(execution.nextFive, "execution.nextFive", errors).length > 5) errors.push("execution.nextFive contains too many items.");
  for (const key of ["blocked", "waiting"]) array(execution[key], `execution.${key}`, errors).forEach((raw, index) => {
    const item = recordForValidation(raw);
    for (const field of ["package", "product", "reason"]) stringValue(item[field], `execution.${key}[${index}].${field}`, errors, { nullable: true });
    booleanValue(item.ownerDecisionRequired, `execution.${key}[${index}].ownerDecisionRequired`, errors);
    stringArray(item.blockingDependencies, `execution.${key}[${index}].blockingDependencies`, errors);
  });
  const reconciliation = recordForValidation(execution.packageReconciliation);
  nullableDate(reconciliation.reconciledAt, "execution.packageReconciliation.reconciledAt", errors);
  for (const key of ["total", "completed", "remaining", "warningCount"]) integerValue(reconciliation[key], `execution.packageReconciliation.${key}`, errors);
  for (const key of ["currentExecutableProduct", "currentExecutablePackage"]) stringValue(reconciliation[key], `execution.packageReconciliation.${key}`, errors, { nullable: true });
  array(execution.events, "execution.events", errors).forEach((raw, index) => {
    const item = recordForValidation(raw);
    stringValue(item.id, `execution.events[${index}].id`, errors, { pattern: /^bfe_[0-9a-f]{16}$/ });
    stringValue(item.type, `execution.events[${index}].type`, errors, { min: 1, max: 80 });
    stringValue(item.product, `execution.events[${index}].product`, errors, { min: 1, max: 80 });
    stringValue(item.package, `execution.events[${index}].package`, errors, { nullable: true });
    nullableDate(item.occurredAt, `execution.events[${index}].occurredAt`, errors);
    stringValue(item.summary, `execution.events[${index}].summary`, errors, { min: 1, max: 400 });
    if (item.authorizationClass !== "governed_execution_record") errors.push(`execution.events[${index}].authorizationClass is invalid.`);
    stringValue(item.evidenceReference, `execution.events[${index}].evidenceReference`, errors, { nullable: true });
  });

  array(projection.releases, "releases", errors).forEach((raw, index) => {
    const item = recordForValidation(raw);
    stringValue(item.id, `releases[${index}].id`, errors, { min: 1, max: 160 });
    stringValue(item.product, `releases[${index}].product`, errors, { min: 1, max: 80 });
    for (const key of ["module", "version", "evidenceReference"]) stringValue(item[key], `releases[${index}].${key}`, errors, { nullable: true });
    for (const key of ["type", "state", "validationState"]) stringValue(item[key], `releases[${index}].${key}`, errors, { max: 80 });
    nullableDate(item.releaseDate, `releases[${index}].releaseDate`, errors);
    booleanValue(item.ownerApproved, `releases[${index}].ownerApproved`, errors);
    stringArray(item.dependencies, `releases[${index}].dependencies`, errors);
    stringArray(item.blockers, `releases[${index}].blockers`, errors);
    stringValue(item.evidenceSummary, `releases[${index}].evidenceSummary`, errors, { min: 1, max: 200 });
    stringValue(item.declaredDeployment, `releases[${index}].declaredDeployment`, errors, { values: new Set(["released_recorded", "not_released"]) });
  });

  const governance = recordForValidation(projection.governance);
  for (const key of ["registryVersion", "packageRegistryVersion", "executionStateVersion", "beastShieldState"]) stringValue(governance[key], `governance.${key}`, errors);
  for (const key of ["automationEnabled", "autonomousExecution", "deploymentCapability"]) booleanValue(governance[key], `governance.${key}`, errors, false);
  if (governance.beastShieldMeaning !== "governance_declaration_not_live_control_verification") errors.push("governance.beastShieldMeaning is invalid.");
  if (governance.dependencyIntegrity !== "validated_by_beastfusion") errors.push("governance.dependencyIntegrity is invalid.");
  stringValue(governance.validatorState, "governance.validatorState", errors, { values: new Set(["registered_complete", "attention"]) });
  stringArray(governance.warningCodes, "governance.warningCodes", errors);
  if (!Array.isArray(governance.errorCodes) || governance.errorCodes.length !== 0) errors.push("governance.errorCodes must be empty.");

  const validation = recordForValidation(projection.validation);
  if (validation.projectionSchema !== beastFusionProjectionSchema || validation.projectionGenerated !== true || validation.canonicalConsistency !== "passed") errors.push("validation evidence is invalid.");
  stringValue(validation.lastGovernedEvidenceReference, "validation.lastGovernedEvidenceReference", errors, { nullable: true });
  nullableDate(validation.lastGovernedEvidenceDate, "validation.lastGovernedEvidenceDate", errors);
  integerValue(validation.testCount, "validation.testCount", errors, true);
  stringArray(validation.warnings, "validation.warnings", errors, { nonEmpty: true });
}

function recordForValidation(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function validateExecutionSelection(item: JsonRecord, label: string, errors: string[]) {
  for (const key of ["package", "product", "reason"]) stringValue(item[key], `${label}.${key}`, errors, { nullable: true });
}

function validateExecutionQueue(item: JsonRecord, label: string, errors: string[]) {
  for (const key of ["package", "product", "reason", "priority", "phase"]) stringValue(item[key], `${label}.${key}`, errors, { nullable: true });
}

function validateNestedKeys(projection: JsonRecord, errors: string[]) {
  exactKeys(projection, exactKeyContracts.projection, "projection", errors);
  exactKeys(projection.source, exactKeyContracts.source, "source", errors);
  exactKeys(projection.classification, exactKeyContracts.classification, "classification", errors);
  array(projection.sourceManifest, "sourceManifest", errors).forEach((item, index) => exactKeys(item, exactKeyContracts.sourceManifestItem, `sourceManifest[${index}]`, errors));
  exactKeys(projection.summary, exactKeyContracts.summary, "summary", errors);
  array(projection.portfolio, "portfolio", errors).forEach((item, index) => exactKeys(item, exactKeyContracts.portfolioItem, `portfolio[${index}]`, errors));
  exactKeys(projection.roadmap, exactKeyContracts.roadmap, "roadmap", errors);
  const roadmap = isRecord(projection.roadmap) ? projection.roadmap : {};
  array(roadmap.items, "roadmap.items", errors).forEach((item, index) => exactKeys(item, exactKeyContracts.roadmapItem, `roadmap.items[${index}]`, errors));
  array(roadmap.documents, "roadmap.documents", errors).forEach((item, index) => exactKeys(item, exactKeyContracts.roadmapDocument, `roadmap.documents[${index}]`, errors));
  exactKeys(projection.execution, exactKeyContracts.execution, "execution", errors);
  const execution = isRecord(projection.execution) ? projection.execution : {};
  if (execution.current !== null) exactKeys(execution.current, exactKeyContracts.executionSelection, "execution.current", errors);
  for (const key of ["nextFive", "recentlyCompleted"] as const) array(execution[key], `execution.${key}`, errors).forEach((item, index) => exactKeys(item, exactKeyContracts.executionQueueItem, `execution.${key}[${index}]`, errors));
  for (const key of ["blocked", "waiting"] as const) array(execution[key], `execution.${key}`, errors).forEach((item, index) => exactKeys(item, exactKeyContracts.executionBlockedItem, `execution.${key}[${index}]`, errors));
  exactKeys(execution.packageReconciliation, exactKeyContracts.executionReconciliation, "execution.packageReconciliation", errors);
  array(execution.events, "execution.events", errors).forEach((item, index) => exactKeys(item, exactKeyContracts.executionEvent, `execution.events[${index}]`, errors));
  array(projection.releases, "releases", errors).forEach((item, index) => exactKeys(item, exactKeyContracts.releaseItem, `releases[${index}]`, errors));
  exactKeys(projection.governance, exactKeyContracts.governance, "governance", errors);
  exactKeys(projection.validation, exactKeyContracts.validation, "validation", errors);
}

function inspectSensitive(value: unknown, errors: string[], location = "projection") {
  if (Array.isArray(value)) return value.forEach((item, index) => inspectSensitive(item, errors, `${location}[${index}]`));
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (/^(?:email|user_id|member_id|access_token|refresh_token|private_key|secret|prompt|response|health_data|financial_data|document_contents)$/i.test(key)) errors.push(`${location}.${key} is forbidden.`);
      inspectSensitive(item, errors, `${location}.${key}`);
    }
  } else if (typeof value === "string" && (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._-]+|\bsk-[A-Za-z0-9_-]{16,}/i.test(value) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value))) {
    errors.push(`${location} contains sensitive or credential-like content.`);
  }
}

export function validateBeastFusionCommandProjection(value: unknown): BeastFusionProjectionValidation {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["Projection must be an object."] };
  if (Buffer.byteLength(stableProjectionString(value), "utf8") > beastFusionProjectionMaxBytes) errors.push("Projection exceeds 1 MiB.");
  validateNestedKeys(value, errors);
  validatePrimitiveContract(value, errors);
  const source = isRecord(value.source) ? value.source : {};
  const classification = isRecord(value.classification) ? value.classification : {};
  if (value.$schema !== beastFusionProjectionSchema || value.projectionVersion !== beastFusionProjectionVersion) errors.push("Unsupported projection schema or version.");
  if (!projectionIdPattern.test(String(value.projectionId ?? ""))) errors.push("Invalid projection identity.");
  if (!isTimestamp(value.generatedAt)) errors.push("generatedAt must be a UTC timestamp.");
  if (source.owner !== "beastfusion" || source.repository !== "seangworld/beastfusion" || source.branch !== "main") errors.push("Invalid canonical BeastFusion source identity.");
  if (!shaPattern.test(String(source.commit ?? "")) || source.commit === "0".repeat(40)) errors.push("Invalid canonical BeastFusion commit.");
  if (source.generatorVersion !== beastFusionProjectionVersion || !digestPattern.test(String(source.canonicalInputDigest ?? ""))) errors.push("Invalid generator version or canonical input digest.");
  if (classification.audience !== "beastadmin_owner_only" || classification.containsMemberData !== false || classification.containsSecrets !== false || classification.containsRawPrompts !== false) errors.push("Invalid projection classification.");

  const sourceManifest = array(value.sourceManifest, "sourceManifest", errors).filter(isRecord);
  const paths = sourceManifest.map((item) => String(item.path ?? ""));
  if (paths.length < requiredSourcePaths.size || new Set(paths).size !== paths.length || JSON.stringify(paths) !== JSON.stringify([...paths].sort())) errors.push("Source manifest must be unique and deterministically sorted.");
  for (const required of Array.from(requiredSourcePaths)) if (!paths.includes(required)) errors.push(`Source manifest is missing ${required}.`);
  for (const item of sourceManifest) if (!String(item.path ?? "").match(/^(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+$/) || !digestPattern.test(String(item.digest ?? ""))) errors.push("Source manifest contains an unsafe path or malformed digest.");
  const calculatedInputDigest = sha256(sourceManifest.map((item) => `${item.path}\0${item.digest}`).join("\n"));
  if (source.canonicalInputDigest !== calculatedInputDigest) errors.push("Canonical input digest mismatch.");
  if (value.projectionId !== `bfcp_${calculatedInputDigest.slice(7, 23)}`) errors.push("Projection identity does not match canonical inputs.");

  const roadmap = isRecord(value.roadmap) ? value.roadmap : {};
  const roadmapItems = array(roadmap.items, "roadmap.items", errors).filter(isRecord);
  const roadmapIds = roadmapItems.map((item) => String(item.id ?? ""));
  if (roadmapIds.some((id) => !id) || new Set(roadmapIds).size !== roadmapIds.length) errors.push("Roadmap IDs must be non-empty and unique.");
  const releaseIds = array(value.releases, "releases", errors).filter(isRecord).map((item) => String(item.id ?? ""));
  if (new Set(releaseIds).size !== releaseIds.length) errors.push("Release IDs must be unique.");
  const execution = isRecord(value.execution) ? value.execution : {};
  const eventIds = array(execution.events, "execution.events", errors).filter(isRecord).map((item) => String(item.id ?? ""));
  if (new Set(eventIds).size !== eventIds.length) errors.push("Execution event IDs must be unique.");
  for (const item of roadmapItems.filter((entry) => entry.executable === true)) if (item.ownerApproved !== true || item.executionAuthorized !== true || item.prerequisitesComplete !== true || item.blocked !== false) errors.push(`Executable roadmap item ${item.id} bypasses a governance gate.`);
  const summary = isRecord(value.summary) ? value.summary : {};
  if (summary.executableWorkAvailable !== true && roadmapItems.some((item) => item.executable === true)) errors.push("Executable work conflicts with terminal summary.");
  if (summary.errorCount !== 0) errors.push("Canonical projection reports consistency errors.");
  inspectSensitive(value, errors);
  if (errors.length) return { ok: false, errors: Array.from(new Set(errors)) };
  return { ok: true, projection: value as BeastFusionCommandProjection, payloadHash: sha256(stableProjectionString(value)), canonicalInputDigest: calculatedInputDigest };
}

export type PublicationVerification = { ok: true } | { ok: false; reason: string };

export function verifyBeastFusionProjectionFreshness(generatedAt: string, now = Date.now(), maximumAgeMs = 24 * 60 * 60 * 1000, maximumFutureSkewMs = 5 * 60 * 1000): PublicationVerification {
  const generated = Date.parse(generatedAt);
  if (Number.isNaN(generated)) return { ok: false, reason: "Projection timestamp is invalid." };
  if (generated < now - maximumAgeMs) return { ok: false, reason: "Projection snapshot is stale." };
  if (generated > now + maximumFutureSkewMs) return { ok: false, reason: "Projection timestamp is in the future." };
  return { ok: true };
}
