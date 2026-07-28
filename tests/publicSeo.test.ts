import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import {
  beastOSNonIndexableRoutes,
  beastOSProductionOrigin,
  beastOSPublicRoutes,
} from "../src/lib/publicSeo";

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
});

test("legacy BeastOS paths redirect only to existing SEANGWORLD pages", async () => {
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
  ]);
});
