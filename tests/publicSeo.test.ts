import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
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
    privacy: "https://www.seangworld.com/privacy",
    terms: "https://www.seangworld.com/terms",
  });
});

test("public SEO inventory contains only real indexable application routes", () => {
  assert.deepEqual(beastOSPublicRoutes, ["/", "/release-notes"]);
  assert.deepEqual(
    sitemap().map((entry) => entry.url),
    [
      beastOSProductionOrigin,
      `${beastOSProductionOrigin}/release-notes`,
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
