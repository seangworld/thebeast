import test from "node:test";
import assert from "node:assert/strict";
import { buildBalanceFinancialStory } from "../src/lib/moneyIntelligence/engine";

test("v3 balance story explains a changed connected balance without inventing transactions", () => {
  const story = buildBalanceFinancialStory({
    ownerId: "owner",
    asOf: "2026-09-28T16:00:00Z",
    changes: [{ accountName: "Card", previousBalance: 1000, reportedBalance: 800, difference: -200 }],
  });
  assert.match(story.headline, /1 connected balance changed/);
  assert.match(story.whatItMeans.join(" "), /projections may be stale/i);
  assert.equal(story.nextActions[0].requiresConfirmation, true);
  assert.match(story.limitations.join(" "), /does not identify the transactions/i);
});

test("v3 balance story reports no action when reviewed balances match", () => {
  const story = buildBalanceFinancialStory({
    ownerId: "owner",
    asOf: "2026-09-28T16:00:00Z",
    changes: [{ accountName: "Checking", previousBalance: 500, reportedBalance: 500, difference: 0 }],
  });
  assert.equal(story.nextActions.length, 0);
  assert.match(story.headline, /match/i);
});
