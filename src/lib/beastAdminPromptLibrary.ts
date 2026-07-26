export const beastAdminPromptDomains = [
  "money",
  "education",
  "health",
  "goals",
  "fusion",
  "shared",
] as const;

export type BeastAdminPromptDomain =
  (typeof beastAdminPromptDomains)[number];

export const beastAdminPromptDomainLabels: Record<
  BeastAdminPromptDomain,
  string
> = {
  money: "Money",
  education: "Education",
  health: "Health",
  goals: "Goals",
  fusion: "Fusion",
  shared: "Shared prompts",
};

export const beastAdminPromptStatuses = [
  "draft",
  "in_review",
  "approved",
  "released",
  "archived",
] as const;

export type BeastAdminPromptStatus =
  (typeof beastAdminPromptStatuses)[number];

export const beastAdminPromptStatusLabels: Record<
  BeastAdminPromptStatus,
  string
> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  released: "Released",
  archived: "Archived",
};

export type BeastAdminPromptVersion = {
  id: string;
  version: string;
  systemPrompt: string;
  constraints: string[];
  variables: string[];
  changeSummary: string;
  status: BeastAdminPromptStatus;
  releaseDate: string | null;
  authorId: string | null;
  authorName: string;
  supersedesVersionId: string | null;
  rollbackOfVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BeastAdminPromptAsset = {
  id: string;
  key: string;
  name: string;
  domain: BeastAdminPromptDomain;
  description: string;
  versions: BeastAdminPromptVersion[];
  createdAt: string;
  updatedAt: string;
};

export const beastAdminPromptGovernanceRules = [
  "Prompt definitions use stable keys; prompt content lives in immutable versions.",
  "Every version records its author, change summary, lifecycle status, and release date when released.",
  "Only an approved version may move to Released. Released versions may be archived, never rewritten.",
  "Rollback prepares a new reviewed version from historical content instead of mutating history.",
  "The library does not replace code-owned prompts until a runtime explicitly adopts a released managed version.",
] as const;

const semanticVersionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

export function isBeastAdminPromptDomain(
  value: unknown
): value is BeastAdminPromptDomain {
  return beastAdminPromptDomains.includes(value as BeastAdminPromptDomain);
}

export function isBeastAdminPromptStatus(
  value: unknown
): value is BeastAdminPromptStatus {
  return beastAdminPromptStatuses.includes(value as BeastAdminPromptStatus);
}

export function isBeastAdminPromptVersion(value: string) {
  return semanticVersionPattern.test(value.trim());
}

function normalizeStringArray(value: unknown) {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string" && item.trim())
  ) {
    return null;
  }
  return value.map((item) => item.trim());
}

function normalizePromptVersion(
  value: unknown
): BeastAdminPromptVersion | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const constraints = normalizeStringArray(record.constraints);
  const variables = normalizeStringArray(record.variables);

  if (
    typeof record.id !== "string" ||
    typeof record.version !== "string" ||
    !isBeastAdminPromptVersion(record.version) ||
    typeof record.systemPrompt !== "string" ||
    !record.systemPrompt.trim() ||
    !constraints ||
    !variables ||
    typeof record.changeSummary !== "string" ||
    !record.changeSummary.trim() ||
    !isBeastAdminPromptStatus(record.status) ||
    (record.releaseDate !== null &&
      (typeof record.releaseDate !== "string" ||
        Number.isNaN(Date.parse(record.releaseDate)))) ||
    (record.status === "released" && record.releaseDate === null) ||
    (record.authorId !== null && typeof record.authorId !== "string") ||
    typeof record.authorName !== "string" ||
    !record.authorName.trim() ||
    (record.supersedesVersionId !== null &&
      typeof record.supersedesVersionId !== "string") ||
    (record.rollbackOfVersionId !== null &&
      typeof record.rollbackOfVersionId !== "string") ||
    !isTimestamp(record.createdAt) ||
    !isTimestamp(record.updatedAt)
  ) {
    return null;
  }

  return {
    id: record.id,
    version: record.version.trim(),
    systemPrompt: record.systemPrompt.trim(),
    constraints,
    variables,
    changeSummary: record.changeSummary.trim(),
    status: record.status,
    releaseDate: record.releaseDate as string | null,
    authorId: record.authorId as string | null,
    authorName: record.authorName.trim(),
    supersedesVersionId: record.supersedesVersionId as string | null,
    rollbackOfVersionId: record.rollbackOfVersionId as string | null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function normalizeBeastAdminPromptAssets(
  value: unknown
): BeastAdminPromptAsset[] | null {
  if (!Array.isArray(value)) return null;

  const assets = value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.key !== "string" ||
      !/^[a-z][a-z0-9_.-]{2,119}$/.test(record.key) ||
      typeof record.name !== "string" ||
      !record.name.trim() ||
      !isBeastAdminPromptDomain(record.domain) ||
      typeof record.description !== "string" ||
      !Array.isArray(record.versions) ||
      !isTimestamp(record.createdAt) ||
      !isTimestamp(record.updatedAt)
    ) {
      return null;
    }

    const versions = record.versions.map(normalizePromptVersion);
    if (
      !versions.every(
        (version): version is BeastAdminPromptVersion => Boolean(version)
      )
    ) {
      return null;
    }

    return {
      id: record.id,
      key: record.key,
      name: record.name.trim(),
      domain: record.domain,
      description: record.description.trim(),
      versions,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });

  return assets.every((asset): asset is BeastAdminPromptAsset => Boolean(asset))
    ? assets
    : null;
}

export function filterBeastAdminPromptAssets(
  assets: BeastAdminPromptAsset[],
  {
    query = "",
    domain = "all",
    status = "all",
  }: {
    query?: string;
    domain?: BeastAdminPromptDomain | "all";
    status?: BeastAdminPromptStatus | "all";
  } = {}
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return assets.filter((asset) => {
    if (domain !== "all" && asset.domain !== domain) return false;
    if (
      status !== "all" &&
      !asset.versions.some((version) => version.status === status)
    ) {
      return false;
    }
    if (!normalizedQuery) return true;
    return [
      asset.key,
      asset.name,
      asset.description,
      beastAdminPromptDomainLabels[asset.domain],
      ...asset.versions.flatMap((version) => [
        version.version,
        version.changeSummary,
        version.authorName,
      ]),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

export function buildBeastAdminPromptStatusCounts(
  assets: BeastAdminPromptAsset[]
) {
  return beastAdminPromptStatuses.reduce<
    Record<BeastAdminPromptStatus, number>
  >(
    (counts, status) => {
      counts[status] = assets.reduce(
        (total, asset) =>
          total +
          asset.versions.filter((version) => version.status === status).length,
        0
      );
      return counts;
    },
    {
      draft: 0,
      in_review: 0,
      approved: 0,
      released: 0,
      archived: 0,
    }
  );
}

export function getLatestReleasedPromptVersion(
  asset: BeastAdminPromptAsset
) {
  return asset.versions
    .filter(
      (version) => version.status === "released" && version.releaseDate
    )
    .sort(
      (left, right) =>
        (right.releaseDate || "").localeCompare(left.releaseDate || "") ||
        right.version.localeCompare(left.version, undefined, { numeric: true })
    )[0] || null;
}
