import { NEWS_TRAFFIC_TOTAL_START, newsTrafficWindow, summarizeNewsTotalViews, summarizeNewsTraffic, type PublicNewsTraffic } from "../publicNewsTraffic";
import { getGoogleAccessToken } from "./seangworldGoogleProviders";

export async function loadPublicNewsTraffic(options: {
  environment?: Readonly<Record<string, string | undefined>>;
  now?: Date;
  fetchImpl?: typeof fetch;
  tokenLoader?: typeof getGoogleAccessToken;
} = {}): Promise<PublicNewsTraffic> {
  const env = options.environment ?? process.env, now = options.now ?? new Date();
  const unavailable: PublicNewsTraffic = { ...newsTrafficWindow(now), status: "unavailable", pageViews: null, totalPageViews: null, totalWindowStart: NEWS_TRAFFIC_TOTAL_START };
  if (!env.BEAST_ECOSYSTEM_GA4_PROPERTY_ID || !env.GOOGLE_WIF_PROVIDER_RESOURCE || !env.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL) {
    console.info("[news:traffic]", JSON.stringify({ stage: "not-configured", propertyPresent: Boolean(env.BEAST_ECOSYSTEM_GA4_PROPERTY_ID), identityPresent: Boolean(env.GOOGLE_WIF_PROVIDER_RESOURCE && env.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL) }));
    return unavailable;
  }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stage: "identity" | "report" = "identity";
  try {
    return await Promise.race([
      (async () => {
        const token = await (options.tokenLoader ?? getGoogleAccessToken)(env);
        if (controller.signal.aborted) return unavailable;
        stage = "report";
        const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(env.BEAST_ECOSYSTEM_GA4_PROPERTY_ID!)}:runReport`;
        const request = (body: Record<string, unknown>) => (options.fetchImpl ?? fetch)(endpoint, {
          method: "POST", signal: controller.signal, cache: "no-store",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const hostFilter = { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "news.seangworld.com", caseSensitive: false } } };
        const rollingPromise = request({
            dateRanges: [{ startDate: "2daysAgo", endDate: "today" }],
            dimensions: [{ name: "dateHourMinute" }], metrics: [{ name: "screenPageViews" }], limit: 5000,
            dimensionFilter: hostFilter,
          });
        const totalPromise = request({
            dateRanges: [{ startDate: NEWS_TRAFFIC_TOTAL_START, endDate: "today" }],
            metrics: [{ name: "screenPageViews" }], limit: 1,
            dimensionFilter: hostFilter,
          }).catch(() => null);
        const [rollingResponse, totalResponse] = await Promise.all([rollingPromise, totalPromise]);
        if (!rollingResponse.ok) {
          console.info("[news:traffic]", JSON.stringify({ stage: "report-http", httpStatus: rollingResponse.status }));
          return unavailable;
        }
        const report = await rollingResponse.json();
        const summary = summarizeNewsTraffic(report, now);
        if (summary.status === "unavailable") {
          console.info("[news:traffic]", JSON.stringify({
            stage: "invalid-report",
            rowCount: Number.isSafeInteger(report?.rowCount) && report.rowCount >= 0 && report.rowCount <= 5000 ? report.rowCount : null,
            receivedRows: Array.isArray(report?.rows) ? Math.min(report.rows.length, 5001) : 0,
            dimensionMatches: report?.dimensionHeaders?.[0]?.name === "dateHourMinute",
            metricMatches: report?.metricHeaders?.[0]?.name === "screenPageViews",
            timeZonePresent: typeof report?.metadata?.timeZone === "string",
            thresholded: report?.metadata?.subjectToThresholding === true,
            sampled: Array.isArray(report?.metadata?.samplingMetadatas) && report.metadata.samplingMetadatas.length > 0,
            dataLoss: report?.metadata?.dataLossFromOtherRow === true,
            emptyReasonPresent: Boolean(report?.metadata?.emptyReason),
          }));
        }
        if (!totalResponse) {
          console.info("[news:traffic]", JSON.stringify({ stage: "total-report-failed" }));
          return summary;
        }
        if (!totalResponse.ok) {
          console.info("[news:traffic]", JSON.stringify({ stage: "total-report-http", httpStatus: totalResponse.status }));
          return summary;
        }
        let totalPageViews: number | null = null;
        try { totalPageViews = summarizeNewsTotalViews(await totalResponse.json()); }
        catch { console.info("[news:traffic]", JSON.stringify({ stage: "total-report-invalid-json" })); return summary; }
        if (totalPageViews === null) console.info("[news:traffic]", JSON.stringify({ stage: "invalid-total-report" }));
        return { ...summary, totalPageViews };
      })(),
      new Promise<PublicNewsTraffic>((resolve) => { timer = setTimeout(() => { controller.abort(); console.info("[news:traffic]", JSON.stringify({ stage: "timeout" })); resolve(unavailable); }, 12_000); }),
    ]);
  } catch { console.info("[news:traffic]", JSON.stringify({ stage: `${stage}-failed` })); return unavailable; }
  finally { if (timer) clearTimeout(timer); }
}
