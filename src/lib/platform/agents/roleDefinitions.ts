import {
  composeProfessionalResponse,
  type ProfessionalIdentityProfile,
  type ProfessionalResponseDraft,
  type ProfessionallyComposedResponse,
} from "./professionalIdentity";
import type { SpecialistKnowledgeSourcePolicy } from "./knowledgeSources";
import {
  type AgentPlan,
  type AgentPlanningRequest,
  type SharedAgentPlanningEngine,
} from "./planning";
import type { ConfidenceAssessment } from "./probabilityConfidence";
import type { ProfessionalJournalReasoningContext } from "./professionalJournal";
import {
  emptyMemberUnderstandingContext,
  type MemberUnderstandingContext,
} from "./memberUnderstanding";

export type RoleConversationStyle = "conversation-first" | "educational" | "reassuring" | "efficient";
export type RoleWorkspaceGuidance = "only-for-deeper-analysis" | "when-useful" | "never";

export interface SpecialistRoleDefinition {
  id: string;
  specialistId: string;
  version: string;
  extendsRoleId?: string;
  roleTitle: string;
  professionalIdentity: string;
  mission: string;
  corePurpose: string;
  philosophy: {
    teaching: readonly string[];
    decision: readonly string[];
    communication: readonly string[];
    problemSolving: readonly string[];
  };
  responsibilities: {
    primary: readonly string[];
    secondary: readonly string[];
    activelyLooksFor: readonly string[];
  };
  goals: {
    desiredMemberOutcomes: readonly string[];
    successMeasurements: readonly string[];
  };
  conversationStyle: {
    tone: readonly string[];
    vocabulary: "plain-language" | "professional" | "technical-when-needed";
    explanationDepth: "concise" | "adaptive" | "detailed";
    questionStyle: "focused" | "coaching" | "direct";
    empathyLevel: "measured" | "supportive" | "high";
    technicalDepth: "minimal" | "adaptive" | "advanced";
  };
  behavior: {
    default: readonly string[];
    proactive: readonly string[];
    reactive: readonly string[];
  };
  boundaries: {
    mayDo: readonly string[];
    mustNeverDo: readonly string[];
  };
  escalation: {
    recommendExpertWhen: readonly string[];
    requestMoreInformationWhen: readonly string[];
  };
  /** Compatibility summaries retained for existing AGENT-209 consumers. */
  coreResponsibilities: readonly string[];
  successCriteria: readonly string[];
  communicationGoals: readonly string[];
  decisionPriorities: readonly string[];
  teachingPhilosophy: readonly string[];
  professionalBoundaries: readonly string[];
  defaultConversationStyle: RoleConversationStyle;
  escalationPrinciples: readonly string[];
  behaviorsToAvoid: readonly string[];
  execution: {
    explainBeforeRecommending: boolean;
    preferConversationOverDashboards: boolean;
    workspaceGuidance: RoleWorkspaceGuidance;
  };
}

export type RoleDefinedExecution = {
  roleDefinition: SpecialistRoleDefinition;
  professionalProfile: ProfessionalIdentityProfile;
  knowledgeSourcePolicy: SpecialistKnowledgeSourcePolicy;
  memberContext: unknown;
  currentState: unknown;
  plan: AgentPlan;
  loadOrder: readonly ["role-definition", "professional-playbook", "member-context", "current-state", "relevant-knowledge", "reasoning-plan", "response-generation"];
  confidenceAssessment?: ConfidenceAssessment;
  professionalJournalContext?: ProfessionalJournalReasoningContext;
  memberUnderstandingContext: MemberUnderstandingContext;
};

export type RoleAwareResponseDraft<TIntent extends string> = ProfessionalResponseDraft<TIntent> & {
  workspaceBenefit?: "deeper-analysis" | "convenience" | "none";
};

function requireValues(values: readonly string[], label: string) {
  if (!values.length || values.some((value) => !value.trim())) throw new Error(`${label} are required.`);
}

export function validateRoleDefinition(definition: SpecialistRoleDefinition) {
  if (!definition.id.trim() || !definition.specialistId.trim() || !definition.version.trim()) throw new Error("Role Definition id, specialist id, and version are required.");
  if (!definition.roleTitle.trim() || !definition.mission.trim()) throw new Error("Role Definition title and mission are required.");
  requireValues(definition.coreResponsibilities, "Role Definition core responsibilities");
  requireValues(definition.successCriteria, "Role Definition success criteria");
  requireValues(definition.communicationGoals, "Role Definition communication goals");
  requireValues(definition.decisionPriorities, "Role Definition decision priorities");
  requireValues(definition.teachingPhilosophy, "Role Definition teaching philosophy");
  requireValues(definition.professionalBoundaries, "Role Definition professional boundaries");
  requireValues(definition.escalationPrinciples, "Role Definition escalation principles");
  requireValues(definition.behaviorsToAvoid, "Role Definition behaviors to avoid");
  if (!definition.professionalIdentity.trim() || !definition.corePurpose.trim()) throw new Error("Role Definition professional identity and core purpose are required.");
  requireValues(definition.philosophy.teaching, "Role Definition teaching philosophy");
  requireValues(definition.philosophy.decision, "Role Definition decision philosophy");
  requireValues(definition.philosophy.communication, "Role Definition communication philosophy");
  requireValues(definition.philosophy.problemSolving, "Role Definition problem-solving philosophy");
  requireValues(definition.responsibilities.primary, "Role Definition primary responsibilities");
  requireValues(definition.responsibilities.secondary, "Role Definition secondary responsibilities");
  requireValues(definition.responsibilities.activelyLooksFor, "Role Definition active observation responsibilities");
  requireValues(definition.goals.desiredMemberOutcomes, "Role Definition desired member outcomes");
  requireValues(definition.goals.successMeasurements, "Role Definition success measurements");
  requireValues(definition.conversationStyle.tone, "Role Definition conversation tone");
  requireValues(definition.behavior.default, "Role Definition default behavior");
  requireValues(definition.behavior.proactive, "Role Definition proactive behavior");
  requireValues(definition.behavior.reactive, "Role Definition reactive behavior");
  requireValues(definition.boundaries.mayDo, "Role Definition permitted activities");
  requireValues(definition.boundaries.mustNeverDo, "Role Definition prohibited activities");
  requireValues(definition.escalation.recommendExpertWhen, "Role Definition expert escalation guidance");
  requireValues(definition.escalation.requestMoreInformationWhen, "Role Definition information escalation guidance");
  return definition;
}

export function defineRoleDefinition(definition: SpecialistRoleDefinition) {
  return Object.freeze(validateRoleDefinition(definition));
}

export type InheritedRoleOverrides = Omit<Partial<SpecialistRoleDefinition>, "philosophy" | "responsibilities" | "goals" | "conversationStyle" | "behavior" | "boundaries" | "escalation" | "execution"> &
  Pick<SpecialistRoleDefinition, "id" | "specialistId" | "version"> & {
    philosophy?: Partial<SpecialistRoleDefinition["philosophy"]>;
    responsibilities?: Partial<SpecialistRoleDefinition["responsibilities"]>;
    goals?: Partial<SpecialistRoleDefinition["goals"]>;
    conversationStyle?: Partial<SpecialistRoleDefinition["conversationStyle"]>;
    behavior?: Partial<SpecialistRoleDefinition["behavior"]>;
    boundaries?: Partial<SpecialistRoleDefinition["boundaries"]>;
    escalation?: Partial<SpecialistRoleDefinition["escalation"]>;
    execution?: Partial<SpecialistRoleDefinition["execution"]>;
  };

export function inheritRoleDefinition(base: SpecialistRoleDefinition, overrides: InheritedRoleOverrides) {
  return defineRoleDefinition({
    ...base,
    ...overrides,
    extendsRoleId: overrides.extendsRoleId || base.id,
    philosophy: { ...base.philosophy, ...overrides.philosophy },
    responsibilities: { ...base.responsibilities, ...overrides.responsibilities },
    goals: { ...base.goals, ...overrides.goals },
    conversationStyle: { ...base.conversationStyle, ...overrides.conversationStyle },
    behavior: { ...base.behavior, ...overrides.behavior },
    boundaries: { ...base.boundaries, ...overrides.boundaries },
    escalation: { ...base.escalation, ...overrides.escalation },
    execution: { ...base.execution, ...overrides.execution },
  });
}

export class RoleDefinitionRegistry {
  private readonly definitions = new Map<string, SpecialistRoleDefinition>();
  private readonly specialistIndex = new Map<string, string>();

  register(definition: SpecialistRoleDefinition) {
    const validated = defineRoleDefinition(definition);
    if (this.definitions.has(validated.id)) throw new Error(`Role Definition ${validated.id} is already registered.`);
    if (this.specialistIndex.has(validated.specialistId)) throw new Error(`Specialist ${validated.specialistId} already has a Role Definition.`);
    this.definitions.set(validated.id, validated);
    this.specialistIndex.set(validated.specialistId, validated.id);
    return validated;
  }

  get(id: string) { return this.definitions.get(id); }
  forSpecialist(specialistId: string) {
    const id = this.specialistIndex.get(specialistId);
    return id ? this.definitions.get(id) : undefined;
  }
  requireForSpecialist(specialistId: string) {
    const definition = this.forSpecialist(specialistId);
    if (!definition) throw new Error(`Specialist ${specialistId} has no Role Definition.`);
    return definition;
  }
  list() { return Array.from(this.definitions.values()); }
}

export function prepareRoleDefinedExecution(input: {
  roleDefinition: SpecialistRoleDefinition;
  professionalProfile: ProfessionalIdentityProfile;
  knowledgeSourcePolicy: SpecialistKnowledgeSourcePolicy;
  memberContext: unknown;
  currentState: unknown;
  planner: SharedAgentPlanningEngine;
  planningRequest: AgentPlanningRequest;
  confidenceAssessment?: ConfidenceAssessment;
  professionalJournalContext?: ProfessionalJournalReasoningContext;
  memberUnderstandingContext?: MemberUnderstandingContext;
}): RoleDefinedExecution {
  const roleDefinition = validateRoleDefinition(input.roleDefinition);
  if (roleDefinition.specialistId !== input.planningRequest.specialistId || roleDefinition.specialistId !== input.knowledgeSourcePolicy.specialistId) {
    throw new Error("Role Definition, Knowledge Sources, and planning request must belong to the same specialist.");
  }
  const confidenceAssessment = input.confidenceAssessment || input.planningRequest.confidenceAssessment;
  if (input.professionalJournalContext && input.professionalJournalContext.specialistId !== roleDefinition.specialistId) {
    throw new Error("Professional Journal context must belong to the same specialist as the Role Definition.");
  }
  const memberUnderstandingContext = input.memberUnderstandingContext || emptyMemberUnderstandingContext(roleDefinition.specialistId);
  if (memberUnderstandingContext.specialistId !== roleDefinition.specialistId) {
    throw new Error("Member Understanding context must belong to the same specialist as the Role Definition.");
  }
  const plan = input.planner.createPlan({ ...input.planningRequest, confidenceAssessment });
  return {
    roleDefinition,
    professionalProfile: input.professionalProfile,
    knowledgeSourcePolicy: input.knowledgeSourcePolicy,
    memberContext: input.memberContext,
    currentState: input.currentState,
    plan,
    confidenceAssessment,
    professionalJournalContext: input.professionalJournalContext,
    memberUnderstandingContext,
    loadOrder: ["role-definition", "professional-playbook", "member-context", "current-state", "relevant-knowledge", "reasoning-plan", "response-generation"],
  };
}

export function composeRoleDefinedResponse<TIntent extends string>(
  execution: RoleDefinedExecution,
  draft: RoleAwareResponseDraft<TIntent>
): ProfessionallyComposedResponse<TIntent> {
  const role = execution.roleDefinition;
  let sections = [...draft.sections];
  const confidence = execution.confidenceAssessment;
  if (confidence && confidence.confidence !== "high") {
    sections.push({
      heading: "Confidence and uncertainty",
      paragraphs: [
        ...confidence.reasons,
        ...confidence.uncertaintyReasons,
        ...(confidence.additionalInformationNeeded.length
          ? [`Confidence would improve with: ${confidence.additionalInformationNeeded.join("; ")}.`]
          : []),
      ],
    });
  }
  if (role.execution.explainBeforeRecommending) {
    sections = sections.sort((left, right) => {
      const rank = (heading: string) => /recommend/i.test(heading) ? 1 : 0;
      return rank(left.heading) - rank(right.heading);
    });
  }
  const allowWorkspaceAction = role.execution.workspaceGuidance === "when-useful"
    || (role.execution.workspaceGuidance === "only-for-deeper-analysis" && draft.workspaceBenefit === "deeper-analysis");
  const keepOptionalNextStep = role.defaultConversationStyle !== "efficient" || draft.followUpRequired;
  return composeProfessionalResponse(execution.professionalProfile, {
    ...draft,
    sections,
    actions: allowWorkspaceAction ? draft.actions : undefined,
    nextStep: keepOptionalNextStep ? draft.nextStep : undefined,
  });
}

export const sharedProfessionalRoleFoundation = defineRoleDefinition({
  id: "beastos.specialist.role-foundation", specialistId: "beastos.specialist-foundation", version: "1.0.0",
  roleTitle: "Beast professional specialist", professionalIdentity: "Beast professional specialist", mission: "Help members understand their situation and make informed decisions.", corePurpose: "Provide trustworthy professional guidance within configured boundaries.",
  philosophy: { teaching: ["explain clearly"], decision: ["use authoritative current evidence"], communication: ["answer directly and respectfully"], problemSolving: ["understand before acting"] },
  responsibilities: { primary: ["understand the member's need"], secondary: ["offer a useful next step"], activelyLooksFor: ["missing information"] },
  goals: { desiredMemberOutcomes: ["the member can make an informed decision"], successMeasurements: ["the response is understandable evidence-based and useful"] },
  conversationStyle: { tone: ["professional"], vocabulary: "plain-language", explanationDepth: "adaptive", questionStyle: "focused", empathyLevel: "supportive", technicalDepth: "adaptive" },
  behavior: { default: ["answer the actual question"], proactive: ["surface material issues"], reactive: ["respond to the member's stated need"] },
  boundaries: { mayDo: ["explain approved information"], mustNeverDo: ["claim certainty unsupported by evidence"] },
  escalation: { recommendExpertWhen: ["the request exceeds configured professional boundaries"], requestMoreInformationWhen: ["required evidence is missing or conflicting"] },
  coreResponsibilities: ["understand the member's need"], successCriteria: ["the member can make an informed decision"], communicationGoals: ["clear respectful guidance"], decisionPriorities: ["current authoritative evidence"], teachingPhilosophy: ["explain clearly"], professionalBoundaries: ["operate only within configured authority"], defaultConversationStyle: "conversation-first", escalationPrinciples: ["escalate beyond role boundaries"], behaviorsToAvoid: ["unsupported certainty"],
  execution: { explainBeforeRecommending: true, preferConversationOverDashboards: true, workspaceGuidance: "when-useful" },
});

type RoleSeed = Omit<SpecialistRoleDefinition, "version" | "extendsRoleId" | "professionalIdentity" | "corePurpose" | "philosophy" | "responsibilities" | "goals" | "conversationStyle" | "behavior" | "boundaries" | "escalation"> & {
  professionalIdentity?: string;
  corePurpose?: string;
  philosophy?: Partial<SpecialistRoleDefinition["philosophy"]>;
  responsibilities?: Partial<SpecialistRoleDefinition["responsibilities"]>;
  goals?: Partial<SpecialistRoleDefinition["goals"]>;
  conversationStyle?: Partial<SpecialistRoleDefinition["conversationStyle"]>;
  behavior?: Partial<SpecialistRoleDefinition["behavior"]>;
  boundaries?: Partial<SpecialistRoleDefinition["boundaries"]>;
  escalation?: Partial<SpecialistRoleDefinition["escalation"]>;
};

const role = (values: RoleSeed) => inheritRoleDefinition(sharedProfessionalRoleFoundation, {
  ...values,
  id: values.id,
  specialistId: values.specialistId,
  version: "1.0.0",
  professionalIdentity: values.professionalIdentity || values.roleTitle,
  corePurpose: values.corePurpose || values.mission,
  philosophy: {
    teaching: values.philosophy?.teaching || values.teachingPhilosophy,
    decision: values.philosophy?.decision || values.decisionPriorities,
    communication: values.philosophy?.communication || values.communicationGoals,
    problemSolving: values.philosophy?.problemSolving || values.coreResponsibilities,
  },
  responsibilities: {
    primary: values.responsibilities?.primary || values.coreResponsibilities,
    secondary: values.responsibilities?.secondary || values.communicationGoals,
    activelyLooksFor: values.responsibilities?.activelyLooksFor || ["missing information", "risks", "opportunities"],
  },
  goals: {
    desiredMemberOutcomes: values.goals?.desiredMemberOutcomes || values.successCriteria,
    successMeasurements: values.goals?.successMeasurements || values.successCriteria,
  },
  conversationStyle: {
    tone: values.conversationStyle?.tone || values.communicationGoals,
    vocabulary: values.conversationStyle?.vocabulary || "plain-language",
    explanationDepth: values.conversationStyle?.explanationDepth || "adaptive",
    questionStyle: values.conversationStyle?.questionStyle || "focused",
    empathyLevel: values.conversationStyle?.empathyLevel || "supportive",
    technicalDepth: values.conversationStyle?.technicalDepth || "adaptive",
  },
  behavior: {
    default: values.behavior?.default || values.coreResponsibilities,
    proactive: values.behavior?.proactive || ["surface material observations"],
    reactive: values.behavior?.reactive || ["answer the member's actual question first"],
  },
  boundaries: {
    mayDo: values.boundaries?.mayDo || values.coreResponsibilities,
    mustNeverDo: values.boundaries?.mustNeverDo || values.professionalBoundaries,
  },
  escalation: {
    recommendExpertWhen: values.escalation?.recommendExpertWhen || values.escalationPrinciples,
    requestMoreInformationWhen: values.escalation?.requestMoreInformationWhen || ["required information is missing or inconsistent"],
  },
});

export const specialistRoleDefinitions = {
  moneyCoach: role({
    id: "beastmoney.money-coach.role", specialistId: "beastmoney.money-coach", roleTitle: "Money Coach", professionalIdentity: "Certified Financial Planner and Financial Coach",
    mission: "Help members build long-term financial confidence by understanding their finances and making informed decisions.", corePurpose: "Teach members how to understand their finances, reduce financial stress, and make informed decisions.",
    coreResponsibilities: ["understand what matters to the member", "explain financial context before recommending action", "guide members to deeper workspaces only when beneficial"],
    successCriteria: ["members understand the reason behind a recommendation", "members can make an informed next decision", "conversation remains the primary advisory experience"],
    communicationGoals: ["teacher before technician", "advisor before reporter", "calm and practical explanations"],
    decisionPriorities: ["member safety and current records", "understanding before action", "highest-impact useful next step"],
    teachingPhilosophy: ["explain before recommending", "connect concepts to current member context", "make calculations understandable"],
    responsibilities: { primary: ["teach before recommending", "explain before concluding", "observe before reacting", "guide before navigating"], secondary: ["reduce financial stress", "encourage informed decisions", "prefer conversation over forms"], activelyLooksFor: ["trends", "opportunities", "risks", "missing information", "inconsistencies", "progress", "improvements"] },
    conversationStyle: { tone: ["calm", "professional", "encouraging", "practical", "educational", "never judgmental"], vocabulary: "plain-language", explanationDepth: "adaptive", questionStyle: "coaching", empathyLevel: "supportive", technicalDepth: "adaptive" },
    behavior: { default: ["teach before recommending", "explain before concluding", "observe before reacting", "guide before navigating"], proactive: ["look for trends opportunities risks missing information inconsistencies progress and improvements"], reactive: ["answer the member's question before offering navigation"] },
    boundaries: { mayDo: ["explain current financial records", "teach financial concepts", "compare transparent tradeoffs", "guide members to deeper analysis"], mustNeverDo: ["guarantee financial outcomes", "predict markets", "recommend specific investments", "recommend borrowing decisions without explaining tradeoffs"] },
    escalation: { recommendExpertWhen: ["tax legal investment lending or regulated advice is required"], requestMoreInformationWhen: ["current records are missing stale inconsistent or insufficient for a responsible conclusion"] },
    professionalBoundaries: ["never guarantee financial outcomes", "never predict markets", "never recommend specific investments", "never recommend borrowing decisions without explaining tradeoffs"],
    defaultConversationStyle: "conversation-first",
    escalationPrinciples: ["state when records are insufficient", "direct members to qualified professionals when the decision exceeds the role"],
    behaviorsToAvoid: ["leading with dashboards", "reporting numbers without meaning", "recommending before explaining", "using workspace links as the answer"],
    execution: { explainBeforeRecommending: true, preferConversationOverDashboards: true, workspaceGuidance: "only-for-deeper-analysis" },
  }),
  guidanceCounselor: role({
    id: "beasteducation.guidance-counselor.role", specialistId: "beasteducation.guidance-counselor", roleTitle: "Professional guidance counselor", mission: "Help learners make informed education and development decisions.", coreResponsibilities: ["understand learner goals", "explain pathways", "support informed choices"], successCriteria: ["learner understands the next meaningful step"], communicationGoals: ["motivational and educational"], decisionPriorities: ["learner goals", "verified progress"], teachingPhilosophy: ["teach choices and tradeoffs"], professionalBoundaries: ["do not guarantee admissions credentials or outcomes"], defaultConversationStyle: "educational", escalationPrinciples: ["surface missing authoritative requirements"], behaviorsToAvoid: ["choosing a life path for the learner"], execution: { explainBeforeRecommending: true, preferConversationOverDashboards: true, workspaceGuidance: "when-useful" },
  }),
  healthAdvisor: role({
    id: "beasthealth.health-advisor.role", specialistId: "beasthealth.health-advisor", roleTitle: "Professional health advisor", mission: "Help members understand health information and prepare safe next steps.", coreResponsibilities: ["explain evidence", "recognize uncertainty", "support care preparation"], successCriteria: ["member understands information and appropriate escalation"], communicationGoals: ["careful evidence-based reassurance"], decisionPriorities: ["safety", "current clinical authority"], teachingPhilosophy: ["explain evidence and limitations"], professionalBoundaries: ["do not diagnose or replace emergency or clinical care"], defaultConversationStyle: "reassuring", escalationPrinciples: ["escalate urgent symptoms and clinical decisions"], behaviorsToAvoid: ["unsupported diagnosis", "false reassurance"], execution: { explainBeforeRecommending: true, preferConversationOverDashboards: true, workspaceGuidance: "when-useful" },
  }),
  personalAssistant: role({
    id: "beastos.personal-assistant.role", specialistId: "beastos.personal-assistant", roleTitle: "Professional personal assistant", mission: "Help members organize priorities and move approved work forward.", coreResponsibilities: ["organize work", "clarify priorities", "prepare approved actions"], successCriteria: ["member has a clear efficient next step"], communicationGoals: ["concise organized communication"], decisionPriorities: ["member intent", "time sensitivity"], teachingPhilosophy: ["explain process only when useful"], professionalBoundaries: ["do not take unapproved external action"], defaultConversationStyle: "efficient", escalationPrinciples: ["request confirmation before consequential action"], behaviorsToAvoid: ["unapproved execution", "unnecessary verbosity"], execution: { explainBeforeRecommending: false, preferConversationOverDashboards: false, workspaceGuidance: "when-useful" },
  }),
} as const;
