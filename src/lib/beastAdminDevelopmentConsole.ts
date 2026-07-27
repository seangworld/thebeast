import {
  beastAdminRoadmapStatusLabels,
  getBeastAdminRoadmapProduct,
  type BeastAdminRoadmapItem,
  type BeastAdminRoadmapStatus,
} from "./beastAdminRoadmap";
import {
  beastAdminDeploymentStatusLabels,
  beastAdminReleaseProductLabels,
  beastAdminValidationStatusLabels,
  filterBeastAdminReleaseRecords,
  type BeastAdminReleaseRecord,
} from "./beastAdminReleaseCenter";
import { versionManifest } from "./appVersion";

export type BeastAdminDevelopmentSourceState = "available" | "unavailable";

export type BeastAdminDevelopmentPrompt = {
  id: string;
  productId: string;
  productLabel: string;
  title: string;
  summary: string;
  status: BeastAdminRoadmapStatus;
  statusLabel: string;
  updatedAt: string;
};

export type BeastAdminDevelopmentRelease = {
  id: string;
  productLabel: string;
  version: string;
  releaseDate: string;
  title: string;
  summary: string;
  validationLabel: string;
  deploymentLabel: string;
  deploymentReference: string;
};

export type BeastAdminDevelopmentGitReference = {
  reference: string;
  shortReference: string;
  branch: string;
  repository: string;
  source: "current_deployment" | "release_center";
  title: string;
  recordedAt: string | null;
};

export type BeastAdminDevelopmentVersion = {
  product: string;
  version: string;
  channel: string;
  buildId: string;
  releaseDate: string | null;
  source: "version_manifest";
};

export type BeastAdminDevelopmentRepositoryStatus = {
  repository: "Beast" | "SEANGWORLD" | "BeastFusion" | "CW";
  branch: string | null;
  worktree: "clean" | "dirty" | "unavailable" | "planning";
  latestCommit: string | null;
  detail: string;
};

export type BeastAdminDevelopmentMilestone = {
  currentGeneration: string | null;
  currentProduct: string | null;
  currentMilestone: string | null;
  nextPlannedMilestone: string | null;
};

export type BeastAdminDevelopmentConsoleSnapshot = {
  generatedAt: string;
  sources: {
    roadmap: BeastAdminDevelopmentSourceState;
    releases: BeastAdminDevelopmentSourceState;
    git: BeastAdminDevelopmentSourceState;
  };
  sourceGaps: string[];
  currentSprint: BeastAdminDevelopmentPrompt[];
  openPrompts: BeastAdminDevelopmentPrompt[];
  completedPrompts: BeastAdminDevelopmentPrompt[];
  upcomingWork: BeastAdminDevelopmentPrompt[];
  recentlyReleased: BeastAdminDevelopmentRelease[];
  gitReferences: BeastAdminDevelopmentGitReference[];
  versionHistory: BeastAdminDevelopmentRelease[];
  currentVersions: BeastAdminDevelopmentVersion[];
  repositories: BeastAdminDevelopmentRepositoryStatus[];
  milestone: BeastAdminDevelopmentMilestone;
};

export type BeastAdminDeploymentGitEvidence = {
  commitSha: string;
  branch: string;
  repository: string;
  commitMessage: string;
};

function developmentPrompt(
  item: BeastAdminRoadmapItem
): BeastAdminDevelopmentPrompt {
  return {
    id: item.id,
    productId: item.productId,
    productLabel:
      getBeastAdminRoadmapProduct(item.productId)?.name || item.productId,
    title: item.title,
    summary: item.summary,
    status: item.status,
    statusLabel: beastAdminRoadmapStatusLabels[item.status],
    updatedAt: item.updatedAt,
  };
}

function developmentRelease(
  release: BeastAdminReleaseRecord
): BeastAdminDevelopmentRelease {
  return {
    id: release.id,
    productLabel: beastAdminReleaseProductLabels[release.product],
    version: release.version,
    releaseDate: release.releaseDate,
    title: release.title,
    summary: release.summary,
    validationLabel:
      beastAdminValidationStatusLabels[release.validationStatus],
    deploymentLabel:
      beastAdminDeploymentStatusLabels[release.deploymentStatus],
    deploymentReference: release.deploymentReference,
  };
}

function isGitReference(value: string) {
  const normalized = value.trim();
  return (
    /^[0-9a-f]{7,40}$/i.test(normalized) ||
    /^refs\/(?:heads|tags)\/[A-Za-z0-9._/-]+$/.test(normalized) ||
    /^[A-Za-z0-9._/-]+@[0-9a-f]{7,40}$/i.test(normalized)
  );
}

function shortGitReference(value: string) {
  const normalized = value.trim();
  if (/^[0-9a-f]{7,40}$/i.test(normalized)) return normalized.slice(0, 12);
  return normalized;
}

function currentVersionIdentities(): BeastAdminDevelopmentVersion[] {
  return Object.values(versionManifest)
    .map((identity) => ({
      product: identity.name,
      version: identity.version,
      channel: identity.channel,
      buildId:
        identity.name === "BeastEducation"
          ? identity.buildId.replace(/^beastlearning(?=-)/, "beasteducation")
          : identity.buildId,
      releaseDate: identity.releaseDate,
      source: "version_manifest" as const,
    }))
    .sort(
      (left, right) =>
        (right.releaseDate || "").localeCompare(left.releaseDate || "") ||
        left.product.localeCompare(right.product)
    );
}

function findRepositoryReference(
  references: BeastAdminDevelopmentGitReference[],
  productLabel: string
) {
  return references.find(
    (reference) =>
      reference.source === "release_center" &&
      reference.title.startsWith(`${productLabel} v`)
  );
}

function repositoryStatuses(
  references: BeastAdminDevelopmentGitReference[]
): BeastAdminDevelopmentRepositoryStatus[] {
  const beastReference = references.find(
    (reference) => reference.source === "current_deployment"
  );
  const seangworldReference = findRepositoryReference(
    references,
    "SEANGWORLD"
  );
  const beastFusionReference = findRepositoryReference(
    references,
    "BeastFusion"
  );

  return [
    {
      repository: "Beast",
      branch: beastReference?.branch || null,
      worktree: "unavailable",
      latestCommit: beastReference?.shortReference || null,
      detail: beastReference
        ? "Deployment metadata verifies the branch and commit. A hosted runtime cannot inspect local worktree cleanliness."
        : "Deployment Git metadata is not available, so branch, worktree, and latest commit cannot be verified.",
    },
    {
      repository: "SEANGWORLD",
      branch: null,
      worktree: "unavailable",
      latestCommit: seangworldReference?.shortReference || null,
      detail: seangworldReference
        ? "Release Center verifies the commit reference. Branch and worktree evidence are not connected."
        : "No SEANGWORLD repository source is connected to the Development Console.",
    },
    {
      repository: "BeastFusion",
      branch: null,
      worktree: "unavailable",
      latestCommit: beastFusionReference?.shortReference || null,
      detail: beastFusionReference
        ? "Release Center verifies the commit reference. Branch and worktree evidence are not connected."
        : "No BeastFusion repository source is connected to the Development Console.",
    },
    {
      repository: "CW",
      branch: null,
      worktree: "planning",
      latestCommit: null,
      detail:
        "Change the World is represented as planning because no repository evidence is connected.",
    },
  ];
}

function milestoneGeneration(prompt: BeastAdminDevelopmentPrompt | undefined) {
  if (!prompt) return null;
  const match = `${prompt.title} ${prompt.summary}`.match(
    /\bgeneration\s+([0-9]+(?:\.[0-9]+)?)\b/i
  );
  return match ? `Generation ${match[1]}` : null;
}

export function buildBeastAdminDevelopmentConsoleSnapshot({
  roadmapItems,
  releases,
  roadmapAvailable,
  releasesAvailable,
  gitEvidence = null,
  generatedAt = new Date().toISOString(),
}: {
  roadmapItems: BeastAdminRoadmapItem[];
  releases: BeastAdminReleaseRecord[];
  roadmapAvailable: boolean;
  releasesAvailable: boolean;
  gitEvidence?: BeastAdminDeploymentGitEvidence | null;
  generatedAt?: string;
}): BeastAdminDevelopmentConsoleSnapshot {
  const sortedPrompts = [...roadmapItems]
    .sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.title.localeCompare(right.title)
    )
    .map(developmentPrompt);
  const sortedReleases = filterBeastAdminReleaseRecords(releases).map(
    developmentRelease
  );
  const deploymentGitReference =
    gitEvidence && isGitReference(gitEvidence.commitSha)
      ? {
          reference: gitEvidence.commitSha.trim(),
          shortReference: shortGitReference(gitEvidence.commitSha),
          branch: gitEvidence.branch.trim(),
          repository: gitEvidence.repository.trim(),
          source: "current_deployment" as const,
          title: gitEvidence.commitMessage.trim() || "Current deployment",
          recordedAt: generatedAt,
        }
      : null;
  const releaseGitReferences: BeastAdminDevelopmentGitReference[] = releases
    .filter((release) => isGitReference(release.deploymentReference))
    .map((release) => ({
      reference: release.deploymentReference.trim(),
      shortReference: shortGitReference(release.deploymentReference),
      branch: "",
      repository: "",
      source: "release_center" as const,
      title: `${beastAdminReleaseProductLabels[release.product]} v${release.version}`,
      recordedAt: release.deployedAt,
    }));
  const gitReferenceCandidates: (
    | BeastAdminDevelopmentGitReference
    | null
  )[] = [deploymentGitReference, ...releaseGitReferences];
  const gitReferences = gitReferenceCandidates
    .filter(
      (reference): reference is BeastAdminDevelopmentGitReference =>
        reference !== null
    )
    .filter(
      (reference, index, all) =>
        all.findIndex(
          (candidate) => candidate.reference === reference.reference
        ) === index
    );
  const sourceGaps = [
    !roadmapAvailable
      ? "Roadmap data is unavailable. Verify BA-RDM-101 using 20260726000000_add_beast_admin_product_roadmap.sql."
      : "",
    !releasesAvailable
      ? "Release history is unavailable. Verify BA-REL-101 using 20260726000600_add_beast_admin_release_center.sql."
      : "",
    gitReferences.length === 0
      ? "The current deployment did not provide a verified Git SHA or ref."
      : "",
  ].filter(Boolean);
  const currentSprint = sortedPrompts.filter((prompt) =>
    ["in_progress", "testing"].includes(prompt.status)
  );
  const openPrompts = sortedPrompts.filter((prompt) =>
    ["planned", "in_progress", "testing"].includes(prompt.status)
  );
  const completedPrompts = sortedPrompts.filter(
    (prompt) => prompt.status === "released"
  );
  const upcomingWork = sortedPrompts.filter(
    (prompt) => prompt.status === "planned"
  );
  const currentMilestone = currentSprint[0];
  const nextPlannedMilestone = upcomingWork[0];

  return {
    generatedAt,
    sources: {
      roadmap: roadmapAvailable ? "available" : "unavailable",
      releases: releasesAvailable ? "available" : "unavailable",
      git: gitReferences.length ? "available" : "unavailable",
    },
    sourceGaps,
    currentSprint,
    openPrompts,
    completedPrompts,
    upcomingWork,
    recentlyReleased: sortedReleases.slice(0, 5),
    gitReferences,
    versionHistory: sortedReleases,
    currentVersions: currentVersionIdentities(),
    repositories: repositoryStatuses(gitReferences),
    milestone: {
      currentGeneration: milestoneGeneration(currentMilestone),
      currentProduct: currentMilestone?.productLabel || null,
      currentMilestone: currentMilestone?.title || null,
      nextPlannedMilestone: nextPlannedMilestone?.title || null,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function normalizePrompt(value: unknown): BeastAdminDevelopmentPrompt | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.id) ||
    !isString(value.productId) ||
    !isString(value.productLabel) ||
    !isString(value.title) ||
    !value.title.trim() ||
    !isString(value.summary) ||
    !isString(value.status) ||
    !Object.prototype.hasOwnProperty.call(
      beastAdminRoadmapStatusLabels,
      value.status
    ) ||
    !isString(value.statusLabel) ||
    !isTimestamp(value.updatedAt)
  ) {
    return null;
  }

  return value as BeastAdminDevelopmentPrompt;
}

function normalizeRelease(value: unknown): BeastAdminDevelopmentRelease | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.id) ||
    !isString(value.productLabel) ||
    !isString(value.version) ||
    !isString(value.releaseDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.releaseDate) ||
    !isString(value.title) ||
    !value.title.trim() ||
    !isString(value.summary) ||
    !isString(value.validationLabel) ||
    !isString(value.deploymentLabel) ||
    !isString(value.deploymentReference)
  ) {
    return null;
  }
  return value as BeastAdminDevelopmentRelease;
}

function normalizeGitReference(
  value: unknown
): BeastAdminDevelopmentGitReference | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.reference) ||
    !isGitReference(value.reference) ||
    !isString(value.shortReference) ||
    !isString(value.branch) ||
    !isString(value.repository) ||
    !["current_deployment", "release_center"].includes(String(value.source)) ||
    !isString(value.title) ||
    (value.recordedAt !== null && !isTimestamp(value.recordedAt))
  ) {
    return null;
  }
  return value as BeastAdminDevelopmentGitReference;
}

function normalizeVersion(
  value: unknown
): BeastAdminDevelopmentVersion | null {
  if (!isRecord(value)) return null;
  if (
    !isString(value.product) ||
    !isString(value.version) ||
    !isString(value.channel) ||
    !isString(value.buildId) ||
    (value.releaseDate !== null &&
      (!isString(value.releaseDate) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value.releaseDate))) ||
    value.source !== "version_manifest"
  ) {
    return null;
  }
  return value as BeastAdminDevelopmentVersion;
}

function normalizeRepository(
  value: unknown
): BeastAdminDevelopmentRepositoryStatus | null {
  if (!isRecord(value)) return null;
  if (
    !["Beast", "SEANGWORLD", "BeastFusion", "CW"].includes(
      String(value.repository)
    ) ||
    (value.branch !== null && !isString(value.branch)) ||
    !["clean", "dirty", "unavailable", "planning"].includes(
      String(value.worktree)
    ) ||
    (value.latestCommit !== null && !isString(value.latestCommit)) ||
    !isString(value.detail) ||
    !value.detail.trim()
  ) {
    return null;
  }
  return value as BeastAdminDevelopmentRepositoryStatus;
}

function normalizeMilestone(
  value: unknown
): BeastAdminDevelopmentMilestone | null {
  if (!isRecord(value)) return null;
  for (const field of [
    "currentGeneration",
    "currentProduct",
    "currentMilestone",
    "nextPlannedMilestone",
  ]) {
    if (value[field] !== null && !isString(value[field])) return null;
  }
  return value as BeastAdminDevelopmentMilestone;
}

function normalizeArray<T>(
  value: unknown,
  normalize: (entry: unknown) => T | null
): T[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value.map(normalize);
  return normalized.every((entry): entry is T => Boolean(entry))
    ? normalized
    : null;
}

export function normalizeBeastAdminDevelopmentConsoleSnapshot(
  value: unknown
): BeastAdminDevelopmentConsoleSnapshot | null {
  if (!isRecord(value) || !isRecord(value.sources)) return null;
  const validSource = (source: unknown) =>
    ["available", "unavailable"].includes(String(source));
  const currentSprint = normalizeArray(value.currentSprint, normalizePrompt);
  const openPrompts = normalizeArray(value.openPrompts, normalizePrompt);
  const completedPrompts = normalizeArray(
    value.completedPrompts,
    normalizePrompt
  );
  const upcomingWork = normalizeArray(value.upcomingWork, normalizePrompt);
  const recentlyReleased = normalizeArray(
    value.recentlyReleased,
    normalizeRelease
  );
  const gitReferences = normalizeArray(
    value.gitReferences,
    normalizeGitReference
  );
  const versionHistory = normalizeArray(value.versionHistory, normalizeRelease);
  const currentVersions = normalizeArray(value.currentVersions, normalizeVersion);
  const repositories = normalizeArray(value.repositories, normalizeRepository);
  const milestone = normalizeMilestone(value.milestone);

  if (
    !isTimestamp(value.generatedAt) ||
    !validSource(value.sources.roadmap) ||
    !validSource(value.sources.releases) ||
    !validSource(value.sources.git) ||
    !Array.isArray(value.sourceGaps) ||
    !value.sourceGaps.every(isString) ||
    !currentSprint ||
    !openPrompts ||
    !completedPrompts ||
    !upcomingWork ||
    !recentlyReleased ||
    !gitReferences ||
    !versionHistory ||
    !currentVersions ||
    !repositories ||
    !milestone
  ) {
    return null;
  }

  return {
    generatedAt: value.generatedAt,
    sources: value.sources as BeastAdminDevelopmentConsoleSnapshot["sources"],
    sourceGaps: value.sourceGaps,
    currentSprint,
    openPrompts,
    completedPrompts,
    upcomingWork,
    recentlyReleased,
    gitReferences,
    versionHistory,
    currentVersions,
    repositories,
    milestone,
  };
}
