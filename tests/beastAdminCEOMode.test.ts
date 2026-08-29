import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildBeastAdminCEOModeSnapshot,
  normalizeBeastAdminCEOSourceSnapshot,
  type BeastAdminCEOSourceSnapshot,
} from "../src/lib/beastAdminCEOMode";
import type { BeastAdminCanonicalReadModel } from "../src/lib/beastAdminCanonicalProjection";
import type { BeastAdminPlatformHealthSnapshot } from "../src/lib/beastAdminPlatformHealth";
import {
  beastAdminRepositoryCatalog,
  buildBeastAdminRepositoryReleaseSnapshot,
  type BeastAdminDeploymentObservation,
  type BeastAdminRepositoryObservation,
} from "../src/lib/beastAdminRepositoryReleaseIntelligence";

const generatedAt = "2026-07-26T11:00:00.000Z";
const commit = "a".repeat(40);

function roadmapItem(
  overrides: Partial<BeastAdminCanonicalReadModel["roadmap"][number]> = {}
): BeastAdminCanonicalReadModel["roadmap"][number] {
  return {
    id: "BA-CMD-001C",
    product: "beast",
    title: "CEO Mode deterministic intelligence repair",
    status: "planned",
    priority: "normal",
    dependencies: [],
    blocked: false,
    executable: false,
    ownerApproved: false,
    executionAuthorized: false,
    source: "beastfusion",
    ...overrides,
  };
}

function canonical(
  overrides: Partial<BeastAdminCanonicalReadModel> = {}
): BeastAdminCanonicalReadModel {
  return {
    provider: {
      status: "connected",
      detail: "Current canonical projection.",
      projectionId: "bfcp_test",
      generatedAt,
      acceptedAt: generatedAt,
      lastConfirmedAt: generatedAt,
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
      {
        id: "beast",
        name: "The Beast",
        parent: null,
        lifecycle: "active",
        version: "2.4.0",
        buildId: null,
        releaseDate: "2026-07-25",
        declaredDeployment: "deployed",
        ownerRepository: "seangworld/thebeast",
        source: "beastfusion",
      },
    ],
    roadmap: [],
    execution: [
      {
        id: "execution-one",
        package: "BA-CMD-001B",
        product: "beast",
        status: "completed",
        occurredAt: "2026-07-25T23:00:00.000Z",
        startedAt: null,
        completedAt: "2026-07-25T23:00:00.000Z",
        candidateCommit: commit,
        result: "Repository intelligence accepted.",
        blocker: null,
        source: "beastfusion",
      },
    ],
    releases: [
      {
        id: "release-one",
        product: "beast",
        version: "2.4.0",
        status: "released",
        releaseDate: "2026-07-25",
        validationState: "passed",
        evidenceReference: `commit:${commit}`,
        preview: "not_in_projection_v1",
        production: "not_in_projection_v1",
        servedCommit: null,
        declaredDeployment: "deployed",
        source: "beastfusion",
      },
    ],
    attention: [],
    ...overrides,
  };
}

function repositoryRelease(model: BeastAdminCanonicalReadModel) {
  const observedAt = "2026-07-25T23:30:00.000Z";
  const repositories: BeastAdminRepositoryObservation[] =
    beastAdminRepositoryCatalog.map((item) => ({
      repository: item.repository,
      state: "connected",
      defaultBranch: "main",
      headCommit: commit,
      headCommittedAt: observedAt,
      observedAt,
      detail: "Verified repository head.",
    }));
  const deployments: BeastAdminDeploymentObservation[] =
    beastAdminRepositoryCatalog.flatMap((item) =>
      (["preview", "production"] as const).map((environment) => ({
        repository: item.repository,
        environment,
        state: item.deployed ? ("connected" as const) : ("not_applicable" as const),
        servedCommit: item.deployed ? commit : null,
        branch: item.deployed ? "main" : null,
        deploymentId: item.deployed ? `${item.id}-${environment}` : null,
        deploymentUrl: item.deployed ? `${item.id}.example.test` : null,
        deployedAt: item.deployed ? observedAt : null,
        observedAt: item.deployed ? observedAt : null,
        detail: item.deployed ? "Verified deployment." : "No deployment boundary.",
      }))
    );
  return buildBeastAdminRepositoryReleaseSnapshot({
    canonical: model,
    githubProvider: { status: "connected", detail: "Current.", observedAt },
    vercelProvider: { status: "connected", detail: "Current.", observedAt },
    repositoryObservations: repositories,
    deploymentObservations: deployments,
    now: new Date(generatedAt),
  });
}

function sourceFixture(
  canonicalModel: BeastAdminCanonicalReadModel | null = canonical()
): BeastAdminCEOSourceSnapshot {
  return {
    generatedAt,
    canonical: canonicalModel,
    repositoryRelease: canonicalModel ? repositoryRelease(canonicalModel) : null,
    feedback: [],
    members: [],
    aiAnalytics: null,
    featureFlags: [],
    opportunityRecommendations: {
      state: "unavailable",
      detail: "Advisory feed is not approved.",
      items: [],
    },
    sources: {
      canonicalGovernance: canonicalModel ? "available" : "unavailable",
      repositoryIntelligence: canonicalModel ? "available" : "unavailable",
      feedback: "available",
      members: "available",
      betaTesting: "available",
      aiActivity: "unavailable",
      opportunityRecommendations: "unavailable",
    },
  };
}

const healthy: BeastAdminPlatformHealthSnapshot = {
  overallStatus: "operational",
  generatedAt,
  services: [],
  errors: [],
  warnings: [],
};

test("BA-CMD-001C answers yesterday and overnight from canonical and provider events", () => {
  const snapshot = buildBeastAdminCEOModeSnapshot({
    source: sourceFixture(),
    platformHealth: healthy,
    platformHealthAvailable: true,
    now: new Date(generatedAt),
  });
  assert.ok(snapshot.happenedYesterday.some((item) => item.id === "execution-execution-one"));
  assert.ok(snapshot.happenedYesterday.some((item) => item.id === "release-release-one"));
  assert.ok(snapshot.changedOvernight.some((item) => item.id === "execution-execution-one"));
  assert.ok(snapshot.changedOvernight.some((item) => item.id.startsWith("repository-beast-")));
  assert.match(snapshot.windowLabel, /America\/New_York/);
});

test("overnight boundaries remain deterministic across America/New_York daylight saving time", () => {
  const model = canonical({
    execution: [
      {
        ...canonical().execution[0],
        id: "before-dst-jump",
        occurredAt: "2026-03-08T06:30:00.000Z",
        completedAt: "2026-03-08T06:30:00.000Z",
      },
      {
        ...canonical().execution[0],
        id: "previous-evening",
        occurredAt: "2026-03-07T23:30:00.000Z",
        completedAt: "2026-03-07T23:30:00.000Z",
      },
    ],
    releases: [],
  });
  const source = sourceFixture(model);
  source.repositoryRelease = null;
  source.sources.repositoryIntelligence = "unavailable";
  const snapshot = buildBeastAdminCEOModeSnapshot({
    source,
    platformHealth: healthy,
    platformHealthAvailable: true,
    now: new Date("2026-03-08T11:30:00.000Z"),
  });
  assert.deepEqual(
    snapshot.changedOvernight
      .filter((item) => item.id.startsWith("execution-"))
      .map((item) => item.id),
    ["execution-before-dst-jump", "execution-previous-evening"]
  );
});

test("planning-only state recommends canonical strategy review and never starts planned work", () => {
  const model = canonical({ roadmap: [roadmapItem()] });
  const snapshot = buildBeastAdminCEOModeSnapshot({ source: sourceFixture(model), platformHealth: healthy, platformHealthAvailable: true });
  assert.deepEqual(snapshot.workNext.map((item) => item.id), ["next-decision-BA-CMD-001C"]);
  assert.match(snapshot.workNext[0].title, /Decide whether to approve/);
  assert.doesNotMatch(JSON.stringify(snapshot.workNext), /Start /);
  assert.match(snapshot.workNext[0].why, /No execution is implied/);
});

test("canonical selected work appears only when every execution gate is true", () => {
  const selected = roadmapItem({ status: "in_progress", executable: true, ownerApproved: true, executionAuthorized: true });
  const model = canonical({
    roadmap: [selected],
    cursor: { path: ["Execution"], mode: "execution_mode", executableWorkAvailable: true, selectedPackage: selected.id, selectedProduct: selected.product, recommendedDirective: null },
  });
  const snapshot = buildBeastAdminCEOModeSnapshot({ source: sourceFixture(model), platformHealth: healthy, platformHealthAvailable: true });
  assert.equal(snapshot.workNext[0].id, "next-executable-BA-CMD-001C");
  assert.match(snapshot.workNext[0].why, /authorization gates are satisfied/);
});

test("blocked canonical work becomes an owner decision ahead of execution", () => {
  const model = canonical({ roadmap: [roadmapItem({ blocked: true, ownerApproved: true, priority: "high" })] });
  const snapshot = buildBeastAdminCEOModeSnapshot({ source: sourceFixture(model), platformHealth: healthy, platformHealthAvailable: true });
  assert.equal(snapshot.workNext[0].id, "next-blocker-BA-CMD-001C");
  assert.equal(snapshot.workNext[0].actionLabel, "Review blocker");
  assert.match(snapshot.workNext[0].why, /not execution authorization/);
});

test("stale canonical state fails closed to restoring governance evidence", () => {
  const model = canonical({ provider: { ...canonical().provider, status: "stale", detail: "Heartbeat stale." } });
  const source = sourceFixture(model);
  source.sources.canonicalGovernance = "stale";
  const snapshot = buildBeastAdminCEOModeSnapshot({ source, platformHealth: healthy, platformHealthAvailable: true });
  assert.equal(snapshot.workNext[0].id, "next-canonical-provider");
  assert.match(snapshot.workNext[0].why, /fails closed/);
  assert.ok(snapshot.configurationItems.some((item) => item.id === "source-canonicalGovernance"));
});

test("critical operational failures outrank canonical execution", () => {
  const model = canonical({ roadmap: [roadmapItem({ executable: true, ownerApproved: true, executionAuthorized: true })], cursor: { path: ["Execution"], mode: "execution_mode", executableWorkAvailable: true, selectedPackage: "BA-CMD-001C", selectedProduct: "beast", recommendedDirective: null } });
  const health: BeastAdminPlatformHealthSnapshot = { ...healthy, overallStatus: "critical", errors: [{ serviceId: "api", serviceLabel: "API", severity: "error", message: "Production API failed." }] };
  const snapshot = buildBeastAdminCEOModeSnapshot({ source: sourceFixture(model), platformHealth: health, platformHealthAvailable: true });
  assert.equal(snapshot.workNext[0].id, "health-error-api");
});

test("empty canonical roadmap retains truthful zeroes and a strategy directive", () => {
  const snapshot = buildBeastAdminCEOModeSnapshot({ source: sourceFixture(), platformHealth: healthy, platformHealthAvailable: true });
  assert.equal(snapshot.summaries.roadmap.planned, 0);
  assert.equal(snapshot.summaries.development.openPrompts, 0);
  assert.equal(snapshot.workNext[0].title, "Owner Strategy Review");
});

test("BA-CMD-002 resolves Release Movement through the canonical product display identity", () => {
  const model = canonical({
    products: [
      ...canonical().products,
      {
        ...canonical().products[0],
        id: "beastlearning",
        name: "BeastEducation",
      },
    ],
    releases: [
      {
        ...canonical().releases[0],
        id: "beasteducation-1.7.1-2026-08-29",
        product: "beastlearning",
        version: "1.7.1",
      },
    ],
  });
  const snapshot = buildBeastAdminCEOModeSnapshot({
    source: sourceFixture(model),
    platformHealth: healthy,
    platformHealthAvailable: true,
  });
  assert.equal(snapshot.summaries.releases.latestLabel, "BeastEducation v1.7.1");
});

test("missing canonical state preserves unavailable values and never falls back to legacy", () => {
  const snapshot = buildBeastAdminCEOModeSnapshot({ source: sourceFixture(null), platformHealth: null, platformHealthAvailable: false });
  assert.equal(snapshot.summaries.roadmap.planned, null);
  assert.equal(snapshot.summaries.releases.total, null);
  assert.equal(snapshot.workNext[0].id, "next-canonical-provider");
  assert.deepEqual(snapshot.repositories, []);
});

test("opportunity recommendations are validated as advisory evidence and never drive work selection", () => {
  const source = sourceFixture();
  source.opportunityRecommendations = {
    state: "available",
    detail: "One advisory item.",
    items: [{ id: "opportunity-one", professionalName: "Money Coach", recommendation: "Review pricing evidence.", whySurfaced: "A verified metric changed.", createdAt: generatedAt }],
  };
  source.sources.opportunityRecommendations = "available";
  assert.deepEqual(normalizeBeastAdminCEOSourceSnapshot(source), source);
  const snapshot = buildBeastAdminCEOModeSnapshot({ source, platformHealth: healthy, platformHealthAvailable: true });
  assert.equal(snapshot.workNext[0].id, "next-canonical-directive");
  assert.equal(snapshot.summaries.opportunityRecommendations.items.length, 1);
});

test("owner route uses 1A and 1B providers and never queries legacy governance truth", () => {
  const route = readFileSync("src/app/api/admin/ceo-mode/route.ts", "utf8");
  assert.match(route, /loadBeastFusionCanonicalReadModel/);
  assert.match(route, /readGitHubRepositoryEvidence/);
  assert.match(route, /readVercelDeploymentEvidence/);
  assert.match(route, /buildBeastAdminRepositoryReleaseSnapshot/);
  assert.match(route, /canonicalOpportunityRecommendations/);
  assert.match(route, /proposal\.ownerApproved/);
  assert.match(route, /proposal\.evidence\.length > 0/);
  assert.match(route, /Connected to the canonical Strategy Proposal feed/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /Cache-Control": "private, no-cache, no-store, must-revalidate"/);
  assert.doesNotMatch(route, /beast_admin_roadmap_items/);
  assert.doesNotMatch(route, /get_beast_admin_release_records/);
  assert.doesNotMatch(route, /\.(insert|update|upsert|delete)\(/);
});

test("CEO Mode UI explains deterministic governance and advisory opportunities", () => {
  const workspace = readFileSync("src/app/dashboard/admin/BeastAdminCEOModeWorkspace.tsx", "utf8");
  for (const question of ["What happened yesterday?", "What changed overnight?", "What needs attention?", "What should I work on next?"]) assert.match(workspace, new RegExp(question.replace("?", "\\?")));
  assert.match(workspace, /honors canonical authorization, blockers, dependencies, and provider freshness/);
  assert.match(workspace, /will not infer execution from planned work/);
  assert.match(workspace, /Opportunity recommendations/);
  assert.match(workspace, /never select or authorize execution/);
  assert.match(workspace, /read-only 1B provider snapshot/);
  assert.match(workspace, /Hosted · local state unavailable/);
  assert.doesNotMatch(workspace, />Status unavailable</);
});
