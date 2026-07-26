import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BeastAgentsPlatform,
  SharedCrossModuleRecommendationExchange,
  crossModuleRecommendationRules,
  type CrossModuleRecommendationProposal,
} from "../src/lib/platform/agents";
import type { SharedAIContextItem } from "../src/lib/platform/sharedAI";

const sharedContext: SharedAIContextItem[] = [
  {
    id: "education-security-plus",
    kind: "Plan",
    source: "learning",
    sourceRecordId: "roadmap-security-plus",
    summary: "Security+ is the next verified certification milestone.",
    permission: "Allowed",
    retention: "Persistent",
  },
  {
    id: "money-college-capacity",
    kind: "Module",
    source: "money",
    sourceRecordId: "financial-outlook-current",
    summary: "The current financial outlook has improved.",
    permission: "Allowed",
    retention: "Session",
  },
  {
    id: "health-stress",
    kind: "Module",
    source: "health",
    sourceRecordId: "stress-observation-current",
    summary: "Recent member-reported stress is elevated.",
    permission: "Restricted",
    retention: "Session",
  },
];

function proposal(
  overrides: Partial<CrossModuleRecommendationProposal> = {}
): CrossModuleRecommendationProposal {
  return {
    id: "money-to-education-1",
    ownerId: "owner-1",
    sourceProfessional: {
      agentId: "beastmoney.money-coach",
      module: "money",
      displayName: "Money Coach",
    },
    recipientProfessional: {
      agentId: "beasteducation.guidance-counselor",
      module: "learning",
      displayName: "Guidance Counselor",
    },
    recommendation:
      "Completing Security+ may improve your earning potential.",
    whySurfaced:
      "Your current education roadmap identifies Security+ as the next verified milestone.",
    suggestedAction: "Discuss how Security+ fits your career plan.",
    sharedContext,
    sourceContextIds: ["education-security-plus"],
    createdAt: "2026-07-26T12:00:00.000Z",
    ...overrides,
  };
}

test("BO-312 exposes one BeastOS-owned cross-module recommendation exchange", () => {
  const platform = new BeastAgentsPlatform();

  assert.ok(
    platform.crossModuleRecommendations instanceof
      SharedCrossModuleRecommendationExchange
  );
  assert.match(crossModuleRecommendationRules[0], /BeastOS brokers/);
  assert.match(crossModuleRecommendationRules[1], /cannot write to or modify/);
  assert.match(crossModuleRecommendationRules[2], /explain why/);
  assert.match(crossModuleRecommendationRules[3], /never execute actions/);
  assert.match(crossModuleRecommendationRules[4], /independently decides/);
});

test("BO-312 recommendations retain professional independence and explain why", () => {
  const exchange = new SharedCrossModuleRecommendationExchange();
  const recommendation = exchange.publish(proposal());

  assert.equal(recommendation.status, "advisory");
  assert.equal(recommendation.collaboration.broker, "BeastOS");
  assert.equal(recommendation.collaboration.contextAccess, "read-only");
  assert.equal(recommendation.collaboration.crossModuleWritesAllowed, false);
  assert.equal(recommendation.collaboration.sourceProfessionalOwnsReasoning, true);
  assert.equal(recommendation.collaboration.recipientProfessionalOwnsResponse, true);
  assert.equal(recommendation.collaboration.memberDecisionRequired, true);
  assert.equal(recommendation.collaboration.autonomousExecution, false);
  assert.match(recommendation.whySurfaced, /roadmap identifies Security\+/);
  assert.deepEqual(
    recommendation.evidence.map((item) => item.id),
    ["education-security-plus"]
  );
});

test("BO-312 only references explicitly allowed shared BeastOS context", () => {
  const exchange = new SharedCrossModuleRecommendationExchange();

  assert.throws(
    () =>
      exchange.publish(
        proposal({
          id: "restricted-context",
          sourceContextIds: ["health-stress"],
        })
      ),
    /context health-stress is restricted/
  );
  assert.throws(
    () =>
      exchange.publish(
        proposal({
          id: "missing-context",
          sourceContextIds: ["unknown-context"],
        })
      ),
    /context unknown-context is unavailable/
  );
  assert.throws(
    () =>
      exchange.publish(
        proposal({ id: "no-context", sourceContextIds: [] })
      ),
    /require shared BeastOS context evidence/
  );
});

test("BO-312 rejects recommendations that do not cross ownership boundaries", () => {
  const exchange = new SharedCrossModuleRecommendationExchange();

  assert.throws(
    () =>
      exchange.publish(
        proposal({
          recipientProfessional: {
            agentId: "beastmoney.debt-specialist",
            module: "money",
            displayName: "Debt Specialist",
          },
        })
      ),
    /cross module ownership boundaries/
  );
  assert.throws(
    () =>
      exchange.publish(
        proposal({
          recipientProfessional: {
            agentId: "beastmoney.money-coach",
            module: "learning",
            displayName: "Money Coach",
          },
        })
      ),
    /two independent professionals/
  );
});

test("BO-312 keeps recommendation delivery owner scoped and recipient specific", () => {
  const exchange = new SharedCrossModuleRecommendationExchange();
  exchange.publish(proposal());
  exchange.publish(
    proposal({
      id: "education-to-money-1",
      ownerId: "owner-2",
      sourceProfessional: {
        agentId: "beasteducation.guidance-counselor",
        module: "learning",
        displayName: "Guidance Counselor",
      },
      recipientProfessional: {
        agentId: "beastmoney.money-coach",
        module: "money",
        displayName: "Money Coach",
      },
      recommendation:
        "College may now be more affordable based on your improved outlook.",
      whySurfaced:
        "Your shared financial outlook changed since the last education review.",
      sourceContextIds: ["money-college-capacity"],
      createdAt: "2026-07-26T13:00:00.000Z",
    })
  );

  assert.deepEqual(
    exchange.listForOwner("owner-1").map((item) => item.id),
    ["money-to-education-1"]
  );
  assert.deepEqual(
    exchange
      .listForOwner("owner-2", "beastmoney.money-coach")
      .map((item) => item.id),
    ["education-to-money-1"]
  );
  assert.equal(
    exchange.listForOwner(
      "owner-2",
      "beasteducation.guidance-counselor"
    ).length,
    0
  );
});

test("BO-312 provides no cross-module mutation or autonomous execution path", () => {
  const source = readFileSync(
    "src/lib/platform/agents/crossModuleRecommendations.ts",
    "utf8"
  );
  const exchange = new SharedCrossModuleRecommendationExchange();
  const input = proposal();
  const recommendation = exchange.publish(input);

  input.sharedContext[0].summary = "Changed after publication.";

  assert.equal(
    recommendation.evidence[0].summary,
    "Security+ is the next verified certification milestone."
  );
  assert.doesNotMatch(source, /\.update\(|\.insert\(|\.delete\(|execute\s*:/);
  assert.match(source, /crossModuleWritesAllowed: false/);
  assert.match(source, /memberDecisionRequired: true/);
  assert.match(source, /autonomousExecution: false/);
});
