import { recommendOutcome, type OutcomeRecommendation } from "./developmentWorkflowIntelligence";
import type { ObservationSourceResult } from "./standingObservation";

export type OperatingHistoryRow = {
  status: string;
  started_at: string;
  completed_at: string | null;
  checked_sources: string[];
  unavailable_sources: string[];
  findings: unknown;
};

export type OperatingAssessment = {
  recommendation: OutcomeRecommendation;
  comparableDays: number;
  recurringSources: string[];
  explanation: string;
  executable: false;
  causalClaim: false;
};

/** Assess collection reliability and recurring attention, not release effectiveness. */
export function assessStandingOperations(
  current: ObservationSourceResult[],
  history: OperatingHistoryRow[],
  now: Date,
): OperatingAssessment {
  const nowMs = now.getTime();
  const today = Number.isFinite(nowMs) ? now.toISOString().slice(0, 10) : "";
  const days = new Set<string>();
  // Select the latest attempt per day before validating it: an earlier clean
  // attempt must not hide a later failed or unfinished attempt on that day.
  const previous = history.filter((row) => {
    const started = Date.parse(row.started_at);
    return Number.isFinite(started) && started <= nowMs && started >= nowMs - 4 * 24 * 60 * 60 * 1000;
  }).sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at)).filter((row) => {
    const day = new Date(row.started_at).toISOString().slice(0, 10);
    if (day === today || days.has(day)) return false;
    days.add(day);
    return true;
  }).slice(0, 2).filter((row) => {
    const completed = row.completed_at ? Date.parse(row.completed_at) : NaN;
    return ["clean", "findings", "duplicate_skipped"].includes(row.status)
      && Number.isFinite(completed) && completed >= Date.parse(row.started_at) && completed <= nowMs
      && Array.isArray(row.findings)
      && row.findings.every((finding: unknown) => Boolean(finding && typeof finding === "object" && "source" in finding && typeof finding.source === "string"));
  });
  const recurringSources = current.filter((source) => source.available && source.changed && previous.length === 2 && previous.every((row) => row.checked_sources.includes(source.source) && !row.unavailable_sources.includes(source.source) && (row.findings as { source: string }[]).some((finding) => finding.source === source.source))).map((source) => source.source);
  const missing = current.length === 0 || current.some((source) => !source.available) || previous.some((row) => current.some((source) => !row.checked_sources.includes(source.source) || row.unavailable_sources.includes(source.source)));
  const comparable = Boolean(today) && previous.length === 2 && !missing;
  const recommendation = recommendOutcome({ technicalReleaseHealthy: true, intendedOutcomeObserved: comparable ? !current.some((source) => source.changed) : null, materialRegression: false, evidenceComparable: comparable, confidence: comparable ? "medium" : "low" });
  const explanation = !comparable
    ? "Investigate: three distinct recent days of complete evidence are not available. Restore missing evidence or retain the existing cadence; do not infer improvement."
    : recurringSources.length
      ? `Modify: attention recurs across three observed days for ${recurringSources.join(", ").replaceAll("_", " ")}. Prioritize investigation of existing findings before proposing more work.`
      : recommendation === "Modify"
        ? "Modify: current attention needs review against the recent baseline; recurrence has not been established. Review existing findings."
        : "Continue: the current observation has no attention signal and three recent days have complete evidence. Retain the existing cadence; this is not proof of intervention effectiveness.";
  const comparableDays = (current.length > 0 && current.every((source) => source.available) ? 1 : 0) + previous.filter((row) => current.length > 0 && current.every((source) => row.checked_sources.includes(source.source) && !row.unavailable_sources.includes(source.source))).length;
  return { recommendation, comparableDays, recurringSources, explanation, executable: false, causalClaim: false };
}
