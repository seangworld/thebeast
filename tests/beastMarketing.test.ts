import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BEAST_MARKETING_VERSION,
  buildMarketingRecommendation,
  isMarketingAssetStatus,
  isMarketingCampaignStatus,
  isMarketingOutcomeMetric,
  marketingCampaignStatuses,
  normalizeMarketingSourceFacts,
  validateCampaignDraft,
  type MarketingCampaign,
  type MarketingOutcome,
} from "../src/lib/beastMarketing";

const campaign: MarketingCampaign = {
  id: "campaign-1",
  title: "Free AI guide",
  objective: "Increase qualified downloads",
  audience: "Adults learning practical AI",
  offer: "Free public guide",
  channels: ["Owned social"],
  callToAction: "Download the guide",
  sourceFacts: [{ label: "Released funnel", url: "https://seangworld.com", observedAt: null, limitation: null }],
  successMeasures: ["Downloads", "Activations"],
  limitations: ["Attribution is incomplete"],
  status: "active",
  startsAt: null,
  endsAt: null,
  createdAt: "2026-08-23T00:00:00Z",
  updatedAt: "2026-08-23T00:00:00Z",
};

function result(metric: MarketingOutcome["metric"], value: number): MarketingOutcome {
  return { id: `${metric}-${value}`, campaignId: campaign.id, metric, value, measuredAt: "2026-08-23T00:00:00Z", sourceLabel: "First-party telemetry", sourceUrl: null, notes: "" };
}

test("BMKT-001 defines bounded campaign, asset, and outcome states", () => {
  assert.equal(BEAST_MARKETING_VERSION, "0.1.0");
  assert.deepEqual(marketingCampaignStatuses, ["draft", "review", "approved", "scheduled", "active", "paused", "completed", "archived"]);
  assert.equal(isMarketingCampaignStatus("approved"), true);
  assert.equal(isMarketingCampaignStatus("published"), false);
  assert.equal(isMarketingAssetStatus("approved"), true);
  assert.equal(isMarketingAssetStatus("posted"), false);
  assert.equal(isMarketingOutcomeMetric("retained_users"), true);
  assert.equal(isMarketingOutcomeMetric("likes"), false);
});

test("BMKT-001 requires a complete campaign contract and HTTPS source facts", () => {
  assert.equal(validateCampaignDraft({ title: "Incomplete" }), null);
  const draft = validateCampaignDraft({ title: campaign.title, objective: campaign.objective, audience: campaign.audience, offer: campaign.offer, callToAction: campaign.callToAction, channels: campaign.channels, successMeasures: campaign.successMeasures, limitations: campaign.limitations, sourceFacts: campaign.sourceFacts });
  assert.equal(draft?.title, campaign.title);
  assert.equal(normalizeMarketingSourceFacts([{ label: "Unsafe", url: "http://example.com" }])[0].url, null);
  assert.equal(normalizeMarketingSourceFacts([{ label: "Safe", url: "https://example.com" }])[0].url, "https://example.com");
});

test("BMKT-001 never treats missing performance evidence as zero", () => {
  const recommendation = buildMarketingRecommendation({ campaign, outcomes: [], approvedAssetCount: 1 });
  assert.equal(recommendation.decision, "modify");
  assert.equal(recommendation.confidence, "low");
  assert.match(recommendation.limitations.join(" "), /No performance outcome/);
});

test("BMKT-001 recommends Continue only from a useful recorded outcome and approved asset", () => {
  const visitsOnly = buildMarketingRecommendation({ campaign, outcomes: [result("visits", 100)], approvedAssetCount: 1 });
  assert.equal(visitsOnly.decision, "modify");
  const converted = buildMarketingRecommendation({ campaign, outcomes: [result("visits", 100), result("downloads", 12)], approvedAssetCount: 1 });
  assert.equal(converted.decision, "continue");
  const unapproved = buildMarketingRecommendation({ campaign, outcomes: [result("downloads", 12)], approvedAssetCount: 0 });
  assert.notEqual(unapproved.decision, "continue");
});

test("BMKT-001 persists owner-only records with explicit grants and atomic decisions", () => {
  const migration = readFileSync("supabase/migrations/20260823161535_add_beast_marketing_foundation.sql", "utf8");
  for (const table of ["campaigns", "assets", "outcomes", "recommendations", "decisions"]) {
    assert.match(migration, new RegExp(`beast_marketing_${table}`));
  }
  assert.equal((migration.match(/enable row level security/g) || []).length, 5);
  assert.equal((migration.match(/revoke all on table public\.beast_marketing_/g) || []).length, 5);
  assert.equal((migration.match(/grant select, insert, update, delete on table public\.beast_marketing_/g) || []).length, 5);
  assert.match(migration, /foreign key \(campaign_id, owner_id\)/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /record_beast_marketing_decision/);
  assert.match(migration, /revoke all on function public\.record_beast_marketing_decision/);
  assert.doesNotMatch(migration, /to anon\s+using/);
});

test("BMKT-001 exposes an owner-only workspace and fails closed on external operations", () => {
  const route = readFileSync("src/app/api/admin/beast-marketing/route.ts", "utf8");
  const workspace = readFileSync("src/app/dashboard/admin/marketing/BeastMarketingWorkspace.tsx", "utf8");
  const page = readFileSync("src/app/dashboard/admin/marketing/page.tsx", "utf8");
  assert.match(route, /profile\?\.role === "admin"/);
  assert.match(route, /\.eq\("owner_id", user\.id\)/);
  assert.match(route, /externalPublishing: "disabled"/);
  assert.doesNotMatch(route, /facebook|instagram|linkedin|tiktok|twitter|stripe|resend/i);
  assert.match(workspace, /Nothing was published/);
  assert.match(workspace, /A recorded zero is valid evidence; a missing row remains unavailable/);
  assert.match(workspace, /Continue, modify, or stop/);
  assert.match(page, /BeastAdminShell/);
});
