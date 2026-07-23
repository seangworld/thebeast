import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BeastAgentsPlatform,
  ProfessionalIdentityRegistry,
  bindSpecialistDomainKnowledge,
  defaultProfessionalPlaybook,
  specialistProfessionalIdentityProfiles,
  validateProfessionalIdentityProfile,
} from "../src/lib/platform/agents";

test("AGENT-205 separates identity playbook and specialist domain knowledge", () => {
  const profile = specialistProfessionalIdentityProfiles.moneyCoach;
  const specialist = bindSpecialistDomainKnowledge(profile, { rules: ["specialist-owned-rule"] });
  assert.equal(specialist.professional.identity.role, "Money Coach");
  assert.match(specialist.professional.identity.mission, /members/i);
  assert.ok(specialist.professional.identity.expertise.length > 0);
  assert.ok(specialist.professional.identity.communicationStyle.includes("calm"));
  assert.ok(specialist.professional.identity.professionalBoundaries.length > 0);
  assert.deepEqual(specialist.domainKnowledge, { rules: ["specialist-owned-rule"] });
  assert.equal("domainKnowledge" in profile, false);
});

test("AGENT-205 defines a complete specialist-neutral professional playbook", () => {
  assert.equal(defaultProfessionalPlaybook.conversation.answerQuestionFirst, true);
  assert.deepEqual(defaultProfessionalPlaybook.investigation.evidenceOrder, ["current-records", "recent-context", "durable-memory", "user-clarification"]);
  assert.equal(defaultProfessionalPlaybook.explanation.distinguishFactObservationRecommendation, true);
  assert.equal(defaultProfessionalPlaybook.prioritization.method, "highest-impact-first");
  assert.equal(defaultProfessionalPlaybook.followUp.askOnlyWhenRequired, true);
  assert.equal(defaultProfessionalPlaybook.teaching.method, "guided");
  assert.equal(defaultProfessionalPlaybook.uncertainty.avoidUnsupportedClaims, true);
  assert.equal(defaultProfessionalPlaybook.closing.avoidUnnecessaryQuestions, true);
});

test("AGENT-205 validates and registers reusable professional profiles", () => {
  const registry = new ProfessionalIdentityRegistry();
  const profile = registry.register(specialistProfessionalIdentityProfiles.guidanceCounselor);
  assert.equal(registry.require(profile.id).identity.role, "Guidance Counselor");
  assert.throws(() => registry.register(profile), /already registered/);
  assert.throws(() => validateProfessionalIdentityProfile({ ...profile, identity: { ...profile.identity, mission: "" } }), /mission is required/);
});

test("AGENT-205 registers identity through the shared BeastAgents platform", () => {
  const platform = new BeastAgentsPlatform();
  platform.professionalIdentity.register(specialistProfessionalIdentityProfiles.healthAdvisor);
  assert.equal(platform.professionalIdentity.require("beasthealth.health-advisor.professional").identity.role, "Health Advisor");
});

test("AGENT-205 example identities remain configuration-only and specialist-neutral", () => {
  assert.equal(specialistProfessionalIdentityProfiles.personalAssistant.identity.role, "Personal Assistant");
  assert.equal(specialistProfessionalIdentityProfiles.healthAdvisor.playbook.uncertainty.stateMissingInformation, true);
  const framework = readFileSync("src/lib/platform/agents/professionalIdentity.ts", "utf8");
  assert.doesNotMatch(framework, /calculateInterest|diagnoseCondition|gradeAssignment|scheduleTask/);
});

test("Money Coach consumes configured professional identity instead of embedding its role", () => {
  const model = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  const component = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");
  assert.match(model, /specialistProfessionalIdentityProfiles\.moneyCoach/);
  assert.match(component, /model\.professional\.identity\.role/);
  assert.match(model, /identity\.professionalBoundaries\.join/);
});
