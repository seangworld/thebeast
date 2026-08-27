import { createHash } from "node:crypto";

export const standingObservationAssignment = "orchestrator_3_standing_observation" as const;
export const standingObservationCron = "0 10 * * *" as const;
export const maximumInvestigationsPerCycle = 3;
export const maximumRetriesPerSource = 2;

export type ObservationSourceResult = {
  source: string;
  available: boolean;
  changed: boolean;
  summary: string;
  confidence: "low" | "medium" | "high";
  impact: "none" | "low" | "medium" | "high";
  fingerprint: string;
};

export type StandingObservationResult = {
  status: "clean" | "findings" | "duplicate_skipped";
  checkedSources: string[];
  unavailableSources: string[];
  changes: string[];
  suppressedSignals: string[];
  findings: ObservationSourceResult[];
  confidence: string;
  impact: string;
  nextStep: string;
  evidenceDigest: string;
  investigationCount: number;
  proposalCount: number;
};

export function evidenceDigest(results: ObservationSourceResult[]) {
  const stable = results
    .map(({ source, available, changed, fingerprint }) => ({ source, available, changed, fingerprint }))
    .sort((a, b) => a.source.localeCompare(b.source));
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function evaluateStandingObservation(
  results: ObservationSourceResult[],
  previousDigest?: string | null
): StandingObservationResult {
  const digest = evidenceDigest(results);
  const checkedSources = results.filter((item) => item.available).map((item) => item.source);
  const unavailableSources = results.filter((item) => !item.available).map((item) => item.source);
  if (previousDigest === digest) {
    return { status: "duplicate_skipped", checkedSources, unavailableSources, changes: [], suppressedSignals: ["Evidence digest is unchanged; investigation skipped."], findings: [], confidence: "high", impact: "none", nextStep: "Continue the standing cadence.", evidenceDigest: digest, investigationCount: 0, proposalCount: 0 };
  }
  const changed = results.filter((item) => item.available && item.changed);
  const findings = changed.filter((item) => item.impact === "medium" || item.impact === "high").slice(0, maximumInvestigationsPerCycle);
  const suppressedSignals = changed.filter((item) => !findings.includes(item)).map((item) => `${item.source}: ${item.summary}`);
  const confidence = findings.some((item) => item.confidence === "high") ? "high" : findings.length ? "medium" : "high";
  const impact = findings.some((item) => item.impact === "high") ? "high" : findings.length ? "medium" : "none";
  return {
    status: findings.length ? "findings" : "clean",
    checkedSources,
    unavailableSources,
    changes: changed.map((item) => `${item.source}: ${item.summary}`),
    suppressedSignals,
    findings,
    confidence,
    impact,
    nextStep: findings.length ? "Queue bounded Proposal Agent investigation; do not execute." : "No owner action required.",
    evidenceDigest: digest,
    investigationCount: findings.length,
    proposalCount: findings.length,
  };
}

export function verifyCronAuthorization(header: string | null, secret: string | undefined) {
  return Boolean(secret && secret.length >= 20 && header === `Bearer ${secret}`);
}

export function standingProposalSourceId(digest: string, source: string) {
  const hex = createHash("sha256").update(`standing-observation:${digest}:${source}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

export async function runWithBoundedRetries<T>(operation: () => Promise<T>, retryable: (value: T) => boolean) {
  let retries = 0;
  let value = await operation();
  while (retryable(value) && retries < maximumRetriesPerSource) {
    retries += 1;
    value = await operation();
  }
  return { value, retries };
}
