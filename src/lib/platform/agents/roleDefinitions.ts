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

export type RoleConversationStyle = "conversation-first" | "educational" | "reassuring" | "efficient";
export type RoleWorkspaceGuidance = "only-for-deeper-analysis" | "when-useful" | "never";

export interface SpecialistRoleDefinition {
  id: string;
  specialistId: string;
  version: string;
  roleTitle: string;
  mission: string;
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
  plan: AgentPlan;
  loadOrder: readonly ["role-definition", "professional-playbook", "knowledge-sources", "plan"];
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
  return definition;
}

export function defineRoleDefinition(definition: SpecialistRoleDefinition) {
  return Object.freeze(validateRoleDefinition(definition));
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
  planner: SharedAgentPlanningEngine;
  planningRequest: AgentPlanningRequest;
}): RoleDefinedExecution {
  const roleDefinition = validateRoleDefinition(input.roleDefinition);
  if (roleDefinition.specialistId !== input.planningRequest.specialistId || roleDefinition.specialistId !== input.knowledgeSourcePolicy.specialistId) {
    throw new Error("Role Definition, Knowledge Sources, and planning request must belong to the same specialist.");
  }
  const plan = input.planner.createPlan(input.planningRequest);
  return {
    roleDefinition,
    professionalProfile: input.professionalProfile,
    knowledgeSourcePolicy: input.knowledgeSourcePolicy,
    plan,
    loadOrder: ["role-definition", "professional-playbook", "knowledge-sources", "plan"],
  };
}

export function composeRoleDefinedResponse<TIntent extends string>(
  execution: RoleDefinedExecution,
  draft: RoleAwareResponseDraft<TIntent>
): ProfessionallyComposedResponse<TIntent> {
  const role = execution.roleDefinition;
  let sections = [...draft.sections];
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

const role = (values: Omit<SpecialistRoleDefinition, "version">) => defineRoleDefinition({ ...values, version: "1.0.0" });

export const specialistRoleDefinitions = {
  moneyCoach: role({
    id: "beastmoney.money-coach.role", specialistId: "beastmoney.money-coach", roleTitle: "Professional financial coach",
    mission: "Reduce financial stress and help members make informed financial decisions through clear conversation and current evidence.",
    coreResponsibilities: ["understand what matters to the member", "explain financial context before recommending action", "guide members to deeper workspaces only when beneficial"],
    successCriteria: ["members understand the reason behind a recommendation", "members can make an informed next decision", "conversation remains the primary advisory experience"],
    communicationGoals: ["teacher before technician", "advisor before reporter", "calm and practical explanations"],
    decisionPriorities: ["member safety and current records", "understanding before action", "highest-impact useful next step"],
    teachingPhilosophy: ["explain before recommending", "connect concepts to current member context", "make calculations understandable"],
    professionalBoundaries: ["provide educational planning support rather than regulated professional advice", "preserve member decision authority"],
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
