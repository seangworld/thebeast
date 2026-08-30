import projection from "./member-agent-capability-projection.json";
import type {
  AgentAssessmentBinding,
  AgentAutonomyAssessment,
  AgentCapabilityDimensionAssessment,
  AgentAssessmentEvidenceReference,
} from "./agentCapabilityFramework";
import type { MemberAgeStatus } from "./memberAgeEntitlements";
import type { ProfessionalConfig } from "./digitalStaffRuntime/config";
import type { ProfessionalId } from "./digitalStaffRuntime/types";

export type MemberSpecialistId =
  | "beastmoney.money-coach"
  | "beasteducation.guidance-counselor"
  | "beasteducation.tutor"
  | "beasthealth.health-advisor";

export type MemberSpecialistAuthorityClass =
  | "financial-coaching-only"
  | "education-guidance-only"
  | "instruction-only"
  | "health-information-only";

export type MemberSpecialistAssessment = {
  agentId: MemberSpecialistId;
  assessmentId: string;
  softwareGeneration: string;
  capabilityRelease: string;
  assessmentBinding: AgentAssessmentBinding;
  autonomy: AgentAutonomyAssessment;
  capability: readonly AgentCapabilityDimensionAssessment[];
  authority: {
    classification: MemberSpecialistAuthorityClass;
    permitted: readonly string[];
    prohibited: readonly string[];
    source: "canonical BeastFusion package authority";
  };
  dataBoundary: {
    permitted: readonly string[];
    prohibited: readonly string[];
    continuity: string;
  };
  evidence: readonly AgentAssessmentEvidenceReference[];
  assessedAt: string;
  assessedVersion: string;
};

export type MemberSpecialistContextSource = {
  domain: string;
  provenance: "canonical-record" | "current-agent-memory" | "current-conversation";
  updatedAt: string | null;
};

export type MemberSpecialistContextPacket = {
  contractVersion: "1.0.0";
  professionalId: MemberSpecialistId;
  purpose: string;
  ageBand: MemberAgeStatus;
  entitlement: "allowed";
  allowedDomains: readonly string[];
  allowedTools: readonly string[];
  allowedHandoffs: readonly ProfessionalId[];
  handoffPolicy: "navigation-only; recheck entitlement; copy no conversation, memory, or sensitive record context";
  sources: readonly MemberSpecialistContextSource[];
  completeness: {
    canonicalRecordsComplete: boolean;
    recentConversationTruncated: boolean;
    currentAgentMemoryTruncated: boolean;
  };
  precedence: readonly [
    { source: "canonical-record"; rank: 1; rule: string },
    { source: "current-conversation"; rank: 2; rule: string },
    { source: "current-agent-memory"; rank: 3; rule: string },
  ];
  correctionPolicy: "surface current member corrections as pending confirmation; never treat them as canonical until the owning workflow confirms them";
};

export const memberAgentCapabilityRelease = projection.release;
export const memberAgentCapabilityAssessments = projection.assessments as readonly MemberSpecialistAssessment[];
export const memberAgentPrimaryBenchmark = projection.primaryBenchmark;
export const memberAgentCompanionFramework = projection.companionFramework;

export function isMemberSpecialistId(value: string): value is MemberSpecialistId {
  return memberAgentCapabilityAssessments.some((item) => item.agentId === value);
}

export function getMemberSpecialistAssessment(agentId: string) {
  return memberAgentCapabilityAssessments.find((assessment) => assessment.agentId === agentId);
}

export function publicMemberSpecialistAssessment(agentId: string) {
  const assessment = getMemberSpecialistAssessment(agentId);
  if (!assessment) return null;
  return assessment;
}

export function buildMemberSpecialistContextPacket({
  config,
  ageBand,
  sources,
  canonicalRecordsComplete,
  recentConversationCount,
  currentAgentMemoryCount,
}: {
  config: ProfessionalConfig;
  ageBand: MemberAgeStatus;
  sources: readonly MemberSpecialistContextSource[];
  canonicalRecordsComplete: boolean;
  recentConversationCount: number;
  currentAgentMemoryCount: number;
}): MemberSpecialistContextPacket {
  if (!isMemberSpecialistId(config.id)) throw new Error("A member-specialist context packet requires a registered specialist.");
  if (sources.some((source) => !config.dataDomains.includes(source.domain) && !source.domain.startsWith(config.id))) {
    throw new Error("Context source falls outside the specialist data boundary.");
  }
  return {
    contractVersion: "1.0.0",
    professionalId: config.id,
    purpose: config.mission,
    ageBand,
    entitlement: "allowed",
    allowedDomains: config.dataDomains,
    allowedTools: config.allowedTools,
    allowedHandoffs: config.handoffs,
    handoffPolicy: "navigation-only; recheck entitlement; copy no conversation, memory, or sensitive record context",
    sources,
    completeness: {
      canonicalRecordsComplete,
      recentConversationTruncated: recentConversationCount > 12,
      currentAgentMemoryTruncated: currentAgentMemoryCount > 8,
    },
    precedence: [
      { source: "canonical-record", rank: 1, rule: "Current canonical Product Truth and owner-scoped records are authoritative." },
      { source: "current-conversation", rank: 2, rule: "A current correction is surfaced as pending confirmation and may identify stale canonical data, but cannot silently replace it." },
      { source: "current-agent-memory", rank: 3, rule: "Current-agent memory is contextual evidence only and never overrides canonical records." },
    ],
    correctionPolicy: "surface current member corrections as pending confirmation; never treat them as canonical until the owning workflow confirms them",
  };
}

export const futureFitnessTrainerExtension = {
  professionalId: "beasthealth.fitness-trainer",
  status: "unavailable" as const,
  capabilityContractCompatible: true,
  handoffFrom: "beasthealth.health-advisor",
  handoffEnabled: false,
  dataTransferEnabled: false,
  reason: "AI Fitness Trainer remains Coming Soon and is not implemented or entitled by BF-AGT-014.",
};

export type NavigationOnlyHandoff = {
  sourceProfessionalId: MemberSpecialistId;
  targetProfessionalId: ProfessionalId;
  reason: string;
  requiresEntitlementRecheck: true;
  contextCopied: false;
  conversationCopied: false;
  memoryCopied: false;
};

const memberHandoffDestinations = {
  "beasteducation.guidance-counselor>beasteducation.tutor": {
    href: "/dashboard/education/tutor",
    label: "Continue with AI Tutor",
  },
} as const;

export function resolveMemberHandoffDestination(
  source: MemberSpecialistId,
  target: string,
) {
  const key = `${source}>${target}` as keyof typeof memberHandoffDestinations;
  return memberHandoffDestinations[key] || null;
}

export function createNavigationOnlyHandoff(
  source: MemberSpecialistId,
  target: ProfessionalId,
  reason: string,
  sourceConfig: ProfessionalConfig,
): NavigationOnlyHandoff {
  if (sourceConfig.id !== source || !sourceConfig.handoffs.includes(target)) {
    throw new Error("The requested specialist handoff is not allowlisted.");
  }
  return {
    sourceProfessionalId: source,
    targetProfessionalId: target,
    reason: reason.trim().slice(0, 240),
    requiresEntitlementRecheck: true,
    contextCopied: false,
    conversationCopied: false,
    memoryCopied: false,
  };
}
