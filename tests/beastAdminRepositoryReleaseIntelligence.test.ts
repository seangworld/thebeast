import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { BeastAdminCanonicalReadModel } from "../src/lib/beastAdminCanonicalProjection";
import {
  beastAdminRepositoryCatalog,
  buildBeastAdminRepositoryReleaseSnapshot,
  commitFromEvidenceReference,
  normalizeBeastAdminRepositoryReleaseSnapshot,
  type BeastAdminDeploymentObservation,
  type BeastAdminRepositoryObservation,
} from "../src/lib/beastAdminRepositoryReleaseIntelligence";
import {
  readGitHubRepositoryEvidence,
  readVercelDeploymentEvidence,
} from "../src/lib/server/beastAdminRepositoryProviders";

const commits = {
  beast: "1".repeat(40),
  seangworld: "2".repeat(40),
  fusion: "3".repeat(40),
  cw: "4".repeat(40),
  other: "f".repeat(40),
};

function canonical(): BeastAdminCanonicalReadModel {
  const product = (
    id: string,
    ownerRepository: string,
    deployed = true
  ): BeastAdminCanonicalReadModel["products"][number] => ({
    id,
    name: id,
    parent: null,
    lifecycle: "active",
    version: "1.0.0",
    buildId: null,
    releaseDate: "2026-08-22",
    declaredDeployment: deployed ? "deployed" : "repository",
    ownerRepository,
    source: "beastfusion",
  });
  const release = (
    id: string,
    productId: string,
    commit: string | null
  ): BeastAdminCanonicalReadModel["releases"][number] => ({
    id,
    product: productId,
    version: "1.0.0",
    status: "released",
    releaseDate: "2026-08-22",
    validationState: "passed",
    evidenceReference: commit ? `commit:${commit}` : null,
    preview: "not_in_projection_v1",
    production: "not_in_projection_v1",
    servedCommit: null,
    declaredDeployment: "released_recorded",
    source: "beastfusion",
  });
  return {
    provider: {
      status: "connected",
      detail: "Current canonical projection.",
      projectionId: "bfcp_test",
      generatedAt: "2026-08-22T10:00:00Z",
      acceptedAt: "2026-08-22T10:01:00Z",
      lastConfirmedAt: "2026-08-22T10:01:00Z",
    },
    cursor: {
      path: ["Planning Mode"],
      mode: "planning_mode",
      executableWorkAvailable: false,
      selectedPackage: null,
      selectedProduct: null,
      recommendedDirective: "Owner Strategy Review",
    },
    products: [
      product("beast", "seangworld/thebeast"),
      product("seangworld", "seangworld/seangworld.com"),
      product("beastfusion", "seangworld/beastfusion", false),
      product("cw", "seangworld/changetheworld"),
    ],
    roadmap: [],
    execution: [],
    releases: [
      release("release-current", "beast", commits.beast),
      release("release-deployed", "seangworld", commits.seangworld),
      release("release-canonical", "beastfusion", commits.fusion),
      release("release-drift", "cw", commits.cw),
      release("release-provider-only", "beast", null),
    ],
    attention: [],
  };
}

function repositoryObservations(
  observedAt = "2026-08-22T11:00:00Z"
): BeastAdminRepositoryObservation[] {
  return beastAdminRepositoryCatalog.map((item) => ({
    repository: item.repository,
    state: "connected",
    defaultBranch: "main",
    headCommit:
      item.id === "beast"
        ? commits.beast
        : item.id === "seangworld"
          ? commits.other
          : item.id === "beastfusion"
            ? commits.fusion
            : commits.cw,
    headCommittedAt: observedAt,
    observedAt,
    detail: "Verified repository head.",
  }));
}

function deploymentObservations(
  observedAt = "2026-08-22T11:00:00Z"
): BeastAdminDeploymentObservation[] {
  const commitFor = (id: string) =>
    id === "beast"
      ? commits.beast
      : id === "seangworld"
        ? commits.seangworld
        : id === "cw"
          ? commits.other
          : null;
  return beastAdminRepositoryCatalog.flatMap((item) =>
    (["preview", "production"] as const).map((environment) => ({
      repository: item.repository,
      environment,
      state: item.deployed ? ("connected" as const) : ("not_applicable" as const),
      servedCommit: commitFor(item.id),
      branch: item.deployed ? "main" : null,
      deploymentId: item.deployed ? `${item.id}-${environment}` : null,
      deploymentUrl: item.deployed ? `${item.id}.example.com` : null,
      deployedAt: item.deployed ? observedAt : null,
      observedAt: item.deployed ? observedAt : null,
      detail: item.deployed ? "Verified deployment." : "No deployment boundary.",
    }))
  );
}

const provider = {
  status: "connected" as const,
  detail: "Verified live evidence.",
  observedAt: "2026-08-22T11:00:00Z",
};

test("BA-CMD-001B applies the deterministic release evidence truth table", () => {
  const snapshot = buildBeastAdminRepositoryReleaseSnapshot({
    canonical: canonical(),
    githubProvider: provider,
    vercelProvider: provider,
    repositoryObservations: repositoryObservations(),
    deploymentObservations: deploymentObservations(),
    now: new Date("2026-08-22T12:00:00Z"),
  });
  const states = Object.fromEntries(
    snapshot.releases.map((release) => [release.id, release.evidenceState])
  );
  assert.equal(states["release-current"], "verified_current");
  assert.equal(states["release-deployed"], "verified_deployed");
  assert.equal(states["release-canonical"], "canonical_only");
  assert.equal(states["release-drift"], "drift_detected");
  assert.equal(states["release-provider-only"], "provider_observed");
  assert.deepEqual(
    snapshot.repositories.map((repository) => repository.worktree),
    ["unavailable", "unavailable", "unavailable", "unavailable"]
  );
});

test("stale and failing providers preserve canonical truth without a legacy fallback", () => {
  const stale = buildBeastAdminRepositoryReleaseSnapshot({
    canonical: canonical(),
    githubProvider: provider,
    vercelProvider: provider,
    repositoryObservations: repositoryObservations("2026-08-21T00:00:00Z"),
    deploymentObservations: deploymentObservations("2026-08-21T00:00:00Z"),
    now: new Date("2026-08-22T12:00:00Z"),
  });
  assert.equal(stale.repositories[0].sourceState, "stale");
  assert.equal(stale.releases[0].evidenceState, "stale");
  assert.equal(stale.providers.github.status, "stale");
  assert.equal(stale.providers.vercel.status, "stale");
  assert.equal(stale.repositories[0].productionComparison, "unavailable");

  const failedDeployments = deploymentObservations().map((observation) =>
    observation.environment === "production" && observation.state === "connected"
      ? { ...observation, state: "error" as const, servedCommit: null }
      : observation
  );
  const failed = buildBeastAdminRepositoryReleaseSnapshot({
    canonical: canonical(),
    githubProvider: provider,
    vercelProvider: { status: "error", detail: "Failed.", observedAt: null },
    repositoryObservations: repositoryObservations(),
    deploymentObservations: failedDeployments,
    operationalNotes: [{
      id: "same-as-canonical",
      product: "beast",
      version: "99.0.0",
      title: "Conflicting legacy note",
      updatedAt: "2026-08-22T11:00:00Z",
      classification: "legacy",
      source: "beastadmin_operational_note",
    }],
    now: new Date("2026-08-22T12:00:00Z"),
  });
  assert.equal(failed.releases[0].version, "1.0.0");
  assert.equal(failed.releases[0].evidenceState, "provider_error");
  assert.equal(failed.operationalNotes[0].source, "beastadmin_operational_note");
});

test("commit evidence accepts only bounded full SHA references", () => {
  assert.equal(commitFromEvidenceReference(`commit:${commits.beast}`), commits.beast);
  assert.equal(commitFromEvidenceReference(`https://github.com/seangworld/thebeast/commit/${commits.beast}`), commits.beast);
  assert.equal(commitFromEvidenceReference("1".repeat(39)), null);
  assert.equal(commitFromEvidenceReference("not-a-commit"), null);
});

test("client snapshot normalization rejects malformed repository boundaries", () => {
  const snapshot = buildBeastAdminRepositoryReleaseSnapshot({
    canonical: canonical(),
    githubProvider: provider,
    vercelProvider: provider,
    repositoryObservations: repositoryObservations(),
    deploymentObservations: deploymentObservations(),
  });
  assert.ok(normalizeBeastAdminRepositoryReleaseSnapshot(snapshot));
  assert.equal(
    normalizeBeastAdminRepositoryReleaseSnapshot({
      ...snapshot,
      repositories: [{ ...snapshot.repositories[0], worktree: "clean" }],
    }),
    null
  );
});

test("unconfigured providers make no request and never report connected", async () => {
  const names = [
    "BEASTADMIN_GITHUB_APP_ID",
    "BEASTADMIN_GITHUB_APP_INSTALLATION_ID",
    "BEASTADMIN_GITHUB_APP_PRIVATE_KEY",
    "BEASTADMIN_VERCEL_ACCESS_TOKEN",
    "BEASTADMIN_VERCEL_TEAM_ID",
    "BEASTADMIN_VERCEL_PROJECT_THEBEAST",
    "BEASTADMIN_VERCEL_PROJECT_SEANGWORLD",
    "BEASTADMIN_VERCEL_PROJECT_CHANGE_THE_WORLD",
  ] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  names.forEach((name) => delete process.env[name]);
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    throw new Error("must not be called");
  }) as typeof fetch;
  try {
    const github = await readGitHubRepositoryEvidence({ fetchImpl });
    const vercel = await readVercelDeploymentEvidence({ fetchImpl });
    assert.equal(calls, 0);
    assert.equal(github.provider.status, "not_configured");
    assert.equal(vercel.provider.status, "not_configured");
    assert.equal(github.observations.length, 4);
    assert.equal(vercel.observations.length, 8);
  } finally {
    names.forEach((name) => {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    });
  }
});

test("owner route and UI keep provider credentials server-only and expose no mutation", () => {
  const route = readFileSync(
    join(process.cwd(), "src/app/api/admin/repository-release-intelligence/route.ts"),
    "utf8"
  );
  const providerSource = readFileSync(
    join(process.cwd(), "src/lib/server/beastAdminRepositoryProviders.ts"),
    "utf8"
  );
  const page = readFileSync(
    join(process.cwd(), "src/app/dashboard/admin/development/page.tsx"),
    "utf8"
  );
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /Cache-Control": "private, no-cache, no-store, must-revalidate"/);
  assert.match(route, /legacy records were not used as a fallback/);
  assert.match(route, /,\s*503\s*\)/);
  assert.match(route, /runtime = "nodejs"/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(providerSource, /permissions: \{ contents: "read", metadata: "read" \}/);
  assert.match(providerSource, /repositories: beastAdminRepositoryCatalog/);
  assert.doesNotMatch(providerSource, /NEXT_PUBLIC_BEASTADMIN/);
  assert.doesNotMatch(providerSource, /personal access token|GITHUB_TOKEN/i);
  assert.match(page, /BeastAdminRepositoryReleaseIntelligenceWorkspace/);
});
