import assert from "node:assert/strict";
import test from "node:test";
import {
  KDP_FACTORY_VERSION,
  buildKdpPublicationBrief,
  canTransitionKdpPublication,
  evaluateKdpPackageReadiness,
  recommendKdpListPrice,
  scoreKdpOpportunity,
} from "../src/lib/kdpPublishingFactory";

test("KDP factory establishes a gated durable lifecycle", () => {
  assert.equal(KDP_FACTORY_VERSION, "0.2.0");
  assert.equal(canTransitionKdpPublication("idea", "scored"), true);
  assert.equal(canTransitionKdpPublication("scored", "brief_ready"), true);
  assert.equal(canTransitionKdpPublication("scored", "brief_approved"), false);
  assert.equal(canTransitionKdpPublication("idea", "published"), false);
  assert.equal(canTransitionKdpPublication("package_ready", "submitted"), false);
  assert.equal(canTransitionKdpPublication("owner_approved", "submitted"), true);
});

test("KDP factory prepares a reviewable brief before owner approval", () => {
  const brief = buildKdpPublicationBrief({ title: "AI-Proof Your Career", audience: "working adults", topic: "build a resilient career plan", formats: ["ebook", "paperback"] });
  assert.match(brief.positioning, /working adults/);
  assert.match(brief.readerOutcome, /resilient career plan/);
  assert.equal(brief.chapters.length, 5);
  assert.match(brief.acceptanceCriteria.join(" "), /ebook, paperback/);
  assert.match(brief.evidencePlan.join(" "), /primary sources/i);
});

test("KDP opportunity ranking favors buyer value, differentiation and reusable series", () => {
  const strong = scoreKdpOpportunity({ buyerIntent: 90, differentiation: 85, evidenceReadiness: 90, seriesPotential: 95, timeToMarketDays: 7, estimatedCashCost: 10 });
  const weak = scoreKdpOpportunity({ buyerIntent: 20, differentiation: 10, evidenceReadiness: 30, seriesPotential: 10, timeToMarketDays: 30, estimatedCashCost: 100 });
  assert.equal(strong.recommendation, "advance");
  assert.equal(weak.recommendation, "hold");
  assert.match(strong.limitations.join(" "), /does not predict sales/i);
});

test("KDP pricing keeps the dollar-store strategy exclusive to eligible ebooks", () => {
  assert.deepEqual(recommendKdpListPrice({ format: "ebook", marketplaceCurrency: "USD", marketplaceMinimum: 0.99 }), {
    listPrice: 0.99,
    strategy: "lowest_eligible_ebook_price",
    royaltyPlan: "35_percent_or_current_eligible_plan",
    requiresCurrentRuleCheck: true,
  });
  assert.deepEqual(recommendKdpListPrice({ format: "paperback", marketplaceCurrency: "USD", marketplaceMinimum: 6.25, printingCost: 4.75, targetPrintMargin: 3 }), {
    listPrice: 7.75,
    strategy: "print_minimum_plus_margin",
    royaltyPlan: "current_print_royalty_terms",
    requiresCurrentRuleCheck: true,
  });
  assert.equal(recommendKdpListPrice({ format: "hardcover", marketplaceCurrency: "USD", marketplaceMinimum: 9.99 }), null);
});

test("KDP packages fail closed until quality, rights and disclosure evidence is complete", () => {
  const base = { manuscript: true, interior: true, cover: true, metadata: true, pricing: true, originalityReview: true, rightsReview: true, factualReview: true, aiDisclosurePrepared: true };
  const ready = evaluateKdpPackageReadiness(base);
  assert.equal(ready.readyForOwnerApproval, true);
  assert.equal(ready.submissionAuthorized, false);
  assert.match(ready.ownerAction, /explicitly approve or reject/i);
  const blocked = evaluateKdpPackageReadiness({ ...base, rightsReview: false, aiDisclosurePrepared: false });
  assert.deepEqual(blocked.missing, ["rightsReview", "aiDisclosurePrepared"]);
  assert.equal(blocked.readyForOwnerApproval, false);
});
