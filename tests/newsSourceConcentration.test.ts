import assert from "node:assert/strict";
import test from "node:test";
import { concentrationWarnings, parseNewsSourceConcentration } from "../src/lib/newsSourceConcentration";

const now = new Date("2026-09-14T12:00:00Z");
function payload() {
  const rows = [{ name: "alpha", count: 8, share: 2 / 3 }, { name: "beta", count: 4, share: 1 / 3 }];
  return { view: "unfiltered-homepage", threshold: 0.5, generatedAt: now.toISOString(),
    totalHeadlineCount: 24, totalFeedCount: 132, totalPublisherCount: 2,
    lanes: ["world", "usa"].map((scope) => ({ scope, poolHeadlineCount: 12, poolFeedCount: 2,
      poolPublisherCount: 2, visibleHeadlineCount: 12, visiblePublisherCount: 2,
      publishers: rows, families: rows, poolPublishers: rows, poolFamilies: rows })) };
}

test("large registry totals cannot suppress visible publisher concentration", () => {
  const parsed = parseNewsSourceConcentration(payload(), now);
  assert.ok(parsed);
  assert.equal(parsed.lanes[0].visiblePublisherCount, 2);
  assert.equal(concentrationWarnings(parsed.lanes[0]).length, 4);
  assert.match(concentrationWarnings(parsed.lanes[0])[0], /67%/);
});

test("exactly 50% is not a majority warning", () => {
  const value = payload();
  for (const lane of value.lanes) for (const key of ["publishers", "families", "poolPublishers", "poolFamilies"] as const) {
    lane[key] = [{ name: "alpha", count: 6, share: 0.5 }, { name: "beta", count: 6, share: 0.5 }];
  }
  const parsed = parseNewsSourceConcentration(value, now);
  assert.ok(parsed);
  assert.deepEqual(concentrationWarnings(parsed.lanes[0]), []);
});

test("missing, malformed, duplicate-lane and future evidence fail closed", () => {
  assert.equal(parseNewsSourceConcentration(undefined, now), null);
  const bad = payload(); bad.lanes[0].publishers = [{ name: "alpha", count: 8, share: 0 }];
  assert.equal(parseNewsSourceConcentration(bad, now), null);
  const duplicate = payload(); duplicate.lanes[1].scope = "world";
  assert.equal(parseNewsSourceConcentration(duplicate, now), null);
  const future = payload(); future.generatedAt = "2026-09-15T12:00:00Z";
  assert.equal(parseNewsSourceConcentration(future, now), null);
});

test("staleness is computed from snapshot time rather than a server freshness claim", () => {
  const value = payload(); value.generatedAt = "2026-09-14T11:44:00Z";
  assert.equal(parseNewsSourceConcentration({ ...value, freshness: "fresh" }, now)?.freshness, "stale");
});
