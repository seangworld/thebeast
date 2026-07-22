export type BehaviorLevel = "low" | "moderate" | "high";
export type ResponseDetail = "brief" | "balanced" | "detailed";
export type ConfidencePresentation = "when-uncertain" | "always" | "never";

export interface CommunicationProfile {
  tone: string;
  professionalism: BehaviorLevel;
  warmth: BehaviorLevel;
  verbosity: ResponseDetail;
  encouragementLevel: BehaviorLevel;
  urgency: "calm" | "situational" | "urgent";
  teachingStyle: "direct" | "guided" | "socratic" | "step-by-step";
}

export interface DecisionProfile {
  modes: readonly (
    | "proactive"
    | "reactive"
    | "educational"
    | "coaching"
    | "advisory"
    | "reminder-focused"
  )[];
  defaultMode: DecisionProfile["modes"][number];
}

export interface ExplanationProfile {
  defaultDetail: ResponseDetail;
  summarizeWhen: "always" | "long-response" | "multiple-items" | "on-request";
  expandWhen: readonly ("requested" | "high-impact" | "low-confidence" | "complex")[];
  simplifyWhen: readonly ("requested" | "new-topic" | "confusion-detected")[];
  showCalculations: "when-relevant" | "on-request" | "always";
  offerExplainWhy: "recommendations" | "recommendations-and-observations" | "always";
}

export interface RecommendationProfile {
  alwaysExplainReasoning: boolean;
  prioritizeHighestImpact: boolean;
  initialRecommendationLimit: number;
  presentAlternatives: "when-useful" | "always" | "never";
  identifyConfidence: ConfidencePresentation;
  distinguishObservationsFromRecommendations: boolean;
}

export interface ConversationProfile {
  greetingStyle: "proactive" | "contextual" | "concise";
  followUpQuestionStyle: "one-at-a-time" | "grouped" | "only-when-needed";
  transitionStyle: "explicit" | "natural" | "concise";
  acknowledgmentStyle: "brief" | "reflective" | "confirming";
  suggestionPhrasing: "direct" | "collaborative" | "choice-oriented";
  closingStyle: "next-step" | "open-door" | "summary";
}

export interface PersonalityProfile {
  traits: readonly string[];
}

export interface ProfessionalBehaviorProfile {
  id: string;
  version: string;
  communication: CommunicationProfile;
  decision: DecisionProfile;
  explanation: ExplanationProfile;
  recommendation: RecommendationProfile;
  conversation: ConversationProfile;
  personality: PersonalityProfile;
}

export type ProfessionalBehaviorOverrides = Partial<{
  communication: Partial<CommunicationProfile>;
  decision: Partial<DecisionProfile>;
  explanation: Partial<ExplanationProfile>;
  recommendation: Partial<RecommendationProfile>;
  conversation: Partial<ConversationProfile>;
  personality: Partial<PersonalityProfile>;
}>;

export const defaultProfessionalBehavior: ProfessionalBehaviorProfile = {
  id: "beastos.professional-default",
  version: "1.0.0",
  communication: {
    tone: "clear",
    professionalism: "high",
    warmth: "moderate",
    verbosity: "balanced",
    encouragementLevel: "moderate",
    urgency: "situational",
    teachingStyle: "guided",
  },
  decision: {
    modes: ["proactive", "educational", "coaching"],
    defaultMode: "proactive",
  },
  explanation: {
    defaultDetail: "balanced",
    summarizeWhen: "multiple-items",
    expandWhen: ["requested", "high-impact", "low-confidence", "complex"],
    simplifyWhen: ["requested", "new-topic", "confusion-detected"],
    showCalculations: "when-relevant",
    offerExplainWhy: "recommendations",
  },
  recommendation: {
    alwaysExplainReasoning: true,
    prioritizeHighestImpact: true,
    initialRecommendationLimit: 3,
    presentAlternatives: "when-useful",
    identifyConfidence: "when-uncertain",
    distinguishObservationsFromRecommendations: true,
  },
  conversation: {
    greetingStyle: "contextual",
    followUpQuestionStyle: "one-at-a-time",
    transitionStyle: "natural",
    acknowledgmentStyle: "brief",
    suggestionPhrasing: "collaborative",
    closingStyle: "next-step",
  },
  personality: { traits: ["respectful", "clear", "helpful"] },
};

function requireText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
}

export function validateProfessionalBehaviorProfile(
  profile: ProfessionalBehaviorProfile
) {
  requireText(profile.id, "Professional behavior profile id");
  requireText(profile.version, "Professional behavior profile version");
  requireText(profile.communication.tone, "Professional behavior tone");
  if (profile.decision.modes.length === 0) {
    throw new Error("Professional behavior decision modes are required.");
  }
  if (!profile.decision.modes.includes(profile.decision.defaultMode)) {
    throw new Error("Professional behavior default decision mode must be enabled.");
  }
  if (!Number.isInteger(profile.recommendation.initialRecommendationLimit) ||
      profile.recommendation.initialRecommendationLimit < 1) {
    throw new Error("Professional behavior recommendation limit must be a positive integer.");
  }
  if (profile.personality.traits.length === 0 || profile.personality.traits.some((trait) => !trait.trim())) {
    throw new Error("Professional behavior personality traits are required.");
  }
  return profile;
}

export function resolveProfessionalBehavior(
  profile: ProfessionalBehaviorProfile = defaultProfessionalBehavior,
  overrides: ProfessionalBehaviorOverrides = {}
): ProfessionalBehaviorProfile {
  const resolved: ProfessionalBehaviorProfile = {
    ...profile,
    communication: { ...profile.communication, ...overrides.communication },
    decision: { ...profile.decision, ...overrides.decision },
    explanation: { ...profile.explanation, ...overrides.explanation },
    recommendation: { ...profile.recommendation, ...overrides.recommendation },
    conversation: { ...profile.conversation, ...overrides.conversation },
    personality: { ...profile.personality, ...overrides.personality },
  };
  return validateProfessionalBehaviorProfile(resolved);
}

export class ProfessionalBehaviorRegistry {
  private readonly profiles = new Map<string, ProfessionalBehaviorProfile>();

  constructor() {
    this.register(defaultProfessionalBehavior);
  }

  register(profile: ProfessionalBehaviorProfile) {
    validateProfessionalBehaviorProfile(profile);
    if (this.profiles.has(profile.id)) {
      throw new Error(`Professional behavior profile ${profile.id} is already registered.`);
    }
    const stored = Object.freeze({ ...profile });
    this.profiles.set(profile.id, stored);
    return stored;
  }

  get(profileId: string) {
    return this.profiles.get(profileId);
  }

  require(profileId: string) {
    const profile = this.get(profileId);
    if (!profile) throw new Error(`Professional behavior profile ${profileId} is not registered.`);
    return profile;
  }

  resolve(profileId: string, overrides?: ProfessionalBehaviorOverrides) {
    return resolveProfessionalBehavior(this.require(profileId), overrides);
  }

  list() {
    return Array.from(this.profiles.values());
  }
}

const specialistProfile = (
  id: string,
  traits: readonly string[],
  overrides: ProfessionalBehaviorOverrides
) => resolveProfessionalBehavior(
  { ...defaultProfessionalBehavior, id, personality: { traits } },
  overrides
);

export const specialistProfessionalProfiles = {
  moneyCoach: specialistProfile(
    "beastmoney.money-coach",
    ["calm", "analytical", "encouraging", "practical"],
    { communication: { tone: "calm and practical" }, explanation: { showCalculations: "when-relevant" } }
  ),
  guidanceCounselor: specialistProfile(
    "beasteducation.guidance-counselor",
    ["motivational", "educational", "future-focused"],
    { communication: { tone: "motivational and future-focused", teachingStyle: "guided" } }
  ),
  healthAdvisor: specialistProfile(
    "beasthealth.health-advisor",
    ["careful", "evidence-based", "reassuring"],
    { communication: { tone: "careful and reassuring", urgency: "situational" }, recommendation: { identifyConfidence: "always" } }
  ),
  personalAssistant: specialistProfile(
    "beastos.personal-assistant",
    ["efficient", "organized", "proactive"],
    { communication: { tone: "efficient and organized", verbosity: "brief" }, conversation: { transitionStyle: "concise" } }
  ),
} as const satisfies Record<string, ProfessionalBehaviorProfile>;
