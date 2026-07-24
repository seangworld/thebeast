import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGuidanceCounselorConversationTurn,
  explicitGuidanceGoalChange,
  guidanceDiscoveryProfileFromRow,
  guidanceRelationshipMemoryRecord,
  guidanceRelationshipReference,
} from "../src/lib/education";

const now = "2026-07-24T12:00:00.000Z";
const baseProfile = guidanceDiscoveryProfileFromRow({
  goal: "Become a cybersecurity analyst",
  career_interests: ["cybersecurity"],
});

function rememberedProfile() {
  const memory = guidanceRelationshipMemoryRecord({
    ownerId: "member-1",
    profile: baseProfile,
    conversationId: "conversation-1",
    messageId: "message-1",
    capturedAt: now,
  });
  assert.ok(memory);
  return memory;
}

test("BE-222 stores relationship memory through the shared Beast Agent contract", () => {
  const memory = rememberedProfile();
  assert.equal(memory.agentId, "beasteducation.guidance-counselor");
  assert.equal(memory.ownerId, "member-1");
  assert.equal(memory.scope, "user");
  assert.equal(memory.key, "education-relationship");
  assert.deepEqual(memory.evidence, [
    {
      source: "conversation-1",
      capturedAt: now,
      description: "message-1",
    },
  ]);
});

test("BE-222 recalls a known goal naturally across conversations", () => {
  const reference = guidanceRelationshipReference({
    memories: [rememberedProfile()],
    previousProfile: baseProfile,
    currentProfile: baseProfile,
    currentConversationId: "conversation-2",
  });
  assert.equal(reference?.kind, "remembered");
  assert.match(reference?.text || "", /Last time you mentioned/);
  assert.match(reference?.text || "", /cybersecurity analyst/);
});

test("BE-222 identifies a member-stated goal change without inventing one", () => {
  const changed = guidanceDiscoveryProfileFromRow({
    goal: "Become a cloud engineer",
  });
  const reference = guidanceRelationshipReference({
    memories: [rememberedProfile()],
    previousProfile: baseProfile,
    currentProfile: changed,
    currentConversationId: "conversation-2",
  });
  assert.equal(reference?.kind, "changed");
  assert.match(reference?.text || "", /changed from Become a cybersecurity analyst to Become a cloud engineer/);
});

test("BE-222 recognizes only explicit changes to an established goal", () => {
  assert.equal(
    explicitGuidanceGoalChange(
      "I changed my goal to become a cloud engineer.",
      "Become a cybersecurity analyst"
    ),
    "become a cloud engineer"
  );
  assert.equal(
    explicitGuidanceGoalChange(
      "Could a cloud certification support my current plan?",
      "Become a cybersecurity analyst"
    ),
    undefined
  );
});

test("BE-222 never references memory without source evidence", () => {
  const unevidenced = { ...rememberedProfile(), evidence: [] };
  const reference = guidanceRelationshipReference({
    memories: [unevidenced],
    previousProfile: guidanceDiscoveryProfileFromRow(null),
    currentProfile: guidanceDiscoveryProfileFromRow(null),
    currentConversationId: "conversation-2",
  });
  assert.equal(reference, undefined);
});

test("BE-222 never fabricates continuity when no memory exists", () => {
  const reference = guidanceRelationshipReference({
    memories: [],
    previousProfile: guidanceDiscoveryProfileFromRow(null),
    currentProfile: guidanceDiscoveryProfileFromRow(null),
    currentConversationId: "conversation-2",
  });
  assert.equal(reference, undefined);
});

test("BE-222 does not repeat a memory throughout the conversation that created it", () => {
  const reference = guidanceRelationshipReference({
    memories: [rememberedProfile()],
    previousProfile: baseProfile,
    currentProfile: baseProfile,
    currentConversationId: "conversation-1",
  });
  assert.equal(reference, undefined);
});

test("BE-222 brings grounded relationship memory into the Counselor response", () => {
  const relationshipMemory = guidanceRelationshipReference({
    memories: [rememberedProfile()],
    previousProfile: baseProfile,
    currentProfile: baseProfile,
    currentConversationId: "conversation-2",
  });
  const response = buildGuidanceCounselorConversationTurn({
    question: "What should I learn next?",
    context: {
      educationalGoal: "Become a cybersecurity analyst",
      interests: "cybersecurity",
      careerDirection: "cybersecurity analyst",
      roadmap: "Build foundations, then role-ready evidence.",
    },
    profile: baseProfile,
    relationshipMemory,
  });
  assert.equal(response.relationshipMemory?.memoryId, rememberedProfile().id);
  assert.match(response.text, /^Last time you mentioned/);
});
