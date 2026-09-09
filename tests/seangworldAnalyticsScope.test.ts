import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getSeangworldAnalyticsScope,
  seangworldAnalyticsScopeIds,
} from "../src/lib/seangworldAnalyticsScope";

test("public product analytics scopes use canonical production hostnames", () => {
  assert.deepEqual(seangworldAnalyticsScopeIds, [
    "seangworld",
    "seangworldnews",
    "thebeast",
    "change-the-world",
  ]);
  assert.equal(
    getSeangworldAnalyticsScope("seangworldnews")?.ga4HostRegex,
    "^news\\.seangworld\\.com$"
  );
  assert.match(
    getSeangworldAnalyticsScope("change-the-world")?.searchConsolePageRegex || "",
    /changetheworld/
  );
  assert.equal(getSeangworldAnalyticsScope("unknown"), null);
});

test("BeastAdmin embeds scoped analytics inside public product sections", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/BeastAdminProductWorkspace.tsx",
    "utf8"
  );
  const news = readFileSync("src/app/dashboard/admin/news/page.tsx", "utf8");
  const route = readFileSync(
    "src/app/api/admin/seangworld-intelligence/route.ts",
    "utf8"
  );
  assert.match(workspace, /product\.analyticsScope/);
  assert.match(workspace, /SeangworldIntelligenceWorkspace/);
  assert.match(news, /product="seangworldnews"/);
  assert.match(route, /supported product analytics scope/);
  assert.match(route, /provider\.id !== "first_party"/);
});
