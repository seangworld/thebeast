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
  if (!env.BEAST_ECOSYSTEM_GA4_PROPERTY_ID || !env.GOOGLE_WIF_PROVIDER_RESOURCE || !env.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL) return unavailable;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const token = await (options.tokenLoader ?? getGoogleAccessToken)(env);
        if (controller.signal.aborted) return unavailable;
        const response = await (options.fetchImpl ?? fetch)(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(env.BEAST_ECOSYSTEM_GA4_PROPERTY_ID!)}:runReport`, {
          method: "POST", signal: controller.signal, cache: "no-store",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({
            dateRanges: [{ startDate: "2daysAgo", endDate: "today" }],
            dimensions: [{ name: "dateHourMinute" }], metrics: [{ name: "screenPageViews" }], limit: 5000,
            dimensionFilter: { filter: { fieldName: "hostName", stringFilter: { matchType: "EXACT", value: "news.seangworld.com", caseSensitive: false } } },
          }),
        });
        return response.ok ? summarizeNewsTraffic(await response.json(), now) : unavailable;
      })(),
      new Promise<PublicNewsTraffic>((resolve) => { timer = setTimeout(() => { controller.abort(); resolve(unavailable); }, 12_000); }),
    ]);
  } catch { return unavailable; }
  finally { if (timer) clearTimeout(timer); }
}
