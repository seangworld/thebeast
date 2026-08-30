import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";
import { GET as getAdsTxt } from "../src/app/ads.txt/route";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import {
  seangworldAdSensePublisherId,
  seangworldAdsTxtBody,
  seangworldAdsTxtEntry,
} from "../src/lib/adsense";
import {
  beastOSFooterLinks,
  beastOSNonIndexableRoutes,
  beastOSProductionOrigin,
  beastOSPublicRoutes,
  seangworldProductionOrigin,
} from "../src/lib/publicSeo";

test("public footer links use canonical production destinations", () => {
  assert.equal(seangworldProductionOrigin, "https://www.seangworld.com");
  assert.deepEqual(beastOSFooterLinks, {
    mainSite: "https://www.seangworld.com",
    developmentAi: "https://thebeast.seangworld.com/ai-development-staff",
    memberAi: "https://thebeast.seangworld.com/ai-specialists",
    privacy: "https://www.seangworld.com/privacy",
    terms: "https://www.seangworld.com/terms",
  });
});

test("public SEO inventory contains only real indexable application routes", () => {
  assert.deepEqual(beastOSPublicRoutes, ["/", "/release-notes", "/ai-development-staff", "/ai-development-staff/methodology", "/ai-development-staff/orchestrator-3", "/ai-development-staff/observer-agent", "/ai-development-staff/proposal-agent", "/ai-development-staff/developer-agent", "/ai-development-staff/reviewer-agent", "/ai-development-staff/outcome-agent", "/ai-specialists", "/ai-specialists/methodology", "/ai-specialists/money-coach", "/ai-specialists/guidance-counselor", "/ai-specialists/tutor", "/ai-specialists/health-advisor"]);
  assert.deepEqual(
    sitemap().map((entry) => entry.url),
    [
      beastOSProductionOrigin,
      `${beastOSProductionOrigin}/release-notes`,
      `${beastOSProductionOrigin}/ai-development-staff`,
      `${beastOSProductionOrigin}/ai-development-staff/methodology`,
      `${beastOSProductionOrigin}/ai-development-staff/orchestrator-3`,
      `${beastOSProductionOrigin}/ai-development-staff/observer-agent`,
      `${beastOSProductionOrigin}/ai-development-staff/proposal-agent`,
      `${beastOSProductionOrigin}/ai-development-staff/developer-agent`,
      `${beastOSProductionOrigin}/ai-development-staff/reviewer-agent`,
      `${beastOSProductionOrigin}/ai-development-staff/outcome-agent`,
      `${beastOSProductionOrigin}/ai-specialists`,
      `${beastOSProductionOrigin}/ai-specialists/methodology`,
      `${beastOSProductionOrigin}/ai-specialists/money-coach`,
      `${beastOSProductionOrigin}/ai-specialists/guidance-counselor`,
      `${beastOSProductionOrigin}/ai-specialists/tutor`,
      `${beastOSProductionOrigin}/ai-specialists/health-advisor`,
    ]
  );
});

test("robots advertises the production sitemap and excludes private routes", () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
  const disallow = rules.flatMap((rule) =>
    Array.isArray(rule.disallow)
      ? rule.disallow
      : rule.disallow
        ? [rule.disallow]
        : []
  );

  assert.equal(result.host, beastOSProductionOrigin);
  assert.equal(result.sitemap, `${beastOSProductionOrigin}/sitemap.xml`);
  assert.deepEqual(disallow, beastOSNonIndexableRoutes);
  assert.ok(disallow.includes("/dashboard"));
  assert.ok(!disallow.includes("/dashboard/"));
});

test("SEANGWORLD AdSense authorization is served as one canonical plain-text entry", async () => {
  const response = getAdsTxt();
  const body = await response.text();

  assert.equal(seangworldAdSensePublisherId, "pub-9840739735056649");
  assert.equal(
    seangworldAdsTxtEntry,
    "google.com, pub-9840739735056649, DIRECT, f08c47fec0942fa0"
  );
  assert.equal(seangworldAdsTxtBody, `${seangworldAdsTxtEntry}\n`);
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "text/plain; charset=utf-8"
  );
  assert.equal(body, seangworldAdsTxtBody);
  assert.deepEqual(
    body.trimEnd().split("\n"),
    [seangworldAdsTxtEntry]
  );
});

test("legacy BeastOS paths preserve external and BeastAdmin compatibility", async () => {
  const redirects = await nextConfig.redirects?.();

  assert.deepEqual(redirects, [
    {
      source: "/privacy.html",
      destination: "https://www.seangworld.com/privacy",
      permanent: true,
    },
    {
      source: "/privacy.php",
      destination: "https://www.seangworld.com/privacy",
      permanent: true,
    },
    {
      source: "/about.php",
      destination: "https://www.seangworld.com/about",
      permanent: true,
    },
    {
      source: "/dashboard/admin/health",
      destination: "/dashboard/admin/platform-health",
      permanent: true,
    },
    {
      source: "/dashboard/admin/prompts",
      destination: "/dashboard/admin/prompt-library",
      permanent: true,
    },
  ]);
});
