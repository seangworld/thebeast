import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  SharedReflectionIntelligence,
  type AgentConversationThread,
  type ReflectionCadence,
  type ReflectionEvidence,
} from "../src/lib/platform/agents";

const asOf = "2026-07-23T12:00:00.000Z";

test("AGENT-217 exposes shared specialist-neutral reflection intelligence", () => {
  assert.ok(new BeastAgentsPlatform().reflectionIntelligence instanceof SharedReflectionIntelligence);
});

test("AGENT-217 supports weekly monthly quarterly annual and since-start reflections", () => {
  const engine = new SharedReflectionIntelligence();
  const cadences: ReflectionCadence[] = ["weekly", "monthly", "quarterly", "annual", "since-start"];
  for (const cadence of cadences) {
    const reflection = engine.generate({ ownerId: "owner-1", specialistId: "future.specialist", cadence, asOf });
    assert.equal(reflection.cadence, cadence);
    assert.equal(reflection.ownerId, "owner-1");
    assert.match(reflection.narrative, /not enough dated evidence/i);
  }
});

test("AGENT-217 compares current metrics with the prior period without inventing changes", () => {
  const evidence: ReflectionEvidence[] = [
    { id: "prior-spending", sourceType: "observation", sourceId: "prior", capturedAt: "2026-03-15T12:00:00.000Z", statement: "Prior discretionary spending.", direction: "context", metric: { name: "discretionary spending", value: 1000, unit: "USD" } },
    { id: "current-spending", sourceType: "observation", sourceId: "current", capturedAt: "2026-07-10T12:00:00.000Z", statement: "Discretionary spending declined.", direction: "improvement", metric: { name: "discretionary spending", value: 880, unit: "USD" } },
  ];
  const reflection = new SharedReflectionIntelligence().generate({ ownerId: "owner-1", specialistId: "beastmoney.money-coach", cadence: "quarterly", asOf, evidence });
  assert.equal(reflection.comparisons[0].change, -120);
  assert.equal(reflection.comparisons[0].percentChange, -12);
  assert.ok(reflection.improvements.some((item) => item.id === "current-spending"));
});

test("AGENT-217 summarizes milestones improvements regressions and consistency", () => {
  const evidence: ReflectionEvidence[] = [
    { id: "milestone", sourceType: "professional-journal", sourceId: "j1", capturedAt: "2026-07-20T12:00:00.000Z", statement: "Completed three certifications.", direction: "milestone" },
    { id: "improvement", sourceType: "observation", sourceId: "o1", capturedAt: "2026-07-19T12:00:00.000Z", statement: "Daily steps increased.", direction: "improvement" },
    { id: "regression", sourceType: "observation", sourceId: "o2", capturedAt: "2026-07-18T12:00:00.000Z", statement: "Sleep consistency declined.", direction: "regression" },
    { id: "consistent", sourceType: "member-understanding", sourceId: "u1", capturedAt: "2026-07-17T12:00:00.000Z", statement: "Study routine remained consistent.", direction: "consistent" },
  ];
  const reflection = new SharedReflectionIntelligence().generate({ ownerId: "owner-1", specialistId: "beasthealth.health-advisor", cadence: "weekly", asOf, evidence });
  assert.equal(reflection.milestones.length, 1);
  assert.equal(reflection.improvements.length, 1);
  assert.equal(reflection.regressions.length, 1);
  assert.equal(reflection.consistencies.length, 1);
  assert.equal(reflection.highlights.length, 4);
});

function conversation(values: Partial<AgentConversationThread>): AgentConversationThread {
  return {
    id: "conversation-1",
    ownerId: "owner-1",
    agentId: "beasteducation.guidance-counselor",
    title: "Certification plan",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
    messages: [],
    messageCount: 8,
    pinned: false,
    archived: false,
    tags: [],
    summary: { overview: "Continued the certification plan.", decisions: [], unresolvedFollowUps: [], updatedAt: "2026-07-20T12:00:00.000Z" },
    relatedInsightIds: [],
    relatedActionIds: [],
    ...values,
  };
}

test("AGENT-217 draws only owner-scoped active conversation history", () => {
  const reflection = new SharedReflectionIntelligence().generate({
    ownerId: "owner-1",
    specialistId: "beasteducation.guidance-counselor",
    cadence: "monthly",
    asOf,
    conversations: [
      conversation({}),
      conversation({ id: "other-owner", ownerId: "owner-2" }),
      conversation({ id: "other-specialist", agentId: "beastmoney.money-coach" }),
      conversation({ id: "archived", archived: true }),
    ],
  });
  assert.deepEqual(reflection.evidence.map((item) => item.sourceId), ["conversation-1"]);
});

test("AGENT-217 incorporates journal and member-understanding reasoning context", () => {
  const reflection = new SharedReflectionIntelligence().generate({
    ownerId: "owner-1",
    specialistId: "future.specialist",
    cadence: "monthly",
    asOf,
    journalEntries: [{ entryId: "journal-1", observation: "Routine", interpretation: "Consistency is improving.", confidence: "moderate", evidenceIds: ["e1"], relatedResources: ["records"], timestamp: "2026-07-15T12:00:00.000Z" }],
    memberUnderstanding: [{ understandingId: "understanding-1", dimension: "strength", understanding: "The member follows through on scheduled reviews.", confidence: "high", evidenceSourceTypes: ["historical-outcome"], updatedAt: "2026-07-16T12:00:00.000Z" }],
  });
  assert.ok(reflection.evidence.some((item) => item.sourceType === "professional-journal"));
  assert.ok(reflection.evidence.some((item) => item.sourceType === "member-understanding"));
  assert.match(reflection.narrative, /2 improvements/i);
});
