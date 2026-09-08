import { evaluateStandingObservation, evidenceDigest, runAfterControlledObservationValidation, runAfterStandingObservationAuthorization, runWithBoundedRetries, standingObservationPermittedSources, standingProposalSourceId, type ObservationSourceResult } from "../standingObservation";
import { proposalIntakeProduct } from "../ownerProposalReview";
import { loadBeastFusionCanonicalReadModel } from "./beastFusionReadModel";
import { readGitHubRepositoryEvidence, readVercelDeploymentEvidence } from "./beastAdminRepositoryProviders";
import { createBeastFusionPublicationClient } from "../supabase/service";
import { buildNonExecutableProposal, buildObserverFinding } from "../developmentWorkflowIntelligence";

import { buildStandingEcosystemEvidence } from "../standingObservationEvidence";

type Simulation = "clean" | null;

export async function runStandingObservation(ownerId: string, scheduleId: string | null, simulation: Simulation = null) {
  const service = createBeastFusionPublicationClient();
  const startedAt = new Date().toISOString();
  const canonical = await loadBeastFusionCanonicalReadModel();
  let githubAttempt = null;
  let vercelAttempt = null;
  if (simulation) {
    await runAfterControlledObservationValidation(canonical.canonical?.roadmap || null, async () => undefined);
  } else {
    const [schedule, authorization] = await Promise.all([
    scheduleId ? service.from("beast_admin_staff_schedules").select("assignment_key,enabled,paused_at,scope_key,permitted_sources").eq("id", scheduleId).eq("owner_id", ownerId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    service.from("beast_admin_standing_authorizations").select("authorization_key,origin_package_id,owner_authorized,scope_key,permitted_sources,revoked_at").eq("owner_id", ownerId).eq("authorization_key", "orchestrator_3_standing_observation").maybeSingle(),
    ]);
    if (schedule.error || authorization.error) throw new Error("standing_authorization_unavailable");
    [githubAttempt, vercelAttempt] = await runAfterStandingObservationAuthorization(
      { authorization: authorization.data, schedule: schedule.data, canonicalRoadmap: canonical.canonical?.roadmap || null },
      async () => Promise.all([
      runWithBoundedRetries(readGitHubRepositoryEvidence, (result) => result.provider.status === "error"),
      runWithBoundedRetries(readVercelDeploymentEvidence, (result) => result.provider.status === "error"),
      ])
    );
  }
  const github = githubAttempt?.value || null;
  const vercel = vercelAttempt?.value || null;
  const retryCount = (githubAttempt?.retries || 0) + (vercelAttempt?.retries || 0);
  const canonicalModel = canonical.canonical;
  if (!canonicalModel) throw new Error("canonical_state_unavailable");
  const sources: ObservationSourceResult[] = simulation === "clean" ? [{ source: "controlled_fixture", available: true, changed: false, summary: "No material change in controlled evidence.", confidence: "high", impact: "none", fingerprint: "bf-agt-011-clean-v1" }] : buildStandingEcosystemEvidence(canonicalModel, github?.observations || [], vercel?.observations || []);
  const prior = await service.from("beast_admin_staff_observation_runs").select("evidence_digest").eq("owner_id", ownerId).eq("trigger_type", simulation ? "owner_controlled_simulation" : "schedule").in("status", ["clean", "findings", "duplicate_skipped"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (prior.error) throw new Error("observation_history_unavailable");
  const result = evaluateStandingObservation(sources, prior.data?.evidence_digest);
  const structuredFindings = result.findings.map((item) => buildObserverFinding({
    source: item.source as (typeof standingObservationPermittedSources)[number],
    observedAt: new Date().toISOString(),
    signal: item.summary,
    baseline: prior.data?.evidence_digest ? "Previous accepted evidence digest" : "First accepted observation baseline",
    magnitude: item.impact,
    confidence: item.confidence,
    impact: item.impact,
    evidenceReferences: [`standing-observation:${result.evidenceDigest}`],
    limitations: result.unavailableSources.length ? [`Unavailable sources: ${result.unavailableSources.join(", ")}`] : [],
    recommendedDisposition: item.impact === "high" || item.impact === "medium" ? "INVESTIGATE" : item.impact === "low" ? "MONITOR" : "IGNORE",
  }));
  const triggerType = simulation ? "owner_controlled_simulation" : "schedule";
  const inserted = await service.from("beast_admin_staff_observation_runs").insert({ owner_id: ownerId, schedule_id: scheduleId, trigger_type: triggerType, status: result.status, started_at: startedAt, completed_at: new Date().toISOString(), checked_sources: result.checkedSources, unavailable_sources: result.unavailableSources, changes: result.changes, suppressed_signals: result.suppressedSignals, findings: structuredFindings, confidence: result.confidence, impact: result.impact, next_step: result.nextStep, evidence_digest: result.evidenceDigest, finding_count: result.findings.length, investigation_count: result.investigationCount, proposal_count: 0, retry_count: retryCount }).select().single();
  if (inserted.error || !inserted.data || !result.findings.length) return inserted;

  let createdProposals = 0;
  for (const finding of result.findings) {
    const sourceId = standingProposalSourceId(evidenceDigest([finding]), finding.source);
    const duplicate = await service.from("beast_admin_roadmap_items").select("id").eq("user_id", ownerId).eq("source_type", "orchestrator_3_proposal").eq("source_id", sourceId).maybeSingle();
    if (duplicate.error) throw new Error("proposal_history_unavailable");
    if (!duplicate.data) {
      const proposal = buildNonExecutableProposal({ findingReference: sourceId, evidence: [`standing-observation:${result.evidenceDigest}`], problemOrOpportunity: finding.summary, expectedBenefit: "Resolve or consciously disposition the evidence-backed operational finding.", proposedScope: ["Investigate the recorded finding within existing governance before defining implementation work."], effort: "unknown", risk: finding.impact === "high" ? "high" : "medium", dependencies: ["Canonical BeastFusion reconciliation", "Owner decision"], affectedProducts: finding.affectedProducts?.length ? finding.affectedProducts : ["BeastFusion"], priority: finding.impact === "high" ? "urgent" : "high", confidence: finding.confidence, recommendedDisposition: "INVESTIGATE", unknowns: result.unavailableSources });
      const created = await service.from("beast_admin_roadmap_items").insert({ user_id: ownerId, source_type: "orchestrator_3_proposal", source_id: sourceId, product_id: proposalIntakeProduct("BeastFusion"), title: `Standing observation: ${finding.source.replaceAll("_", " ")}`, summary: finding.summary, status: "planned", governance_classification: "intake", execution_status: "candidate_intake", is_next_build: false, execution_payload: { ...proposal, generatedBy: "proposal_agent", standingObservationRunId: inserted.data.id, evidenceDigest: result.evidenceDigest, reconciliationStatus: "awaiting_beastfusion_reconciliation", executionAuthorized: false, executable: false } });
      if (created.error) {
        await service.from("beast_admin_staff_observation_runs").update({ status: "failed", proposal_count: createdProposals, error_category: "proposal_intake_write_failed", next_step: "Proposal intake persistence failed; no proposal is available for review or execution." }).eq("id", inserted.data.id);
        throw new Error("proposal_intake_write_failed");
      }
      createdProposals += 1;
    }
  }
  const updated = await service.from("beast_admin_staff_observation_runs").update({ proposal_count: createdProposals, next_step: createdProposals ? "Proposal intake awaits canonical BeastFusion reconciliation before owner review; do not execute." : result.nextStep }).eq("id", inserted.data.id).select().single();
  if (updated.error) throw new Error("observation_proposal_count_update_failed");
  return updated;
}
