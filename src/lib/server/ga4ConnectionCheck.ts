import { getGoogleAccessToken } from "./seangworldGoogleProviders";
import { SEANGWORLD_NEWS_MEASUREMENT_ID, type Ga4ConnectionCheck } from "../ga4ConnectionCheck";

type Environment = Readonly<Record<string, string | undefined>>;
const measurementPattern = /^G-[A-Z0-9]{6,20}$/;

export async function checkGa4Connection(
  environment: Environment,
  options: { now?: Date; fetchImpl?: typeof fetch; tokenLoader?: typeof getGoogleAccessToken } = {},
): Promise<Ga4ConnectionCheck> {
  const checkedAt = (options.now ?? new Date()).toISOString();
  const beastId = environment.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
  const expected = [
    { label: "Beast", measurementId: measurementPattern.test(beastId) ? beastId : "Not configured" },
    { label: "SEANGWORLD / News", measurementId: SEANGWORLD_NEWS_MEASUREMENT_ID },
  ];
  const unavailable = (message: string): Ga4ConnectionCheck => ({
    checkedAt, status: "unavailable", message,
    streams: expected.map((stream) => ({ ...stream, status: "unavailable" })),
  });
  const property = environment.BEAST_ECOSYSTEM_GA4_PROPERTY_ID ?? "";
  if (!/^\d+$/.test(property)) return unavailable("A numeric ecosystem GA4 property ID is required. A G- measurement ID cannot be used as the reporting property ID.");
  if (!measurementPattern.test(beastId)) return unavailable("Beast's production measurement ID is missing or invalid.");
  if (!environment.GOOGLE_WIF_PROVIDER_RESOURCE || !environment.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL) {
    return unavailable("The existing Google reporting connection is not configured.");
  }
  try {
    const token = await (options.tokenLoader ?? getGoogleAccessToken)(environment);
    const request = options.fetchImpl ?? fetch;
    const found = new Set<string>();
    const seenTokens = new Set<string>();
    let pageToken = "";
    // Bound the read and never infer missing streams from a partial list.
    for (let page = 0; page < 5; page += 1) {
      const query = new URLSearchParams({ pageSize: "200" });
      if (pageToken) query.set("pageToken", pageToken);
      const response = await request(`https://analyticsadmin.googleapis.com/v1beta/properties/${property}/dataStreams?${query}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        return unavailable(response.status === 403
          ? "Google denied the stream check. Verify that the Analytics Admin API is enabled and the existing reporting service account can read this property. Report access alone does not prove stream-check access."
          : response.status === 404
            ? "Google could not find the configured reporting property. Verify its numeric property ID and the reporting account's access."
            : "Google could not complete the stream check. Retry later; no missing-stream conclusion was made.");
      }
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid response");
      const payload = body as { dataStreams?: unknown; nextPageToken?: unknown; error?: unknown };
      if (payload.error || (payload.dataStreams !== undefined && !Array.isArray(payload.dataStreams))) throw new Error("Invalid stream list");
      for (const item of (payload.dataStreams ?? []) as unknown[]) {
        if (!item || typeof item !== "object") throw new Error("Invalid stream");
        const stream = item as { name?: unknown; type?: unknown; webStreamData?: { measurementId?: unknown } };
        if (typeof stream.name !== "string" || !new RegExp(`^properties/${property}/dataStreams/\\d+$`).test(stream.name)) throw new Error("Invalid stream property");
        if (stream.type === "WEB_DATA_STREAM") {
          const id = stream.webStreamData?.measurementId;
          if (typeof id !== "string" || !measurementPattern.test(id)) throw new Error("Invalid measurement ID");
          found.add(id);
        } else if (stream.type !== "ANDROID_APP_DATA_STREAM" && stream.type !== "IOS_APP_DATA_STREAM") throw new Error("Invalid stream type");
      }
      if (payload.nextPageToken !== undefined && typeof payload.nextPageToken !== "string") throw new Error("Invalid page token");
      pageToken = (payload.nextPageToken as string | undefined) ?? "";
      if (!pageToken) {
        const streams: Ga4ConnectionCheck["streams"] = expected.map((stream) => ({ ...stream, status: found.has(stream.measurementId) ? "found" : "missing" }));
        const matched = streams.every((stream) => stream.status === "found");
        return {
          checkedAt, status: matched ? "matched" : "mismatch", streams,
          message: matched
            ? "Both expected measurement IDs belong to the reporting property. This confirms the mapping only; it does not confirm that visits are arriving. Check Realtime and traffic filters next."
            : "The reporting property does not contain every expected measurement ID. Visits sent to a different property will not appear in these reports. Verify the property and stream configuration before changing any IDs.",
        };
      }
      if (seenTokens.has(pageToken)) throw new Error("Repeated page token");
      seenTokens.add(pageToken);
    }
    return unavailable("Google returned an incomplete stream list. No missing-stream conclusion was made.");
  } catch {
    return unavailable("The Google stream check could not be verified. Check the existing reporting connection and retry; no missing-stream conclusion was made.");
  }
}
