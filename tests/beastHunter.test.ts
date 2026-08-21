import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BEAST_HUNTER_VERSION, defaultBeastHunterCriteria, isBeastHunterTrackingStatus, normalizeBeastHunterCriteria, rankBeastHunterCandidates, scoreBeastHunterCandidate, validateBeastHunterCriteria, type BeastHunterCandidate, type BeastHunterRankedCandidate } from "../src/lib/beastHunter";
import { buildBeastHunterResearchInput, parseBeastHunterResearch } from "../src/lib/beastHunterResearch";
import { buildBeastHunterBuildBrief, parseBeastHunterMonitor, parseBeastHunterValidation } from "../src/lib/beastHunterDecision";

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
test("BeastHunter makes active research and optional criteria unmistakable", () => {
  const workspace = readFileSync("src/app/dashboard/admin/intelligence/hunter/BeastHunterWorkspace.tsx", "utf8");
  assert.match(workspace, /Search in progress/);
  assert.match(workspace, /actively researching current sources/);
  assert.match(workspace, /Elapsed time/);
  assert.match(workspace, /including expected monthly revenue, is optional/);
  assert.match(workspace, /fieldset disabled=\{running\}/);
  assert.match(workspace, /aria-live="polite"/);
});

test("BeastHunter supports saved hunt history and controlled opportunity states", () => {
  assert.equal(isBeastHunterTrackingStatus("watch"), true);
  assert.equal(isBeastHunterTrackingStatus("deleted"), false);
  const workspace = readFileSync("src/app/dashboard/admin/intelligence/hunter/BeastHunterWorkspace.tsx", "utf8");
  const route = readFileSync("src/app/api/admin/beast-hunter/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260821000200_add_beast_hunter_tracking.sql", "utf8");
  assert.match(workspace, /title="Hunt history"/);
  assert.match(workspace, /Opportunity status/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /\.eq\("owner_id", user\.id\)/);
  assert.match(migration, /tracking_status in \('new', 'watch', 'validate', 'build', 'rejected', 'archived'\)/);
  assert.match(migration, /beast_hunter_opportunities_owner_tracking_idx/);
});

test("BeastHunter v1 completes validation monitoring build briefs and management", () => {
  assert.equal(BEAST_HUNTER_VERSION, "1.0.0");
  const cited = { output: [{ content: [{ type: "output_text", annotations: [{ type: "url_citation", url: "https://evidence.test/current", title: "Current evidence" }] }] }] };
  const validation = parseBeastHunterValidation({ ...cited, output_text: JSON.stringify({ verdict: "caution", demandEvidence: "Demand exists but is early.", competitorAnalysis: "Two focused competitors.", realisticMonthlyRevenue: "$0-$2,000 until validated.", startupCost: "$100-$500", buildEstimate: "2-4 weeks", marketingDifficulty: "Moderate", platformDependencies: ["Search"], reasonsToProceed: ["Demand"], reasonsToReject: ["Competition"], nextSteps: ["Interview buyers"], sourceUrls: ["https://evidence.test/current"] }) });
  assert.equal(validation.validation.verdict, "caution");
  const monitor = parseBeastHunterMonitor({ ...cited, output_text: JSON.stringify({ trendStatus: "rising", summary: "Recent demand increased.", totalScore: 82, sourceUrls: ["https://evidence.test/current"] }) });
  assert.equal(monitor.trendStatus, "rising");
  const brief = buildBeastHunterBuildBrief({ ...candidate, score: 80, rank: 1, filterNotes: [], validation: validation.validation } as BeastHunterRankedCandidate);
  assert.match(brief.objective, /Veteran benefit calculator/);
  const workspace = readFileSync("src/app/dashboard/admin/intelligence/hunter/BeastHunterWorkspace.tsx", "utf8");
  const actions = readFileSync("src/app/api/admin/beast-hunter/actions/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260821000300_complete_beast_hunter_v1.sql", "utf8");
  assert.match(workspace, /Validate opportunity/);
  assert.match(workspace, /Create build brief/);
  assert.match(workspace, /Hunt comparison/);
  assert.match(workspace, /Run duplicate anyway/);
  assert.match(actions, /beast_hunter_opportunity_snapshots/);
  assert.match(migration, /validation jsonb/);
  assert.match(migration, /build_brief jsonb/);
});
