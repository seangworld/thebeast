import assert from "node:assert/strict";
import test from "node:test";
import { growthTrackedLink, growthDraftAsset, growthAssessmentId, growthAssessmentBatch, GROWTH_PUBLISHING_BLOCKER } from "../src/lib/marketingGrowthCycle";
import { searchGrowthCampaignId } from "../src/lib/searchGrowthCampaign";

test("tracked links bind campaign identity to public destinations without accepting credential or offsite URLs", () => {
  const page = "https://news.seangworld.com/";
  const id = searchGrowthCampaignId("owner", page, "news");
  const url = new URL(growthTrackedLink(page, id)!);
  assert.equal(url.searchParams.get("utm_id"), id);
  assert.equal(url.searchParams.get("utm_campaign"), id);
  assert.equal(url.searchParams.get("utm_source"), "seangworld");
  assert.equal(url.searchParams.get("utm_medium"), "organic_social");
  for (const bad of ["https://evil.test/", "https://thebeast.seangworld.com/dashboard", "https://news.seangworld.com/?secret=1", "https://me@news.seangworld.com/"]) assert.equal(growthTrackedLink(bad, id), null);
  assert.equal(growthTrackedLink(page, "arbitrary-campaign"), null);
});

test("draft assets remain unapproved with explicit claim verification and stable retry identity", () => {
  const page = "https://thebeast.seangworld.com/";
  const id = searchGrowthCampaignId("owner", page, "help");
  const draft = growthDraftAsset("owner", id, page)!;
  assert.equal(draft.status, "draft");
  assert.match(draft.body, /Add only verified details/);
  assert.equal(draft.id, growthDraftAsset("owner", id, page)!.id);
  assert.notEqual(draft.id, growthDraftAsset("other-owner", id, page)!.id);
  assert.match(GROWTH_PUBLISHING_BLOCKER, /not connected or authorized/);
});

test("assessment deduplication includes owner, campaign and exact reporting period", () => {
  const id = growthAssessmentId("a", "campaign", "2026-08-01", "2026-08-30");
  assert.equal(id, growthAssessmentId("a", "campaign", "2026-08-01", "2026-08-30"));
  assert.notEqual(id, growthAssessmentId("b", "campaign", "2026-08-01", "2026-08-30"));
  assert.notEqual(id, growthAssessmentId("a", "other", "2026-08-01", "2026-08-30"));
  assert.notEqual(id, growthAssessmentId("a", "campaign", "2026-08-02", "2026-08-31"));
});

test("assessment batches are bounded, deterministic and eventually cover every campaign", () => {
  for (const size of [0, 1, 9, 10, 11, 50, 499, 500]) {
    const items = Array.from({ length: size }, (_, index) => index);
    const seen = new Set<number>();
    for (let day = 0; day < Math.max(1, size); day++) {
      const now = new Date(day * 86_400_000);
      const batch = growthAssessmentBatch(items, now);
      assert.equal(batch.length, Math.min(10, size));
      assert.equal(new Set(batch).size, batch.length);
      assert.deepEqual(batch, growthAssessmentBatch(items, now));
      batch.forEach((id) => seen.add(id));
    }
    assert.equal(seen.size, size);
  }
});
