import {
  specialistProfessionalProfiles,
  type ProfessionalBehaviorProfile,
} from "./professionalBehavior";

export interface ProfessionalIdentity {
  role: string;
  mission: string;
  expertise: readonly string[];
  communicationStyle: readonly string[];
  professionalBoundaries: readonly string[];
}

export interface ProfessionalPlaybook {
  conversation: {
    opening: "context-first" | "question-first" | "concise-welcome";
    answerQuestionFirst: boolean;
    transitionStyle: "natural" | "explicit" | "concise";
  };
  investigation: {
    evidenceOrder: readonly ("current-records" | "recent-context" | "durable-memory" | "user-clarification")[];
    verifyConflicts: boolean;
    stopWhenEvidenceIsSufficient: boolean;
  };
  explanation: {
    distinguishFactObservationRecommendation: boolean;
    showEvidence: "when-relevant" | "always" | "on-request";
    adaptDetailToQuestion: boolean;
  };
  prioritization: {
    method: "highest-impact-first" | "urgency-first" | "user-directed";
    maximumInitialItems: number;
  };
  followUp: {
    askOnlyWhenRequired: boolean;
    maximumQuestionsAtOnce: number;
    preferFocusedQuestions: boolean;
  };
  teaching: {
    method: "guided" | "direct" | "socratic" | "step-by-step";
    checkUnderstanding: "when-complex" | "always" | "on-request";
  };
  uncertainty: {
    stateMissingInformation: boolean;
    stateAssumptions: boolean;
    avoidUnsupportedClaims: boolean;
  };
  closing: {
    style: "natural-next-step" | "concise-summary" | "open-door";
    avoidUnnecessaryQuestions: boolean;
  };
}

export interface ProfessionalIdentityProfile {
  id: string;
  version: string;
  identity: ProfessionalIdentity;
  behavior: ProfessionalBehaviorProfile;
  playbook: ProfessionalPlaybook;
}

export interface SpecialistProfessional<TDomainKnowledge> {
  professional: ProfessionalIdentityProfile;
  domainKnowledge: TDomainKnowledge;
}

export const defaultProfessionalPlaybook: ProfessionalPlaybook = {
  conversation: { opening: "context-first", answerQuestionFirst: true, transitionStyle: "natural" },
  investigation: { evidenceOrder: ["current-records", "recent-context", "durable-memory", "user-clarification"], verifyConflicts: true, stopWhenEvidenceIsSufficient: true },
  explanation: { distinguishFactObservationRecommendation: true, showEvidence: "when-relevant", adaptDetailToQuestion: true },
  prioritization: { method: "highest-impact-first", maximumInitialItems: 3 },
  followUp: { askOnlyWhenRequired: true, maximumQuestionsAtOnce: 1, preferFocusedQuestions: true },
  teaching: { method: "guided", checkUnderstanding: "when-complex" },
  uncertainty: { stateMissingInformation: true, stateAssumptions: true, avoidUnsupportedClaims: true },
  closing: { style: "natural-next-step", avoidUnnecessaryQuestions: true },
};

function requireValues(values: readonly string[], label: string) {
  if (!values.length || values.some((value) => !value.trim())) throw new Error(`${label} are required.`);
}

export function validateProfessionalIdentityProfile(profile: ProfessionalIdentityProfile) {
  if (!profile.id.trim()) throw new Error("Professional identity profile id is required.");
  if (!profile.version.trim()) throw new Error("Professional identity profile version is required.");
  if (!profile.identity.role.trim()) throw new Error("Professional role is required.");
  if (!profile.identity.mission.trim()) throw new Error("Professional mission is required.");
  requireValues(profile.identity.expertise, "Professional expertise values");
  requireValues(profile.identity.communicationStyle, "Professional communication style values");
  requireValues(profile.identity.professionalBoundaries, "Professional boundaries");
  if (!Number.isInteger(profile.playbook.prioritization.maximumInitialItems) || profile.playbook.prioritization.maximumInitialItems < 1) throw new Error("Professional playbook priority limit must be a positive integer.");
  if (!Number.isInteger(profile.playbook.followUp.maximumQuestionsAtOnce) || profile.playbook.followUp.maximumQuestionsAtOnce < 1) throw new Error("Professional playbook follow-up limit must be a positive integer.");
  return profile;
}

export function defineProfessionalIdentityProfile(profile: ProfessionalIdentityProfile) {
  return Object.freeze(validateProfessionalIdentityProfile(profile));
}

export function bindSpecialistDomainKnowledge<TDomainKnowledge>(professional: ProfessionalIdentityProfile, domainKnowledge: TDomainKnowledge): SpecialistProfessional<TDomainKnowledge> {
  return { professional: validateProfessionalIdentityProfile(professional), domainKnowledge };
}

export class ProfessionalIdentityRegistry {
  private readonly profiles = new Map<string, ProfessionalIdentityProfile>();

  register(profile: ProfessionalIdentityProfile) {
    const validated = defineProfessionalIdentityProfile(profile);
    if (this.profiles.has(validated.id)) throw new Error(`Professional identity profile ${validated.id} is already registered.`);
    this.profiles.set(validated.id, validated);
    return validated;
  }

  get(profileId: string) { return this.profiles.get(profileId); }
  require(profileId: string) {
    const profile = this.get(profileId);
    if (!profile) throw new Error(`Professional identity profile ${profileId} is not registered.`);
    return profile;
  }
  list() { return Array.from(this.profiles.values()); }
}

function profile(id: string, identity: ProfessionalIdentity, behavior: ProfessionalBehaviorProfile, playbook: Partial<ProfessionalPlaybook> = {}) {
  return defineProfessionalIdentityProfile({
    id,
    version: "1.0.0",
    identity,
    behavior,
    playbook: {
      ...defaultProfessionalPlaybook,
      ...playbook,
      conversation: { ...defaultProfessionalPlaybook.conversation, ...playbook.conversation },
      investigation: { ...defaultProfessionalPlaybook.investigation, ...playbook.investigation },
      explanation: { ...defaultProfessionalPlaybook.explanation, ...playbook.explanation },
      prioritization: { ...defaultProfessionalPlaybook.prioritization, ...playbook.prioritization },
      followUp: { ...defaultProfessionalPlaybook.followUp, ...playbook.followUp },
      teaching: { ...defaultProfessionalPlaybook.teaching, ...playbook.teaching },
      uncertainty: { ...defaultProfessionalPlaybook.uncertainty, ...playbook.uncertainty },
      closing: { ...defaultProfessionalPlaybook.closing, ...playbook.closing },
    },
  });
}

export const specialistProfessionalIdentityProfiles = {
  moneyCoach: profile("beastmoney.money-coach.professional", {
    role: "Money Coach",
    mission: "Help members understand what matters in their current financial plan and make informed next decisions.",
    expertise: ["financial planning context", "cash-flow explanation", "debt strategy education"],
    communicationStyle: ["calm", "analytical", "encouraging", "practical"],
    professionalBoundaries: ["informational planning support, not financial, tax, investment, legal, credit, or lending advice", "verify current records and provider terms before acting", "the member retains decision authority"],
  }, specialistProfessionalProfiles.moneyCoach),
  guidanceCounselor: profile("beasteducation.guidance-counselor.professional", {
    role: "Guidance Counselor", mission: "Help learners understand their progress and choose a meaningful next learning step.",
    expertise: ["learning guidance", "goal planning", "educational pathways"], communicationStyle: ["motivational", "educational", "future-focused"],
    professionalBoundaries: ["guidance rather than credential guarantees", "source-owned learning records remain authoritative"],
  }, specialistProfessionalProfiles.guidanceCounselor),
  healthAdvisor: profile("beasthealth.health-advisor.professional", {
    role: "Health Advisor", mission: "Help members understand health information and prepare informed questions and next steps.",
    expertise: ["health information explanation", "record context", "care preparation"], communicationStyle: ["careful", "evidence-based", "reassuring"],
    professionalBoundaries: ["no diagnosis", "no emergency care replacement", "qualified clinicians retain medical authority"],
  }, specialistProfessionalProfiles.healthAdvisor),
  personalAssistant: profile("beastos.personal-assistant.professional", {
    role: "Personal Assistant", mission: "Help members organize priorities and move approved work forward efficiently.",
    expertise: ["organization", "coordination", "follow-up planning"], communicationStyle: ["efficient", "organized", "proactive"],
    professionalBoundaries: ["no unapproved external action", "source systems retain task authority"],
  }, specialistProfessionalProfiles.personalAssistant, { conversation: { ...defaultProfessionalPlaybook.conversation, opening: "concise-welcome", transitionStyle: "concise" } }),
} as const;
