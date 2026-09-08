import { evidenceDigest, runAfterControlledObservationValidation, runAfterStandingObservationAuthorization, runWithBoundedRetries, standingObservationPermittedSources, standingProposalSourceId, type ObservationSourceResult } from "../standingObservation";
import { proposalIntakeProduct } from "../ownerProposalReview";
import { loadBeastFusionCanonicalReadModel } from "./beastFusionReadModel";
import { readGitHubRepositoryEvidence, readVercelDeploymentEvidence } from "./beastAdminRepositoryProviders";
import { createBeastFusionPublicationClient } from "../supabase/service";
import { buildNonExecutableProposal, buildObserverFinding } from "../developmentWorkflowIntelligence";

import { buildStandingEcosystemEvidence } from "../standingObservationEvidence";
import { buildStandingObservationLearning } from "../standingObservationLearning";
import { persistStandingObservationCycle } from "../standingObservationPersistence";

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
  // Retain source findings on duplicate cycles so the latest completed cycle
  // remains a useful baseline without repeating proposal investigations.
  const baseline = await service.from("beast_admin_staff_observation_runs").select("findings,unavailable_sources").eq("owner_id", ownerId).eq("trigger_type", simulation ? "owner_controlled_simulation" : "schedule").in("status", ["clean", "findings", "duplicate_skipped"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (baseline.error) throw new Error("observation_learning_history_unavailable");
  const triggerType = simulation ? "owner_controlled_simulation" : "schedule";
  let createdProposals = 0;
  const run = await persistStandingObservationCycle(sources, buildStandingObservationLearning(sources, baseline.data), {
    async hasAcceptedDigest(digest) {
      // Match the existing owner/digest unique index, which spans trigger types.
      const accepted = await service.from("beast_admin_staff_observation_runs").select("id").eq("owner_id", ownerId).eq("evidence_digest", digest).in("status", ["clean", "findings"]).limit(1).maybeSingle();
      if (accepted.error) throw new Error("observation_history_unavailable");
      return Boolean(accepted.data);
    },
    async insert(result, status) {
  const structuredFindings = sources.filter((source) => source.available && source.changed && ["medium", "high"].includes(source.impact)).map((item) => buildObserverFinding({
    source: item.source as (typeof standingObservationPermittedSources)[number],
    observedAt: new Date().toISOString(),
    signal: item.summary,
    baseline: baseline.data ? "Previous evaluated source-level observation" : "First accepted observation baseline",
    magnitude: item.impact,
    confidence: item.confidence,
    impact: item.impact,
    evidenceReferences: [`standing-observation:${result.evidenceDigest}`],
    limitations: result.unavailableSources.length ? [`Unavailable sources: ${result.unavailableSources.join(", ")}`] : [],
    recommendedDisposition: item.impact === "high" || item.impact === "medium" ? "INVESTIGATE" : item.impact === "low" ? "MONITOR" : "IGNORE",
  }));
  const inserted = await service.from("beast_admin_staff_observation_runs").insert({ owner_id: ownerId, schedule_id: scheduleId, trigger_type: triggerType, status, started_at: startedAt, completed_at: status === "running" ? null : new Date().toISOString(), checked_sources: result.checkedSources, unavailable_sources: result.unavailableSources, changes: result.changes, suppressed_signals: result.suppressedSignals, findings: structuredFindings, confidence: result.confidence, impact: result.impact, next_step: result.nextStep, evidence_digest: result.evidenceDigest, finding_count: structuredFindings.length, investigation_count: result.investigationCount, proposal_count: 0, retry_count: retryCount }).select().single();
  if (inserted.error || !inserted.data) throw new Error("observation_persistence_failed");
  return inserted.data as { id: string; evidence_digest: string; status: string };
    },
    async createProposals(run, findings) {

  for (const finding of findings) {
    const sourceId = standingProposalSourceId(evidenceDigest([finding]), finding.source);
    const duplicate = await service.from("beast_admin_roadmap_items").select("id").eq("user_id", ownerId).eq("source_type", "orchestrator_3_proposal").eq("source_id", sourceId).maybeSingle();
    if (duplicate.error) throw new Error("proposal_history_unavailable");
    if (!duplicate.data) {
      const proposal = buildNonExecutableProposal({ findingReference: sourceId, evidence: [`standing-observation:${run.evidence_digest}`], problemOrOpportunity: finding.summary, expectedBenefit: "Resolve or consciously disposition the evidence-backed operational finding.", proposedScope: ["Investigate the recorded finding within existing governance before defining implementation work."], effort: "unknown", risk: finding.impact === "high" ? "high" : "medium", dependencies: ["Canonical BeastFusion reconciliation", "Owner decision"], affectedProducts: finding.affectedProducts?.length ? finding.affectedProducts : ["BeastFusion"], priority: finding.impact === "high" ? "urgent" : "high", confidence: finding.confidence, recommendedDisposition: "INVESTIGATE", unknowns: sources.filter((source) => !source.available).map((source) => source.source) });
      const created = await service.from("beast_admin_roadmap_items").insert({ user_id: ownerId, source_type: "orchestrator_3_proposal", source_id: sourceId, product_id: proposalIntakeProduct("BeastFusion"), title: `Standing observation: ${finding.source.replaceAll("_", " ")}`, summary: finding.summary, status: "planned", governance_classification: "intake", execution_status: "candidate_intake", is_next_build: false, execution_payload: { ...proposal, generatedBy: "proposal_agent", standingObservationRunId: run.id, evidenceDigest: run.evidence_digest, reconciliationStatus: "awaiting_beastfusion_reconciliation", executionAuthorized: false, executable: false } });
      if (created.error) {
        throw new Error("proposal_intake_write_failed");
      }
      createdProposals += 1;
    }
  }
  return createdProposals;
    },
    async finish(run, status, proposalCount, nextStep) {
      const updated = await service.from("beast_admin_staff_observation_runs").update({ status, completed_at: new Date().toISOString(), proposal_count: proposalCount, next_step: nextStep }).eq("id", run.id).eq("owner_id", ownerId).select().single();
      if (updated.error || !updated.data) throw new Error("observation_proposal_count_update_failed");
      return updated.data as { id: string; evidence_digest: string; status: string };
    },
    async fail(run) {
      const failed = await service.from("beast_admin_staff_observation_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_category: "proposal_cycle_incomplete", proposal_count: createdProposals, next_step: "Proposal processing was incomplete; existing intake is retained and the next cycle will retry safely. Do not execute." }).eq("id", run.id).eq("owner_id", ownerId);
      if (failed.error) throw new Error("observation_failure_persistence_failed");
    },
  });
  return { data: run, error: null };
}
