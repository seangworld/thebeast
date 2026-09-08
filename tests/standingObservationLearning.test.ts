import assert from "node:assert/strict";
import test from "node:test";
import { buildStandingObservationLearning } from "../src/lib/standingObservationLearning";
import type { ObservationSourceResult } from "../src/lib/standingObservation";

const source: ObservationSourceResult = { source: "github_repository_evidence", available: true, changed: false, summary: "Current evidence", confidence: "high", impact: "none", fingerprint: "current" };
const baseline = { findings: [{ source: source.source, signal: "Earlier attention" }], unavailable_sources: [] };

test("first observation establishes a baseline without claiming improvement", () => {
  assert.match(buildStandingObservationLearning([source], null)[0], /no earlier comparable observation/);
});

test("recurring source attention directs review of existing findings", () => {
  assert.match(buildStandingObservationLearning([{ ...source, changed: true }], baseline)[0], /attention persists.*existing findings/);
});

test("disappearing attention does not imply intervention effectiveness", () => {
  assert.match(buildStandingObservationLearning([source], baseline)[0], /no longer observed.*does not establish/);
});

test("missing evidence cannot be reported as resolved attention", () => {
  const learning = buildStandingObservationLearning([{ ...source, available: false }], baseline);
  assert.match(learning[0], /missing evidence cannot establish improvement/);
  assert.doesNotMatch(learning.join(" "), /no longer observed/);
});

test("restored evidence requires a new baseline", () => {
  assert.match(buildStandingObservationLearning([source], { ...baseline, unavailable_sources: [source.source] })[0], /evidence restored.*fresh baseline/);
});

test("new attention is identified and malformed history is not treated as a healthy baseline", () => {
  assert.match(buildStandingObservationLearning([{ ...source, changed: true }], { findings: [], unavailable_sources: [] })[0], /new attention signal/);
  assert.match(buildStandingObservationLearning([source], { findings: null, unavailable_sources: [] })[0], /requires valid historical evidence/);
});
