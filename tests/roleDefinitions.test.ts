import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  BeastAgentsPlatform,
  RoleDefinitionRegistry,
  SharedAgentPlanningEngine,
  composeRoleDefinedResponse,
  defineRoleDefinition,
  prepareRoleDefinedExecution,
  specialistAgentPlanningPolicies,
  specialistKnowledgeSourcePolicies,
  specialistProfessionalIdentityProfiles,
  specialistRoleDefinitions,
} from "../src/lib/platform/agents";
import { answerMoneyCoachQuestion, buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

test("AGENT-209 defines role philosophy separately from identity playbook knowledge and memory", () => {
  const definition = specialistRoleDefinitions.moneyCoach;
  assert.equal(definition.roleTitle, "Professional financial coach");
  assert.match(definition.communicationGoals.join(" "), /teacher before technician/i);
  assert.match(definition.communicationGoals.join(" "), /advisor before reporter/i);
  assert.match(definition.teachingPhilosophy.join(" "), /explain before recommending/i);
  assert.match(definition.mission, /reduce financial stress/i);
  assert.match(definition.mission, /informed financial decisions/i);
  assert.equal(definition.execution.preferConversationOverDashboards, true);
  assert.equal(definition.execution.workspaceGuidance, "only-for-deeper-analysis");
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

test("AGENT-209 loads role playbook sources and plan in the required order", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const execution = prepareRoleDefinedExecution({
    roleDefinition: specialistRoleDefinitions.moneyCoach,
    professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach,
    knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach,
    planner,
    planningRequest: { specialistId: "beastmoney.money-coach", input: "Explain cash flow", confidence: 0.95 },
  });
  assert.deepEqual(execution.loadOrder, ["role-definition", "professional-playbook", "knowledge-sources", "plan"]);
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
  const execution = prepareRoleDefinedExecution({ roleDefinition, professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach, knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach, planner, planningRequest: { specialistId: "beastmoney.money-coach", input: "Evaluate this", confidence: 1 } });
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
  assert.deepEqual(response.roleExecution?.loadOrder, ["role-definition", "professional-playbook", "knowledge-sources", "plan"]);
  assert.ok(response.roleExecution?.planId);
  assert.match(response.text, /Explain Why/i);
  assert.equal(response.toolAction?.target, "/dashboard/money/cashflow");
  const moneySource = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  assert.match(moneySource, /specialistRoleDefinitions\.moneyCoach/);
  assert.match(moneySource, /composeRoleDefinedResponse/);
});
