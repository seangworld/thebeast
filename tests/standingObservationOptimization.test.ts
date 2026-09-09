import test from "node:test";
import assert from "node:assert/strict";
import { assessStandingOperations, type OperatingHistoryRow } from "../src/lib/standingObservationOptimization";
import type { ObservationSourceResult } from "../src/lib/standingObservation";

const now = new Date("2026-09-09T10:00:00Z");
const source: ObservationSourceResult = { source: "github_repository_evidence", available: true, changed: false, summary: "Current evidence", confidence: "high", impact: "none", fingerprint: "one" };
const day = (date: string, attention = false): OperatingHistoryRow => ({ status: "duplicate_skipped", started_at: `${date}T10:00:00Z`, completed_at: `${date}T10:00:01Z`, checked_sources: [source.source], unavailable_sources: [], findings: attention ? [{ source: source.source }] : [] });

test("operating assessment identifies three-day recurrence without authorizing execution", () => {
  const result = assessStandingOperations([{ ...source, changed: true }], [day("2026-09-08", true), day("2026-09-07", true)], now);
  assert.equal(result.recommendation, "Modify");
  assert.deepEqual(result.recurringSources, [source.source]);
  assert.match(result.explanation, /existing findings/);
  assert.equal(result.executable, false); assert.equal(result.causalClaim, false);
});
test("multiple cycles on one day do not fabricate a three-day baseline", () => {
  const result = assessStandingOperations([source], [day("2026-09-08"), day("2026-09-08"), day("2026-09-09")], now);
  assert.equal(result.recommendation, "Investigate");
  assert.equal(result.comparableDays, 2);
});
test("missing current or historical evidence never produces Continue", () => {
  const history = [day("2026-09-08"), day("2026-09-07")];
  assert.equal(assessStandingOperations([{ ...source, available: false }], history, now).recommendation, "Investigate");
  assert.equal(assessStandingOperations([source], [{ ...history[0], checked_sources: [] }, history[1]], now).recommendation, "Investigate");
});
test("failed, incomplete, future and stale rows do not establish comparable history", () => {
  for (const invalid of [{ ...day("2026-09-08"), status: "failed" }, { ...day("2026-09-08"), completed_at: null }, day("2026-09-10"), day("2026-08-01"), { ...day("2026-09-08"), findings: [null] }]) {
    assert.equal(assessStandingOperations([source], [invalid, day("2026-09-07")], now).recommendation, "Investigate");
  }
});
test("complete current healthy evidence recommends cadence continuity without causation", () => {
  const result = assessStandingOperations([source], [day("2026-09-08"), day("2026-09-07")], now);
  assert.equal(result.recommendation, "Continue");
  assert.match(result.explanation, /not proof of intervention effectiveness/);
});
test("a new signal is not described as recurring", () => {
  const result = assessStandingOperations([{ ...source, changed: true }], [day("2026-09-08"), day("2026-09-07")], now);
  assert.equal(result.recommendation, "Modify");
  assert.deepEqual(result.recurringSources, []);
  assert.match(result.explanation, /recurrence has not been established/);
});

test("a later failed attempt cannot be hidden by an earlier clean attempt on the same day", () => {
  const failed = { ...day("2026-09-08"), status: "failed", started_at: "2026-09-08T12:00:00Z", completed_at: "2026-09-08T12:00:01Z" };
  assert.equal(assessStandingOperations([source], [day("2026-09-08"), failed, day("2026-09-07"), day("2026-09-06")], now).recommendation, "Investigate");
});

test("malformed JSONB source collections and unknown finding IDs remain insufficient evidence", () => {
  for (const patch of [
    { checked_sources: {} }, { checked_sources: source.source }, { unavailable_sources: {} },
    { checked_sources: [""] }, { checked_sources: [source.source, source.source] },
    { unavailable_sources: [source.source] }, { findings: [{ source: "" }] },
    { findings: [{ source: "unapproved_provider" }] },
  ]) {
    const invalid = { ...day("2026-09-08"), ...patch } as unknown as OperatingHistoryRow;
    assert.equal(assessStandingOperations([source], [invalid, day("2026-09-07")], now).recommendation, "Investigate");
  }
});
