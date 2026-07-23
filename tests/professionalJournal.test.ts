import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  composeRoleDefinedResponse,
  prepareRoleDefinedExecution,
  SharedAgentPlanningEngine,
  SharedProbabilityConfidenceEngine,
  SharedProfessionalJournal,
  professionalJournalFixturePatterns,
  specialistAgentPlanningPolicies,
  specialistKnowledgeSourcePolicies,
  specialistProfessionalIdentityProfiles,
  specialistRoleDefinitions,
  type CreateProfessionalJournalEntry,
} from "../src/lib/platform/agents";
import { buildMoneyCoachObservations } from "../src/lib/moneyCoachObservations";

const now = "2026-07-23T12:00:00.000Z";

function confidence(evidenceId = "evidence-1") {
  return new SharedProbabilityConfidenceEngine().assess({
    claim: "A professional pattern is supported.",
    evidence: [{
      id: evidenceId,
      source: "authenticated.member.records",
      relationship: "supports",
      claimType: "direct",
      authority: 0.9,
      reliability: 0.9,
      freshness: 1,
      completeness: 0.85,
      directness: 1,
      independent: false,
    }],
  });
}

function entry(values: Partial<CreateProfessionalJournalEntry> = {}): CreateProfessionalJournalEntry {
  return {
    id: "journal-1",
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    type: "progress-pattern",
    observation: "Budget consistency improved across recent saved periods.",
    interpretation: "The pattern may reflect more consistent planning behavior.",
    confidence: confidence(),
    evidence: [{
      id: "evidence-1",
      source: "beastmoney.cash-flow",
      sourceRecordId: "snapshot-1",
      observedAt: now,
      description: "Three current budget snapshots were within the configured range.",
    }],
    timestamp: now,
    relatedMemberData: [{
      resource: "beastmoney.cash-flow",
      recordId: "snapshot-1",
      fields: ["monthlyIncome", "monthlyOutflow"],
      ownerId: "owner-1",
    }],
    fingerprint: "money:budget-consistency",
    ...values,
  };
}

test("AGENT-213 exposes a Professional Journal distinct from the governance learning journal", () => {
  const platform = new BeastAgentsPlatform();
  assert.ok(platform.professionalJournal instanceof SharedProfessionalJournal);
  assert.notEqual(platform.professionalJournal, platform.learningJournal);
});

test("AGENT-213 records internal owner-scoped specialist understanding with required fields", () => {
  const journal = new SharedProfessionalJournal(undefined, () => now);
  const recorded = journal.record(entry());
  assert.equal(recorded.visibility, "specialist-internal");
  assert.equal(recorded.observation, "Budget consistency improved across recent saved periods.");
  assert.match(recorded.interpretation, /planning behavior/);
  assert.equal(recorded.confidence.confidence, "high");
  assert.equal(recorded.evidence.length, 1);
  assert.equal(recorded.relatedMemberData[0].ownerId, "owner-1");
  assert.equal(recorded.specialistId, "beastmoney.money-coach");
  assert.equal(recorded.timestamp, now);
});

test("AGENT-213 validates evidence, ownership, confidence references, and timestamps", () => {
  const journal = new SharedProfessionalJournal(undefined, () => now);
  assert.throws(() => journal.record(entry({ evidence: [] })), /require evidence/);
  assert.throws(() => journal.record(entry({
    relatedMemberData: [{ resource: "beastmoney.cash-flow", recordId: "other", fields: [], ownerId: "owner-2" }],
  })), /belong to the journal owner/);
  assert.throws(() => journal.record(entry({
    confidence: confidence("unknown-evidence"),
  })), /references evidence not stored/);
  assert.throws(() => journal.record(entry({ timestamp: "not-a-date" })), /valid timestamp/);
});

test("AGENT-213 keeps entries isolated by owner and specialist", () => {
  const journal = new SharedProfessionalJournal(undefined, () => now);
  journal.record(entry());
  journal.record(entry({
    id: "journal-2",
    ownerId: "owner-2",
    relatedMemberData: [{ resource: "beastmoney.cash-flow", recordId: "snapshot-2", fields: [], ownerId: "owner-2" }],
  }));
  journal.record(entry({
    id: "journal-3",
    specialistId: "beasthealth.health-advisor",
  }));
  assert.equal(journal.query({ ownerId: "owner-1", specialistId: "beastmoney.money-coach" }).length, 1);
  assert.equal(journal.query({ ownerId: "owner-2", specialistId: "beastmoney.money-coach" }).length, 1);
  assert.equal(journal.query({ ownerId: "owner-1", specialistId: "beasthealth.health-advisor" }).length, 1);
});

test("AGENT-213 deduplicates unchanged understanding and preserves revisions", () => {
  const journal = new SharedProfessionalJournal(undefined, () => now);
  const original = journal.record(entry());
  assert.equal(journal.record(entry()), original);
  assert.throws(() => journal.record(entry({ interpretation: "The interpretation changed." })), /new entry id/);
  const revised = journal.record(entry({
    id: "journal-2",
    interpretation: "The newer evidence suggests a sustained planning pattern.",
  }));
  assert.equal(revised.revision, 2);
  assert.equal(revised.supersedesEntryId, "journal-1");
  assert.equal(journal.query({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    statuses: ["superseded"],
  })[0].id, "journal-1");
});

test("AGENT-213 supports resolution, expiration, filtering, and bounded reasoning context", () => {
  const journal = new SharedProfessionalJournal(undefined, () => now);
  const first = journal.record(entry());
  journal.record(entry({
    id: "journal-2",
    fingerprint: "money:emergency-fund-progress",
    observation: "Emergency fund progress continued.",
    timestamp: "2026-07-22T12:00:00.000Z",
  }));
  journal.resolve("owner-1", "beastmoney.money-coach", first.id);
  const context = journal.reasoningContext({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    limit: 1,
  });
  assert.equal(context.purpose, "internal-reasoning");
  assert.equal(context.entries.length, 1);
  assert.equal(context.entries[0].observation, "Emergency fund progress continued.");
  journal.expire("owner-1", "beastmoney.money-coach", "journal-2");
  assert.equal(journal.reasoningContext({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
  }).entries.length, 0);
});

test("AGENT-213 can derive grounded journal evidence from Observation Intelligence", () => {
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
  const recorded = journal.recordObservation({
    observation: observations[0],
    type: "progress-pattern",
    interpretation: "The current evidence may indicate improving financial consistency.",
  });
  assert.equal(recorded.confidence, observations[0].confidenceAnalysis);
  assert.equal(recorded.evidence.length, observations[0].evidence.length);
  assert.match(recorded.fingerprint, /^observation:/);
});

test("AGENT-213 journal context informs role execution but is never rendered to members", () => {
  const privateInterpretation = "INTERNAL: member responds better to weekly planning intervals.";
  const journal = new SharedProfessionalJournal(undefined, () => now);
  journal.record(entry({ interpretation: privateInterpretation }));
  const journalContext = journal.reasoningContext({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
  });
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const execution = prepareRoleDefinedExecution({
    roleDefinition: specialistRoleDefinitions.moneyCoach,
    professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach,
    knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach,
    memberContext: {},
    currentState: {},
    professionalJournalContext: journalContext,
    planner,
    planningRequest: {
      specialistId: "beastmoney.money-coach",
      input: "How is my plan going?",
      confidence: 0.95,
    },
  });
  assert.equal(execution.professionalJournalContext?.entries[0].interpretation, privateInterpretation);
  const response = composeRoleDefinedResponse(execution, {
    intent: "status",
    shortAnswer: "Your current records show measurable progress.",
    sections: [],
    expertiseUsed: ["financial planning context"],
    mode: "answer",
    followUpRequired: false,
    nextStepUseful: false,
    workspaceBenefit: "none",
  });
  assert.doesNotMatch(response.text, /INTERNAL|weekly planning intervals/);
});

test("AGENT-213 rejects journal context from a different specialist during role execution", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  assert.throws(() => prepareRoleDefinedExecution({
    roleDefinition: specialistRoleDefinitions.moneyCoach,
    professionalProfile: specialistProfessionalIdentityProfiles.moneyCoach,
    knowledgeSourcePolicy: specialistKnowledgeSourcePolicies.moneyCoach,
    memberContext: {},
    currentState: {},
    professionalJournalContext: {
      ownerId: "owner-1",
      specialistId: "beasthealth.health-advisor",
      purpose: "internal-reasoning",
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

test("AGENT-213 provides Money, Health, and Learning fixture patterns without domain logic", () => {
  assert.deepEqual(professionalJournalFixturePatterns.moneyCoach, [
    "member discipline",
    "budget consistency",
    "impulse spending",
    "emergency fund progress",
  ]);
  assert.deepEqual(professionalJournalFixturePatterns.healthAdvisor, [
    "medication adherence",
    "sleep trend",
    "weight trend",
  ]);
  assert.deepEqual(professionalJournalFixturePatterns.guidanceCounselor, [
    "confidence trend",
    "learning style",
    "retention trend",
  ]);
});
