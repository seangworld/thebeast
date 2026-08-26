import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deriveDevelopmentAgentCanonicalState, developmentAgentProfiles, getDevelopmentAgentProfile } from "../src/lib/developmentAgentProfiles";
import type { BeastAdminCanonicalReadModel } from "../src/lib/beastAdminCanonicalProjection";

const canonical = {
  provider: { status: "connected", detail: "Current", projectionId: "projection-1", generatedAt: "2026-08-25T00:00:00Z", acceptedAt: "2026-08-25T00:00:01Z", lastConfirmedAt: "2026-08-25T00:00:02Z" },
  projection: { projectionId: "projection-1", projectionVersion: "1", payloadHash: "hash", canonicalInputDigest: "digest", sourceCommit: "abc", generatedAt: "2026-08-25T00:00:00Z", acceptedAt: "2026-08-25T00:00:01Z", lastConfirmedAt: "2026-08-25T00:00:02Z", repository: "beastfusion", branch: "main" },
  cursor: { path: [], mode: "planning", executableWorkAvailable: false, selectedPackage: null, selectedProduct: null, recommendedDirective: null },
  products: [], releases: [], attention: [],
  roadmap: developmentAgentProfiles.map((profile) => ({ id: profile.foundationPackage, product: "beastfusion", title: profile.name, status: "complete", priority: "normal", dependencies: [], blocked: false, executable: false, ownerApproved: true, executionAuthorized: false, evidenceReferences: [`roadmaps/completed/${profile.foundationPackage}.md`], source: "beastfusion" as const })),
  execution: [{ id: "reviewer-complete", package: "BF-AGT-003", product: "beastfusion", status: "completed", occurredAt: "2026-08-25T00:00:00Z", startedAt: null, completedAt: "2026-08-25T00:00:00Z", candidateCommit: "abc", result: "Reviewer Agent completed.", blocker: null, source: "beastfusion" as const }],
  validation: { projectionSchema: "schema", projectionGenerated: true, canonicalConsistency: "passed", lastGovernedEvidenceReference: null, lastGovernedEvidenceDate: null, testCount: 206, warnings: [] },
} satisfies BeastAdminCanonicalReadModel;

test("development roster contains the bounded Orchestrator 3.0 lifecycle roles", () => {
  assert.deepEqual(developmentAgentProfiles.map((profile) => profile.id), ["orchestrator-3", "observer-agent", "proposal-agent", "developer-agent", "reviewer-agent", "outcome-agent"]);
  assert.match(getDevelopmentAgentProfile("developer-agent")!.limitations.join(" "), /Cannot authorize itself/);
  assert.match(getDevelopmentAgentProfile("reviewer-agent")!.limitations.join(" "), /PASS does not equal owner acceptance/);
  assert.match(getDevelopmentAgentProfile("observer-agent")!.authorityBoundary, /never authorization/);
  assert.match(getDevelopmentAgentProfile("proposal-agent")!.authorityBoundary, /non-executable/);
  assert.match(getDevelopmentAgentProfile("outcome-agent")!.limitations.join(" "), /Cannot authorize remediation/);
});

test("profile status and activity derive from canonical projection without implying active work", () => {
  const developer = deriveDevelopmentAgentCanonicalState(getDevelopmentAgentProfile("developer-agent")!, canonical);
  const reviewer = deriveDevelopmentAgentCanonicalState(getDevelopmentAgentProfile("reviewer-agent")!, canonical);
  assert.match(developer.statusLabel, /none active/);
  assert.match(developer.assignmentLabel, /BF-AGT-002/);
  assert.equal(developer.recentActivity.length, 0);
  assert.equal(reviewer.recentActivity[0]?.id, "reviewer-complete");
  assert.match(reviewer.verdictLabel!, /No active or recent review verdict/);
});

test("unavailable canonical state fails closed", () => {
  const state = deriveDevelopmentAgentCanonicalState(getDevelopmentAgentProfile("developer-agent")!, null);
  assert.equal(state.status, "source-unavailable");
  assert.match(state.assignmentLabel, /No assignment can be confirmed/);
});

test("owner-only roster and profiles preserve the established BeastAdmin surface", () => {
  const directory = readFileSync("src/app/dashboard/admin/development/agents/DevelopmentAgentDirectory.tsx", "utf8");
  const profile = readFileSync("src/app/dashboard/admin/development/agents/DevelopmentAgentProfileWorkspace.tsx", "utf8");
  const page = readFileSync("src/app/dashboard/admin/development/agents/[agentId]/page.tsx", "utf8");
  assert.match(directory, /Orchestrator coordinates, Observer detects, Proposal Agent researches and recommends, Developer builds, Reviewer independently checks, Outcome Agent measures, and the owner authorizes/);
  assert.match(profile, /profile.authorityBoundary/);
  assert.match(readFileSync("src/lib/developmentAgentProfiles.ts", "utf8"), /PASS does not equal owner release authorization/);
  assert.match(page, /BeastAdminShell/);
  assert.doesNotMatch(directory + profile, /service_role|access_token|raw provider/i);
});
