import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { developmentAgentCapabilityAssessments, developmentAgentCapabilityProjectionContract, developmentOpsCapabilityRelease, getDevelopmentAgentCapabilityAssessment, knightAutonomyFramework, openAIAgenticnessDimensions, publicDevelopmentAgentCapabilityAssessment } from "../src/lib/developmentAgentCapabilityFramework";
import { buildNonExecutableProposal, buildObserverFinding, classifyBoundedRemediation, deriveEcosystemImpact, developerExecutionLoop, exactCandidateReviewerMatrix, orchestratorDecompositionStages, outcomeEvaluationWindows, ownerInterruptionPolicy, recommendOutcome, validateDeveloperContextPacket, validateDeveloperExecutionEvidence, validateObjectiveContextPacket, type DeveloperContextPacket } from "../src/lib/developmentWorkflowIntelligence";
import { appendEngineeringMemoryCorrection, currentEngineeringMemory, engineeringMemoryRules, packageAEngineeringMemory, validateEngineeringMemoryRecord } from "../src/lib/developmentEngineeringMemory";
import { developmentAgentProfiles, getPublicDevelopmentAgentProfile, publicDevelopmentAgentProfiles } from "../src/lib/developmentAgentProfiles";
import { standingObservationPermittedSources } from "../src/lib/standingObservation";

test("BF-AGT-013 separates generation, capability, autonomy, and canonical authority for all six agents", () => {
  assert.equal(developmentOpsCapabilityRelease.packageId, "BF-AGT-013");
  assert.equal(developmentOpsCapabilityRelease.beastFusionVersion, "2.4.0");
  assert.equal(developmentOpsCapabilityRelease.beastOSVersion, "3.1.0");
  assert.equal(developmentAgentCapabilityProjectionContract.ownedBy, "beastfusion");
  assert.equal(developmentAgentCapabilityProjectionContract.registryPath, "state/agent-capability-assessment-registry.json");
  assert.equal(developmentAgentCapabilityProjectionContract.registryVersion, "1.0.0");
  assert.deepEqual(developmentAgentCapabilityAssessments.map(({ agentId }) => agentId), developmentAgentProfiles.map(({ id }) => id));
  for (const assessment of developmentAgentCapabilityAssessments) {
    assert.equal(assessment.capability.length, 4);
    assert.match(assessment.assessmentId, /^BF-AGT-013-ASMT-/);
    assert.ok(assessment.evidenceIds.length > 0);
    assert.deepEqual(Object.keys(assessment.assessmentBinding).sort(), ["configurationId", "environmentId", "modelId", "promptContractId", "toolsetId"]);
    assert.match(assessment.softwareGeneration, /2\.4\.0/);
    assert.equal(assessment.assessedVersion, "1.1.0");
    assert.equal(assessment.autonomy.classification, "self-assessed");
    assert.equal(assessment.authority.source, "canonical BeastFusion package authority");
    assert.ok(assessment.authority.prohibited.some((item) => /owner authority/i.test(item)));
  }
  assert.equal(getDevelopmentAgentCapabilityAssessment("observer-agent")?.autonomy.level, 4);
  assert.equal(getDevelopmentAgentCapabilityAssessment("developer-agent")?.authority.classification, "implement-authorized");
});

test("published frameworks are cited accurately without certification or standard claims", () => {
  assert.equal(knightAutonomyFramework.publisher, "Knight First Amendment Institute at Columbia University");
  assert.equal(knightAutonomyFramework.publishedAt, "2025-07-28");
  assert.deepEqual(knightAutonomyFramework.levels.map(({ userRole }) => userRole), ["operator", "collaborator", "consultant", "approver", "observer"]);
  assert.match(knightAutonomyFramework.status, /not represented as an industry standard or certification/i);
  assert.equal(openAIAgenticnessDimensions.publisher, "OpenAI");
  assert.equal(openAIAgenticnessDimensions.publishedAt, "2023-12-14");
  assert.deepEqual(openAIAgenticnessDimensions.dimensions.map(({ id }) => id), ["goal-complexity", "environmental-complexity", "adaptability", "independent-execution"]);
  assert.match(openAIAgenticnessDimensions.use, /not.*certification/i);
});

test("public assessment semantics exactly match the canonical BeastFusion projection", () => {
  const expected = {
    "orchestrator-3": ["BF-AGT-013-ASMT-ORCH-001", "BeastFusion Development & Operations AI 2.4.0 / Orchestrator 3.0", 3, "BF-AGT-013-EV-ORCH", "beastfusion-governed-tools-2026-08-30", "BF-AGT-013-orchestrator-contract-v1", "bf-agt-013-low-touch-authority-v1", "beastfusion-bounded-development-2026-08-30"],
    "observer-agent": ["BF-AGT-013-ASMT-OBS-001", "BeastFusion Development & Operations AI 2.4.0 / Observer", 4, "BF-AGT-013-EV-OBS", "beastfusion-read-only-observer-tools-2026-08-30", "BF-AGT-013-observer-contract-v1", "bf-agt-011-standing-observation-authority-v1", "beastfusion-standing-read-only-observation-2026-08-30"],
    "proposal-agent": ["BF-AGT-013-ASMT-PROP-001", "BeastFusion Development & Operations AI 2.4.0 / Proposal", 3, "BF-AGT-013-EV-PROP", "beastfusion-governed-tools-2026-08-30", "BF-AGT-013-proposal-contract-v1", "bf-agt-013-non-executable-proposal-v1", "beastfusion-bounded-proposal-2026-08-30"],
    "developer-agent": ["BF-AGT-013-ASMT-DEV-001", "BeastFusion Development & Operations AI 2.4.0 / Developer", 3, "BF-AGT-013-EV-DEV", "beastfusion-governed-tools-2026-08-30", "BF-AGT-013-developer-contract-v1", "bf-agt-013-low-touch-authority-v1", "beastfusion-bounded-development-2026-08-30"],
    "reviewer-agent": ["BF-AGT-013-ASMT-REV-001", "BeastFusion Development & Operations AI 2.4.0 / Reviewer", 3, "BF-AGT-013-EV-REV", "beastfusion-governed-tools-2026-08-30", "BF-AGT-013-reviewer-contract-v1", "bf-agt-013-independent-review-v1", "beastfusion-bounded-review-2026-08-30"],
    "outcome-agent": ["BF-AGT-013-ASMT-OUT-001", "BeastFusion Development & Operations AI 2.4.0 / Outcome", 3, "BF-AGT-013-EV-OUT", "beastfusion-governed-tools-2026-08-30", "BF-AGT-013-outcome-contract-v1", "bf-agt-013-evaluation-only-v1", "beastfusion-verified-outcome-2026-08-30"],
  } as const;
  for (const assessment of developmentAgentCapabilityAssessments) {
    const [assessmentId, softwareGeneration, level, evidencePrefix, toolsetId, promptContractId, configurationId, environmentId] = expected[assessment.agentId];
    assert.equal(assessment.assessmentId, assessmentId);
    assert.equal(assessment.assessedVersion, "1.1.0");
    assert.equal(assessment.assessedAt, "2026-08-30");
    assert.equal(assessment.softwareGeneration, softwareGeneration);
    assert.equal(assessment.autonomy.level, level);
    assert.deepEqual(assessment.evidenceIds, [`${evidencePrefix}-001`, `${evidencePrefix}-002`]);
    assert.deepEqual(assessment.assessmentBinding, { modelId: "gpt-5.6-sol", toolsetId, promptContractId, configurationId, environmentId });
  }
});

test("Orchestrator and Developer packets require bounded evidence, independent review, and exact-candidate flow", () => {
  assert.deepEqual(developerExecutionLoop, ["inspect", "plan", "implement", "test", "diagnose", "bounded-remediate", "retest", "exact-candidate"]);
  assert.ok(orchestratorDecompositionStages.includes("stop-at-authority-boundary"));
  const packet = { packageId: "BF-AGT-013", objective: "Upgrade capability without authority expansion", authorizedOutcomes: ["Capability evidence"], explicitExclusions: ["No authority expansion"], productTruthReferences: ["canonical"], repositories: ["TheBeast"], dependencies: [], riskGates: [], impactDimensions: ["product-truth" as const], assignments: [{ agent: "developer-agent" as const, responsibility: "Build" }, { agent: "reviewer-agent" as const, responsibility: "Independent review" }], acceptanceEvidence: ["tests"], stopConditions: ["authorization ends"] };
  assert.deepEqual(validateObjectiveContextPacket(packet), { valid: true, errors: [] });
  assert.equal(validateObjectiveContextPacket({ ...packet, assignments: [] }).valid, false);
  const developerPacket: DeveloperContextPacket = {
    ...packet, assignmentId: "dev-1", contextPacketId: "ctx-1",
    productTruth: { source: "BeastFusion", version: "2.4.0", evidenceIds: ["e-product-truth"] },
    repositoryMap: [{ repository: "TheBeast", purpose: "Product projection", permittedMutation: true }],
    architectureNotes: ["Reuse projection"], currentVersions: { BeastFusion: "2.4.0", BeastOS: "3.1.0" },
    securityPrivacyConstraints: ["Public-safe only"], historicalDecisions: [], priorReviewerFindings: [],
    requiredValidation: ["focused tests"], expectedOutputs: ["exact candidate"],
    riskGates: [{ condition: "authority expansion", class: "owner-gate", ownerAction: "stop" }],
  };
  assert.equal(validateDeveloperContextPacket(developerPacket).valid, true);
  assert.equal(validateDeveloperContextPacket({ ...developerPacket, productTruth: { source: "", version: "", evidenceIds: [] } }).valid, false);
  assert.equal(validateDeveloperContextPacket({ ...developerPacket, repositoryMap: [], currentVersions: {}, impactDimensions: [] }).valid, false);
  const evidence = developerExecutionLoop.map((phase, index) => ({ phase, evidenceId: `ev-${index}`, contextPacketId: "ctx-1", sourceReference: `artifact:${phase}`, ...(phase === "exact-candidate" ? { candidateId: "candidate-sha", treeId: "tree-sha", validationEvidenceIds: ["ev-test"] } : {}) }));
  assert.equal(validateDeveloperExecutionEvidence(developerPacket, evidence).valid, true);
  assert.equal(validateDeveloperExecutionEvidence(developerPacket, evidence.filter(({ phase }) => phase !== "test")).valid, false);
  assert.equal(validateDeveloperExecutionEvidence(developerPacket, evidence.map((item) => item.phase === "exact-candidate" ? { ...item, candidateId: "", validationEvidenceIds: [] } : item)).valid, false);
  assert.match(ownerInterruptionPolicy.sessionRule, /Reuse a valid correctly scoped authenticated session/);
  assert.ok(ownerInterruptionPolicy.agentHandledInsideAuthorizedPackage.includes("Routine implementation, testing, diagnosis, and in-scope remediation"));
  assert.ok(ownerInterruptionPolicy.ownerRequired.some((item) => /authority decision/.test(item)));
});

test("Reviewer matrix covers engineering, safety, experience, scope, and actual user need", () => {
  const ids: readonly string[] = exactCandidateReviewerMatrix.map(({ id }) => id);
  for (const required of ["candidate-identity", "correctness", "architecture", "regression", "authentication", "authorization", "rls-data-ownership", "security", "privacy", "errors-failures", "responsive-mobile", "accessibility", "product-truth", "cross-ecosystem", "scope", "actual-user-need"]) assert.ok(ids.includes(required), required);
  assert.equal(new Set(ids).size, ids.length);
});

test("bounded remediation returns only routine in-scope findings and fails closed for authority/provider/destructive work", () => {
  const routine = { finding: "Missing mobile label", insideAuthorizedScope: true, changesAuthority: false, highRisk: false, destructive: false, materialProductDecision: false, requiresNewProviderOrCredential: false };
  assert.equal(classifyBoundedRemediation(routine), "return-to-developer");
  assert.equal(classifyBoundedRemediation({ ...routine, insideAuthorizedScope: false }), "separate-governed-package");
  assert.equal(classifyBoundedRemediation({ ...routine, materialProductDecision: true }), "owner-decision-required");
  assert.equal(classifyBoundedRemediation({ ...routine, changesAuthority: true }), "prohibited");
  assert.equal(classifyBoundedRemediation({ ...routine, requiresNewProviderOrCredential: true }), "prohibited");
});

test("impact discovery reuses Product Completeness dimensions across downstream surfaces", () => {
  const impact = deriveEcosystemImpact(["beastfusion-governance"]);
  assert.ok(impact.nodes.some(({ id }) => id === "beastadmin-development-console"));
  assert.ok(impact.nodes.some(({ id }) => id === "public-agent-profiles"));
  assert.ok(impact.productCompletenessDimensions.includes("security-privacy"));
  assert.ok(impact.productCompletenessDimensions.includes("version-release"));
  assert.deepEqual(deriveEcosystemImpact(["unknown"]).nodes, []);
});

test("Observer analysis keeps the prior source allowlist and Proposal output remains non-executable", () => {
  assert.deepEqual(standingObservationPermittedSources, ["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence"]);
  const finding = buildObserverFinding({ source: "beastfusion_canonical_projection", observedAt: "2026-08-30T00:00:00Z", signal: "Version mismatch", baseline: "Accepted projection", magnitude: "one record", confidence: "high", impact: "medium", evidenceReferences: ["projection"], limitations: [], recommendedDisposition: "INVESTIGATE" });
  assert.equal(finding.executable, false);
  assert.throws(() => buildObserverFinding({ ...finding, source: "private_member_records" as never }));
  const proposal = buildNonExecutableProposal({ findingReference: "finding-1", evidence: ["projection"], problemOrOpportunity: "Mismatch", expectedBenefit: "Consistent truth", proposedScope: ["Reconcile"], effort: "small", risk: "low", dependencies: [], affectedProducts: ["BeastFusion"], priority: "normal", confidence: "high", recommendedDisposition: "APPROVE FOR GOVERNED INTAKE", unknowns: [] });
  assert.equal(proposal.executable, false);
  assert.equal(proposal.executionStatus, "awaiting-owner-and-governance");
});

test("Outcome separates Production health from product value across immediate, short, 7-day, and 30-day windows", () => {
  assert.deepEqual(outcomeEvaluationWindows.map(({ id }) => id), ["immediate", "short", "7-day", "30-day"]);
  assert.equal(recommendOutcome({ technicalReleaseHealthy: true, intendedOutcomeObserved: true, materialRegression: false, evidenceComparable: true, confidence: "high" }), "Continue");
  assert.equal(recommendOutcome({ technicalReleaseHealthy: true, intendedOutcomeObserved: false, materialRegression: false, evidenceComparable: true, confidence: "high" }), "Modify");
  assert.equal(recommendOutcome({ technicalReleaseHealthy: true, intendedOutcomeObserved: null, materialRegression: false, evidenceComparable: false, confidence: "low" }), "Investigate");
  assert.equal(recommendOutcome({ technicalReleaseHealthy: true, intendedOutcomeObserved: true, materialRegression: true, evidenceComparable: true, confidence: "high" }), "Stop");
});

test("engineering memory requires provenance, rejects sensitive content, and yields to current Product Truth", () => {
  assert.match(engineeringMemoryRules.join(" "), /Product Truth always overrides/i);
  for (const record of packageAEngineeringMemory) assert.equal(validateEngineeringMemoryRecord(record).valid, true, record.id);
  const unsafe = { ...packageAEngineeringMemory[0], id: "unsafe", lesson: "service_role=secret-value" };
  assert.equal(validateEngineeringMemoryRecord(unsafe).valid, false);
  const nestedUnsafe = { ...packageAEngineeringMemory[0], id: "nested-unsafe", limitations: ["safe"], provenance: ["BF-AGT-013:evidence", "metadata access_token=secret"] };
  assert.equal(validateEngineeringMemoryRecord(nestedUnsafe).valid, false);
  const originalSnapshot = JSON.stringify(packageAEngineeringMemory[0]);
  const corrected = appendEngineeringMemoryCorrection(packageAEngineeringMemory, {
    ...packageAEngineeringMemory[0], id: "bf-agt-013-capability-is-not-authority-v2", title: "Corrected capability and authority lesson", supersedes: packageAEngineeringMemory[0].id,
  });
  assert.equal(JSON.stringify(corrected[0]), originalSnapshot, "append-only correction preserves original bytes");
  assert.equal(corrected.at(-1)?.supersedes, packageAEngineeringMemory[0].id);
  assert.ok(!currentEngineeringMemory(corrected, [], "2026-08-30").some(({ id }) => id === packageAEngineeringMemory[0].id));
  assert.equal(currentEngineeringMemory(packageAEngineeringMemory, [], "2026-08-30").length, 3);
  assert.equal(currentEngineeringMemory(packageAEngineeringMemory, [], "2027-03-01").length, 0, "stale memory expires into review");
});

test("public-safe profiles reuse the canonical source and omit private execution data", () => {
  assert.equal(publicDevelopmentAgentProfiles.length, 6);
  const developer = getPublicDevelopmentAgentProfile("developer-agent")!;
  assert.deepEqual(developer.capabilityAssessment, publicDevelopmentAgentCapabilityAssessment("developer-agent"));
  assert.equal("foundationPackage" in developer, false);
  assert.doesNotMatch(JSON.stringify(publicDevelopmentAgentProfiles), /service_role|access_token|repository path|execution state|candidateCommit/i);
  assert.match(readFileSync("src/app/ai-development-staff/page.tsx", "utf8"), /publicDevelopmentAgentProfiles\.map/);
  assert.match(readFileSync("src/app/ai-development-staff/[agentId]/page.tsx", "utf8"), /self-assessed/i);
  assert.match(JSON.stringify(knightAutonomyFramework.limitations), /not Knight Institute certificates/i);
});

test("BF-AGT-013 updates owner surfaces, public discovery, documentation, and versions without a migration", () => {
  const owner = readFileSync("src/app/dashboard/admin/development/agents/DevelopmentAgentProfileWorkspace.tsx", "utf8");
  const publicSeo = readFileSync("src/lib/publicSeo.ts", "utf8");
  const manifest = JSON.parse(readFileSync("src/lib/version-manifest.json", "utf8"));
  assert.match(owner, /Software, capability, autonomy, and authority/);
  assert.match(publicSeo, /ai-development-staff\/methodology/);
  assert.ok(["3.1.0", "3.2.0"].includes(manifest.identities.beastos.version), "BF-AGT-013 remains represented after a compatible later release");
  assert.ok(["2.4.0", "2.5.0"].includes(manifest.identities.beastfusion.version), "BF-AGT-013 remains represented after a compatible later release");
  assert.match(readFileSync("docs/BEASTOS-3.1.0-BEASTFUSION-2.4.0-DEVELOPMENT-OPERATIONS-AI.md", "utf8"), /No database migration/);
  assert.equal(readFileSync("src/lib/standingObservation.ts", "utf8").match(/standingObservationPermittedSources = \[([\s\S]*?)\] as const/)?.[1].trim(), '"beastfusion_canonical_projection",\n  "github_repository_evidence",\n  "vercel_deployment_evidence",');
});
