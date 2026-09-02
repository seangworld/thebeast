import { evaluateVideoReadiness, normalizeVideoTopicPhrases, type VideoJobState, type VideoSeriesSettings } from "./beastMarketingVideo";

export const VIDEO_CANDIDATE_BATCH_LIMIT = 5;

export type OwnerWorkflowGroup = "needs_review" | "approved_scheduled" | "published_history" | "rejected_needs_changes";
export type OwnerWorkflowDecision = "pending" | "held" | "approved" | "rejected" | "needs_changes";

export type AutoApprovalEvidence = {
  factualClaimsVerified?: boolean;
  productTruthVerified?: boolean;
  misleadingClaimsAbsent?: boolean;
  safeContent?: boolean;
  provenanceComplete?: boolean;
  destinationValid?: boolean;
  duplicateRisk?: number;
  mediaIntegrity?: boolean;
  metadataQuality?: number;
  attributionValid?: boolean;
  runtimeSeconds?: number;
  publicationEligibleMedia?: boolean;
};

export type AutoApprovalControls = {
  pauseAllPublishing: boolean;
  externalPublishingAuthorized: boolean;
  automaticPublishingAuthorized: boolean;
  youtubeAuthorized: boolean;
};

export function evaluateSeriesAutoApproval(input: { settings: VideoSeriesSettings; seriesEnabled: boolean; manuallyApprovedCount: number; controls: AutoApprovalControls; evidence: AutoApprovalEvidence }) {
  if (input.settings.approvalMode !== "automatic") return { approved: false as const, fallback: "needs_review" as const, blockers: ["Owner Approval is configured for this series."] };
  const uncertain: string[] = [];
  const failed: string[] = [];
  if (!input.seriesEnabled) uncertain.push("The series is paused.");
  if (input.manuallyApprovedCount < input.settings.manualApprovalFirstN) uncertain.push(`${input.settings.manualApprovalFirstN - input.manuallyApprovedCount} more manually approved video${input.settings.manualApprovalFirstN - input.manuallyApprovedCount === 1 ? " is" : "s are"} required before auto-approval.`);
  if (input.controls.pauseAllPublishing) uncertain.push("PAUSE ALL PUBLISHING is active.");
  if (!input.controls.youtubeAuthorized) uncertain.push("YouTube OAuth is not authorized.");
  if (!input.controls.externalPublishingAuthorized) uncertain.push("External publishing authority is absent.");
  if (!input.controls.automaticPublishingAuthorized) uncertain.push("Automatic publishing authority is absent.");

  const booleanGates: [keyof AutoApprovalEvidence, string][] = [
    ["factualClaimsVerified", "Factual claims verification"], ["productTruthVerified", "Product Truth verification"],
    ["misleadingClaimsAbsent", "Misleading-claims review"], ["safeContent", "Safety review"],
    ["provenanceComplete", "Provenance review"], ["destinationValid", "Destination validation"],
    ["mediaIntegrity", "Media integrity"], ["attributionValid", "Attribution validation"],
  ];
  for (const [key, label] of booleanGates) {
    if (input.evidence[key] === false) failed.push(`${label} failed.`);
    else if (input.evidence[key] !== true) uncertain.push(`${label} is unavailable.`);
  }
  if (input.evidence.publicationEligibleMedia === false) failed.push("The rendered media is not publication-eligible.");
  else if (input.evidence.publicationEligibleMedia !== true) uncertain.push("Publication-eligible media evidence is unavailable.");
  if (!Number.isFinite(input.evidence.duplicateRisk)) uncertain.push("Duplication risk is unavailable.");
  else if (Number(input.evidence.duplicateRisk) >= 0.8) failed.push("Duplication risk is too high.");
  if (!Number.isFinite(input.evidence.metadataQuality)) uncertain.push("Metadata quality is unavailable.");
  else if (Number(input.evidence.metadataQuality) < input.settings.qualityThreshold) failed.push("Metadata quality is below the series threshold.");
  if (!Number.isFinite(input.evidence.runtimeSeconds)) uncertain.push("Runtime validation is unavailable.");
  else if (Number(input.evidence.runtimeSeconds) < input.settings.minimumRuntimeSeconds || Number(input.evidence.runtimeSeconds) > input.settings.maximumRuntimeSeconds) failed.push("Runtime is outside the configured range.");

  if (!failed.length && !uncertain.length) {
    const readiness = evaluateVideoReadiness({
      factualClaimsVerified: true, productTruthVerified: true, misleadingClaimsAbsent: true, safeContent: true,
      provenanceComplete: true, destinationValid: true, duplicateRisk: Number(input.evidence.duplicateRisk), mediaIntegrity: true,
      metadataQuality: Number(input.evidence.metadataQuality), attributionValid: true, runtimeSeconds: Number(input.evidence.runtimeSeconds), settings: input.settings,
    });
    if (!readiness.ready) failed.push(...readiness.blockers);
  }
  if (failed.length) return { approved: false as const, fallback: "needs_changes" as const, blockers: [...failed, ...uncertain] };
  if (uncertain.length) return { approved: false as const, fallback: "needs_review" as const, blockers: uncertain };
  return { approved: true as const, fallback: null, blockers: [] as string[] };
}

type WorkflowJob = {
  state: VideoJobState;
  quality?: { renderReady?: boolean; ownerQualityReview?: string; ownerWorkflowDecision?: string } | null;
};

export function ownerWorkflowGroup(job: WorkflowJob): OwnerWorkflowGroup {
  const decision = job.quality?.ownerWorkflowDecision;
  if (["published", "measuring", "completed", "scale"].includes(job.state)) return "published_history";
  if (decision === "approved" || job.state === "scheduled") return "approved_scheduled";
  if (decision === "rejected" || decision === "needs_changes" || ["modify", "stop", "failed", "skipped"].includes(job.state)) return "rejected_needs_changes";
  return "needs_review";
}

export function ownerWorkflowStatus(job: WorkflowJob) {
  const decision = job.quality?.ownerWorkflowDecision;
  if (decision === "held") return "On hold";
  if (decision === "approved") return job.state === "scheduled" ? "Approved and scheduled" : "Approved · upload authority pending";
  if (decision === "rejected") return "Rejected";
  if (decision === "needs_changes") return "Needs changes";
  if (["published", "measuring", "completed", "scale"].includes(job.state)) return "Published · outcome tracking active";
  if (job.state === "ready" && job.quality?.renderReady) return "Waiting for owner approval";
  if (job.state === "generating") return "Generating internal video";
  if (job.state === "scripted") return "Ready for internal render";
  if (job.state === "selected") return "Ready for grounded script";
  return "Preparing candidate";
}

export function validateTopicFamily(topicFamily: string, settings: VideoSeriesSettings) {
  const normalized = topicFamily.replace(/\s+/g, " ").trim();
  if (!normalized) return { valid: false as const, error: "A topic or topic family is required." };
  const identity = normalized.toLowerCase();
  const excluded = normalizeVideoTopicPhrases(settings.excludedTopics);
  const blocked = excluded.find((phrase) => identity.includes(phrase.toLowerCase()) || phrase.toLowerCase().includes(identity));
  if (blocked) return { valid: false as const, error: `This topic family conflicts with the excluded topic phrase “${blocked}”.` };
  const allowed = normalizeVideoTopicPhrases(settings.allowedTopics);
  if (allowed.length && !allowed.some((phrase) => identity.includes(phrase.toLowerCase()) || phrase.toLowerCase().includes(identity))) {
    return { valid: false as const, error: "This topic family does not match the selected series’ allowed topic phrases." };
  }
  return { valid: true as const, topicFamily: normalized };
}

function windowStart(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return { hour: 12, minute: 0 };
  const hour = Number(match[1]); const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? { hour, minute } : { hour: 12, minute: 0 };
}

export function planCandidateCadence(settings: VideoSeriesSettings, requestedCount: number, now = new Date()) {
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > VIDEO_CANDIDATE_BATCH_LIMIT) {
    return { valid: false as const, error: `Generate between 1 and ${VIDEO_CANDIDATE_BATCH_LIMIT} candidates at a time.` };
  }
  if (requestedCount > settings.maximumPerWeek) {
    return { valid: false as const, error: `This series allows at most ${settings.maximumPerWeek} candidate${settings.maximumPerWeek === 1 ? "" : "s"} per week.` };
  }
  const permittedDays = new Set(settings.daysOfWeek.length ? settings.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]);
  const start = windowStart(settings.preferredWindows[0] || "12:00-13:00");
  const slots: string[] = [];
  for (let dayOffset = 0; dayOffset < 7 && slots.length < requestedCount; dayOffset += 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);
    if (!permittedDays.has(day.getDay())) continue;
    for (let index = 0; index < settings.maximumPerDay && slots.length < requestedCount; index += 1) {
      const slot = new Date(day);
      slot.setHours(start.hour, start.minute + (index * settings.minimumSpacingMinutes), 0, 0);
      if (slot.getTime() <= now.getTime()) continue;
      slots.push(slot.toISOString());
    }
  }
  if (slots.length < requestedCount) return { valid: false as const, error: "The requested batch does not fit the series cadence in the next seven days." };
  return { valid: true as const, slots };
}
