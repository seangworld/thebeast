import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  composeRoleDefinedResponse,
  prepareRoleDefinedExecution,
  SharedAgentPlanningEngine,
  SharedProbabilityConfidenceEngine,
  specialistAgentPlanningPolicies,
  specialistKnowledgeSourcePolicies,
  specialistProfessionalIdentityProfiles,
  specialistRoleDefinitions,
  type ConfidenceEvidence,
} from "../src/lib/platform/agents";
import { buildMoneyCoachBenchmarks } from "../src/lib/moneyCoachBenchmarks";
import { buildMoneyCoachObservations } from "../src/lib/moneyCoachObservations";

const now = "2026-07-23T12:00:00.000Z";

function evidence(
  id: string,
  values: Partial<ConfidenceEvidence> = {}
): ConfidenceEvidence {
  return {
    id,
    source: "authenticated.member.records",
    relationship: "supports",
    claimType: "direct",
    authority: 0.95,
    reliability: 0.95,
    freshness: 1,
    completeness: 0.9,
    directness: 1,
    independent: true,
    ...values,
  };
}

test("AGENT-212 exposes one shared Probability and Confidence Engine", () => {
  const platform = new BeastAgentsPlatform();
  assert.ok(platform.probabilityConfidence instanceof SharedProbabilityConfidenceEngine);
});

test("AGENT-212 explains high confidence from strong independent evidence", () => {
  const engine = new SharedProbabilityConfidenceEngine();
  const assessment = engine.assess({
    claim: "The saved value changed.",
    evidence: [evidence("record-a"), evidence("record-b", { source: "independent.calculation" })],
  });
  assert.equal(assessment.confidence, "high");
  assert.equal(assessment.evidenceQuality, "strong");
  assert.equal(assessment.uncertainty, "low");
  assert.match(assessment.reasons.join(" "), /independent evidence/i);
  assert.equal(assessment.probability, undefined);
  assert.match(engine.explain(assessment).probability, /No supported probability/);
});

test("AGENT-212 identifies insufficient evidence and names what would improve it", () => {
  const engine = new SharedProbabilityConfidenceEngine();
  const assessment = engine.assess({
    claim: "The condition is established.",
    evidence: [],
    requiredEvidenceCount: 2,
    missingInformation: ["a current measurement"],
  });
  assert.equal(assessment.confidence, "insufficient");
  assert.equal(assessment.insufficientEvidence, true);
  assert.equal(assessment.uncertainty, "high");
  assert.ok(assessment.additionalInformationNeeded.includes("a current measurement"));
  assert.ok(assessment.additionalInformationNeeded.some((item) => /2 additional required evidence items/.test(item)));
});

test("AGENT-212 lowers confidence for contradictory evidence", () => {
  const engine = new SharedProbabilityConfidenceEngine();
  const assessment = engine.assess({
    claim: "The current direction is positive.",
    evidence: [
      evidence("supports"),
      evidence("contradicts", { relationship: "contradicts", source: "second.current.record" }),
    ],
  });
  assert.equal(assessment.contradictoryEvidence, true);
  assert.equal(assessment.uncertainty, "high");
  assert.ok(assessment.contradictoryEvidenceIds.includes("contradicts"));
  assert.match(assessment.uncertaintyReasons.join(" "), /conflicting directions/i);
});

test("AGENT-212 distinguishes correlation from causation", () => {
  const engine = new SharedProbabilityConfidenceEngine();
  const assessment = engine.assess({
    claim: "Two measurements moved together.",
    evidence: [evidence("correlation", { claimType: "correlation" })],
    attemptsCausalConclusion: true,
  });
  assert.equal(assessment.correlationOnly, true);
  assert.equal(assessment.causalConclusionSupported, false);
  assert.match(assessment.uncertaintyReasons.join(" "), /correlation, not causation/i);
  assert.ok(assessment.additionalInformationNeeded.some((item) => /causal evidence/.test(item)));
});

test("AGENT-212 never creates a probability without an explicit supported model", () => {
  const engine = new SharedProbabilityConfidenceEngine();
  const assessment = engine.assess({
    claim: "An outcome may occur.",
    evidence: [evidence("record-a")],
  });
  assert.equal(assessment.probability, undefined);
});

test("AGENT-212 validates supported probabilities and labels likelihood without changing the estimate", () => {
  const engine = new SharedProbabilityConfidenceEngine();
  assert.throws(() => engine.assess({
    claim: "An outcome may occur.",
    evidence: [evidence("record-a")],
    probability: {
      value: 0.72,
      method: "Documented cohort model",
      source: "Official model",
      sourceDate: now,
      supportingEvidenceIds: ["unknown"],
      calculation: "Published model applied to current inputs",
      assumptions: [],
    },
  }), /unknown evidence/);
  assert.throws(() => engine.assess({
    claim: "An outcome may occur.",
    evidence: [evidence("record-a")],
    probability: {
      value: 1.2,
      method: "Documented cohort model",
      source: "Official model",
      sourceDate: now,
      supportingEvidenceIds: ["record-a"],
      calculation: "Published model applied to current inputs",
      assumptions: [],
    },
  }), /between 0 and 1/);
  const assessment = engine.assess({
    claim: "An outcome may occur.",
    evidence: [evidence("record-a")],
    probability: {
      value: 0.72,
      method: "Documented cohort model",
      source: "Official model",
      sourceDate: now,
      supportingEvidenceIds: ["record-a"],
      calculation: "Published model applied to current inputs",
      assumptions: ["The model population is applicable."],
    },
  });
  assert.equal(assessment.probability?.value, 0.72);
  assert.equal(assessment.probability?.likelihood, "likely");
});

test("AGENT-212 integrates confidence analysis into Observation Intelligence", () => {
  const observations = buildMoneyCoachObservations({
    current: {
      capturedAt: now,
      monthlyIncome: 6000,
      monthlyOutflow: 4500,
      projectedSurplus: 1500,
      currentCash: 5000,
      cashBuffer: 2500,
      totalDebt: 16000,
    },
    history: [{
      capturedAt: "2026-06-23T12:00:00.000Z",
      monthlyIncome: 6000,
      monthlyOutflow: 4800,
      projectedSurplus: 1200,
      currentCash: 4500,
      cashBuffer: 2500,
      totalDebt: 17500,
    }],
  }, "owner-1", now);
  assert.ok(observations.length > 0);
  assert.ok(observations.every((item) => item.confidenceAnalysis));
  assert.ok(observations.every((item) => item.confidenceAnalysis?.probability === undefined));
});

test("AGENT-212 integrates confidence analysis into Benchmark Intelligence", () => {
  const benchmarks = buildMoneyCoachBenchmarks({
    current: {
      capturedAt: now,
      monthlyIncome: 6000,
      monthlyOutflow: 4500,
      projectedSurplus: 1500,
      currentCash: 5000,
      cashBuffer: 2500,
      totalDebt: 16000,
    },
    history: [{
      capturedAt: "2026-06-23T12:00:00.000Z",
      monthlyIncome: 6000,
      monthlyOutflow: 4800,
      projectedSurplus: 1200,
      currentCash: 4500,
      cashBuffer: 2500,
      totalDebt: 17500,
    }],
  }, "owner-1", now);
  assert.ok(benchmarks.length > 0);
  assert.ok(benchmarks.every((item) => item.confidenceAnalysis));
  assert.ok(benchmarks.every((item) => item.confidenceAnalysis?.probability === undefined));
});

test("AGENT-212 lets the Planning Engine clarify insufficient or contradictory evidence", () => {
  const confidence = new SharedProbabilityConfidenceEngine().assess({
    claim: "A decision is ready.",
    evidence: [],
    missingInformation: ["the current source record"],
  });
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const plan = planner.createPlan({
    specialistId: "beastmoney.money-coach",
    input: "What should I do?",
    confidence: 0.99,
    confidenceAssessment: confidence,
  });
  assert.equal(plan.requiresClarification, true);
  assert.match(plan.clarificationQuestion || "", /current source record/);
  assert.equal(plan.confidenceAssessment?.confidence, "insufficient");
});

test("AGENT-212 lets Role Definition execution explain moderate confidence naturally", () => {
  const engine = new SharedProbabilityConfidenceEngine();
  const confidence = engine.assess({
    claim: "The current comparison is useful.",
    evidence: [evidence("limited", {
      authority: 0.7,
      reliability: 0.65,
      freshness: 0.65,
      completeness: 0.55,
      directness: 0.7,
      independent: false,
      limitation: "Only one recent record is available.",
    })],
    missingInformation: ["another current record"],
  });
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const execution = prepareRoleDefinedExecution({
    roleDefinition: specialistRoleDefinitions.moneyCoach,
    professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach,
    knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach,
    memberContext: {},
    currentState: {},
    planner,
    planningRequest: {
      specialistId: "beastmoney.money-coach",
      input: "Explain the comparison",
      confidence: 0.9,
    },
    confidenceAssessment: confidence,
  });
  const response = composeRoleDefinedResponse(execution, {
    intent: "explain",
    shortAnswer: "The current comparison is useful but limited.",
    sections: [],
    expertiseUsed: ["financial planning context"],
    mode: "answer",
    followUpRequired: false,
    nextStepUseful: true,
    workspaceBenefit: "none",
  });
  assert.match(response.text, /Confidence and uncertainty:/);
  assert.match(response.text, /Confidence is moderate/i);
  assert.match(response.text, /another current record/i);
});
