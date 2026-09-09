import assert from "node:assert/strict";
import test from "node:test";
import { assessOperatingOutcomes, buildOperatingSnapshot, unpackObservationEvidence, type OperatingSnapshot, type OutcomeHistoryRow } from "../src/lib/standingObservationOutcomes";
import type { BeastAdminCanonicalReadModel } from "../src/lib/beastAdminCanonicalProjection";
import { beastAdminRepositoryCatalog } from "../src/lib/beastAdminRepositoryReleaseIntelligence";

const canonical = { provider: { status: "connected" }, attention: [], roadmap: [], proposals: [] } as unknown as BeastAdminCanonicalReadModel;
function snapshot(date: string, attention = false): OperatingSnapshot {
  const now = new Date(`${date}T10:00:00Z`);
  const repos = beastAdminRepositoryCatalog.map((c) => ({ repository: c.repository, state: "connected" as const, headCommit: "a", defaultBranch: "main", headCommittedAt: null, observedAt: now.toISOString(), detail: "" }));
  const deployments = beastAdminRepositoryCatalog.filter((c) => c.deployed).map((c) => ({ repository: c.repository, state: "connected" as const, servedCommit: "a", branch: "main", deployedAt: null, observedAt: now.toISOString(), deploymentId: "one", deploymentUrl: null, detail: "", environment: "production" as const }));
  return buildOperatingSnapshot({ ...canonical, attention: attention ? [{ id: "blocked", kind: "blocker", detail: "Delivery is blocked", source: "beastfusion" }] : [] }, repos, deployments, now);
}
const row = (s: OperatingSnapshot): OutcomeHistoryRow => ({ status: "findings", started_at: s.observedAt, completed_at: new Date(Date.parse(s.observedAt) + 1000).toISOString(), findings: { version: 1, findings: [], snapshot: s } });
const find = (report: ReturnType<typeof assessOperatingOutcomes>) => report.outcomes.find((c) => c.id === "canonical:blocked")!;

test("tracks individual recurrence and automatically prioritizes persistent blockers", () => {
  const result = assessOperatingOutcomes(snapshot("2026-09-09", true), [row(snapshot("2026-09-08", true)), row(snapshot("2026-09-07", true))]);
  assert.equal(find(result).outcome, "persisting"); assert.equal(find(result).observedDays, 3);
  assert.equal(result.outcomes[0].id, "canonical:blocked");
  assert.equal(result.executable, false); assert.equal(result.causalClaim, false);
});
test("three consecutive clear days resolve a signal but never claim intervention effectiveness", () => {
  const report = assessOperatingOutcomes(snapshot("2026-09-09"), [row(snapshot("2026-09-08")), row(snapshot("2026-09-07")), row(snapshot("2026-09-06", true))]);
  assert.equal(find(report).outcome, "resolved"); assert.match(find(report).detail, /no longer observed/);
  assert.equal(report.causalClaim, false);
});
test("missing and failed daily evidence cannot establish sustained resolution", () => {
  for (const missing of [[], [{ ...row(snapshot("2026-09-08")), status: "failed" }], [{ ...row(snapshot("2026-09-08")), completed_at: null }]]) {
    const report = assessOperatingOutcomes(snapshot("2026-09-09"), [...missing, row(snapshot("2026-09-07")), row(snapshot("2026-09-06", true))]);
    assert.equal(find(report).outcome, "recovering");
    assert.ok(report.windows[0].unknownDays > 0);
  }
});
test("return after a clear day is flagged without creating a new condition identity", () => {
  const report = assessOperatingOutcomes(snapshot("2026-09-09", true), [row(snapshot("2026-09-08")), row(snapshot("2026-09-07", true))]);
  assert.equal(find(report).outcome, "returned");
  assert.match(find(report).recommendation, /earlier finding/);
});
test("later failed attempt replaces earlier same-day success for learning", () => {
  const failed = { ...row(snapshot("2026-09-08")), status: "failed", started_at: "2026-09-08T12:00:00Z" };
  const report = assessOperatingOutcomes(snapshot("2026-09-09"), [row(snapshot("2026-09-08")), failed, row(snapshot("2026-09-07")), row(snapshot("2026-09-06", true))]);
  assert.equal(find(report).outcome, "recovering");
  assert.equal(report.windows[0].observedDays, 3);
});
test("legacy arrays, corrupt envelopes and mismatched timestamps cannot become outcome evidence", () => {
  for (const bad of [[], {}, { version: 2, findings: [] }, { version: 1, findings: [], snapshot: { ...snapshot("2026-09-08"), conditions: [] } }]) {
    const report = assessOperatingOutcomes(snapshot("2026-09-09"), [{ ...row(snapshot("2026-09-08")), findings: bad }]);
    assert.equal(report.windows[0].observedDays, 1);
  }
  const report = assessOperatingOutcomes(snapshot("2026-09-09"), [{ ...row(snapshot("2026-09-08")), started_at: "2026-09-08T09:00:00Z" }]);
  assert.equal(report.windows[0].observedDays, 1);
  assert.deepEqual(unpackObservationEvidence([{ source: "legacy" }]).findings, [{ source: "legacy" }]);
});
test("missing catalog products and missing repository head cannot produce healthy deployment", () => {
  const empty = buildOperatingSnapshot(canonical, [], [], new Date("2026-09-09T10:00:00Z"));
  assert.equal(empty.conditions.filter((c) => c.state === "unknown").length, 7);
  const report = assessOperatingOutcomes(empty, []);
  assert.equal(report.windows[0].clearDays, 0); assert.equal(report.windows[0].unknownDays, 7);
});
test("stale canonical projection does not erase an earlier blocker", () => {
  const stale = buildOperatingSnapshot({ ...canonical, provider: { ...canonical.provider, status: "stale" } }, [], [], new Date("2026-09-09T10:00:00Z"));
  const report = assessOperatingOutcomes(stale, [row(snapshot("2026-09-08", true))]);
  assert.equal(find(report).outcome, "unknown");
});
test("old or future observations and repeated same-day runs do not inflate calendar windows", () => {
  const report = assessOperatingOutcomes(snapshot("2026-09-09"), [row(snapshot("2026-09-10")), row(snapshot("2026-08-01")), row(snapshot("2026-09-09")), row(snapshot("2026-09-08")), row(snapshot("2026-09-08"))]);
  assert.deepEqual(report.windows[0], { days: 7, observedDays: 2, clearDays: 2, attentionDays: 0, unknownDays: 5 });
});
test("owner watch and approval decisions remain follow-ups, not execution or success", () => {
  const proposal = { id: "p", product: "Beast", title: "Review delivery", status: "watching" };
  const s = buildOperatingSnapshot({ ...canonical, proposals: [proposal] as BeastAdminCanonicalReadModel["proposals"] }, [], [], new Date("2026-09-09T10:00:00Z"));
  assert.match(s.followUps[0].nextStep, /watch decision/);
  assert.match(s.followUps[0].nextStep, /do not reopen or execute/);
});

test("malformed snapshot IDs cannot relabel product or source or fabricate clear coverage", () => {
  for (const patch of [{ source: "vercel_deployment_evidence" }, { product: "Unknown" }, { state: "unknown" }]) {
    const s = snapshot("2026-09-08");
    s.conditions[0] = { ...s.conditions[0], ...patch } as typeof s.conditions[number];
    assert.equal(unpackObservationEvidence({ version: 1, findings: [], snapshot: s }).snapshot, null);
  }
});
test("positional canonical warning IDs do not mix different issues when warnings move", () => {
  const now = new Date("2026-09-09T10:00:00Z");
  const make = (items: string[]) => buildOperatingSnapshot({ ...canonical, attention: items.map((detail, i) => ({ id: `validation-warning:${i}`, detail, kind: "missing_evidence", source: "beastfusion" })) }, [], [], now);
  const before = make(["Missing A", "Missing B"]); const after = make(["Missing B"]);
  assert.equal(before.conditions.find((c) => c.detail === "Missing B")!.id, after.conditions.find((c) => c.detail === "Missing B")!.id);
  assert.notEqual(before.conditions.find((c) => c.detail === "Missing A")!.id, after.conditions.find((c) => c.detail === "Missing B")!.id);
});
