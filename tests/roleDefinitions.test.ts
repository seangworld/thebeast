import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  BeastAgentsPlatform,
  RoleDefinitionRegistry,
  SharedAgentPlanningEngine,
  composeRoleDefinedResponse,
  defineRoleDefinition,
  inheritRoleDefinition,
  prepareRoleDefinedExecution,
  specialistAgentPlanningPolicies,
  specialistKnowledgeSourcePolicies,
  specialistProfessionalIdentityProfiles,
  specialistRoleDefinitions,
  sharedProfessionalRoleFoundation,
} from "../src/lib/platform/agents";
import { answerMoneyCoachQuestion, buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

test("AGENT-209 defines role philosophy separately from identity playbook knowledge and memory", () => {
  const definition = specialistRoleDefinitions.moneyCoach;
  assert.equal(definition.roleTitle, "Money Coach");
  assert.equal(definition.professionalIdentity, "Certified Financial Planner and Financial Coach");
  assert.match(definition.communicationGoals.join(" "), /teacher before technician/i);
  assert.match(definition.communicationGoals.join(" "), /advisor before reporter/i);
  assert.match(definition.teachingPhilosophy.join(" "), /explain before recommending/i);
  assert.match(definition.corePurpose, /reduce financial stress/i);
  assert.match(definition.mission, /making informed decisions/i);
  assert.equal(definition.execution.preferConversationOverDashboards, true);
  assert.equal(definition.execution.workspaceGuidance, "only-for-deeper-analysis");
  assert.deepEqual(definition.responsibilities.activelyLooksFor, ["trends", "opportunities", "risks", "missing information", "inconsistencies", "progress", "improvements"]);
  assert.match(definition.boundaries.mustNeverDo.join(" "), /guarantee financial outcomes/i);
  assert.equal("domainKnowledge" in definition, false);
  assert.equal("memory" in definition, false);
  assert.equal("playbook" in definition, false);
  assert.equal("knowledgeSources" in definition, false);
});

test("AGENT-209 provides reusable registered roles for current and future specialists", () => {
  const platform = new BeastAgentsPlatform();
  assert.deepEqual(platform.roleDefinitions.list().map((item) => item.specialistId), [
    "beastmoney.money-coach",
    "beasteducation.guidance-counselor",
    "beasthealth.health-advisor",
    "beastos.personal-assistant",
  ]);
  const registry = new RoleDefinitionRegistry();
  const future = defineRoleDefinition({
    ...specialistRoleDefinitions.guidanceCounselor,
    id: "future.specialist.role",
    specialistId: "future.specialist",
  });
  registry.register(future);
  assert.equal(registry.requireForSpecialist("future.specialist").roleTitle, future.roleTitle);
});

test("AGENT-209 supports role inheritance without changing shared architecture", () => {
  const homeAdvisor = inheritRoleDefinition(sharedProfessionalRoleFoundation, {
    id: "beasthome.home-advisor.role",
    specialistId: "beasthome.home-advisor",
    version: "1.0.0",
    roleTitle: "Home Advisor",
    professionalIdentity: "Professional home advisor",
    mission: "Help members care for their homes.",
    corePurpose: "Turn home information into understandable next steps.",
    responsibilities: { activelyLooksFor: ["maintenance risks", "missing records"] },
  });
  assert.equal(homeAdvisor.extendsRoleId, sharedProfessionalRoleFoundation.id);
  assert.deepEqual(homeAdvisor.philosophy, sharedProfessionalRoleFoundation.philosophy);
  assert.deepEqual(homeAdvisor.responsibilities.activelyLooksFor, ["maintenance risks", "missing records"]);
});

test("AGENT-209 loads role playbook sources and plan in the required order", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const execution = prepareRoleDefinedExecution({
    roleDefinition: specialistRoleDefinitions.moneyCoach,
    professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach,
    knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach,
    memberContext: { ownerId: "owner-1" },
    currentState: { cash: 1000 },
    planner,
    planningRequest: { specialistId: "beastmoney.money-coach", input: "Explain cash flow", confidence: 0.95 },
  });
  assert.deepEqual(execution.loadOrder, ["role-definition", "professional-playbook", "member-context", "current-state", "relevant-knowledge", "reasoning-plan", "response-generation"]);
  assert.deepEqual(execution.memberContext, { ownerId: "owner-1" });
  assert.deepEqual(execution.currentState, { cash: 1000 });
  assert.deepEqual(execution.plan.steps.map((step) => step.kind), ["understand", "reason", "answer"]);
  assert.throws(() => prepareRoleDefinedExecution({ ...execution, planningRequest: { specialistId: "beasthealth.health-advisor", input: "Help", confidence: 1 }, planner } as never), /same specialist/);
});

test("AGENT-209 role configuration changes live composition behavior", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const roleDefinition = defineRoleDefinition({
    ...specialistRoleDefinitions.moneyCoach,
    id: "test.efficient.role",
    defaultConversationStyle: "efficient",
    execution: { ...specialistRoleDefinitions.moneyCoach.execution, workspaceGuidance: "never" },
  });
  const execution = prepareRoleDefinedExecution({ roleDefinition, professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach, knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach, memberContext: {}, currentState: {}, planner, planningRequest: { specialistId: "beastmoney.money-coach", input: "Evaluate this", confidence: 1 } });
  const response = composeRoleDefinedResponse(execution, {
    intent: "evaluate",
    shortAnswer: "Here is the evaluation.",
    sections: [{ heading: "Recommendation", paragraphs: ["Act."] }, { heading: "Explanation", paragraphs: ["Evidence first."] }],
    actions: [{ id: "open", label: "Open", type: "navigate", target: "/workspace" }],
    nextStep: "Optional next step",
    nextStepUseful: true,
    workspaceBenefit: "deeper-analysis",
    mode: "recommendation",
  });
  assert.deepEqual(response.sections.map((section) => section.heading), ["Explanation", "Recommendation"]);
  assert.deepEqual(response.actions, []);
  assert.equal(response.nextStep, undefined);
});

test("identical prompts produce role-specific behavior for different specialists", () => {
  const buildExecution = (kind: "moneyCoach" | "personalAssistant") => {
    const planner = new SharedAgentPlanningEngine();
    planner.registerPolicy(specialistAgentPlanningPolicies[kind]);
    const roleDefinition = specialistRoleDefinitions[kind];
    return prepareRoleDefinedExecution({
      roleDefinition,
      professionalProfile: specialistProfessionalIdentityProfiles[kind],
      knowledgeSourcePolicy: specialistKnowledgeSourcePolicies[kind],
      memberContext: {},
      currentState: {},
      planner,
      planningRequest: { specialistId: roleDefinition.specialistId, input: "What should I do next?", confidence: 1 },
    });
  };
  const draft = {
    intent: "next-step",
    shortAnswer: "Start with the highest priority item.",
    sections: [{ heading: "Explanation", paragraphs: ["This has the highest current impact."] }],
    nextStep: "We can talk through the tradeoffs.",
    nextStepUseful: true,
    actions: [{ id: "open", label: "Open", type: "navigate" as const, target: "/workspace" }],
    workspaceBenefit: "deeper-analysis" as const,
  };
  const coach = composeRoleDefinedResponse(buildExecution("moneyCoach"), draft);
  const assistant = composeRoleDefinedResponse(buildExecution("personalAssistant"), draft);
  assert.equal(coach.nextStep, "We can talk through the tradeoffs.");
  assert.equal(assistant.nextStep, undefined);
  assert.notDeepEqual(specialistRoleDefinitions.moneyCoach.conversationStyle, specialistRoleDefinitions.personalAssistant.conversationStyle);
});

test("Money Coach loads and applies its Role Definition for every live response", () => {
  const model = buildMoneyCoachExperience({
    ownerId: "owner-1", userName: "Sean", asOfDate: new Date("2026-07-22T12:00:00"), activeBillCount: 0,
    billsDueSoonCount: 0, monthlyBills: 0, activeDebtCount: 0, totalDebt: 0, projectedDebtReduction: 0,
    debtProgressPercent: 0, monthlyIncome: 3000, monthlyOutflow: 2000, projectedSurplus: 1000, currentCash: 2000,
    cashBuffer: 500, utilization: 0, fundingSourceCount: 0, safeFundingSourceCapacity: 0, assignedIncomePotCount: 0,
    totalObligationCount: 0, recommendationTitle: "Review cash flow", recommendationAction: "Review cash flow",
    recommendationWhy: "Current income exceeds tracked outflow.", recommendationHref: "/dashboard/money/cashflow", interestSaved: 0, timeSavedMonths: 0,
  });
  const response = answerMoneyCoachQuestion("Can my income cover this month?", model);
  assert.equal(response.roleExecution?.roleDefinitionId, "beastmoney.money-coach.role");
  assert.deepEqual(response.roleExecution?.loadOrder, ["role-definition", "professional-playbook", "member-context", "current-state", "relevant-knowledge", "reasoning-plan", "response-generation"]);
  assert.ok(response.roleExecution?.planId);
  assert.match(response.text, /Explain Why/i);
  assert.equal(response.toolAction?.target, "/dashboard/money/cashflow");
  const moneySource = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  assert.match(moneySource, /specialistRoleDefinitions\.moneyCoach/);
  assert.match(moneySource, /composeRoleDefinedResponse/);
});

test("existing saved conversations remain compatible without embedded Role Definition data", () => {
  const moneySource = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  const experience = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");
  assert.match(moneySource, /roleExecution\?:/);
  assert.match(experience, /content\.structured \|\|/);
  assert.match(experience, /satisfies MoneyCoachStructuredAnswer/);
});
