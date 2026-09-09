import { newsTrafficWindow, summarizeNewsTraffic, type PublicNewsTraffic } from "../publicNewsTraffic";
import { getGoogleAccessToken } from "./seangworldGoogleProviders";

export async function loadPublicNewsTraffic(options: {
  environment?: Readonly<Record<string, string | undefined>>;
  now?: Date;
  fetchImpl?: typeof fetch;
  tokenLoader?: typeof getGoogleAccessToken;
} = {}): Promise<PublicNewsTraffic> {
  const env = options.environment ?? process.env, now = options.now ?? new Date();
  const unavailable: PublicNewsTraffic = { ...newsTrafficWindow(now), status: "unavailable", pageViews: null };
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
        const response = await (options.fetchImpl ?? fetch)(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(env.BEAST_ECOSYSTEM_GA4_PROPERTY_ID!)}:runReport`, {
          method: "POST", signal: controller.signal, cache: "no-store",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({
            dateRanges: [{ startDate: "2daysAgo", endDate: "today" }],
            dimensions: [{ name: "dateHourMinute" }], metrics: [{ name: "screenPageViews" }], limit: 5000,
            dimensionFilter: { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "news.seangworld.com", caseSensitive: false } } },
          }),
        });
        if (!response.ok) {
          console.info("[news:traffic]", JSON.stringify({ stage: "report-http", httpStatus: response.status }));
          return unavailable;
        }
        const report = await response.json();
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
        return summary;
      })(),
      new Promise<PublicNewsTraffic>((resolve) => { timer = setTimeout(() => { controller.abort(); console.info("[news:traffic]", JSON.stringify({ stage: "timeout" })); resolve(unavailable); }, 12_000); }),
    ]);
  } catch { console.info("[news:traffic]", JSON.stringify({ stage: `${stage}-failed` })); return unavailable; }
  finally { if (timer) clearTimeout(timer); }
}
