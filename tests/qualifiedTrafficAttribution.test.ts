import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { loadLiveSeangworldProviders } from "../src/lib/server/seangworldGoogleProviders";
import { getSeangworldAnalyticsScope } from "../src/lib/seangworldAnalyticsScope";

const names = ["sessionSource", "landingPagePlusQueryString", "sessionMedium", "sessionCampaignName", "sessionCampaignId"];
const row = (medium = "organic", id = "id-1", count = "10", campaign = "Same name") => ({ dimensionValues: ["google", "/guide", medium, campaign, id].map((value) => ({ value })), metricValues: [{ value: count }, { value: "5" }] });
const report = (rows: ReturnType<typeof row>[]) => ({ rows, dimensionHeaders: names.map((name) => ({ name })) });
let sequence = 0;
async function load(reports: Record<string, unknown>) {
  let qualifiedCalls = 0;
  const result = await loadLiveSeangworldProviders({ BEAST_ECOSYSTEM_GA4_PROPERTY_ID: `campaign-attribution-${sequence++}`, GOOGLE_WIF_PROVIDER_RESOURCE: "projects/test/providers/test", GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL: "test@example.test" }, new Date("2026-07-28T12:00:00Z"), async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    if (body.dimensions?.[0]?.name !== "sessionSource" || body.dimensions.length === 1) return Response.json({ rows: [] });
    qualifiedCalls++; assert.deepEqual(body.dimensions.map((item: { name: string }) => item.name), names);
    assert.equal(body.limit, "50"); assert.match(JSON.stringify(body.dimensionFilter), /thebeast/);
    const action = body.metrics[0].name === "eventCount";
    if (action) assert.match(JSON.stringify(body.dimensionFilter), /account_creation_selected/);
    const previous = body.dateRanges[0].startDate === "2026-07-14";
    return Response.json(reports[`${action ? "actions" : "sessions"}${previous ? "Previous" : "Current"}`] ?? { rows: [] });
  }, async () => "test-token", 7, getSeangworldAnalyticsScope("thebeast"));
  assert.equal(qualifiedCalls, 4, "same four bounded requests; no added provider calls");
  return result!.find((item) => item.id === "ga4")!.data?.qualifiedTraffic ?? [];
}

test("same source/page and campaign name remain separated by medium and campaign ID", async () => {
  const rows = await load({ sessionsCurrent: report([row(), row("organic", "id-2"), row("cpc")]), sessionsPrevious: report([row("organic", "id-1", "8")]), actionsCurrent: report([row("organic", "id-1", "0"), row("organic", "id-2", "7"), row("cpc", "id-1", "3")]), actionsPrevious: report([row("organic", "id-1", "2"), row("organic", "id-2", "99")]) });
  assert.equal(rows.length, 3); assert.deepEqual(rows.map((item) => item.qualifiedActions), [0, 7, 3]);
  assert.deepEqual(rows.map((item) => item.previousSessions), [8, null, null]);
  assert.deepEqual(rows.map((item) => item.previousQualifiedActions), [2, null, null]);
  assert.deepEqual(rows.map((item) => [item.medium, item.campaignId]), [["organic", "id-1"], ["organic", "id-2"], ["cpc", "id-1"]]);
});

test("incomplete or ambiguous attribution cannot join an action onto another campaign", async () => {
  const incomplete = row(); incomplete.dimensionValues.pop();
  const malformed = { ...row(), dimensionValues: [null] };
  const rows = await load({ sessionsCurrent: report([row()]), actionsCurrent: { rows: [incomplete, malformed, row(), row()] } });
  assert.equal(rows[0].qualifiedActions, null);
  const duplicates = await load({ sessionsCurrent: report([row(), row()]), actionsCurrent: report([row()]) });
  assert.deepEqual(duplicates, []);
});

test("suppression, sampling and mismatched headers remain unavailable", async () => {
  for (const metadata of [{ subjectToThresholding: true }, { dataLossFromOtherRow: true }, { samplingMetadatas: [{}] }, { emptyReason: "restricted" }]) {
    const rows = await load({ sessionsCurrent: report([row()]), actionsCurrent: { ...report([row()]), metadata } });
    assert.equal(rows[0].qualifiedActions, null);
  }
  const wrong = { ...report([row()]), dimensionHeaders: [...names].reverse().map((name) => ({ name })) };
  assert.equal((await load({ sessionsCurrent: report([row()]), actionsCurrent: wrong }))[0].qualifiedActions, null);
  assert.deepEqual(await load({ sessionsCurrent: { ...report([row()]), metadata: { subjectToThresholding: true } } }), []);
});

test("missing or malformed session counts remain unavailable, while explicit zero is retained", async () => {
  for (const count of ["", "invalid", "-1", "1.5", "9007199254740993"]) {
    assert.deepEqual(await load({ sessionsCurrent: report([row("organic", "id-1", count)]) }), []);
    const rows = await load({ sessionsCurrent: report([row()]), sessionsPrevious: report([row("organic", "id-1", count)]) });
    assert.equal(rows[0].previousSessions, null);
  }
  const absent = row(); absent.metricValues = [];
  assert.deepEqual(await load({ sessionsCurrent: report([absent]) }), []);
  const zero = row("organic", "id-1", "0"); zero.metricValues[1].value = "0";
  assert.equal((await load({ sessionsCurrent: report([zero]) }))[0].sessions, 0);
});

test("actual owner table renders separate labels, provider ID and attribution limitations", async () => {
  const rows = await load({ sessionsCurrent: report([row("organic", "id-1", "10", "<campaign>"), row("cpc", "id-2")]) });
  const source = readFileSync("src/app/dashboard/admin/intelligence/SeangworldIntelligenceWorkspace.tsx", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: { table?: (props: { items: typeof rows }) => React.ReactNode } = {};
  runInNewContext(code + "\nexports.table = QualifiedTrafficTable;", { exports, Intl, require: (name: string) => name.startsWith("react") ? require(name) : {} });
  const html = renderToStaticMarkup(exports.table!({ items: rows }));
  assert.match(html, /Medium/); assert.match(html, /GA4 campaign/); assert.match(html, /ID:.*id-1/);
  assert.match(html, /organic/); assert.match(html, /cpc/); assert.match(html, /&lt;campaign&gt;/);
  assert.match(html, /not automatically linked to BeastMarketing/); assert.match(html, /not verified registrations/);
  assert.match(html, /Unavailable/); assert.match(html, /tabindex="0"/);
});
