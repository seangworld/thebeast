import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { defaultBeastHunterCriteria, rankBeastHunterCandidates, scoreBeastHunterCandidate, validateBeastHunterCriteria, type BeastHunterCandidate } from "../src/lib/beastHunter";

const scores = { demand: 90, velocity: 85, competitionGap: 70, commercialIntent: 80, saturation: 25, aiCommoditizationRisk: 20, seangworldFit: 95, timeToMarket: 90, revenuePotential: 75, durability: 65, confidence: 80, actionWindow: 85 };
const candidate: BeastHunterCandidate = { id: "one", title: "Veteran benefit calculator", summary: "A focused calculator", huntType: "Calculator / Tool", market: "Veterans", discoveredAt: "2026-08-21T00:00:00Z", startupCost: 100, buildDays: 7, interaction: "none", automation: "mostly_automated", competition: 35, actionWindowDays: 45, revenueModels: ["Affiliate"], geography: "United States", evidence: [], scores };

test("BeastHunter score remains bounded", () => { assert.ok(scoreBeastHunterCandidate(scores) >= 0); assert.ok(scoreBeastHunterCandidate(scores) <= 100); });
test("strict filters exclude candidates that miss the contract", () => { const results = rankBeastHunterCandidates([candidate], { ...defaultBeastHunterCriteria, query: "calculator", strictness: "strict", maximumBuildDays: 3 }); assert.equal(results.length, 0); });
test("flexible filters retain candidates and explain misses", () => { const results = rankBeastHunterCandidates([candidate], { ...defaultBeastHunterCriteria, query: "calculator", strictness: "flexible", maximumBuildDays: 3 }); assert.equal(results.length, 1); assert.deepEqual(results[0].filterNotes, ["Build time exceeds target"]); });
test("a hunt requires an objective, type, or market", () => { assert.equal(validateBeastHunterCriteria(defaultBeastHunterCriteria).length, 1); });
test("BeastHunter persistence is owner-only and evidence-backed", () => {
  const migration = readFileSync("supabase/migrations/20260821000100_add_beast_hunter_foundation.sql", "utf8");
  assert.match(migration, /beast_hunter_hunts/);
  assert.match(migration, /beast_hunter_opportunities/);
  assert.match(migration, /beast_hunter_evidence/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /role = 'admin'/);
  assert.match(migration, /result_limit in \(10, 25, 50, 100\)/);
});
