import assert from "node:assert/strict";
import test from "node:test";
import { NEWS_TRAFFIC_TOTAL_START, summarizeNewsTotalViews, summarizeNewsTraffic } from "../src/lib/publicNewsTraffic";
import { loadPublicNewsTraffic } from "../src/lib/server/publicNewsTraffic";

const now = new Date("2026-09-09T16:20:30Z");
const row = (key: string, value: string) => ({ dimensionValues: [{ value: key }], metricValues: [{ value }] });
const report = (rows: ReturnType<typeof row>[] = [], timeZone = "America/New_York") => ({ dimensionHeaders: [{ name: "dateHourMinute" }], metricHeaders: [{ name: "screenPageViews" }], rowCount: rows.length, rows, metadata: { timeZone } });
const totalReport = (value = "0") => ({ metricHeaders: [{ name: "screenPageViews" }], rowCount: 1, rows: [{ metricValues: [{ value }] }], metadata: {} });

test("public News views use exact minute-bounded rolling day in property timezone", () => {
  const value = summarizeNewsTraffic(report([row("202609081219", "90"), row("202609081220", "3"), row("202609091219", "4"), row("202609091220", "80")]), now);
  assert.equal(value.pageViews, 7); assert.equal(value.windowStart, "2026-09-08T16:20:00.000Z"); assert.equal(value.windowEnd, "2026-09-09T16:20:00.000Z");
  assert.equal(value.totalPageViews, null); assert.equal(value.totalWindowStart, NEWS_TRAFFIC_TOTAL_START);
  assert.equal(summarizeNewsTraffic(report(), now).pageViews, 0);
});

test("public News total views accept only one complete unsuppressed aggregate", () => {
  assert.equal(summarizeNewsTotalViews(totalReport("1234")), 1234);
  assert.equal(summarizeNewsTotalViews({ ...totalReport(), kind: "analyticsData#runReport", rowCount: undefined, rows: undefined }), 0);
  for (const input of [
    null, {}, { ...totalReport(), rowCount: 2 }, { ...totalReport(), dimensionHeaders: [{ name: "date" }] },
    { ...totalReport(), rows: [{ metricValues: [{ value: "-1" }] }] }, { ...totalReport(), rows: [{ metricValues: [{ value: "1.5" }] }] },
    { ...totalReport(), metadata: { subjectToThresholding: true } }, { ...totalReport(), metadata: { samplingMetadatas: [{}] } },
  ]) assert.equal(summarizeNewsTotalViews(input), null);
});

test("incomplete, malformed, suppressed and ambiguous reports stay unavailable", () => {
  for (const input of [null, {}, { ...report(), rowCount: 1 }, { ...report(), rowCount: undefined }, report([row("202609091200", "-1")]), report([row("202609091200", "1.5")]), report([row("202609091200", "9007199254740992")]), report([row("202602311200", "1")]), report([row("202609091200", "1"), row("202609091200", "2")]), { ...report(), metadata: { timeZone: "UTC", subjectToThresholding: true } }, { ...report(), metadata: { timeZone: "UTC", samplingMetadatas: [{}] } }, { ...report(), metadata: { timeZone: "UTC", dataLossFromOtherRow: true } }, report([], "invalid-zone")]) {
    assert.equal(summarizeNewsTraffic(input, now).pageViews, null);
  }
  assert.equal(summarizeNewsTraffic(report(), new Date("2026-11-01T15:00:00Z")).pageViews, null);
});

test("identified empty GA4 ProtoJSON reports use omitted zero defaults only", () => {
  const empty = { ...report(), kind: "analyticsData#runReport", rowCount: undefined, rows: undefined };
  assert.equal(summarizeNewsTraffic(empty, now).pageViews, 0);
  assert.equal(summarizeNewsTraffic({ ...empty, rows: [] }, now).pageViews, 0);
  for (const input of [
    { ...empty, kind: undefined }, { ...empty, kind: "other" },
    { ...empty, rows: null }, { ...empty, rows: {} }, { ...empty, rowCount: null },
    { ...empty, rows: [row("202609091200", "2")] },
    { ...empty, metadata: {} }, { ...empty, metricHeaders: [] },
    { ...empty, metadata: { timeZone: "UTC", emptyReason: "suppressed" } },
    { ...empty, metadata: { timeZone: "UTC", subjectToThresholding: true } },
  ]) assert.equal(summarizeNewsTraffic(input, now).pageViews, null);
});

test("public loader is fixed to News aggregate, omits sensitive output and does not request when unconfigured", async () => {
  const environment = { BEAST_ECOSYSTEM_GA4_PROPERTY_ID: "123", GOOGLE_WIF_PROVIDER_RESOURCE: "existing", GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL: "existing@example.test" };
  let calls = 0;
  const result = await loadPublicNewsTraffic({ environment, now, tokenLoader: async () => "private-token", fetchImpl: async (url, init) => {
    calls++; assert.match(String(url), /properties\/123:runReport$/);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.dimensionFilter.filter.stringFilter.value, "news.seangworld.com");
    assert.equal(body.dimensionFilter.filter.stringFilter.matchType, "EXACT");
    assert.deepEqual(body.metrics, [{ name: "screenPageViews" }]);
    if (body.dimensions) {
      assert.deepEqual(body.dimensions, [{ name: "dateHourMinute" }]); assert.equal(body.limit, 5000);
      return Response.json(report([row("202609091200", "5")]));
    }
    assert.deepEqual(body.dateRanges, [{ startDate: NEWS_TRAFFIC_TOTAL_START, endDate: "today" }]); assert.equal(body.limit, 1);
    return Response.json(totalReport("45"));
  } });
  assert.equal(calls, 2); assert.equal(result.pageViews, 5); assert.equal(result.totalPageViews, 45); assert.doesNotMatch(JSON.stringify(result), /private-token|existing|example/);
  assert.equal((await loadPublicNewsTraffic({ environment: {}, now, tokenLoader: async () => { throw new Error("must not load"); } })).pageViews, null);
  assert.equal((await loadPublicNewsTraffic({ environment, now, tokenLoader: async () => "token", fetchImpl: async () => Response.json({ secret: "private" }, { status: 403 }) })).pageViews, null);
});

test("a total-report failure does not hide a valid rolling 24-hour count", async () => {
  const environment = { BEAST_ECOSYSTEM_GA4_PROPERTY_ID: "123", GOOGLE_WIF_PROVIDER_RESOURCE: "existing", GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL: "existing@example.test" };
  let calls = 0;
  const result = await loadPublicNewsTraffic({ environment, now, tokenLoader: async () => "token", fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? Response.json(report([row("202609091200", "5")])) : Response.json({}, { status: 503 });
  } });
  assert.equal(result.pageViews, 5); assert.equal(result.totalPageViews, null);
});

test("unavailable diagnostics log bounded stages and shape without provider secrets", async () => {
  const logs: unknown[][] = [], original = console.info;
  console.info = (...args: unknown[]) => { logs.push(args); };
  const environment = { BEAST_ECOSYSTEM_GA4_PROPERTY_ID: "private-property", GOOGLE_WIF_PROVIDER_RESOURCE: "private-identity", GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL: "private-email" };
  try {
    await loadPublicNewsTraffic({ environment, now, tokenLoader: async () => { throw new Error("private-error"); } });
    await loadPublicNewsTraffic({ environment, now, tokenLoader: async () => "private-token", fetchImpl: async () => Response.json({ ...report(), rowCount: 9000, secret: "private-body" }) });
    const serialized = JSON.stringify(logs);
    assert.match(serialized, /identity-failed/); assert.match(serialized, /invalid-report/);
    assert.doesNotMatch(serialized, /private-|9000/);
  } finally { console.info = original; }
});
