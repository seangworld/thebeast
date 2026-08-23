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
import {
  buildMarketingDistributionPackage,
  fingerprintMarketingAdRevision,
  marketingPlacementProfiles,
  normalizeMarketingAdRevision,
  validateMarketingAdRevision,
  type MarketingAdVariant,
  type MarketingDistributionPlan,
} from "../src/lib/beastMarketingPreview";

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

test("BeastMarketing v0.2 preserves bounded campaign, asset, and outcome states", () => {
  assert.equal(BEAST_MARKETING_VERSION, "0.2.0");
  assert.deepEqual(marketingCampaignStatuses, ["draft", "review", "approved", "scheduled", "active", "paused", "completed", "archived"]);
  assert.equal(isMarketingCampaignStatus("approved"), true);
  assert.equal(isMarketingCampaignStatus("published"), false);
  assert.equal(isMarketingAssetStatus("approved"), true);
  assert.equal(isMarketingAssetStatus("posted"), false);
  assert.equal(isMarketingOutcomeMetric("retained_users"), true);
  assert.equal(isMarketingOutcomeMetric("likes"), false);
});

const adRevision = normalizeMarketingAdRevision({
  campaignId: campaign.id,
  placementProfileId: "meta_feed",
  headline: "A practical AI guide",
  primaryText: "Learn ten practical things about AI in 2026.",
  description: "Free public guide",
  callToAction: "Download",
  destinationUrl: "https://seangworld.com/ai-guide",
  mediaUrl: "https://seangworld.com/guide.jpg",
  mediaType: "image",
  mediaAltText: "The free AI guide cover",
  sourceFacts: campaign.sourceFacts,
  limitations: campaign.limitations,
});

test("BMKT-002 defines recognizable provider-neutral placement previews", () => {
  assert.equal(marketingPlacementProfiles.length, 6);
  assert.deepEqual(marketingPlacementProfiles.map((profile) => profile.id), ["meta_feed", "instagram_story_reel", "x_post", "linkedin_feed", "google_search", "general_display"]);
  assert.equal(adRevision?.placementProfileId, "meta_feed");
  assert.equal(validateMarketingAdRevision(adRevision!).errors.length, 0);
  assert.match(validateMarketingAdRevision(adRevision!).warnings.join(" "), /does not guarantee provider acceptance/);
});

test("BMKT-002 rejects invalid destinations and planning-limit violations", () => {
  assert.equal(normalizeMarketingAdRevision({ ...adRevision, destinationUrl: "http://unsafe.test" }), null);
  const tooLong = { ...adRevision!, headline: "x".repeat(41) };
  assert.match(validateMarketingAdRevision(tooLong).errors.join(" "), /40-character/);
  const searchWithMedia = { ...adRevision!, placementProfileId: "google_search" as const };
  assert.match(validateMarketingAdRevision(searchWithMedia).errors.join(" "), /does not use media/);
});

test("BMKT-002 fingerprints the exact creative revision deterministically", () => {
  assert.equal(fingerprintMarketingAdRevision(adRevision!), fingerprintMarketingAdRevision({ ...adRevision! }));
  assert.notEqual(fingerprintMarketingAdRevision(adRevision!), fingerprintMarketingAdRevision({ ...adRevision!, callToAction: "Read now" }));
  assert.match(fingerprintMarketingAdRevision(adRevision!), /^fnv1a32:[0-9a-f]{8}$/);
});

test("BMKT-002 exports only a matching exact approved revision", () => {
  const hash = fingerprintMarketingAdRevision(adRevision!);
  const variant: MarketingAdVariant = { ...adRevision!, id: "variant-1", platform: "Meta", placement: "Feed", revision: 2, revisionHash: hash, status: "approved", approvedRevision: 2, approvedRevisionHash: hash, createdAt: campaign.createdAt, updatedAt: campaign.updatedAt };
  const plan: MarketingDistributionPlan = { id: "plan-1", campaignId: campaign.id, variantId: variant.id, variantRevision: 2, variantRevisionHash: hash, platform: variant.platform, placement: variant.placement, plannedFor: "2026-08-24T15:00:00Z", timezone: "America/New_York", status: "ready", ownerNotes: "Review before manual provider entry", exportedAt: null, createdAt: campaign.createdAt, updatedAt: campaign.updatedAt };
  const handoff = buildMarketingDistributionPackage({ campaign, variant, plan });
  assert.equal(handoff?.externalActionPerformed, false);
  assert.equal(handoff?.providerState.published, false);
  assert.equal(buildMarketingDistributionPackage({ campaign, variant: { ...variant, revision: 3 }, plan }), null);
  assert.equal(buildMarketingDistributionPackage({ campaign, variant, plan: { ...plan, status: "cancelled" } }), null);
});

test("BMKT-002 migration makes edits invalidate approvals and keeps distribution internal", () => {
  const migration = readFileSync("supabase/migrations/20260823185623_add_beast_marketing_preview_distribution.sql", "utf8");
  for (const table of ["ad_variants", "ad_decisions", "distribution_plans"]) assert.match(migration, new RegExp(`beast_marketing_${table}`));
  assert.equal((migration.match(/enable row level security/g) || []).length, 3);
  assert.equal((migration.match(/grant select, insert, update, delete on table public\.beast_marketing_/g) || []).length, 3);
  assert.equal((migration.match(/revoke all on table public\.beast_marketing_.+ from public, anon, authenticated/g) || []).length, 3);
  assert.match(migration, /new\.revision = old\.revision \+ 1/);
  assert.match(migration, /new\.approved_revision = null/);
  assert.match(migration, /record_beast_marketing_ad_decision/);
  assert.match(migration, /security invoker/g);
  assert.doesNotMatch(migration, /to anon\s+using|http_post|net\.http|vault\./i);
});

test("BMKT-002 exposes exact visual previews while provider actions stay disabled", () => {
  const route = readFileSync("src/app/api/admin/beast-marketing/route.ts", "utf8");
  const workspace = readFileSync("src/app/dashboard/admin/marketing/BeastMarketingWorkspace.tsx", "utf8");
  assert.match(workspace, /See the exact ad before approval/);
  assert.match(workspace, /Mobile/);
  assert.match(workspace, /Desktop/);
  assert.match(workspace, /Provider-neutral handoff/);
  assert.match(route, /externalPublishing: "disabled"/);
  assert.match(route, /externalScheduling: "disabled"/);
  assert.doesNotMatch(route, /fetch\(["']https:\/\//);
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
