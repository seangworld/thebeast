import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildMobileNavigation } from "../src/lib/mobileFoundation";
import { secondaryNavigation } from "../src/lib/moduleNavigation";
import {
  buildProfessionalRelationship,
  buildRelationshipCenter,
  professionalRelationshipDefinitions,
  relationshipCenterRules,
  type RelationshipConversationEvidence,
  type RelationshipMemoryEvidence,
} from "../src/lib/platform/relationships";

const moneyConversation: RelationshipConversationEvidence = {
  id: "money-thread",
  agentId: "beastmoney.money-coach",
  title: "Plan my mortgage payoff",
  summary: {
    overview: "Compared the current mortgage payoff options.",
    decisions: ["Keep the cash buffer protected."],
    unresolvedFollowUps: ["Review the next safe extra payment."],
  },
  messageCount: 6,
  createdAt: "2026-01-20T12:00:00.000Z",
  updatedAt: "2026-07-25T12:00:00.000Z",
};

const moneyMemory: RelationshipMemoryEvidence = {
  id: "money-goal",
  agentId: "beastmoney.money-coach",
  key: "financial-goal",
  value: {
    content: "Pay off the mortgage while protecting the cash reserve.",
  },
  updatedAt: "2026-07-25T12:00:00.000Z",
};

test("BO-314 builds an evidence-backed long-term professional relationship", () => {
  const definition = professionalRelationshipDefinitions[0];
  const relationship = buildProfessionalRelationship({
    definition,
    conversations: [moneyConversation],
    memories: [moneyMemory],
    now: new Date("2026-07-26T12:00:00.000Z"),
  });

  assert.equal(relationship.role, "Money Coach");
  assert.equal(relationship.state, "active");
  assert.equal(relationship.relationshipDuration, "Working together for 6 months");
  assert.equal(relationship.lastConversation, "Yesterday");
  assert.equal(
    relationship.currentObjective,
    "Pay off the mortgage while protecting the cash reserve."
  );
  assert.equal(
    relationship.recentProgress,
    "Compared the current mortgage payoff options."
  );
  assert.equal(
    relationship.nextRecommendedConversation,
    "Review the next safe extra payment."
  );
  assert.equal(relationship.understandingConfidence.label, "Growing");
  assert.deepEqual(relationship.evidence, {
    conversationCount: 1,
    messageCount: 6,
    memoryCount: 1,
  });
});

test("BO-314 ignores empty threads and never invents relationship history", () => {
  const relationships = buildRelationshipCenter({
    conversations: [
      {
        ...moneyConversation,
        id: "empty-thread",
        title: "New conversation",
        messageCount: 0,
      },
    ],
    memories: [],
    now: new Date("2026-07-26T12:00:00.000Z"),
  });

  for (const relationship of relationships) {
    assert.equal(relationship.state, "not-started");
    assert.equal(relationship.relationshipDuration, "Relationship not started");
    assert.equal(relationship.lastConversation, "No saved conversation yet");
    assert.equal(
      relationship.currentObjective,
      "No current objective has been established yet."
    );
    assert.equal(
      relationship.recentProgress,
      "No recent progress has been captured yet."
    );
    assert.equal(
      relationship.understandingConfidence.label,
      "Not established"
    );
  }
});

test("BO-314 does not mistake preferences or constraints for objectives", () => {
  const relationship = buildProfessionalRelationship({
    definition: professionalRelationshipDefinitions[0],
    conversations: [moneyConversation],
    memories: [
      {
        ...moneyMemory,
        id: "money-preference",
        key: "preference-or-constraint",
        value: { content: "I prefer short explanations." },
        updatedAt: "2026-07-26T12:00:00.000Z",
      },
    ],
    now: new Date("2026-07-26T12:00:00.000Z"),
  });

  assert.equal(relationship.currentObjective, "Plan my mortgage payoff");
  assert.equal(relationship.understandingConfidence.label, "Growing");
});

test("BE-301 adds AI Tutor as an independent professional relationship", () => {
  assert.deepEqual(
    professionalRelationshipDefinitions.map((professional) => professional.role),
    ["Money Coach", "Guidance Counselor", "AI Tutor", "Health Advisor"]
  );
  assert.deepEqual(
    professionalRelationshipDefinitions.map(
      (professional) => professional.agentId
    ),
    [
      "beastmoney.money-coach",
      "beasteducation.guidance-counselor",
      "beasteducation.tutor",
      "beasthealth.health-advisor",
    ]
  );
  assert.match(relationshipCenterRules[0], /owner-scoped/);
  assert.match(relationshipCenterRules[1], /exchanged saved messages/);
  assert.match(relationshipCenterRules[2], /only when supported/);
  assert.match(relationshipCenterRules[3], /not hidden AI judgment/);
  assert.match(relationshipCenterRules[4], /never changes professional behavior/);
});

test("BO-314 Relationship Center reads owner-scoped evidence without writing", () => {
  const page = readFileSync(
    "src/app/dashboard/relationships/page.tsx",
    "utf8"
  );

  assert.match(page, /\.from\("agent_conversations"\)/);
  assert.match(page, /\.from\("agent_memories"\)/);
  assert.equal((page.match(/\.eq\("owner_id", user\.id\)/g) || []).length, 2);
  assert.match(page, /\.in\("agent_id", agentIds\)/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  assert.doesNotMatch(page, /fetch\("\/api\/learning\/ai|answerMoneyCoachQuestion/);
});

test("BO-314 presents every relationship dimension with honest states", () => {
  const page = readFileSync(
    "src/app/dashboard/relationships/page.tsx",
    "utf8"
  );

  assert.match(page, /Your professional team/);
  assert.match(page, /Long-term relationships/);
  assert.match(page, /Current objective/);
  assert.match(page, /Recent progress/);
  assert.match(page, /Next recommended conversation/);
  assert.match(page, /Understanding/);
  assert.match(page, /Confidence basis/);
  assert.match(page, /Loading professional relationships/);
  assert.match(page, /could not be loaded right now/);
  assert.match(page, /does not invent history or change how any professional works/);
});

test("BO-314 is reachable through secondary desktop and mobile navigation", () => {
  assert.deepEqual(
    secondaryNavigation.find((item) => item.label === "Relationship Center"),
    {
      label: "Relationship Center",
      href: "/dashboard/relationships",
      module: "beastos",
    }
  );
  assert.equal(
    buildMobileNavigation({ isOwner: false }).more.some(
      (item) =>
        item.label === "Relationship Center" &&
        item.href === "/dashboard/relationships"
    ),
    true
  );
});
