import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { retainOrCreateSearchCampaign, selectSearchCampaign } from "../src/lib/searchGrowthCampaignPersistence";
import { CampaignReviewEvidence } from "../src/app/dashboard/admin/marketing/CampaignReviewEvidence";

test("retry retains archived or approved campaigns and never reloads or writes evidence", async () => {
  for (const status of ["archived", "approved", "paused"]) {
    const campaign = { id: "old", status, baseline: "original" };
    const result = await retainOrCreateSearchCampaign({ find: async () => campaign, prepare: async () => { throw new Error("must not prepare"); }, insert: async () => { throw new Error("must not write"); } });
    assert.deepEqual(result, { campaign, reused: true });
  }
});

test("concurrent campaign preparations retain one row and original baseline", async () => {
  let row: { id: string; baseline: string } | null = null;
  let writes = 0;
  const operations = {
    find: async () => row,
    prepare: async () => ({ id: "stable", baseline: "original" }),
    insert: async (draft: { id: string; baseline: string }) => {
      if (row) throw { code: "23505" };
      writes += 1; row = draft; return row;
    },
  };
  const results = await Promise.all([retainOrCreateSearchCampaign(operations), retainOrCreateSearchCampaign(operations)]);
  assert.equal(writes, 1);
  assert.equal(results.filter((result) => result?.reused).length, 1);
  assert.deepEqual(results[0]?.campaign, results[1]?.campaign);
});

test("missing evidence and lookup failures never create a campaign", async () => {
  let writes = 0;
  const operations = { find: async () => null, prepare: async () => null, insert: async () => { writes++; return { id: "unexpected" }; } };
  assert.equal(await retainOrCreateSearchCampaign(operations), null);
  await assert.rejects(retainOrCreateSearchCampaign({ ...operations, find: async () => { throw new Error("lookup unavailable"); } }), /lookup unavailable/);
  assert.equal(writes, 0);
});

test("non-unique write errors and unconfirmed conflicts are reported as failures", async () => {
  for (const code of ["42501", "23505"]) {
    await assert.rejects(retainOrCreateSearchCampaign({ find: async () => null, prepare: async () => ({}), insert: async () => { throw { code }; } }), (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === code));
  }
});

test("review handoff selects its older campaign and refuses another owner's unavailable ID", () => {
  const campaigns = [{ id: "newest" }, { id: "older-archived" }];
  assert.equal(selectSearchCampaign(campaigns, "older-archived", "older-archived"), "older-archived");
  assert.equal(selectSearchCampaign(campaigns, "unavailable", "unavailable"), "");
  assert.equal(selectSearchCampaign(campaigns, "", ""), "newest");
});

test("campaign review renders source baseline, observation, limitations and success measures", () => {
  const html = renderToStaticMarkup(createElement(CampaignReviewEvidence, { campaign: {
    sourceFacts: [{ label: "Current baseline: 12 clicks", url: "https://news.seangworld.com/", observedAt: "2026-09-09T00:00:00Z", limitation: "Sampled rows" }, { label: "Previous baseline unavailable", url: "javascript:alert(1)", observedAt: null, limitation: "Not zero" }],
    successMeasures: ["Qualified actions"], limitations: ["No publication authorized"],
  } }));
  for (const text of ["<details", "Current baseline: 12 clicks", "2026-09-09T00:00:00Z", "Sampled rows", "Previous baseline unavailable", "Not zero", "Qualified actions", "No publication authorized"]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes("javascript:"));
});
