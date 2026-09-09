import assert from "node:assert/strict";
import test from "node:test";
import { loadLiveSeangworldProviders } from "../src/lib/server/seangworldGoogleProviders";

async function loadActions(suffix: string, currentValue: unknown, previousValue: unknown, mode = "matched") {
  const env = { BEAST_ECOSYSTEM_GA4_PROPERTY_ID: `action-evidence-${suffix}`, GOOGLE_WIF_PROVIDER_RESOURCE: "projects/test/providers/test", GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL: "test@example.test" };
  const fetcher: typeof fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    const paired = body.dimensions?.length === 2 && body.dimensions[0].name === "sessionSource";
    const action = body.metrics?.[0]?.name === "eventCount";
    const previous = body.dateRanges?.[0]?.startDate === "2026-07-14";
    if (!paired) return new Response(JSON.stringify({ rows: [] }));
    if (action && mode === "failed") return new Response("Unavailable", { status: 403 });
    if (action && mode === "absent") return new Response(JSON.stringify({ rows: [] }));
    const dimensions = [{ value: "google" }, { value: action && mode === "other-page" ? "/other" : "/guide" }];
    return new Response(JSON.stringify({ rows: [{ dimensionValues: dimensions, metricValues: action ? [{ value: previous ? previousValue : currentValue }] : [{ value: "10" }, { value: "5" }] }] }));
  };
  const providers = await loadLiveSeangworldProviders(env, new Date("2026-07-28T12:00:00Z"), fetcher, async () => "test-token", 7);
  const rows = providers?.find((item) => item.id === "ga4")?.data?.qualifiedTraffic;
  assert.equal(rows?.length, 1);
  return rows![0];
}

test("bounded GA4 reports retain explicit current zero and prior positive evidence", async () => {
  const row = await loadActions("zero", "0", "7");
  assert.equal(row.qualifiedActions, 0);
  assert.equal(row.previousQualifiedActions, 7);
  assert.equal(row.sessions, 10);
});

test("missing, mismatched and failed action reports never become measured zero", async () => {
  for (const mode of ["absent", "other-page", "failed"]) {
    const row = await loadActions(mode, "5", "3", mode);
    assert.equal(row.qualifiedActions, null, mode);
    assert.equal(row.previousQualifiedActions, null, mode);
    assert.equal(row.sessions, 10);
  }
});

test("malformed action counts remain unavailable without discarding valid prior evidence", async () => {
  let i = 0;
  for (const value of [undefined, null, "", " ", "-1", "1.5", "NaN", "Infinity", "9007199254740992", false, [], {}]) {
    const row = await loadActions(`invalid-${i++}`, value, "0");
    assert.equal(row.qualifiedActions, null, JSON.stringify(value));
    assert.equal(row.previousQualifiedActions, 0);
  }
});
