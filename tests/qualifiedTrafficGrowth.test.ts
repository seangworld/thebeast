import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSearchOpportunities } from "../src/lib/seangworldIntelligence";

test("SW-QTG-001 prefers distribution of a proven existing asset", () => {
  const [opportunity] = buildSearchOpportunities([
    {
      page: "https://www.seangworld.com/tools/cash-flow",
      query: "cash flow calculator",
      clicks: 12,
      impressions: 120,
      ctr: 0.1,
      position: 6,
    },
  ], []);
  assert.equal(opportunity.classification, "Distribute");
  assert.equal(opportunity.recommendedAsset, "Existing Page");
  assert.equal(opportunity.trafficSource, "Organic search");
  assert.match(opportunity.proposedAction, /distribution/i);
  assert.match(opportunity.measurement, /qualified actions/i);
  assert.equal(opportunity.ownerApprovalRequired, false);
});

test("SW-QTG-001 uses existing owner surfaces and keeps execution disabled", () => {
  const intelligence = readFileSync(
    "src/app/dashboard/admin/intelligence/SeangworldIntelligenceWorkspace.tsx",
    "utf8"
  );
  const marketing = readFileSync(
    "src/app/dashboard/admin/marketing/BeastMarketingWorkspace.tsx",
    "utf8"
  );
  const packageRecord = readFileSync(
    "docs/SW-QTG-001-QUALIFIED-TRAFFIC-GROWTH.md",
    "utf8"
  );
  assert.match(intelligence, /Qualified traffic by source and landing page/);
  assert.match(marketing, /Primary growth objective · Qualified Traffic Growth/);
  assert.match(packageRecord, /No automatic proposal intake, publication, distribution, execution, or spend/);
  assert.match(packageRecord, /does not expand\s+the current three-source standing assignment/);
});
