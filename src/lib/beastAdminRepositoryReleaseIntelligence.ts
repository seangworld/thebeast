import type {
  BeastAdminCanonicalReadModel,
  BeastAdminLegacyClassification,
} from "./beastAdminCanonicalProjection";

export const beastAdminRepositoryCatalog = [
  {
    id: "beast",
    label: "The Beast",
    repository: "seangworld/thebeast",
    deployed: true,
  },
  {
    id: "seangworld",
    label: "SEANGWORLD",
    repository: "seangworld/seangworld.com",
    deployed: true,
  },
  {
    id: "beastfusion",
    label: "BeastFusion",
    repository: "seangworld/beastfusion",
    deployed: false,
  },
  {
    id: "cw",
    label: "Change the World",
    repository: "seangworld/changetheworld",
    deployed: true,
  },
] as const;

export type BeastAdminRepositoryId =
  (typeof beastAdminRepositoryCatalog)[number]["id"];

export type BeastAdminEvidenceSourceState =
  | "connected"
  | "partial"
  | "not_configured"
  | "unavailable"
  | "stale"
  | "error";

export type BeastAdminProviderStatus = {
  status: BeastAdminEvidenceSourceState;
  detail: string;
  observedAt: string | null;
};

export type BeastAdminRepositoryObservation = {
  repository: string;
  state: Exclude<BeastAdminEvidenceSourceState, "partial">;
  defaultBranch: string | null;
  headCommit: string | null;
  headCommittedAt: string | null;
  observedAt: string | null;
  detail: string;
};

export type BeastAdminDeploymentEnvironment = "preview" | "production";

export type BeastAdminDeploymentObservation = {
  repository: string;
  environment: BeastAdminDeploymentEnvironment;
  state:
    | Exclude<BeastAdminEvidenceSourceState, "partial">
    | "not_applicable";
  servedCommit: string | null;
  branch: string | null;
  deploymentId: string | null;
  deploymentUrl: string | null;
  deployedAt: string | null;
  observedAt: string | null;
  detail: string;
};

export type BeastAdminRepositoryView = {
  id: BeastAdminRepositoryId;
  label: string;
  repository: string;
  sourceState: BeastAdminRepositoryObservation["state"];
  defaultBranch: string | null;
  headCommit: string | null;
  headCommittedAt: string | null;
  observedAt: string | null;
  worktree: "unavailable";
  preview: BeastAdminDeploymentObservation;
  production: BeastAdminDeploymentObservation;
  productionComparison:
    | "current"
    | "different"
    | "unavailable"
    | "not_applicable";
  detail: string;
};

export type BeastAdminReleaseEvidenceState =
  | "verified_current"
  | "verified_deployed"
  | "drift_detected"
  | "provider_observed"
  | "declared_only"
  | "canonical_only"
  | "stale"
  | "provider_error"
  | "unavailable";

export type BeastAdminCanonicalReleaseView = {
  id: string;
  product: string;
  repository: string | null;
  version: string | null;
  status: string;
  releaseDate: string | null;
  validationState: string | null;
  declaredDeployment: string;
  declaredCommit: string | null;
  repositoryHead: string | null;
  previewServedCommit: string | null;
  productionServedCommit: string | null;
  evidenceState: BeastAdminReleaseEvidenceState;
  evidenceDetail: string;
  source: "beastfusion";
};

export type BeastAdminOperationalReleaseNote = {
  id: string;
  product: string;
  version: string;
  title: string;
  updatedAt: string;
  classification: Exclude<
    BeastAdminLegacyClassification,
    "canonical_projection"
  >;
  source: "beastadmin_operational_note";
};

export type BeastAdminRepositoryReleaseSnapshot = {
  generatedAt: string;
  canonicalProvider: BeastAdminCanonicalReadModel["provider"];
  providers: {
    github: BeastAdminProviderStatus;
    vercel: BeastAdminProviderStatus;
  };
  repositories: BeastAdminRepositoryView[];
  releases: BeastAdminCanonicalReleaseView[];
  operationalNotes: BeastAdminOperationalReleaseNote[];
  limitations: string[];
};

type CanonicalRelease = BeastAdminCanonicalReadModel["releases"][number];

const SHA = /^[0-9a-f]{40}$/i;

function normalizedSha(value: string | null | undefined) {
  const normalized = value?.trim() || "";
  return SHA.test(normalized) ? normalized.toLowerCase() : null;
}

export function commitFromEvidenceReference(
  value: string | null | undefined
) {
  const normalized = value?.trim() || "";
  const direct = normalized.match(/^(?:commit:)?([0-9a-f]{40})$/i);
  if (direct) return direct[1].toLowerCase();
  const github = normalized.match(/\/commit\/([0-9a-f]{40})(?:$|[/?#])/i);
  return github ? github[1].toLowerCase() : null;
}

function unavailableDeployment(
  repository: string,
  environment: BeastAdminDeploymentEnvironment,
  deployed: boolean
): BeastAdminDeploymentObservation {
  return {
    repository,
    environment,
    state: deployed ? "unavailable" : "not_applicable",
    servedCommit: null,
    branch: null,
    deploymentId: null,
    deploymentUrl: null,
    deployedAt: null,
    observedAt: null,
    detail: deployed
      ? `No ${environment} deployment observation is available.`
      : "This repository does not have an application deployment boundary.",
  };
}

function observationAge(
  value: { observedAt: string | null },
  now: Date
) {
  if (!value.observedAt) return Number.POSITIVE_INFINITY;
  return now.getTime() - new Date(value.observedAt).getTime();
}

function withStaleRepositoryState(
  observation: BeastAdminRepositoryObservation,
  now: Date,
  staleAfterMs: number
) {
  if (
    observation.state === "connected" &&
    observationAge(observation, now) > staleAfterMs
  ) {
    return {
      ...observation,
      state: "stale" as const,
      detail: "The last repository observation is stale; retained values are not current evidence.",
    };
  }
  return observation;
}

function withStaleDeploymentState(
  observation: BeastAdminDeploymentObservation,
  now: Date,
  staleAfterMs: number
) {
  if (
    observation.state === "connected" &&
    observationAge(observation, now) > staleAfterMs
  ) {
    return {
      ...observation,
      state: "stale" as const,
      detail: "The last deployment observation is stale; the served commit is retained but not current evidence.",
    };
  }
  return observation;
}

function repositoryForRelease(
  release: CanonicalRelease,
  canonical: BeastAdminCanonicalReadModel
) {
  const product = canonical.products.find(
    (candidate) => candidate.id === release.product
  );
  const ownerRepository = product?.ownerRepository?.toLowerCase() || null;
  return (
    beastAdminRepositoryCatalog.find(
      (candidate) =>
        candidate.id === release.product ||
        candidate.repository.toLowerCase() === ownerRepository
    ) || null
  );
}

function releaseEvidenceState({
  declaredCommit,
  repositoryHead,
  deployment,
}: {
  declaredCommit: string | null;
  repositoryHead: string | null;
  deployment: BeastAdminDeploymentObservation;
}): Pick<
  BeastAdminCanonicalReleaseView,
  "evidenceState" | "evidenceDetail"
> {
  if (deployment.state === "error") {
    return {
      evidenceState: "provider_error",
      evidenceDetail:
        "The deployment provider failed closed; canonical release truth is retained without a live served-commit claim.",
    };
  }
  if (deployment.state === "stale") {
    return {
      evidenceState: "stale",
      evidenceDetail:
        "The deployment observation is stale; canonical release truth remains available.",
    };
  }
  const servedCommit = normalizedSha(deployment.servedCommit);
  if (declaredCommit && servedCommit && declaredCommit !== servedCommit) {
    return {
      evidenceState: "drift_detected",
      evidenceDetail:
        "The provider-served commit does not match the canonical release evidence commit.",
    };
  }
  if (declaredCommit && servedCommit && declaredCommit === servedCommit) {
    if (repositoryHead && repositoryHead === servedCommit) {
      return {
        evidenceState: "verified_current",
        evidenceDetail:
          "Canonical release evidence, repository head, and Production served commit agree.",
      };
    }
    return {
      evidenceState: "verified_deployed",
      evidenceDetail:
        "The Production served commit matches canonical release evidence; the repository head is different or unavailable.",
    };
  }
  if (servedCommit) {
    return {
      evidenceState: "provider_observed",
      evidenceDetail:
      "Production reports a served commit, but the canonical release record does not declare a commit for equality verification.",
    };
  }
  if (deployment.state === "not_applicable") {
    return {
      evidenceState: "canonical_only",
      evidenceDetail:
        "This repository has canonical release evidence but no application deployment boundary.",
    };
  }
  if (declaredCommit) {
    return {
      evidenceState: "declared_only",
      evidenceDetail:
        "Canonical release evidence declares a commit, but no current Production served-commit observation is available.",
    };
  }
  if (
    deployment.state === "not_configured" ||
    deployment.state === "unavailable"
  ) {
    return {
      evidenceState: "canonical_only",
      evidenceDetail:
        "Canonical release evidence is available; live deployment verification is not configured or unavailable.",
    };
  }
  return {
    evidenceState: "unavailable",
    evidenceDetail: "Release evidence could not be reconciled.",
  };
}

function releaseViews({
  canonical,
  repositories,
}: {
  canonical: BeastAdminCanonicalReadModel;
  repositories: BeastAdminRepositoryView[];
}): BeastAdminCanonicalReleaseView[] {
  return canonical.releases.map((release) => {
    const catalog = repositoryForRelease(release, canonical);
    const repository = catalog
      ? repositories.find((candidate) => candidate.id === catalog.id) || null
      : null;
    const declaredCommit = commitFromEvidenceReference(
      release.evidenceReference
    );
    const evidence = releaseEvidenceState({
      declaredCommit,
      repositoryHead: normalizedSha(repository?.headCommit),
      deployment:
        repository?.production ||
        unavailableDeployment("", "production", true),
    });
    return {
      id: release.id,
      product: release.product,
      repository: catalog?.repository || null,
      version: release.version,
      status: release.status,
      releaseDate: release.releaseDate,
      validationState: release.validationState,
      declaredDeployment: release.declaredDeployment,
      declaredCommit,
      repositoryHead: normalizedSha(repository?.headCommit),
      previewServedCommit: normalizedSha(repository?.preview.servedCommit),
      productionServedCommit: normalizedSha(
        repository?.production.servedCommit
      ),
      ...evidence,
      source: "beastfusion" as const,
    };
  });
}

export function buildBeastAdminRepositoryReleaseSnapshot({
  canonical,
  githubProvider,
  vercelProvider,
  repositoryObservations,
  deploymentObservations,
  operationalNotes = [],
  now = new Date(),
  staleAfterMs = 6 * 60 * 60 * 1000,
}: {
  canonical: BeastAdminCanonicalReadModel;
  githubProvider: BeastAdminProviderStatus;
  vercelProvider: BeastAdminProviderStatus;
  repositoryObservations: BeastAdminRepositoryObservation[];
  deploymentObservations: BeastAdminDeploymentObservation[];
  operationalNotes?: BeastAdminOperationalReleaseNote[];
  now?: Date;
  staleAfterMs?: number;
}): BeastAdminRepositoryReleaseSnapshot {
  const repositories = beastAdminRepositoryCatalog.map((catalog) => {
    const repository = withStaleRepositoryState(
      repositoryObservations.find(
        (candidate) => candidate.repository === catalog.repository
      ) || {
        repository: catalog.repository,
        state: "unavailable" as const,
        defaultBranch: null,
        headCommit: null,
        headCommittedAt: null,
        observedAt: null,
        detail: "No repository observation is available.",
      },
      now,
      staleAfterMs
    );
    const deploymentFor = (
      environment: BeastAdminDeploymentEnvironment
    ) =>
      withStaleDeploymentState(
        deploymentObservations.find(
          (candidate) =>
            candidate.repository === catalog.repository &&
            candidate.environment === environment
        ) ||
          unavailableDeployment(
            catalog.repository,
            environment,
            catalog.deployed
          ),
        now,
        staleAfterMs
      );
    const preview = deploymentFor("preview");
    const production = deploymentFor("production");
    const headCommit = normalizedSha(repository.headCommit);
    const servedCommit = normalizedSha(production.servedCommit);
    const productionComparison = !catalog.deployed
      ? ("not_applicable" as const)
      : repository.state !== "connected" ||
          production.state !== "connected" ||
          !headCommit ||
          !servedCommit
        ? ("unavailable" as const)
        : headCommit === servedCommit
          ? ("current" as const)
          : ("different" as const);

    return {
      id: catalog.id,
      label: catalog.label,
      repository: catalog.repository,
      sourceState: repository.state,
      defaultBranch: repository.defaultBranch,
      headCommit,
      headCommittedAt: repository.headCommittedAt,
      observedAt: repository.observedAt,
      worktree: "unavailable" as const,
      preview,
      production,
      productionComparison,
      detail: `${repository.detail} Hosted BeastAdmin cannot inspect a developer's local worktree.`,
    };
  });

  const staleProvider = (
    provider: BeastAdminProviderStatus,
    states: string[]
  ): BeastAdminProviderStatus =>
    provider.status === "connected" && states.includes("stale")
      ? {
          ...provider,
          status: "stale",
          detail:
            "The last valid provider evidence is retained, but it is stale.",
        }
      : provider;

  return {
    generatedAt: now.toISOString(),
    canonicalProvider: canonical.provider,
    providers: {
      github: staleProvider(
        githubProvider,
        repositories.map((repository) => repository.sourceState)
      ),
      vercel: staleProvider(
        vercelProvider,
        repositories.flatMap((repository) => [
          repository.preview.state,
          repository.production.state,
        ])
      ),
    },
    repositories,
    releases: releaseViews({ canonical, repositories }),
    operationalNotes: operationalNotes.map((note) => ({
      ...note,
      source: "beastadmin_operational_note" as const,
    })),
    limitations: [
      "Local worktree cleanliness is unavailable in hosted BeastAdmin.",
      "BeastAdmin release notes supplement canonical BeastFusion release truth and never override it.",
      "A provider is not labeled connected until it returns a valid live observation.",
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function normalizeBeastAdminRepositoryReleaseSnapshot(
  value: unknown
): BeastAdminRepositoryReleaseSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.repositories)) return null;
  if (
    typeof value.generatedAt !== "string" ||
    !isRecord(value.canonicalProvider) ||
    !isRecord(value.providers) ||
    !isRecord(value.providers.github) ||
    !isRecord(value.providers.vercel) ||
    !Array.isArray(value.releases) ||
    !Array.isArray(value.operationalNotes) ||
    !Array.isArray(value.limitations)
  ) {
    return null;
  }
  const repositoriesValid = value.repositories.every((entry) => {
    if (!isRecord(entry)) return false;
    return (
      typeof entry.id === "string" &&
      beastAdminRepositoryCatalog.some((item) => item.id === entry.id) &&
      typeof entry.label === "string" &&
      typeof entry.repository === "string" &&
      typeof entry.sourceState === "string" &&
      isStringOrNull(entry.defaultBranch) &&
      isStringOrNull(entry.headCommit) &&
      entry.worktree === "unavailable" &&
      isRecord(entry.preview) &&
      isRecord(entry.production) &&
      typeof entry.productionComparison === "string" &&
      typeof entry.detail === "string"
    );
  });
  return repositoriesValid
    ? (value as unknown as BeastAdminRepositoryReleaseSnapshot)
    : null;
}
