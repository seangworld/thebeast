import type { ObservationSourceResult } from "./standingObservation";

export type ObservationLearningBaseline = {
  findings: unknown;
  unavailable_sources: string[] | null;
};

/** Source-level comparison is advisory evidence, never attribution or execution authority. */
export function buildStandingObservationLearning(
  sources: ObservationSourceResult[],
  previous: ObservationLearningBaseline | null,
): string[] {
  if (!previous) return ["Learning baseline established; no earlier comparable observation is available."];
  if (!Array.isArray(previous.findings)) return ["Earlier findings are unavailable; outcome comparison requires valid historical evidence."];
  const priorSources = new Set(previous.findings.flatMap((finding: unknown) => {
    if (!finding || typeof finding !== "object" || !("source" in finding) || typeof finding.source !== "string") return [];
    return [finding.source];
  }));
  const learning: string[] = [];
  for (const source of sources) {
    if (!source.available) {
      learning.push(`${source.source}: comparison unavailable; missing evidence cannot establish improvement.`);
      continue;
    }
    if (previous.unavailable_sources?.includes(source.source)) {
      learning.push(`${source.source}: evidence restored; establish a fresh baseline before judging outcomes.`);
    } else if (priorSources.has(source.source)) {
      learning.push(source.changed
        ? `${source.source}: attention persists at this source; review existing findings before proposing more work.`
        : `${source.source}: the earlier attention signal is no longer observed. This does not establish that an intervention caused improvement.`);
    } else if (source.changed) {
      learning.push(`${source.source}: a new attention signal is observed against the previous baseline.`);
    }
  }
  return learning;
}
