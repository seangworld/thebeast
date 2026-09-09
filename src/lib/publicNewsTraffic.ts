export type PublicNewsTraffic = {
  status: "ready" | "unavailable";
  pageViews: number | null;
  windowStart: string;
  windowEnd: string;
  measuredAt: string;
};

export function newsTrafficWindow(now: Date) {
  const end = Math.floor(now.getTime() / 60_000) * 60_000;
  return { windowStart: new Date(end - 86_400_000).toISOString(), windowEnd: new Date(end).toISOString(), measuredAt: now.toISOString() };
}

function localMinute(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return ["year", "month", "day", "hour", "minute"].map(get).join("");
}

function minuteAsUtc(key: string) {
  if (!/^\d{12}$/.test(key)) throw new Error("Invalid minute");
  const iso = `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}T${key.slice(8, 10)}:${key.slice(10, 12)}:00.000Z`;
  const value = Date.parse(iso);
  if (!Number.isFinite(value) || new Date(value).toISOString() !== iso) throw new Error("Invalid calendar minute");
  return value;
}

/** Only an exact, complete, unsuppressed report can become a public count. */
export function summarizeNewsTraffic(report: unknown, now: Date): PublicNewsTraffic {
  const window = newsTrafficWindow(now);
  const unavailable: PublicNewsTraffic = { ...window, status: "unavailable", pageViews: null };
  try {
    if (!report || typeof report !== "object") return unavailable;
    const data = report as { dimensionHeaders?: { name?: string }[]; metricHeaders?: { name?: string }[]; rowCount?: number; rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[]; metadata?: { timeZone?: string; subjectToThresholding?: boolean; dataLossFromOtherRow?: boolean; emptyReason?: string; samplingMetadatas?: unknown[] } };
    if (data.dimensionHeaders?.length !== 1 || data.dimensionHeaders[0].name !== "dateHourMinute" || data.metricHeaders?.length !== 1 || data.metricHeaders[0].name !== "screenPageViews") return unavailable;
    const meta = data.metadata;
    if (!meta?.timeZone || meta.subjectToThresholding || meta.dataLossFromOtherRow || meta.emptyReason || meta.samplingMetadatas?.length) return unavailable;
    const rows = data.rows === undefined ? [] : data.rows;
    if (!Array.isArray(rows)) return unavailable;
    // GA4 ProtoJSON omits a zero rowCount. Accept that default only for an
    // identified runReport response with no rows and the validated headers/metadata.
    const implicitEmpty = data.rowCount === undefined && rows.length === 0 &&
      (report as { kind?: string }).kind === "analyticsData#runReport";
    const rowCount = implicitEmpty ? 0 : data.rowCount;
    if (!Number.isSafeInteger(rowCount) || rowCount! < 0 || rowCount! > 5000 || rows.length !== rowCount) return unavailable;
    const start = new Date(window.windowStart), end = new Date(window.windowEnd);
    const startKey = localMinute(start, meta.timeZone), endKey = localMinute(end, meta.timeZone);
    // A DST transition makes minute labels ambiguous; do not invent an exact rolling count.
    if (minuteAsUtc(startKey) - start.getTime() !== minuteAsUtc(endKey) - end.getTime()) return unavailable;
    let total = 0;
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.dimensionValues?.length !== 1 || row.metricValues?.length !== 1) return unavailable;
      const key = row.dimensionValues[0].value ?? "", raw = row.metricValues[0].value ?? "";
      minuteAsUtc(key);
      if (seen.has(key) || !/^(0|[1-9]\d*)$/.test(raw)) return unavailable;
      seen.add(key);
      const count = Number(raw);
      if (!Number.isSafeInteger(count)) return unavailable;
      if (key >= startKey && key < endKey) total += count;
      if (!Number.isSafeInteger(total)) return unavailable;
    }
    return { ...window, status: "ready", pageViews: total };
  } catch { return unavailable; }
}
