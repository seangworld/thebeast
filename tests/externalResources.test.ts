import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createExternalResourceEvent,
  createExternalResourcePlatform,
  externalResourceLinkProps,
  initialExternalResourceModules,
  initialExternalResourceProviders,
  requestExternalResourceRecommendations,
  type ExternalResourceProvider,
} from "../src/lib/platform/externalResources";

test("G2-PLT-EXT-001 seeds one reusable provider registry for all modules", () => {
  const registry = createExternalResourcePlatform();
  assert.equal(registry.list().length, 12);
  assert.deepEqual(
    ["youtube", "khan-academy", "coursera", "microsoft-learn", "linkedin-learning", "edx", "oreilly", "udemy", "certification-providers", "books"].map((id) => registry.require(id).name),
    ["YouTube", "Khan Academy", "Coursera", "Microsoft Learn", "LinkedIn Learning", "edX", "O'Reilly", "Udemy", "Certification providers", "Books"],
  );
  assert.ok(registry.list().every((provider) => provider.capabilities.futureApi === false && provider.capabilities.futureRatings === false));
  assert.deepEqual(initialExternalResourceModules, ["beasteducation", "beastmoney", "beasthealth", "seangworld"]);
});

test("provider registry accepts unlimited future providers without module changes", () => {
  const registry = createExternalResourcePlatform([]);
  const future: ExternalResourceProvider = {
    id: "future-provider",
    name: "Future Provider",
    categories: ["general"],
    description: "A future resource source.",
    website: "https://example.com/",
    normalUrl: "https://example.com/resources",
    icon: "F",
    pricingModel: "varies",
    isFree: false,
    status: "active",
    affiliate: { supported: false },
    capabilities: { futureApi: true, futureRatings: true },
  };
  registry.register(future);
  assert.equal(registry.require("future-provider").name, "Future Provider");
});

test("module agents request recommendations while BeastOS owns provider and link logic", () => {
  const recommendations = requestExternalResourceRecommendations({
    moduleId: "beastmoney",
    agentId: "beastmoney.money-coach",
    candidates: [{
      id: "budget-basics",
      providerId: "youtube",
      title: "Budgeting fundamentals",
      whyRecommended: "A short overview can clarify the next planning step.",
      query: "budgeting fundamentals",
      estimatedTime: "20 minutes",
      difficulty: "beginner",
      cost: "Free",
    }],
  });
  assert.equal(recommendations[0].moduleId, "beastmoney");
  assert.equal(recommendations[0].providerName, "YouTube");
  assert.match(recommendations[0].externalUrl, /budgeting%20fundamentals/);
  assert.equal(recommendations[0].affiliateApplied, false);
});

test("affiliate resolution is optional disclosed and happens after agent selection", () => {
  const affiliateProvider: ExternalResourceProvider = {
    ...initialExternalResourceProviders[0],
    id: "affiliate-example",
    name: "Affiliate Example",
    normalUrl: "https://example.com/normal",
    website: "https://example.com/",
    resourceUrlTemplate: undefined,
    affiliate: {
      supported: true,
      affiliateId: "beast-example",
      referralUrl: "https://example.com/referral",
      campaignParameters: { campaign: "guidance" },
    },
  };
  const registry = createExternalResourcePlatform([affiliateProvider]);
  const [normal] = requestExternalResourceRecommendations({ moduleId: "beasthealth", agentId: "beasthealth.health-advisor", candidates: [{ id: "one", providerId: affiliateProvider.id, title: "Resource", whyRecommended: "User benefit" }] }, registry);
  const [referred] = requestExternalResourceRecommendations({ moduleId: "beasthealth", agentId: "beasthealth.health-advisor", useAffiliateLinks: true, candidates: [{ id: "one", providerId: affiliateProvider.id, title: "Resource", whyRecommended: "User benefit" }] }, registry);
  assert.equal(normal.externalUrl, "https://example.com/normal");
  assert.equal(normal.disclosure, undefined);
  assert.match(referred.externalUrl, /campaign=guidance/);
  assert.match(referred.disclosure || "", /may earn a commission/i);
  assert.equal(referred.whyRecommended, normal.whyRecommended);
});

test("resource events are privacy-minimal and external links preserve the Beast experience", () => {
  const recommendation = requestExternalResourceRecommendations({ moduleId: "seangworld", agentId: "seangworld.guide", candidates: [{ id: "resource-1", providerId: "books", title: "Book", whyRecommended: "Relevant" }] })[0];
  const event = createExternalResourceEvent("resource-opened", recommendation, "2026-07-21T12:00:00.000Z");
  assert.deepEqual(Object.keys(event.payload).sort(), ["moduleId", "providerId", "recommendationId"]);
  assert.equal(externalResourceLinkProps.target, "_blank");
  assert.match(externalResourceLinkProps.rel, /noopener/);
  const card = readFileSync("src/app/components/design/ExternalResourceCard.tsx", "utf8");
  assert.match(card, /externalResourceLinkProps/);
  assert.match(card, /Open resource/);
  const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
  assert.equal((rootLayout.match(/href=\"https:\/\//g) || []).length, (rootLayout.match(/\.\.\.externalResourceLinkProps/g) || []).length);
});
