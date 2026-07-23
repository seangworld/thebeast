import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  composeRoleDefinedResponse,
  memberUnderstandingSourceTypes,
  prepareRoleDefinedExecution,
  SharedAgentPlanningEngine,
  SharedMemberUnderstandingModel,
  SharedProbabilityConfidenceEngine,
  SharedProfessionalJournal,
  specialistAgentPlanningPolicies,
  specialistKnowledgeSourcePolicies,
  specialistProfessionalIdentityProfiles,
  specialistRoleDefinitions,
  type MemberUnderstandingDimension,
  type RefineMemberUnderstandingInput,
} from "../src/lib/platform/agents";
import { buildMoneyCoachObservations } from "../src/lib/moneyCoachObservations";

const now = "2026-07-23T12:00:00.000Z";

function confidence(evidenceIds = ["evidence-1"]) {
  return new SharedProbabilityConfidenceEngine().assess({
    claim: "The interpreted member pattern is supported.",
    evidence: evidenceIds.map((id, index) => ({
      id,
      source: index ? "historical.outcomes" : "authenticated.member.records",
      relationship: "supports" as const,
      claimType: "inference" as const,
      authority: 0.85,
      reliability: 0.85,
      freshness: 0.9,
      completeness: 0.8,
      directness: 0.7,
      independent: index > 0,
    })),
  });
}

function understanding(values: Partial<RefineMemberUnderstandingInput> = {}): RefineMemberUnderstandingInput {
  return {
    id: "understanding-1",
    ownerId: "owner-1",
    dimension: "preference",
    understanding: "The member appears to prefer concise comparisons before detailed calculations.",
    rationale: "This interpretation is supported by repeated choices across recent interactions.",
    confidence: confidence(),
    evidence: [{
      id: "evidence-1",
      sourceType: "conversation",
      sourceId: "conversation-1",
      capturedAt: now,
      interpretationBasis: "The member repeatedly selected concise comparison responses before requesting details.",
      originatingSpecialistId: "beastmoney.money-coach",
    }],
    applicableSpecialists: "all",
    originatingSpecialistId: "beastmoney.money-coach",
    fingerprint: "communication:concise-before-detail",
    ...values,
  };
}

test("AGENT-214 exposes one shared Member Understanding Model", () => {
  const platform = new BeastAgentsPlatform();
  assert.ok(platform.memberUnderstanding instanceof SharedMemberUnderstandingModel);
});

test("AGENT-214 supports every required understanding dimension", () => {
  const dimensions: MemberUnderstandingDimension[] = [
    "strength",
    "weakness",
    "preference",
    "communication-style",
    "decision-style",
    "risk-tolerance",
    "habit",
    "motivator",
    "learning-preference",
    "behavior-pattern",
    "goal",
  ];
  const model = new SharedMemberUnderstandingModel(undefined, () => now);
  dimensions.forEach((dimension, index) => model.refine(understanding({
    id: `understanding-${index}`,
    dimension,
    fingerprint: `dimension:${dimension}`,
  })));
  assert.deepEqual(
    model.query({ ownerId: "owner-1", specialistId: "beastmoney.money-coach", limit: 20 }).map((item) => item.dimension).sort(),
    [...dimensions].sort()
  );
});

test("AGENT-214 stores interpretations with evidence rather than raw member facts", () => {
  const model = new SharedMemberUnderstandingModel(undefined, () => now);
  const recorded = model.refine(understanding());
  assert.match(recorded.understanding, /appears to prefer/);
  assert.match(recorded.rationale, /interpretation/);
  assert.match(recorded.evidence[0].interpretationBasis, /repeatedly selected/);
  assert.equal("value" in recorded, false);
  assert.equal("fact" in recorded, false);
});

test("AGENT-214 requires interpreted evidence and valid confidence references", () => {
  const model = new SharedMemberUnderstandingModel(undefined, () => now);
  assert.throws(() => model.refine(understanding({ evidence: [] })), /requires interpreted evidence/);
  assert.throws(() => model.refine(understanding({
    evidence: [{ ...understanding().evidence[0], interpretationBasis: "" }],
  })), /interpretation basis rather than a raw fact/);
  assert.throws(() => model.refine(understanding({
    confidence: confidence(["other-evidence"]),
  })), /references evidence not supplied/);
});

test("AGENT-214 refines understanding with preserved revisions and explicit contradictions", () => {
  let currentTime = now;
  const model = new SharedMemberUnderstandingModel(undefined, () => currentTime);
  const original = model.refine(understanding());
  assert.equal(model.refine(understanding()), original);
  currentTime = "2026-07-24T12:00:00.000Z";
  assert.throws(() => model.refine(understanding({ rationale: "A changed rationale." })), /new id/);
  const revised = model.refine(understanding({
    id: "understanding-2",
    understanding: "The member now appears to prefer detailed calculations first.",
    rationale: "Newer interactions consistently requested calculations before summaries.",
  }));
  assert.equal(revised.revision, 2);
  assert.equal(revised.supersedesUnderstandingId, original.id);
  const contrary = model.refine(understanding({
    id: "understanding-3",
    fingerprint: "communication:prefers-verbal-summary",
    understanding: "The member may prefer verbal summaries.",
    contradictsUnderstandingIds: [revised.id],
  }));
  assert.equal(contrary.status, "active");
  assert.equal(model.query({ ownerId: "owner-1", specialistId: "beastmoney.money-coach" }).some((item) => item.id === revised.id), false);
});

test("AGENT-214 remains owner scoped while sharing applicable understanding across specialists", () => {
  const model = new SharedMemberUnderstandingModel(undefined, () => now);
  model.refine(understanding());
  model.refine(understanding({
    id: "owner-2-understanding",
    ownerId: "owner-2",
    fingerprint: "owner-2:preference",
  }));
  assert.equal(model.query({ ownerId: "owner-1", specialistId: "beasthealth.health-advisor" }).length, 1);
  assert.equal(model.query({ ownerId: "owner-2", specialistId: "beasthealth.health-advisor" }).length, 1);
  model.refine(understanding({
    id: "money-only",
    fingerprint: "money-only",
    applicableSpecialists: ["beastmoney.money-coach"],
  }));
  assert.equal(model.query({ ownerId: "owner-1", specialistId: "beasthealth.health-advisor" }).length, 1);
  assert.equal(model.query({ ownerId: "owner-1", specialistId: "beastmoney.money-coach" }).length, 2);
});

test("AGENT-214 continuously refines from all approved source classes", () => {
  const model = new SharedMemberUnderstandingModel(undefined, () => now);
  memberUnderstandingSourceTypes.forEach((sourceType, index) => model.refine(understanding({
    id: `source-${index}`,
    dimension: index % 2 ? "habit" : "behavior-pattern",
    fingerprint: `source:${sourceType}`,
    evidence: [{
      id: "evidence-1",
      sourceType,
      sourceId: `${sourceType}-1`,
      capturedAt: now,
      interpretationBasis: `The ${sourceType} source contributes interpreted pattern evidence.`,
    }],
  })));
  const context = model.context({ ownerId: "owner-1", specialistId: "beastmoney.money-coach" });
  assert.deepEqual(
    Array.from(new Set(context.entries.flatMap((item) => item.evidenceSourceTypes))).sort(),
    [...memberUnderstandingSourceTypes].sort()
  );
});

test("AGENT-214 derives understanding from Observation and Professional Journal evidence", () => {
  const observations = buildMoneyCoachObservations({
    current: {
      capturedAt: now,
      monthlyIncome: 6000,
      monthlyOutflow: 4300,
      projectedSurplus: 1700,
      currentCash: 5000,
      cashBuffer: 2500,
      totalDebt: 16000,
    },
    history: [{
      capturedAt: "2026-06-23T12:00:00.000Z",
      monthlyIncome: 6000,
      monthlyOutflow: 4700,
      projectedSurplus: 1300,
      currentCash: 4500,
      cashBuffer: 2500,
      totalDebt: 17500,
    }],
  }, "owner-1", now);
  const journal = new SharedProfessionalJournal(undefined, () => now);
  const journalEntry = journal.recordObservation({
    observation: observations[0],
    type: "progress-pattern",
    interpretation: "The evidence may indicate improving consistency.",
  });
  const model = new SharedMemberUnderstandingModel(undefined, () => now);
  const fromObservation = model.refineFromObservation({
    observation: observations[0],
    dimension: "strength",
    understanding: "The member may be building greater financial consistency.",
    rationale: "The current pattern improved relative to prior records.",
  });
  const fromJournal = model.refineFromJournal({
    entry: journalEntry,
    dimension: "behavior-pattern",
    understanding: "The member appears to sustain improvements across reviews.",
  });
  assert.equal(fromObservation.evidence[0].sourceType, "observation");
  assert.equal(fromJournal.evidence[0].sourceType, "professional-journal");
});

test("AGENT-214 supports correction and removal without losing prior interpretation history", () => {
  const model = new SharedMemberUnderstandingModel(undefined, () => now);
  const original = model.refine(understanding());
  const corrected = model.correct("owner-1", original.id, {
    ...understanding({
      id: "understanding-corrected",
      understanding: "The member prefers detailed explanations.",
      rationale: "The member explicitly corrected the earlier interpretation.",
    }),
  });
  assert.equal(corrected.revision, 2);
  assert.equal(corrected.supersedesUnderstandingId, original.id);
  const removed = model.remove("owner-1", corrected.id);
  assert.equal(removed.status, "removed");
  assert.equal(model.context({ ownerId: "owner-1", specialistId: "beastmoney.money-coach" }).state, "empty");
});

test("every Role Definition execution reads an understanding context before response generation", () => {
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
      input: "Help me understand this.",
      confidence: 0.95,
    },
  });
  assert.equal(execution.memberUnderstandingContext.purpose, "personalized-reasoning");
  assert.equal(execution.memberUnderstandingContext.state, "empty");
});

test("Role execution consumes applicable understanding without exposing internal context verbatim", () => {
  const model = new SharedMemberUnderstandingModel(undefined, () => now);
  model.refine(understanding({
    understanding: "INTERNAL: the member prefers concise risk explanations.",
  }));
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const execution = prepareRoleDefinedExecution({
    roleDefinition: specialistRoleDefinitions.moneyCoach,
    professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach,
    knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach,
    memberContext: {},
    currentState: {},
    memberUnderstandingContext: model.context({
      ownerId: "owner-1",
      specialistId: "beastmoney.money-coach",
    }),
    planner,
    planningRequest: {
      specialistId: "beastmoney.money-coach",
      input: "Explain this risk.",
      confidence: 0.95,
    },
  });
  assert.equal(execution.memberUnderstandingContext.entries.length, 1);
  const response = composeRoleDefinedResponse(execution, {
    intent: "explain",
    shortAnswer: "Here is the practical risk.",
    sections: [],
    expertiseUsed: ["financial planning context"],
    mode: "answer",
    followUpRequired: false,
    nextStepUseful: false,
    workspaceBenefit: "none",
  });
  assert.doesNotMatch(response.text, /INTERNAL|prefers concise risk explanations/);
});

test("Role execution rejects understanding assembled for another specialist", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  assert.throws(() => prepareRoleDefinedExecution({
    roleDefinition: specialistRoleDefinitions.moneyCoach,
    professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach,
    knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach,
    memberContext: {},
    currentState: {},
    memberUnderstandingContext: {
      ownerId: "owner-1",
      specialistId: "beasthealth.health-advisor",
      purpose: "personalized-reasoning",
      state: "empty",
      entries: [],
    },
    planner,
    planningRequest: {
      specialistId: "beastmoney.money-coach",
      input: "Review",
      confidence: 0.95,
    },
  }), /same specialist/);
});
