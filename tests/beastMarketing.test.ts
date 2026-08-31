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
import { allowedVideoTransitions, defaultVideoSeriesSettings, evaluateVideoReadiness, externalVideoAuthorities, videoJobStates, VIDEO_ENGINE_VERSION } from "../src/lib/beastMarketingVideo";
import { buildGroundedScript, buildYouTubeMetadata, scoreVideoOpportunity, VIDEO_CONTENT_ENGINE_VERSION } from "../src/lib/beastMarketingContent";

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

test("BeastMarketing v0.4 preserves bounded campaign, asset, and outcome states", () => {
  assert.equal(BEAST_MARKETING_VERSION, "0.4.0");
  assert.deepEqual(marketingCampaignStatuses, ["draft", "review", "approved", "scheduled", "active", "paused", "completed", "archived"]);
  assert.equal(isMarketingCampaignStatus("approved"), true);
  assert.equal(isMarketingCampaignStatus("published"), false);
  assert.equal(isMarketingAssetStatus("approved"), true);
  assert.equal(isMarketingAssetStatus("posted"), false);
  assert.equal(isMarketingOutcomeMetric("retained_users"), true);
  assert.equal(isMarketingOutcomeMetric("likes"), false);
});

test("BMKT-003 defines configurable video controls and deterministic lifecycle", () => {
  assert.equal(VIDEO_ENGINE_VERSION, "0.4.0");
  assert.equal(defaultVideoSeriesSettings.aspectRatio, "9:16");
  assert.equal(defaultVideoSeriesSettings.publishingEnabled, false);
  assert.equal(defaultVideoSeriesSettings.approvalMode, "owner_approval");
  assert.deepEqual(allowedVideoTransitions.generating, ["ready", "failed"]);
  assert.equal(videoJobStates.includes("measuring"), true);
  assert.deepEqual(externalVideoAuthorities, { providersConfigured: false, youtubeAuthorized: false, externalPublishingEnabled: false, automaticPublishingEnabled: false });
});

test("BMKT-004 ranks the intersection of evidence, capability truth, and funnel value", () => {
  const result = scoreVideoOpportunity({ title: "AI Tutor homework review", category: "education", capabilityMatch: 95, funnelValue: 90, historicalPerformance: null, audienceInterest: 80, trendOpportunity: null, evidence: [{ source: "search_console", label: "GSC page/query sample", url: null, observedAt: "2026-08-31T00:00:00Z", sampleSize: 120, value: 80, limitation: "Search Console may omit queries." }] }, { ...defaultVideoSeriesSettings, minimumOpportunityConfidence: 40 });
  assert.equal(VIDEO_CONTENT_ENGINE_VERSION, "0.4.0");
  assert.equal(result.selectable, true);
  assert.equal(result.evidenceStatus, "partial");
  assert.match(result.rationale.join(" "), /provenance/i);
});

test("BMKT-004 does not invent trend evidence or pad an under-length script", () => {
  const opportunity = scoreVideoOpportunity({ title: "Generic AI rumor", category: "AI", capabilityMatch: 70, funnelValue: 30, historicalPerformance: null, audienceInterest: null, trendOpportunity: null, evidence: [{ source: "owner", label: "Owner idea", url: null, observedAt: null, sampleSize: null, value: null, limitation: null }] }, defaultVideoSeriesSettings);
  assert.equal(opportunity.evidenceStatus, "owner_only");
  assert.match(opportunity.rationale.join(" "), /unavailable/i);
  const script = buildGroundedScript({ topic: "AI Tutor", facts: [{ statement: "AI Tutor provides age-appropriate contextual tutorials.", sourceLabel: "Product Truth", sourceUrl: null, verified: true }], destinationLabel: "SEANGWORLD", destinationUrl: "https://seangworld.com", settings: defaultVideoSeriesSettings });
  assert.equal(script.generationReady, false);
  assert.match(script.warnings.join(" "), /do not pad/i);
});

test("BMKT-004 produces relevant natural metadata with measurable attribution", () => {
  const metadata = buildYouTubeMetadata({ topic: "How AI Tutor Reviews Homework", summary: "See how guided review identifies the first incorrect step.", keywords: ["AI tutor", "homework review", "AI tutor", "x".repeat(60)], destinationUrl: "https://seangworld.com/ai-specialists", campaignId: "bmkt-ai-tutor-001" });
  assert.deepEqual(metadata.tags, ["ai tutor", "homework review"]);
  assert.match(metadata.destinationUrl, /utm_source=youtube/);
  assert.equal(metadata.warnings.length, 0);
});

test("BMKT-004 keeps evidence-backed intelligence and scripting owner-scoped", () => {
  const route = readFileSync("src/app/api/admin/beast-marketing/video/route.ts", "utf8");
  const panel = readFileSync("src/app/dashboard/admin/marketing/VideoGrowthEnginePanel.tsx", "utf8");
  assert.match(route, /kind === "search_opportunity_job"/);
  assert.match(route, /kind === "evaluate_job"/);
  assert.match(route, /kind === "script_job"/);
  assert.match(route, /\.eq\("owner_id", user\.id\)/);
  assert.match(route, /evidenceStatus/);
  assert.match(route, /Search Console query samples can be partial/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.doesNotMatch(route, /fetch\(["']https:\/\//);
  assert.match(panel, /Refresh content opportunities/);
  assert.match(panel, /No provider is contacted until the owner requests a refresh/);
  assert.match(panel, /No synthetic opportunities were created/);
  assert.match(panel, /Evaluate Product Truth and funnel fit/);
  assert.match(panel, /Build grounded script and YouTube metadata/);
  assert.doesNotMatch(panel, /useEffect\(\(\) => \{ void loadIntelligence/);
});

test("BMKT-003 readiness blocks weak or unsafe videos instead of maintaining frequency", () => {
  const result = evaluateVideoReadiness({ factualClaimsVerified: true, productTruthVerified: true, misleadingClaimsAbsent: true, safeContent: true, provenanceComplete: false, destinationValid: true, duplicateRisk: 0.1, mediaIntegrity: true, metadataQuality: 92, attributionValid: true, runtimeSeconds: 60, settings: defaultVideoSeriesSettings });
  assert.equal(result.ready, false);
  assert.match(result.blockers.join(" "), /provenance/i);
});

test("BMKT-003 persists owner-only series, presenter profiles, and retry-safe jobs", () => {
  const migration = readFileSync("supabase/migrations/20260831150054_add_beast_marketing_video_control_plane.sql", "utf8");
  for (const table of ["video_series", "video_controls", "presenter_profiles", "video_jobs"]) assert.match(migration, new RegExp(`beast_marketing_${table}`));
  assert.equal((migration.match(/enable row level security/g) || []).length, 4);
  assert.match(migration, /unique \(owner_id, idempotency_key\)/);
  assert.match(migration, /future_owner_likeness/);
  assert.match(migration, /pause_all_publishing boolean not null default true/);
  assert.doesNotMatch(migration, /to anon\s+using|http_post|net\.http|vault\./i);
});

test("BMKT-003 exposes owner controls while every external video action fails closed", () => {
  const route = readFileSync("src/app/api/admin/beast-marketing/video/route.ts", "utf8");
  const panel = readFileSync("src/app/dashboard/admin/marketing/VideoGrowthEnginePanel.tsx", "utf8");
  const workspace = readFileSync("src/app/dashboard/admin/marketing/BeastMarketingWorkspace.tsx", "utf8");
  assert.match(route, /profile\?\.role === "admin"/);
  assert.match(route, /YouTube authorization and external publishing authority are required/);
  assert.match(route, /external_publishing_authorized: false/);
  assert.doesNotMatch(route, /fetch\(["']https:\/\//);
  for (const control of ["PAUSE ALL PUBLISHING", "Approval mode", "Minimum runtime", "Maximum per week", "Allowed topics", "Optimization", "AI Sean · locked", "Publish Now · locked"]) assert.match(panel, new RegExp(control));
  assert.match(panel, /Idea → learn, with guarded transitions/);
  assert.match(workspace, /<VideoGrowthEnginePanel/);
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
