import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { defaultBeastHunterCriteria, normalizeBeastHunterCriteria, rankBeastHunterCandidates, scoreBeastHunterCandidate, validateBeastHunterCriteria, type BeastHunterCandidate } from "../src/lib/beastHunter";
import { buildBeastHunterResearchInput, parseBeastHunterResearch } from "../src/lib/beastHunterResearch";

const scores = { demand: 90, velocity: 85, competitionGap: 70, commercialIntent: 80, saturation: 25, aiCommoditizationRisk: 20, seangworldFit: 95, timeToMarket: 90, revenuePotential: 75, durability: 65, confidence: 80, actionWindow: 85 };
const candidate: BeastHunterCandidate = { id: "one", title: "Veteran benefit calculator", summary: "A focused calculator", huntType: "Calculator / Tool", market: "Veterans", discoveredAt: "2026-08-21T00:00:00Z", startupCost: 100, buildDays: 7, interaction: "none", automation: "mostly_automated", competition: 35, actionWindowDays: 45, revenueModels: ["Affiliate"], geography: "United States", evidence: [], scores };

test("BeastHunter score remains bounded", () => { assert.ok(scoreBeastHunterCandidate(scores) >= 0); assert.ok(scoreBeastHunterCandidate(scores) <= 100); });
test("strict filters exclude candidates that miss the contract", () => { const results = rankBeastHunterCandidates([candidate], { ...defaultBeastHunterCriteria, query: "calculator", strictness: "strict", maximumBuildDays: 3 }); assert.equal(results.length, 0); });
test("flexible filters retain candidates and explain misses", () => { const results = rankBeastHunterCandidates([candidate], { ...defaultBeastHunterCriteria, query: "calculator", strictness: "flexible", maximumBuildDays: 3 }); assert.equal(results.length, 1); assert.deepEqual(results[0].filterNotes, ["Build time exceeds target"]); });
test("a hunt requires an objective, type, or market", () => { assert.equal(validateBeastHunterCriteria(defaultBeastHunterCriteria).length, 1); });
test("BeastHunter normalizes only complete hunt contracts", () => { assert.equal(normalizeBeastHunterCriteria(defaultBeastHunterCriteria), null); assert.equal(normalizeBeastHunterCriteria({ ...defaultBeastHunterCriteria, query: "current AI tools" })?.resultCount, 25); });
test("BeastHunter research rejects uncited opportunities", () => {
  const criteria = { ...defaultBeastHunterCriteria, query: "calculator" };
  const item = { title: "Calculator", summary: "Current opportunity", huntType: "Calculator / Tool", market: "Money", startupCost: 10, buildDays: 4, interaction: "none", automation: "mostly_automated", competition: 30, actionWindowDays: 40, revenueModels: ["Affiliate"], geography: "United States", sourceUrls: ["https://evidence.test/item"], scores };
  assert.equal(parseBeastHunterResearch({ output_text: JSON.stringify({ opportunities: [item] }), output: [] }, criteria).length, 0);
  const cited = parseBeastHunterResearch({ output_text: JSON.stringify({ opportunities: [item] }), output: [{ content: [{ type: "output_text", annotations: [{ type: "url_citation", url: "https://evidence.test/item", title: "Evidence" }] }] }] }, criteria);
  assert.equal(cited.length, 1); assert.equal(cited[0].evidence[0].label, "Evidence"); assert.match(buildBeastHunterResearchInput(criteria), /calculator/);
});
test("BeastHunter persistence is owner-only and evidence-backed", () => {
  const migration = readFileSync("supabase/migrations/20260821000100_add_beast_hunter_foundation.sql", "utf8");
  assert.match(migration, /beast_hunter_hunts/);
  assert.match(migration, /beast_hunter_opportunities/);
  assert.match(migration, /beast_hunter_evidence/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /role = 'admin'/);
  assert.match(migration, /result_limit in \(10, 25, 50, 100\)/);
});
test("BeastHunter controls explain their behavior on hover", () => {
  const workspace = readFileSync("src/app/dashboard/admin/intelligence/hunter/BeastHunterWorkspace.tsx", "utf8");
  assert.match(workspace, /title="Research current sources/);
  assert.match(workspace, /title="Clear every hunt filter/);
  assert.match(workspace, /title=\{`\$\{selected\.includes\(option\)/);
});
