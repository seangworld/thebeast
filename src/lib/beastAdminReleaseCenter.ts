export const beastAdminReleaseProducts = [
  "platform",
  "beastos",
  "money",
  "education",
  "health",
  "goals",
  "documents",
  "home",
  "security",
  "fusion",
  "admin",
  "seangworld",
] as const;

export type BeastAdminReleaseProduct =
  (typeof beastAdminReleaseProducts)[number];

export const beastAdminReleaseProductLabels: Record<
  BeastAdminReleaseProduct,
  string
> = {
  platform: "The Beast",
  beastos: "BeastOS",
  money: "BeastMoney",
  education: "BeastEducation",
  health: "BeastHealth",
  goals: "BeastGoals",
  documents: "BeastDocuments",
  home: "BeastHome",
  security: "BeastSecurity",
  fusion: "BeastFusion",
  admin: "BeastAdmin",
  seangworld: "SEANGWORLD",
};

export const beastAdminValidationStatuses = [
  "not_started",
  "in_progress",
  "passed",
  "passed_with_limits",
  "failed",
] as const;

export type BeastAdminValidationStatus =
  (typeof beastAdminValidationStatuses)[number];

export const beastAdminValidationStatusLabels: Record<
  BeastAdminValidationStatus,
  string
> = {
  not_started: "Not started",
  in_progress: "In progress",
  passed: "Passed",
  passed_with_limits: "Passed with limits",
  failed: "Failed",
};

export const beastAdminDeploymentStatuses = [
  "not_deployed",
  "scheduled",
  "deploying",
  "deployed",
  "failed",
  "rolled_back",
] as const;

export type BeastAdminDeploymentStatus =
  (typeof beastAdminDeploymentStatuses)[number];

export const beastAdminDeploymentStatusLabels: Record<
  BeastAdminDeploymentStatus,
  string
> = {
  not_deployed: "Not deployed",
  scheduled: "Scheduled",
  deploying: "Deploying",
  deployed: "Deployed",
  failed: "Failed",
  rolled_back: "Rolled back",
};

export type BeastAdminReleaseRecord = {
  id: string;
  product: BeastAdminReleaseProduct;
  version: string;
  releaseDate: string;
  title: string;
  summary: string;
  modulesIncluded: BeastAdminReleaseProduct[];
  bugFixes: string[];
  features: string[];
  databaseMigrations: string[];
  validationStatus: BeastAdminValidationStatus;
  validationChecks: string[];
  validationNotes: string;
  validatedAt: string | null;
  deploymentStatus: BeastAdminDeploymentStatus;
  deploymentReference: string;
  deploymentNotes: string;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim())
  );
}

export function isBeastAdminReleaseProduct(
  value: unknown
): value is BeastAdminReleaseProduct {
  return beastAdminReleaseProducts.includes(
    value as BeastAdminReleaseProduct
  );
}

export function isBeastAdminValidationStatus(
  value: unknown
): value is BeastAdminValidationStatus {
  return beastAdminValidationStatuses.includes(
    value as BeastAdminValidationStatus
  );
}

export function isBeastAdminDeploymentStatus(
  value: unknown
): value is BeastAdminDeploymentStatus {
  return beastAdminDeploymentStatuses.includes(
    value as BeastAdminDeploymentStatus
  );
}

export function normalizeBeastAdminReleaseRecords(
  value: unknown
): BeastAdminReleaseRecord[] | null {
  if (!Array.isArray(value)) return null;

  const records = value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      !isBeastAdminReleaseProduct(record.product) ||
      typeof record.version !== "string" ||
      !record.version.trim() ||
      !isDate(record.releaseDate) ||
      typeof record.title !== "string" ||
      !record.title.trim() ||
      typeof record.summary !== "string" ||
      !isStringArray(record.modulesIncluded) ||
      !record.modulesIncluded.length ||
      !record.modulesIncluded.every(isBeastAdminReleaseProduct) ||
      !isStringArray(record.bugFixes) ||
      !isStringArray(record.features) ||
      !isStringArray(record.databaseMigrations) ||
      !isBeastAdminValidationStatus(record.validationStatus) ||
      !isStringArray(record.validationChecks) ||
      typeof record.validationNotes !== "string" ||
      (record.validatedAt !== null && !isTimestamp(record.validatedAt)) ||
      !isBeastAdminDeploymentStatus(record.deploymentStatus) ||
      typeof record.deploymentReference !== "string" ||
      typeof record.deploymentNotes !== "string" ||
      (record.deployedAt !== null && !isTimestamp(record.deployedAt)) ||
      (record.deploymentStatus === "deployed" &&
        record.deployedAt === null) ||
      !isTimestamp(record.createdAt) ||
      !isTimestamp(record.updatedAt)
    ) {
      return null;
    }

    return {
      id: record.id,
      product: record.product,
      version: record.version.trim(),
      releaseDate: record.releaseDate,
      title: record.title.trim(),
      summary: record.summary.trim(),
      modulesIncluded: record.modulesIncluded,
      bugFixes: record.bugFixes.map((item) => item.trim()),
      features: record.features.map((item) => item.trim()),
      databaseMigrations: record.databaseMigrations.map((item) => item.trim()),
      validationStatus: record.validationStatus,
      validationChecks: record.validationChecks.map((item) => item.trim()),
      validationNotes: record.validationNotes.trim(),
      validatedAt: record.validatedAt as string | null,
      deploymentStatus: record.deploymentStatus,
      deploymentReference: record.deploymentReference.trim(),
      deploymentNotes: record.deploymentNotes.trim(),
      deployedAt: record.deployedAt as string | null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    } satisfies BeastAdminReleaseRecord;
  });

  return records.every(
    (record): record is BeastAdminReleaseRecord => Boolean(record)
  )
    ? records
    : null;
}

export function filterBeastAdminReleaseRecords(
  releases: BeastAdminReleaseRecord[],
  {
    query = "",
    product = "all",
    validationStatus = "all",
    deploymentStatus = "all",
  }: {
    query?: string;
    product?: BeastAdminReleaseProduct | "all";
    validationStatus?: BeastAdminValidationStatus | "all";
    deploymentStatus?: BeastAdminDeploymentStatus | "all";
  } = {}
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return releases
    .filter((release) => {
      if (product !== "all" && release.product !== product) return false;
      if (
        validationStatus !== "all" &&
        release.validationStatus !== validationStatus
      ) {
        return false;
      }
      if (
        deploymentStatus !== "all" &&
        release.deploymentStatus !== deploymentStatus
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      return [
        release.version,
        release.title,
        release.summary,
        beastAdminReleaseProductLabels[release.product],
        release.deploymentReference,
        ...release.modulesIncluded.map(
          (module) => beastAdminReleaseProductLabels[module]
        ),
        ...release.bugFixes,
        ...release.features,
        ...release.databaseMigrations,
        ...release.validationChecks,
      ].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery)
      );
    })
    .sort(
      (left, right) =>
        right.releaseDate.localeCompare(left.releaseDate) ||
        right.createdAt.localeCompare(left.createdAt)
    );
}

export function buildBeastAdminReleaseSummary(
  releases: BeastAdminReleaseRecord[]
) {
  return {
    releases: releases.length,
    deployed: releases.filter(
      (release) => release.deploymentStatus === "deployed"
    ).length,
    validationPassed: releases.filter((release) =>
      ["passed", "passed_with_limits"].includes(release.validationStatus)
    ).length,
    withMigrations: releases.filter(
      (release) => release.databaseMigrations.length > 0
    ).length,
    needsAttention: releases.filter(
      (release) =>
        release.validationStatus === "failed" ||
        ["failed", "rolled_back"].includes(release.deploymentStatus)
    ).length,
  };
}
