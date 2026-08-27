import { evaluateStandingObservation, evidenceDigest, runAfterControlledObservationValidation, runAfterStandingObservationAuthorization, runWithBoundedRetries, standingProposalSourceId, type ObservationSourceResult } from "../standingObservation";
import { proposalIntakeProduct } from "../ownerProposalReview";
import { loadBeastFusionCanonicalReadModel } from "./beastFusionReadModel";
import { readGitHubRepositoryEvidence, readVercelDeploymentEvidence } from "./beastAdminRepositoryProviders";
import { createBeastFusionPublicationClient } from "../supabase/service";

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
  const sources: ObservationSourceResult[] = simulation === "clean" ? [{ source: "controlled_fixture", available: true, changed: false, summary: "No material change in controlled evidence.", confidence: "high", impact: "none", fingerprint: "bf-agt-011-clean-v1" }] : [
    { source: "beastfusion_canonical_projection", available: true, changed: canonicalModel.attention.length > 0, summary: canonicalModel.attention.length ? `${canonicalModel.attention.length} canonical attention item(s).` : "Canonical governance has no attention items.", confidence: "high", impact: canonicalModel.attention.some((item) => item.kind === "failure" || item.kind === "blocker") ? "high" : canonicalModel.attention.length ? "medium" : "none", fingerprint: `${canonicalModel.projection?.payloadHash || "unknown"}:${canonicalModel.attention.map((item) => item.id).sort().join(",")}` },
    { source: "github_repository_evidence", available: github?.provider.status === "connected", changed: github?.observations.some((item) => item.state !== "connected") || false, summary: github?.provider.detail || "GitHub evidence unavailable.", confidence: "high", impact: github?.provider.status === "error" ? "medium" : "none", fingerprint: github?.observations.map((item) => `${item.repository}:${item.headCommit || item.state}`).sort().join("|") || "unavailable" },
    { source: "vercel_deployment_evidence", available: vercel?.provider.status === "connected", changed: vercel?.observations.some((item) => item.state !== "connected") || false, summary: vercel?.provider.detail || "Vercel evidence unavailable.", confidence: "high", impact: vercel?.provider.status === "error" ? "medium" : "none", fingerprint: vercel?.observations.map((item) => `${item.repository}:${item.environment}:${item.deploymentId || item.state}`).sort().join("|") || "unavailable" },
  ];
  const digest = evidenceDigest(sources);
  const prior = await service.from("beast_admin_staff_observation_runs").select("evidence_digest").eq("owner_id", ownerId).eq("evidence_digest", digest).in("status", ["clean", "findings"]).limit(1).maybeSingle();
  const result = evaluateStandingObservation(sources, prior.data?.evidence_digest);
  const triggerType = simulation ? "owner_controlled_simulation" : "schedule";
  const inserted = await service.from("beast_admin_staff_observation_runs").insert({ owner_id: ownerId, schedule_id: scheduleId, trigger_type: triggerType, status: result.status, started_at: startedAt, completed_at: new Date().toISOString(), checked_sources: result.checkedSources, unavailable_sources: result.unavailableSources, changes: result.changes, suppressed_signals: result.suppressedSignals, findings: result.findings.map((item) => ({ source: item.source, summary: item.summary, confidence: item.confidence, impact: item.impact })), confidence: result.confidence, impact: result.impact, next_step: result.nextStep, evidence_digest: result.evidenceDigest, finding_count: result.findings.length, investigation_count: result.investigationCount, proposal_count: 0, retry_count: retryCount }).select().single();
  if (inserted.error || !inserted.data || !result.findings.length) return inserted;

  let createdProposals = 0;
  for (const finding of result.findings) {
    const sourceId = standingProposalSourceId(result.evidenceDigest, finding.source);
    const duplicate = await service.from("beast_admin_roadmap_items").select("id").eq("user_id", ownerId).eq("source_type", "orchestrator_3_proposal").eq("source_id", sourceId).maybeSingle();
    if (!duplicate.data) {
      const created = await service.from("beast_admin_roadmap_items").insert({ user_id: ownerId, source_type: "orchestrator_3_proposal", source_id: sourceId, product_id: proposalIntakeProduct("BeastFusion"), title: `Standing observation: ${finding.source.replaceAll("_", " ")}`, summary: finding.summary, status: "planned", governance_classification: "intake", execution_status: "candidate_intake", is_next_build: false, execution_payload: { generatedBy: "proposal_agent", standingObservationRunId: inserted.data.id, evidenceDigest: result.evidenceDigest, reconciliationStatus: "awaiting_beastfusion_reconciliation", executionAuthorized: false, executable: false } });
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
