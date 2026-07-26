export const beastAdminPlatformServiceIds = [
  "authentication",
  "database",
  "api",
  "storage",
  "email",
  "ai",
  "performance",
  "background_jobs",
] as const;

export type BeastAdminPlatformServiceId =
  (typeof beastAdminPlatformServiceIds)[number];

export const beastAdminPlatformServiceLabels: Record<
  BeastAdminPlatformServiceId,
  string
> = {
  authentication: "Authentication",
  database: "Database",
  api: "API",
  storage: "Storage",
  email: "Email",
  ai: "AI",
  performance: "Performance",
  background_jobs: "Background jobs",
};

export const beastAdminPlatformHealthStatuses = [
  "operational",
  "warning",
  "critical",
  "unknown",
] as const;

export type BeastAdminPlatformHealthStatus =
  (typeof beastAdminPlatformHealthStatuses)[number];

export const beastAdminPlatformHealthStatusLabels: Record<
  BeastAdminPlatformHealthStatus,
  string
> = {
  operational: "Operational",
  warning: "Warning",
  critical: "Critical",
  unknown: "Monitoring gap",
};

export type BeastAdminPlatformHealthSource =
  | "live_probe"
  | "configuration"
  | "request_sample"
  | "not_connected";

export type BeastAdminPlatformHealthSignal = {
  id: BeastAdminPlatformServiceId;
  status: BeastAdminPlatformHealthStatus;
  summary: string;
  evidence: string;
  source: BeastAdminPlatformHealthSource;
  checkedAt: string;
  latencyMs: number | null;
};

export type BeastAdminPlatformHealthIssue = {
  serviceId: BeastAdminPlatformServiceId;
  serviceLabel: string;
  severity: "error" | "warning";
  message: string;
};

export type BeastAdminPlatformHealthSnapshot = {
  overallStatus: BeastAdminPlatformHealthStatus;
  generatedAt: string;
  services: BeastAdminPlatformHealthSignal[];
  errors: BeastAdminPlatformHealthIssue[];
  warnings: BeastAdminPlatformHealthIssue[];
};

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

export function isBeastAdminPlatformHealthStatus(
  value: unknown
): value is BeastAdminPlatformHealthStatus {
  return beastAdminPlatformHealthStatuses.includes(
    value as BeastAdminPlatformHealthStatus
  );
}

function isBeastAdminPlatformServiceId(
  value: unknown
): value is BeastAdminPlatformServiceId {
  return beastAdminPlatformServiceIds.includes(
    value as BeastAdminPlatformServiceId
  );
}

function normalizeSignal(
  value: unknown
): BeastAdminPlatformHealthSignal | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    !isBeastAdminPlatformServiceId(record.id) ||
    !isBeastAdminPlatformHealthStatus(record.status) ||
    typeof record.summary !== "string" ||
    !record.summary.trim() ||
    typeof record.evidence !== "string" ||
    !record.evidence.trim() ||
    !["live_probe", "configuration", "request_sample", "not_connected"].includes(
      String(record.source)
    ) ||
    !isTimestamp(record.checkedAt) ||
    (record.latencyMs !== null &&
      (typeof record.latencyMs !== "number" ||
        !Number.isFinite(record.latencyMs) ||
        record.latencyMs < 0))
  ) {
    return null;
  }

  return {
    id: record.id,
    status: record.status,
    summary: record.summary.trim(),
    evidence: record.evidence.trim(),
    source: record.source as BeastAdminPlatformHealthSource,
    checkedAt: record.checkedAt,
    latencyMs: record.latencyMs as number | null,
  };
}

function normalizeIssue(
  value: unknown
): BeastAdminPlatformHealthIssue | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    !isBeastAdminPlatformServiceId(record.serviceId) ||
    typeof record.serviceLabel !== "string" ||
    !record.serviceLabel.trim() ||
    !["error", "warning"].includes(String(record.severity)) ||
    typeof record.message !== "string" ||
    !record.message.trim()
  ) {
    return null;
  }
  return {
    serviceId: record.serviceId,
    serviceLabel: record.serviceLabel.trim(),
    severity: record.severity as "error" | "warning",
    message: record.message.trim(),
  };
}

export function normalizeBeastAdminPlatformHealthSnapshot(
  value: unknown
): BeastAdminPlatformHealthSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    !isBeastAdminPlatformHealthStatus(record.overallStatus) ||
    !isTimestamp(record.generatedAt) ||
    !Array.isArray(record.services) ||
    !Array.isArray(record.errors) ||
    !Array.isArray(record.warnings)
  ) {
    return null;
  }

  const services = record.services.map(normalizeSignal);
  const errors = record.errors.map(normalizeIssue);
  const warnings = record.warnings.map(normalizeIssue);
  if (
    !services.every(
      (signal): signal is BeastAdminPlatformHealthSignal => Boolean(signal)
    ) ||
    services.length !== beastAdminPlatformServiceIds.length ||
    new Set(services.map((signal) => signal.id)).size !==
      beastAdminPlatformServiceIds.length ||
    !errors.every(
      (issue): issue is BeastAdminPlatformHealthIssue => Boolean(issue)
    ) ||
    !warnings.every(
      (issue): issue is BeastAdminPlatformHealthIssue => Boolean(issue)
    )
  ) {
    return null;
  }

  return {
    overallStatus: record.overallStatus,
    generatedAt: record.generatedAt,
    services,
    errors,
    warnings,
  };
}

export function buildBeastAdminPlatformHealthSnapshot({
  services,
  generatedAt = new Date().toISOString(),
}: {
  services: BeastAdminPlatformHealthSignal[];
  generatedAt?: string;
}): BeastAdminPlatformHealthSnapshot {
  if (
    services.length !== beastAdminPlatformServiceIds.length ||
    new Set(services.map((service) => service.id)).size !==
      beastAdminPlatformServiceIds.length
  ) {
    throw new Error(
      "Platform Health requires one signal for every monitored service."
    );
  }

  const errors = services
    .filter((service) => service.status === "critical")
    .map((service) => ({
      serviceId: service.id,
      serviceLabel: beastAdminPlatformServiceLabels[service.id],
      severity: "error" as const,
      message: service.summary,
    }));
  const warnings = services
    .filter((service) => service.status === "warning")
    .map((service) => ({
      serviceId: service.id,
      serviceLabel: beastAdminPlatformServiceLabels[service.id],
      severity: "warning" as const,
      message: service.summary,
    }));
  const overallStatus = errors.length
    ? "critical"
    : warnings.length
      ? "warning"
      : services.some((service) => service.status === "unknown")
        ? "unknown"
        : "operational";

  return {
    overallStatus,
    generatedAt,
    services,
    errors,
    warnings,
  };
}

export function getBeastAdminPlatformHealthCounts(
  snapshot: BeastAdminPlatformHealthSnapshot
) {
  return beastAdminPlatformHealthStatuses.reduce<
    Record<BeastAdminPlatformHealthStatus, number>
  >(
    (counts, status) => {
      counts[status] = snapshot.services.filter(
        (service) => service.status === status
      ).length;
      return counts;
    },
    { operational: 0, warning: 0, critical: 0, unknown: 0 }
  );
}
