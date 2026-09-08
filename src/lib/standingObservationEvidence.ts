import type { BeastAdminCanonicalReadModel } from "./beastAdminCanonicalProjection";
import { beastAdminRepositoryCatalog, type BeastAdminRepositoryObservation, type BeastAdminDeploymentObservation } from "./beastAdminRepositoryReleaseIntelligence";
import type { ObservationSourceResult } from "./standingObservation";

const productFor = (repository: string) => beastAdminRepositoryCatalog.find((item) => item.repository === repository)?.label || "BeastFusion";

/** Interpret only the three evidence sources already permitted by the standing assignment. */
export function buildStandingEcosystemEvidence(
  canonical: Pick<BeastAdminCanonicalReadModel, "attention">,
  repositories: BeastAdminRepositoryObservation[],
  deployments: BeastAdminDeploymentObservation[],
): ObservationSourceResult[] {
  const repositoryProblems = repositories.filter((item) => item.state !== "connected");
  const production = deployments.filter((item) => item.environment === "production" && item.state !== "not_applicable");
  const deploymentProblems = production.filter((item) => item.state !== "connected" || (() => {
    const head = repositories.find((repo) => repo.repository === item.repository && repo.state === "connected")?.headCommit;
    return Boolean(head && item.servedCommit && head !== item.servedCommit);
  })());
  const attention = canonical.attention.map(({ id, kind, detail }) => ({ id, kind, detail })).sort((a, b) => a.id.localeCompare(b.id));
  return [
    {
      source: "beastfusion_canonical_projection", available: true, changed: attention.length > 0,
      summary: attention.length ? `${attention.length} canonical attention item(s) across the SEANGWORLD ecosystem.` : "No canonical attention items recorded.",
      confidence: "high", impact: attention.some((item) => ["failure", "blocker"].includes(item.kind)) ? "high" : attention.length ? "medium" : "none",
      // Publication timestamps and unrelated commits must not recreate the same proposal.
      fingerprint: JSON.stringify(attention), affectedProducts: ["BeastFusion", "The Beast", "SEANGWORLD", "Change the World"],
    },
    {
      source: "github_repository_evidence", available: repositories.some((item) => item.state === "connected"), changed: repositoryProblems.length > 0,
      summary: repositoryProblems.length ? `Repository evidence needs attention: ${repositoryProblems.map((item) => `${productFor(item.repository)} (${item.state})`).join(", ")}.` : "Configured repositories returned current evidence.",
      confidence: repositoryProblems.length ? "medium" : "high", impact: repositoryProblems.length ? "medium" : "none",
      fingerprint: JSON.stringify(repositories.map(({ repository, state }) => ({ repository, state })).sort((a, b) => a.repository.localeCompare(b.repository))),
      affectedProducts: Array.from(new Set(repositoryProblems.map((item) => productFor(item.repository)))),
    },
    {
      source: "vercel_deployment_evidence", available: production.some((item) => item.state === "connected"), changed: deploymentProblems.length > 0,
      summary: deploymentProblems.length ? `Production evidence needs review: ${deploymentProblems.map((item) => `${productFor(item.repository)} (${item.state === "connected" ? "served commit differs from repository head; an intentional release gap is possible" : item.state})`).join(", ")}.` : "No differences found between available Production and repository evidence.",
      confidence: deploymentProblems.length ? "medium" : "high", impact: deploymentProblems.length ? "medium" : "none",
      fingerprint: JSON.stringify(deploymentProblems.map(({ repository, state, servedCommit }) => ({ repository, state, servedCommit })).sort((a, b) => a.repository.localeCompare(b.repository))),
      affectedProducts: Array.from(new Set(deploymentProblems.map((item) => productFor(item.repository)))),
    },
  ];
}
