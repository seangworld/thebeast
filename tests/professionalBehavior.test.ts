import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  ProfessionalBehaviorRegistry,
  defaultProfessionalBehavior,
  resolveProfessionalBehavior,
  specialistProfessionalProfiles,
  type ProfessionalBehaviorProfile,
} from "../src/lib/platform/agents";

test("AGENT-202 exposes specialist-neutral professional behavior contracts", () => {
  const profile: ProfessionalBehaviorProfile = defaultProfessionalBehavior;

  assert.equal(profile.communication.professionalism, "high");
  assert.ok(profile.decision.modes.includes("proactive"));
  assert.equal(profile.explanation.offerExplainWhy, "recommendations");
  assert.equal(profile.recommendation.alwaysExplainReasoning, true);
  assert.equal(profile.conversation.followUpQuestionStyle, "one-at-a-time");
  assert.ok(profile.personality.traits.length > 0);
});

test("AGENT-202 resolves specialist behavior almost entirely through configuration", () => {
  const resolved = resolveProfessionalBehavior(defaultProfessionalBehavior, {
    communication: {
      tone: "measured",
      warmth: "high",
      verbosity: "brief",
    },
    explanation: { showCalculations: "on-request" },
    recommendation: { initialRecommendationLimit: 2 },
    conversation: { closingStyle: "summary" },
    personality: { traits: ["patient", "precise"] },
  });

  assert.equal(resolved.communication.tone, "measured");
  assert.equal(resolved.communication.professionalism, "high");
  assert.equal(resolved.explanation.showCalculations, "on-request");
  assert.equal(resolved.recommendation.initialRecommendationLimit, 2);
  assert.equal(resolved.conversation.closingStyle, "summary");
  assert.deepEqual(resolved.personality.traits, ["patient", "precise"]);
});

test("AGENT-202 validates profiles and registers them through BeastAgents", () => {
  const registry = new ProfessionalBehaviorRegistry();
  assert.throws(
    () => registry.register({
      ...defaultProfessionalBehavior,
      id: "invalid",
      recommendation: {
        ...defaultProfessionalBehavior.recommendation,
        initialRecommendationLimit: 0,
      },
    }),
    /positive integer/
  );

  const platform = new BeastAgentsPlatform();
  platform.professionalBehavior.register(specialistProfessionalProfiles.moneyCoach);
  assert.deepEqual(
    platform.professionalBehavior.require("beastmoney.money-coach").personality.traits,
    ["calm", "analytical", "encouraging", "practical"]
  );
});

test("AGENT-202 example specialist profiles contain configuration, not intelligence", () => {
  assert.deepEqual(
    specialistProfessionalProfiles.guidanceCounselor.personality.traits,
    ["motivational", "educational", "future-focused"]
  );
  assert.deepEqual(
    specialistProfessionalProfiles.healthAdvisor.personality.traits,
    ["careful", "evidence-based", "reassuring"]
  );
  assert.equal(
    specialistProfessionalProfiles.personalAssistant.communication.verbosity,
    "brief"
  );
});
