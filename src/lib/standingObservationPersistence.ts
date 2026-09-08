import { evaluateStandingObservation, evidenceDigest, type ObservationSourceResult, type StandingObservationResult } from "./standingObservation";

export type ObservationCycleStore<T> = {
  hasAcceptedDigest(digest: string): Promise<boolean>;
  insert(result: StandingObservationResult, status: "running" | StandingObservationResult["status"]): Promise<T>;
  createProposals(run: T, findings: ObservationSourceResult[]): Promise<number>;
  finish(run: T, status: StandingObservationResult["status"], proposalCount: number, nextStep: string): Promise<T>;
  fail(run: T, reason: unknown): Promise<void>;
};

/** Successful digests remain unique; failed proposal work never becomes a baseline. */
export async function persistStandingObservationCycle<T>(
  sources: ObservationSourceResult[],
  learning: string[],
  store: ObservationCycleStore<T>,
) {
  const digest = evidenceDigest(sources);
  const accepted = await store.hasAcceptedDigest(digest);
  const result = evaluateStandingObservation(sources, accepted ? digest : null);
  result.changes.push(...learning);
  // Keep both new and recurring material attention visible even when intake is suppressed.
  if (accepted && sources.some((source) => source.available && source.changed)) {
    result.nextStep = "Previously recorded attention is present; review existing findings before proposing more work.";
  }
  const run = await store.insert(result, result.findings.length ? "running" : result.status);
  if (!result.findings.length) return run;
  try {
    const count = await store.createProposals(run, result.findings);
    return await store.finish(run, result.status, count, count
      ? "Proposal intake awaits canonical BeastFusion reconciliation before owner review; do not execute."
      : "Existing proposal intake remains available for canonical reconciliation; do not execute.");
  } catch (error) {
    // If failure recording is unavailable, the run stays running, not accepted.
    await store.fail(run, error);
    throw error;
  }
}
