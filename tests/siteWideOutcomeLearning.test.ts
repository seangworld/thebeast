import assert from "node:assert/strict";
import test from "node:test";
import {
  assessSiteWideOutcomes,
  buildSiteWideObservationSources,
  buildSiteWideOutcomeSnapshot,
  normalizeSiteWideOutcomeSnapshot,
  type SiteWideOutcomeSnapshot,
} from "../src/lib/siteWideOutcomeLearning";
import type { SeangworldIntelligenceSnapshot } from "../src/lib/seangworldIntelligence";

function intelligence(input: {
  sessions?: [number, number | null];
  clicks?: [number, number];
  engagement?: [number, number | null];
  connected?: boolean;
  mobile?: { mobileSessions: number; desktopSessions: number; mobileEngagementRate: number; desktopEngagementRate: number } | null;
}): SeangworldIntelligenceSnapshot {
  const connected = input.connected ?? true;
  const provider = (id: "ga4" | "search_console") => ({
    id, label: id, status: connected ? "configured" : "unavailable",
    connectionStatus: connected ? "connected" : "unavailable", freshness: connected ? "current" : "unknown",
    guidance: "", lastSynchronizationAt: "2026-09-14T10:00:00Z", lastSuccessfulSynchronizationAt: connected ? "2026-09-14T10:00:00Z" : null,
    dataThroughDate: "2026-09-13", reportingDelayDays: 1, error: null, data: {},
  });
  return {
    generatedAt: "2026-09-14T10:00:00Z", comparisonPeriod: "current 30 days compared with previous 30 days",
    providers: [provider("ga4"), provider("search_console")] as SeangworldIntelligenceSnapshot["providers"],
    data: {
      sessions: input.sessions ? { value: input.sessions[0], previousValue: input.sessions[1] } : null,
      clicks: input.clicks ? { value: input.clicks[0], previousValue: input.clicks[1] } : null,
      engagementRate: input.engagement ? { value: input.engagement[0], previousValue: input.engagement[1] } : null,
      deviceEngagement: input.mobile ?? null,
    } as SeangworldIntelligenceSnapshot["data"], recommendations: [], limitations: [],
  };
}

function outcomeAt(date: string, overrides: Partial<Parameters<typeof intelligence>[0]> = {}) {
  return buildSiteWideOutcomeSnapshot({
    observedAt: `${date}T10:00:00Z`,
    ecosystem: intelligence({ sessions: [120, 100], clicks: [20, 15], ...overrides }),
    news: intelligence({ sessions: [60, 50], engagement: [0.6, 0.55], ...overrides }),
    beast: intelligence({ sessions: [50, 45], engagement: [0.55, 0.5], mobile: { mobileSessions: 30, desktopSessions: 30, mobileEngagementRate: 0.55, desktopEngagementRate: 0.6 }, ...overrides }),
  });
}

function row(snapshot: SiteWideOutcomeSnapshot, status = "clean") {
  return { status, started_at: snapshot.observedAt, completed_at: new Date(Date.parse(snapshot.observedAt) + 1000).toISOString(), findings: { version: 2, findings: [], snapshot: {}, siteOutcomes: snapshot } };
}

test("produces bounded Continue recommendations from comparable aggregate evidence", () => {
  const snapshot = outcomeAt("2026-09-14");
  assert.deepEqual(snapshot.workstreams.map((item) => item.decision), ["Continue", "Continue", "Continue"]);
  assert.ok(snapshot.workstreams.every((item) => item.ownerApprovalRequired && !item.executable && !item.causalClaim));
  assert.equal(normalizeSiteWideOutcomeSnapshot(snapshot)?.workstreams.length, 3);
  assert.ok(buildSiteWideObservationSources(snapshot).every((source) => source.available && !source.changed));
});

test("recommends Modify for material declines without claiming cause", () => {
  const snapshot = buildSiteWideOutcomeSnapshot({
    observedAt: "2026-09-14T10:00:00Z",
    ecosystem: intelligence({ sessions: [70, 100], clicks: [12, 20] }),
    news: intelligence({ sessions: [35, 50], engagement: [0.42, 0.58] }),
    beast: intelligence({ sessions: [50, 50], engagement: [0.4, 0.55], mobile: { mobileSessions: 50, desktopSessions: 50, mobileEngagementRate: 0.35, desktopEngagementRate: 0.6 } }),
  });
  assert.deepEqual(snapshot.workstreams.map((item) => item.decision), ["Modify", "Modify", "Modify"]);
  assert.ok(buildSiteWideObservationSources(snapshot).every((source) => source.changed && source.impact === "medium"));
  assert.ok(snapshot.workstreams.every((item) => item.limitations.some((entry) => /do not|does not/i.test(entry))));
});

test("missing, stale, or undersized evidence becomes Investigate rather than fabricated health", () => {
  for (const patch of [{ connected: false }, { sessions: [4, 3] as [number, number], clicks: [2, 1] as [number, number], engagement: [0.5, 0.5] as [number, number] }]) {
    const snapshot = outcomeAt("2026-09-14", patch);
    assert.ok(snapshot.workstreams.every((item) => item.decision === "Investigate"));
    assert.ok(buildSiteWideObservationSources(snapshot).every((source) => source.available === (patch.connected !== false) && !source.changed));
  }
});

test("three consecutive valid scheduled days validate behavior; failed or missing days never count", () => {
  const current = outcomeAt("2026-09-14");
  const priorOne = outcomeAt("2026-09-13");
  const priorTwo = outcomeAt("2026-09-12");
  const validated = assessSiteWideOutcomes(current, [row(priorOne), row(priorTwo)]);
  assert.equal(validated.validation.status, "validated");
  assert.equal(validated.validation.observedCycles, 3);
  assert.ok(validated.workstreams.every((item) => item.sameDecisionCycles === 3));
  for (const history of [[row(priorOne)], [row(priorOne), row(priorTwo, "failed")], [row(priorTwo)]]) {
    const pending = assessSiteWideOutcomes(current, history);
    assert.equal(pending.validation.status, "pending");
    assert.ok(pending.validation.observedCycles < 3);
  }
  assert.equal(assessSiteWideOutcomes(current, [row(priorTwo)]).validation.observedCycles, 1);
});

test("malformed envelopes and changed owner gates cannot become learning evidence", () => {
  const snapshot = outcomeAt("2026-09-14");
  assert.equal(normalizeSiteWideOutcomeSnapshot({ ...snapshot, executable: true }), null);
  assert.equal(normalizeSiteWideOutcomeSnapshot({ ...snapshot, ownerGates: ["execution"] }), null);
  assert.equal(normalizeSiteWideOutcomeSnapshot({ ...snapshot, workstreams: snapshot.workstreams.map((item) => item.id === "growth" ? { ...item, source: "ux_aggregate_outcome_evidence" } : item) }), null);
  const report = assessSiteWideOutcomes(snapshot, [{ ...row(outcomeAt("2026-09-13")), findings: { version: 2, siteOutcomes: { ...outcomeAt("2026-09-13"), causalClaim: true } } }]);
  assert.equal(report.validation.observedCycles, 1);
});

 test("fresh small or absent baseline counts operationally but provider failures never count", () => {
   const small = { sessions: [11, null] as [number, null], clicks: [2, 1] as [number, number], engagement: [1, null] as [number, null] };
   const current = outcomeAt("2026-09-16", small);
   assert.ok(current.workstreams.every(x => x.decision === "Investigate" && x.evidenceStatus === "insufficient_history" && x.evidence.length > 0));
   assert.equal(assessSiteWideOutcomes(current, [row(outcomeAt("2026-09-15", small)), row(outcomeAt("2026-09-14", small))]).validation.status, "validated");
   const failure = outcomeAt("2026-09-16", {connected: false});
   assert.ok(failure.workstreams.every(x => x.evidenceStatus === "provider_unavailable"));
   assert.equal(assessSiteWideOutcomes(failure, [row(outcomeAt("2026-09-15")), row(outcomeAt("2026-09-14"))]).validation.observedCycles, 0);
   const empty = outcomeAt("2026-09-15");
   empty.workstreams[1].evidence = [];
   assert.equal(assessSiteWideOutcomes(current, [row(empty), row(outcomeAt("2026-09-14"))]).validation.observedCycles, 1);
 });
