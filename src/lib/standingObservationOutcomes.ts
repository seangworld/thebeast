import { createHash } from "node:crypto";
import type { BeastAdminCanonicalReadModel } from "./beastAdminCanonicalProjection";
import { beastAdminRepositoryCatalog, type BeastAdminRepositoryObservation, type BeastAdminDeploymentObservation } from "./beastAdminRepositoryReleaseIntelligence";
import { standingObservationPermittedSources } from "./standingObservation";

type Source = typeof standingObservationPermittedSources[number];
type SignalState = "attention" | "clear" | "unknown";
export type OperatingCondition = { id: string; source: Source; product: string; detail: string; state: SignalState; severity: "medium" | "high" };
export type OperatingSnapshot = { observedAt: string; canonicalComplete: boolean; conditions: OperatingCondition[]; followUps: Array<{ id: string; product: string; title: string; status: string; nextStep: string }> };
export type OutcomeHistoryRow = { status: string; started_at: string; completed_at: string | null; findings: unknown };
export type OperatingOutcome = OperatingCondition & { outcome: "new" | "persisting" | "returned" | "recovering" | "resolved" | "healthy" | "unknown"; observedDays: number; recommendation: string };
export type OperatingOutcomeReport = { observedAt: string; outcomes: OperatingOutcome[]; followUps: OperatingSnapshot["followUps"]; windows: Array<{ days: number; observedDays: number; clearDays: number; attentionDays: number; unknownDays: number }>; nextStep: string; executable: false; causalClaim: false };
const dayMs = 86400000;
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 4000;
const validTime = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));

/** Versioned JSONB payload; legacy finding arrays remain readable. No schema change. */
export function unpackObservationEvidence(value: unknown): { findings: unknown[] | null; snapshot: OperatingSnapshot | null } {
  if (Array.isArray(value)) return { findings: value, snapshot: null };
  const envelope = record(value); const snapshot = record(envelope.snapshot);
  if (envelope.version !== 1 || !Array.isArray(envelope.findings)) return { findings: null, snapshot: null };
  const invalid = { findings: null, snapshot: null };
  if (!validTime(snapshot.observedAt) || typeof snapshot.canonicalComplete !== "boolean" || !Array.isArray(snapshot.conditions) || snapshot.conditions.length > 1000 || !Array.isArray(snapshot.followUps) || snapshot.followUps.length > 1000) return invalid;
  if (!snapshot.conditions.every((v) => { const c = record(v); return text(c.id) && text(c.product) && text(c.detail) && standingObservationPermittedSources.includes(c.source as Source) && ["attention", "clear", "unknown"].includes(c.state as string) && ["medium", "high"].includes(c.severity as string); })) return invalid;
  if (new Set(snapshot.conditions.map((c) => c.id)).size !== snapshot.conditions.length) return invalid;
  const expected = new Map<string, { source: Source; product: string }>([["canonical:coverage", { source: "beastfusion_canonical_projection", product: "BeastFusion" }]]);
  for (const c of beastAdminRepositoryCatalog) {
    expected.set(`repository:${c.repository}`, { source: "github_repository_evidence", product: c.label });
    if (c.deployed) expected.set(`production:${c.repository}`, { source: "vercel_deployment_evidence", product: c.label });
  }
  const conditions = snapshot.conditions;
  if (!Array.from(expected.keys()).every((id) => conditions.some((c) => c.id === id))) return invalid;
  if (!conditions.every((c) => { const fixed = expected.get(c.id); return fixed ? c.source === fixed.source && c.product === fixed.product : c.id.startsWith("canonical:") && c.source === "beastfusion_canonical_projection" && c.product === "BeastFusion"; })) return invalid;
  if (conditions.find((c) => c.id === "canonical:coverage")?.state !== (snapshot.canonicalComplete ? "clear" : "unknown")) return invalid;
  if (!snapshot.canonicalComplete && snapshot.conditions.some((c) => c.source === "beastfusion_canonical_projection" && c.state !== "unknown")) return invalid;
  if (!snapshot.followUps.every((v) => { const f = record(v); return [f.id, f.product, f.title, f.status, f.nextStep].every(text); })) return invalid;
  return { findings: envelope.findings, snapshot: snapshot as OperatingSnapshot };
}

/** Fixed catalog prevents a missing product from silently disappearing from coverage. */
export function buildOperatingSnapshot(canonical: BeastAdminCanonicalReadModel, repositories: BeastAdminRepositoryObservation[], deployments: BeastAdminDeploymentObservation[], now: Date): OperatingSnapshot {
  const canonicalComplete = canonical.provider.status === "connected";
  const conditions: OperatingCondition[] = canonicalComplete ? canonical.attention.map((item) => ({ id: `canonical:${/^(validation-warning|blocked):\d+$/.test(item.id) ? `${item.id.split(":")[0]}:${createHash("sha256").update(item.detail).digest("hex")}` : item.id}`, source: "beastfusion_canonical_projection", product: "BeastFusion", detail: item.detail, state: "attention", severity: ["blocker", "failure"].includes(item.kind) ? "high" : "medium" })) : [];
  conditions.push({ id: "canonical:coverage", source: "beastfusion_canonical_projection", product: "BeastFusion", detail: canonicalComplete ? "Canonical operating evidence is current." : "Restore current canonical evidence before assessing outcomes.", state: canonicalComplete ? "clear" : "unknown", severity: "high" });
  for (const item of beastAdminRepositoryCatalog) {
    const repos = repositories.filter((r) => r.repository === item.repository);
    const repo = repos.length === 1 ? repos[0] : null;
    const repoReady = repo?.state === "connected" && Boolean(repo.headCommit);
    conditions.push({ id: `repository:${item.repository}`, source: "github_repository_evidence", product: item.label, detail: repoReady ? "Repository evidence is available." : "Repository evidence is unavailable; restore the existing connection.", state: repoReady ? "clear" : "unknown", severity: "high" });
    if (!item.deployed) continue;
    const matches = deployments.filter((d) => d.repository === item.repository && d.environment === "production");
    const deployed = matches.length === 1 ? matches[0] : null;
    const comparable = repoReady && deployed?.state === "connected" && Boolean(deployed.servedCommit);
    const state = !comparable ? "unknown" : repo!.headCommit === deployed!.servedCommit ? "clear" : "attention";
    conditions.push({ id: `production:${item.repository}`, source: "vercel_deployment_evidence", product: item.label, detail: state === "unknown" ? "Production and repository evidence cannot be compared." : state === "attention" ? "Production differs from repository head; check whether the release gap is intentional." : "Production serves the observed repository head.", state, severity: "medium" });
  }
  const followUps: OperatingSnapshot["followUps"] = [];
  if (canonicalComplete) {
    for (const item of canonical.roadmap.filter((r) => r.blocked && !["complete", "completed", "released", "archived"].includes(r.status))) {
      followUps.push({ id: `work:${item.id}`, product: item.product, title: item.title, status: item.status, nextStep: item.ownerAction || `Resolve the recorded dependencies for ${item.id}; retain the existing authorization boundary.` });
    }
    for (const item of canonical.proposals || []) {
      if (["rejected", "completed", "archived", "reconciled"].includes(item.status)) continue;
      const nextStep = item.status === "watching" ? "Continue the owner's watch decision; do not reopen or execute automatically." : item.status === "approved_pending_reconciliation" ? "Complete canonical reconciliation; proposal approval alone does not authorize execution." : ["changes_requested", "further_investigation_requested"].includes(item.status) ? "Follow up on the recorded owner request in the existing proposal queue." : "Review this proposal in the existing owner decision queue.";
      followUps.push({ id: `proposal:${item.id}`, product: item.product, title: item.title, status: item.status, nextStep });
    }
  }
  const snapshot = { observedAt: now.toISOString(), canonicalComplete, conditions: Array.from(new Map(conditions.map((c) => [c.id, c])).values()), followUps };
  if (!unpackObservationEvidence({ version: 1, findings: [], snapshot }).snapshot) throw new Error("operating_snapshot_invalid");
  return snapshot;
}

function stateFor(snapshot: OperatingSnapshot | null, condition: OperatingCondition): SignalState {
  if (!snapshot) return "unknown";
  const found = snapshot.conditions.find((c) => c.id === condition.id);
  if (found) return found.source === condition.source && found.product === condition.product ? found.state : "unknown";
  return condition.id.startsWith("canonical:") && condition.id !== "canonical:coverage" && snapshot.canonicalComplete ? "clear" : "unknown";
}

/** Daily evidence is operational learning, never causal attribution or execution authority. */
export function assessOperatingOutcomes(current: OperatingSnapshot, history: OutcomeHistoryRow[]): OperatingOutcomeReport {
  const now = Date.parse(current.observedAt); const today = new Date(now).toISOString().slice(0, 10);
  const latestByDay = new Map<string, OutcomeHistoryRow>();
  for (const row of [...history].sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))) {
    const time = Date.parse(row.started_at);
    if (!Number.isFinite(time) || time >= now || time < now - 30 * dayMs) continue;
    const day = new Date(time).toISOString().slice(0, 10);
    if (day !== today && !latestByDay.has(day)) latestByDay.set(day, row);
  }
  const prior = new Map<string, OperatingSnapshot | null>();
  for (const [day, row] of Array.from(latestByDay)) {
    const snapshot = unpackObservationEvidence(row.findings).snapshot;
    const valid = ["clean", "findings", "duplicate_skipped"].includes(row.status) && row.completed_at && Date.parse(row.completed_at) >= Date.parse(row.started_at) && Date.parse(row.completed_at) <= now && snapshot && Date.parse(snapshot.observedAt) === Date.parse(row.started_at);
    prior.set(day, valid ? snapshot : null);
  }
  const known = new Map(current.conditions.map((c) => [c.id, c]));
  for (const snapshot of Array.from(prior.values())) for (const c of snapshot?.conditions || []) if (!known.has(c.id)) known.set(c.id, c);
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.parse(`${today}T00:00:00Z`) - i * dayMs).toISOString().slice(0, 10));
  const snapshots = days.map((day, i) => i === 0 ? current : prior.get(day) || null);
  const outcomes = Array.from(known.values()).map((condition): OperatingOutcome => {
    const states = snapshots.map((s) => stateFor(s, condition)); const state = states[0];
    let outcome: OperatingOutcome["outcome"] = state === "unknown" ? "unknown" : state === "attention" ? "new" : "healthy";
    if (state === "attention" && states[1] === "attention") outcome = "persisting";
    if (state === "attention" && states[1] === "clear" && states.slice(2).includes("attention")) outcome = "returned";
    if (state === "clear" && states.slice(1).includes("attention")) outcome = states.slice(0, 3).every((s) => s === "clear") ? "resolved" : "recovering";
    const recommendation = outcome === "unknown" ? "Restore evidence; no outcome conclusion is available." : outcome === "returned" ? "Revisit the earlier finding: the attention signal returned after a clear observation." : outcome === "persisting" ? "Prioritize the existing finding; repeated attention should not create duplicate work." : outcome === "new" ? "Investigate the current signal against the available baseline." : outcome === "recovering" ? "Monitor at the existing cadence until three consecutive days confirm the signal remains clear." : outcome === "resolved" ? "Three consecutive daily observations are clear; retain the evidence and monitor for recurrence." : "Continue the existing monitoring cadence.";
    const detail = state === "clear" && !current.conditions.some((c) => c.id === condition.id) ? `Earlier canonical signal is no longer observed: ${condition.detail}` : condition.detail;
    return { ...condition, detail, state, outcome, observedDays: states.filter((s) => s === "attention").length, recommendation };
  });
  const rank = (o: OperatingOutcome) => (o.state === "unknown" ? 100 : o.state === "attention" ? 50 : 0) + (o.severity === "high" ? 20 : 0) + (o.outcome === "returned" ? 15 : 0) + Math.min(o.observedDays, 14);
  outcomes.sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
  const windows = [7, 30].map((count) => {
    const selected = snapshots.slice(0, count);
    const states = selected.map((s) => !s || s.conditions.some((c) => c.state === "unknown") ? "unknown" : s.conditions.some((c) => c.state === "attention") ? "attention" : "clear");
    return { days: count, observedDays: selected.filter(Boolean).length, clearDays: states.filter((s) => s === "clear").length, attentionDays: states.filter((s) => s === "attention").length, unknownDays: states.filter((s) => s === "unknown").length };
  });
  const first = outcomes.find((o) => o.state !== "clear");
  return { observedAt: current.observedAt, outcomes, followUps: current.followUps, windows, nextStep: first ? `${first.product}: ${first.recommendation}` : current.followUps.length ? "Follow up on existing canonical decisions and blockers; technical health does not close them." : "Continue the existing cadence; no current operational attention is observed.", executable: false, causalClaim: false };
}
