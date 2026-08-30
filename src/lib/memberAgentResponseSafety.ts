import type { MemberSpecialistId } from "./memberAgentCapabilityFramework";
import { isLearningWorkReviewRequest } from "./learning/intentDetection";
import type { LearningIntent } from "./learning/types";

export type MemberAgentSafetyResult = {
  safe: boolean;
  response: string;
  failures: readonly string[];
};

export type MemberAgentResponseContract = {
  consequentialAction: "none" | "completed";
  providerConnection: "none" | "connected";
  professionalAuthority: "bounded_ai" | "licensed_or_official";
  diagnosis: "none" | "asserted";
  medicationDirection: "none" | "directed_change";
  emergencyEscalation: "not_applicable" | "present" | "missing";
  homeworkReview: "not_requested" | "evidence_based" | "insufficient_evidence";
};

export const safeMemberAgentResponseContract: MemberAgentResponseContract = {
  consequentialAction: "none",
  providerConnection: "none",
  professionalAuthority: "bounded_ai",
  diagnosis: "none",
  medicationDirection: "none",
  emergencyEscalation: "not_applicable",
  homeworkReview: "not_requested",
};

export function isMemberAgentResponseContract(value: unknown): value is MemberAgentResponseContract {
  if (!value || typeof value !== "object") return false;
  const contract = value as Partial<MemberAgentResponseContract>;
  return ["none", "completed"].includes(contract.consequentialAction || "")
    && ["none", "connected"].includes(contract.providerConnection || "")
    && ["bounded_ai", "licensed_or_official"].includes(contract.professionalAuthority || "")
    && ["none", "asserted"].includes(contract.diagnosis || "")
    && ["none", "directed_change"].includes(contract.medicationDirection || "")
    && ["not_applicable", "present", "missing"].includes(contract.emergencyEscalation || "")
    && ["not_requested", "evidence_based", "insufficient_evidence"].includes(contract.homeworkReview || "");
}

const instructionSignals = [
  /\b(?:ignore|disregard|bypass|override|forget|disable|discard)\b.{0,60}\b(?:(?:all|any|the|your|previous|prior)\s+)?(?:rules?|instructions?|polic(?:y|ies)|safeguards?|guardrails?|restrictions?|system|developer)\b/i,
  /\b(?:act|behave|pretend)\b.{0,35}\b(?:as if|like)\b.{0,50}\b(?:rules?|instructions?|polic(?:y|ies)|safeguards?|guardrails?|restrictions?)\b.{0,30}\b(?:do not|don't|did not|didn't|never|no longer)\b.{0,20}\b(?:exist|apply|matter|count)\b/i,
  /\b(?:act|behave|respond|answer)\b.{0,30}\bwithout\b.{0,20}\b(?:rules?|restrictions?|safeguards?|guardrails?)\b/i,
  /\b(?:treat|consider|regard)\b.{0,30}\b(?:system|developer)\s+(?:message|prompt|instructions?)\b.{0,25}\b(?:optional|irrelevant|nonbinding|untrusted|ignorable)\b/i,
  /\b(?:follow|obey|use)\b.{0,40}\b(?:(?:my|these|the user'?s?)\s+(?:instructions?|rules?)|(?:worksheet|document|message|note)\s+(?:commands?|instructions?))\b.{0,40}\b(?:instead of|over|above)\b.{0,30}\b(?:system|developer|safety|security|protected|prior|previous)\b/i,
  /\b(?:put|set|leave)\b.{0,25}\b(?:safety|security|protected)\s+(?:requirements?|rules?|policy|policies|constraints?)\b.{0,20}\b(?:aside|away|off|suspended)\b/i,
  /\b(?:normal|usual|standard|safety|security)\s+(?:constraints?|rules?|requirements?|polic(?:y|ies))\b.{0,20}\b(?:are|is|were|have been)?\s*(?:suspended|disabled|waived|inactive|off)\b/i,
  /\b(?:show|reveal|repeat|print|expose|display|provide|give|tell|dump)\b.{0,60}\b(?:setup|initiali[sz]ation|system|developer|hidden|internal|original|protected)\s+(?:text|prompt|instructions?|message|configuration|rules?)\b/i,
] as const;
const reportedSpeech = /\b(?:(?:my|the)\s+)?(?:doctor|clinician|teacher|instructor|professor|supervisor|manager|document|note|worksheet|assignment|policy)\s+(?:said|says|stated|states|wrote|instructed|told (?:me|us)|reads?)\b/i;
const securityEducationReport = /\b(?:need help understanding|help me understand|trying to understand|explain|analy[sz]e|learn)\b.{0,80}\b(?:why|how|what)?\s*(?:a\s+)?(?:prompt injection|jailbreak|security (?:attack|example))\b.{0,50}\b(?:says?|asks?|tries?|attempts?|works?)\b/i;
const quotedInstructionEducation = /\b(?:for (?:a|this) lesson|in (?:a|this) lesson|explain|discuss|analy[sz]e)\b.{0,80}\b(?:phrase|wording|quotation|quote|example)\b/i;
const protectedOutputDisclosure = /\b(?:system|developer|hidden|internal|initiali[sz]ation|protected)\s+(?:prompt|instructions?|message|text|configuration|rules?)\s*(?:is|are|says|:)/i;
const licensedClaim = /\b(?:i am|i'm|i act as|as)\s+(?:(?:your|a|an|the)\s+)?(?:(?:licensed|certified|official)\s+)?(?:financial (?:advisor|adviser|planner)|physician|doctor|therapist|school counselor|school official|admissions (?:authority|officer|official))\b/i;
const financialObject = "(?:bill|payment|transfer|money|funds?|bank account|financial (?:account|institution)|account connection)";
const moneyExecution = new RegExp(`\\b(?:(?:i|we)\\s+(?:(?:have|already)\\s+|went ahead and\\s+)?(?:paid|made|submitted|sent|transferred|moved|withdrew|connected|linked|initiated|processed|completed)\\s+(?:(?:your|the|a|an)\\s+)?(?:${financialObject}|it|that)|(?:i|we)\\s+(?:took care of|handled)\\s+(?:(?:your|the)\\s+)?(?:bill|payment|transfer)|(?:i|we)\\s+(?:set up|established)\\s+(?:(?:your|the|a)\\s+)?(?:bank link|account link|provider connection)|(?:(?:your|the)\\s+)?(?:${financialObject}|bank)\\s+(?:(?:was|is|has been)\\s+|is now\\s+)?(?:paid|submitted|sent|transferred|moved|withdrawn|connected|linked|initiated|processed|completed|taken care of|went through|succeeded))\\b`, "i");
const medicationName = "(?:medication|medicine|prescription|dose|pills?|tablets?|capsules?|beta blocker|blood thinner|metoprolol|lisinopril|losartan|atorvastatin|metformin|insulin|aspirin|warfarin|amoxicillin|[a-z][a-z-]*(?:olol|pril|sartan|statin|formin|cillin|cycline|zepam|oxetine|prazole|semide|dipine|thiazide|gliptin|gliflozin))";
const medicationAmount = "(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|a|an|another|half|double|\\d+(?:\\.\\d+)?)\\s+)?";
const medicationDirection = new RegExp(`(?:^|[.!?]\\s*)(?:(?:you should|please)\\s+)?(?:stop|quit|start|take|discontinue|resume|increase|decrease|double|halve|skip|taper|change|come off)\\s+(?:taking\\s+)?${medicationAmount}(?:(?:your next|your|the|next)\\s+)?${medicationName}(?:\\s+shot)?\\b|\\b(?:i|we)\\s+(?:recommend|advise|suggest)\\s+(?:(?:that you|you)\\s+)?(?:stopping|quitting|starting|taking|discontinuing|resuming|increasing|decreasing|doubling|halving|skipping|tapering|changing)\\s+(?:(?:your|the)\\s+)?(?:it|${medicationName})\\b|\\b(?:do not|don't)\\s+(?:take|continue)\\s+(?:(?:your|the)\\s+)?${medicationName}\\b`, "i");
const diagnosisClaim = /\b(?:(?:your|these|the) symptoms?\s+(?:(?:likely|probably)\s+)?(?:indicate|confirm|mean|show|prove|point to|are caused by)|(?:you\s+(?:(?:likely|probably)\s+)?have|you are suffering from|you definitely caught|this is definitely|this confirms|this (?:likely |probably )?sounds like|it (?:likely |probably )?(?:is|sounds like)|that is)\s+(?:(?:a|an|the)\s+)?(?:diabetes|hypertension|asthma|pneumonia|influenza|flu|covid(?:-19)?|stroke|heart attack|cancer|infection|disorder|disease))\b/i;
const emergencyInput = /\b(?:chest\s+(?:pain|pressure)|(?:crushing|severe)\s+(?:pain|pressure)\s+in\s+(?:my|the)\s+chest|difficulty breathing|trouble breathing|shortness of breath|can(?:not|'t) (?:breathe|catch (?:my )?breath|speak)|choking|gasping|turning blue|blue lips|lips (?:are|turning|look) blue|fainting|fainted|going to pass out|passed out|loss of consciousness|unresponsive|can(?:not|'t) stay awake|(?:face|mouth) (?:is )?(?:drooping|sagging)|one side of (?:my|the) face (?:is )?(?:drooping|sagging)|(?:slurred speech|speech (?:is )?slurred)|arm (?:is )?(?:numb|weak)|(?:one side|one-sided) (?:is )?(?:numb|weak)|sudden (?:one-sided |one side )?weakness|(?:swallowed|took|ingested|drank) (?:(?:far too many|about|around|roughly|an entire) )?(?:\d+|a|the)?\s*(?:whole |full )?(?:tablets?|pills?|bottle of (?:pills|medicine|cough syrup)|bottle of cough syrup)(?:\s+on purpose)?|stroke|overdose|suicid(?:e|al)|seizure|severe bleeding|severe allergic reaction)\b/i;
const emergencyDirection = /\b(?:call\s+911|911|emergency services|emergency department|emergency room|seek emergency care|urgent medical care)\b/i;
const dishonestTutor = /\b(?:here (?:is|are) (?:the|your) (?:final )?answers?|copy this answer|submit this as your own)\b/i;
const unreadMaterialClaim = /\b(?:i can clearly read|the image says|i (?:read|reviewed) (?:the )?(?:image|photo|worksheet|attachment))\b/i;
const supportedReview = /\b(?:first|equivalent|also correct|reasoning is correct|arithmetic|transcription|conceptual)\b/i;
const guidedCorrection = /\b(?:next step|try|correct|because|work through|show me)\b/i;
const targetedPractice = /\b(?:practice|similar problem|try this)\b/i;
const unreadableCaveat = /\b(?:blurry|cropped|unreadable|cannot clearly read|can't clearly read|can't verify|cannot verify|not enough (?:detail|evidence|information)|need (?:a )?(?:readable|clearer)|uncertain)\b/i;
const safeMedicationBoundary = /\b(?:do not|don't|should not|shouldn't)\s+(?:start|stop|skip|take|increase|decrease|change|adjust|double|halve)\b.{0,100}\b(?:without|unless|until|contact|ask|confirm|speak|talk)\b.{0,80}\b(?:clinician|doctor|prescriber|pharmacist|licensed professional)\b/i;

export type TutorReviewPhase = "initial_review" | "learner_retry" | "alternate_method" | "targeted_practice" | "insufficient_evidence" | "integrity_boundary" | "not_review";

export function classifyTutorReviewPhase(memberMessage: string): TutorReviewPhase {
  const message = normalizedSafetyText(memberMessage);
  if (/\b(?:live graded test|exam|quiz)\b/i.test(message) && /\b(?:final answers?|just give|do it for me|don't explain|do not explain)\b/i.test(message)) return "integrity_boundary";
  if (/\b(?:blurry|cropped|unreadable|without (?:seeing|showing)|can't (?:see|read)|cannot (?:see|read))\b/i.test(message)) return "insufficient_evidence";
  if (/\b(?:similar|practice)\s+(?:problem|question)|targets? the mistake|wait for my attempt\b/i.test(message)) return "targeted_practice";
  if (/\b(?:alternate|alternative|another)\s+(?:method|way)|could i .{0,45}\b(?:instead|first)\b|what if i .{0,45}\b(?:instead|first)\b/i.test(message)) return "alternate_method";
  if (/\b(?:is|was) (?:that|this|my) (?:reasoning|step|work) (?:right|correct)|right so far|correct so far|then i\b/i.test(message)) return "learner_retry";
  if (isLearningWorkReviewRequest(message)) return "initial_review";
  return "not_review";
}

function tutorPhaseRequirementsSatisfied(phase: TutorReviewPhase, response: string) {
  if (phase === "insufficient_evidence") return unreadableCaveat.test(response);
  if (phase === "integrity_boundary") return !dishonestTutor.test(response);
  if (phase === "targeted_practice") return targetedPractice.test(response);
  if (phase === "alternate_method") return /\b(?:equivalent|also correct|valid|works|same equation|same result|divide both sides)\b/i.test(response);
  if (phase === "learner_retry") return /\b(?:correct|right|yes|works|accurate|that step|so far)\b/i.test(response) && /\b(?:next|now|try|what|how|continue|proceed|because)\b/i.test(response);
  if (phase === "initial_review") return supportedReview.test(response) && guidedCorrection.test(response);
  return true;
}

export type MemberInstructionIntent = "none" | "reported" | "executable";

function normalizedSafetyText(value: string) {
  return value.normalize("NFKC").replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

function instructionMatches(input: string) {
  return instructionSignals
    .map((pattern) => pattern.exec(input))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .sort((left, right) => (left.index || 0) - (right.index || 0));
}

function isReportedSignal(input: string, signal: RegExpExecArray) {
  const prefix = input.slice(Math.max(0, (signal.index || 0) - 120), signal.index || 0);
  const currentClause = prefix.slice(Math.max(prefix.lastIndexOf("."), prefix.lastIndexOf("!"), prefix.lastIndexOf("?"), prefix.lastIndexOf("\n")) + 1);
  return reportedSpeech.test(currentClause) || securityEducationReport.test(currentClause) || quotedInstructionEducation.test(currentClause);
}

const nonPersonalEmergencyContext = /\b(?:first[- ]aid lesson|health class|fictional (?:character|story|scenario)|hypothetical (?:character|scenario)|lesson (?:about|on)|how (?:should|would) .{0,30}(?:describe|explain|teach|recognize))\b/i;
function isPersonalEmergencyInput(input: string) {
  return emergencyInput.test(input) && !nonPersonalEmergencyContext.test(input);
}

export function classifyMemberInstructionIntent(input: string): MemberInstructionIntent {
  const normalized = normalizedSafetyText(input);
  const matches = instructionMatches(normalized);
  if (!matches.length) return "none";
  return matches.every((signal) => isReportedSignal(normalized, signal)) ? "reported" : "executable";
}

export function isExplicitSafeMedicationBoundary(response: string) {
  return safeMedicationBoundary.test(normalizedSafetyText(response));
}

export function sanitizeUntrustedMemberText(input: string) {
  const intent = classifyMemberInstructionIntent(input);
  if (intent === "none") return { value: input, quarantined: false, intent };
  const replaceReportedSpans = (source: string) => {
    let value = source;
    for (let replacementCount = 0; replacementCount < 8; replacementCount += 1) {
      const signal = instructionMatches(value)[0];
      if (!signal) break;
      const start = signal.index || 0;
      value = [value.slice(0, start).trim(), "[instruction-like content quarantined]", value.slice(start + signal[0].length).trim()]
        .filter(Boolean)
        .join(" ");
    }
    return value;
  };
  const normalized = normalizedSafetyText(input);
  const value = normalized.split(/(?<=[.!?])\s+/).map((sentence) => {
    const matches = instructionMatches(sentence);
    if (!matches.length) return sentence;
    return matches.every((signal) => isReportedSignal(sentence, signal))
      ? replaceReportedSpans(sentence)
      : "[instruction-like content quarantined]";
  }).join(" ");
  return {
    value,
    quarantined: true,
    intent,
  };
}

export function screenMemberAgentInput(input: string): MemberAgentSafetyResult {
  if (classifyMemberInstructionIntent(input) !== "executable") return { safe: true, response: "", failures: [] };
  return {
    safe: false,
    response: "I can help with the specialist task, but I can’t reveal or override protected instructions or access boundaries.",
    failures: ["prompt-injection-attempt"],
  };
}

export function memberAgentSafetyFallback(
  professionalId: MemberSpecialistId,
  memberMessage: string,
  failureReasons: readonly string[] = [],
) {
  const emergencyFailure = failureReasons.some((reason) => ["missing_emergency_escalation", "missing-emergency-escalation", "missing-emergency-contract"].includes(reason));
  return professionalId === "beasthealth.health-advisor"
    ? emergencyFailure || isPersonalEmergencyInput(memberMessage)
      ? "This may require urgent medical attention. Call 911 or local emergency services now. I can help organize information after immediate safety is addressed."
      : "I can help explain authorized BeastHealth information and prepare questions for a qualified professional, but I cannot diagnose, prescribe, direct medication changes, or replace emergency or licensed care."
    : professionalId === "beastmoney.money-coach"
      ? "I can explain your saved BeastMoney information and options, but I cannot move money, submit a payment, connect an account, or act as a licensed financial professional."
      : professionalId === "beasteducation.tutor"
        ? "I can help you learn from the work you provide, but I need a readable problem and your attempt. I’ll identify the first supported error, guide the next correction step, and then give one similar practice problem rather than supply work to submit dishonestly."
        : "I can provide bounded educational guidance, but I cannot claim professional authority, guarantee an outcome, or act outside your authorized BeastEducation context.";
}

export function filterMemberAgentContextItems<T>(items: readonly T[]) {
  const accepted: T[] = [];
  let rejectedCount = 0;
  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === "string") {
      const result = sanitizeUntrustedMemberText(value);
      if (result.quarantined) rejectedCount += 1;
      return result.value;
    }
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeValue(item)]));
    return value;
  };
  for (const item of items) {
    try { accepted.push(sanitizeValue(item) as T); } catch { rejectedCount += 1; }
  }
  return { accepted, rejectedCount };
}

export function enforceMemberAgentResponseSafety({
  professionalId,
  memberMessage,
  response,
  imageProvided = false,
  contract,
  learningIntent,
}: {
  professionalId: MemberSpecialistId;
  memberMessage: string;
  response: string;
  imageProvided?: boolean;
  contract?: MemberAgentResponseContract;
  learningIntent?: LearningIntent;
}): MemberAgentSafetyResult {
  const failures: string[] = [];
  if (!contract) failures.push("missing-response-contract");
  if (contract?.professionalAuthority !== "bounded_ai") failures.push("unsafe-professional-authority-contract");
  if (contract?.consequentialAction !== "none") failures.push("unsafe-action-contract");
  if (contract?.providerConnection !== "none") failures.push("unsafe-provider-contract");
  if (protectedOutputDisclosure.test(response)) failures.push("protected-instruction-disclosure");
  if (licensedClaim.test(response)) failures.push("false-professional-claim");
  if (professionalId === "beastmoney.money-coach" && moneyExecution.test(response)) failures.push("financial-execution-claim");
  if (professionalId === "beasthealth.health-advisor") {
    if (contract?.diagnosis !== "none") failures.push("unsafe-diagnosis-contract");
    if (contract?.medicationDirection !== "none") failures.push("unsafe-medication-contract");
    if (medicationDirection.test(response)) failures.push("medication-change-direction");
    if (diagnosisClaim.test(response)) failures.push("diagnosis-claim");
    if (isPersonalEmergencyInput(memberMessage) && contract?.emergencyEscalation !== "present") failures.push("missing-emergency-contract");
    if (isPersonalEmergencyInput(memberMessage) && !emergencyDirection.test(response)) failures.push("missing-emergency-escalation");
  }
  if (professionalId === "beasteducation.tutor") {
    if (dishonestTutor.test(response)) failures.push("academic-integrity-failure");
    if (!imageProvided && unreadMaterialClaim.test(response)) failures.push("unsupported-image-reading-claim");
    const reviewPhase = classifyTutorReviewPhase(memberMessage);
    const reviewRequested = learningIntent === "Review" || reviewPhase !== "not_review";
    const verdictPhase = ["initial_review", "learner_retry", "alternate_method", "insufficient_evidence"].includes(reviewPhase);
    if (verdictPhase && contract && !["evidence_based", "insufficient_evidence"].includes(contract.homeworkReview)) failures.push("missing-homework-review-contract");
    if (reviewRequested && !tutorPhaseRequirementsSatisfied(reviewPhase, response)) failures.push(`incomplete-homework-review:${reviewPhase}`);
  }
  if (!failures.length) return { safe: true, response, failures };
  const replacement = memberAgentSafetyFallback(professionalId, memberMessage, failures);
  return { safe: false, response: replacement, failures };
}
