type Share = { name: string; count: number; share: number };
export type NewsSourceConcentration = {
  generatedAt: string;
  freshness: "fresh" | "stale";
  totalHeadlineCount: number;
  totalFeedCount: number;
  totalPublisherCount: number;
  lanes: Array<{
    scope: "world" | "usa";
    poolHeadlineCount: number;
    poolFeedCount: number;
    poolPublisherCount: number;
    visibleHeadlineCount: number;
    visiblePublisherCount: number;
    publishers: Share[];
    families: Share[];
    poolPublishers: Share[];
    poolFamilies: Share[];
  }>;
};

const object = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function shares(value: unknown, total: number): value is Share[] {
  if (!Array.isArray(value) || value.length > 1000) return false;
  let sum = 0;
  const names = new Set<string>();
  for (const raw of value) {
    const row = object(raw);
    if (!row || typeof row.name !== "string" || !row.name.trim() || names.has(row.name) || !count(row.count) || row.count === 0 || typeof row.share !== "number" || !Number.isFinite(row.share) || total === 0 || Math.abs(row.share - row.count / total) > 0.000001) return false;
    names.add(row.name);
    sum += row.count;
  }
  return sum === total;
}

/** Missing, stale or malformed observations must never become an all-clear. */
export function parseNewsSourceConcentration(value: unknown, now = new Date()): NewsSourceConcentration | null {
  const record = object(value);
  if (!record || record.view !== "unfiltered-homepage" || record.threshold !== 0.5 || typeof record.generatedAt !== "string"
    || ![record.totalHeadlineCount, record.totalFeedCount, record.totalPublisherCount].every(count)
    || !Array.isArray(record.lanes) || record.lanes.length !== 2) return null;
  const timestamp = Date.parse(record.generatedAt);
  if (!Number.isFinite(timestamp) || timestamp > now.getTime()) return null;
  const lanes: NewsSourceConcentration["lanes"] = [];
  for (const raw of record.lanes) {
    const lane = object(raw);
    if (!lane || (lane.scope !== "world" && lane.scope !== "usa") || lanes.some((row) => row.scope === lane.scope)
      || !count(lane.poolHeadlineCount) || !count(lane.poolFeedCount) || !count(lane.poolPublisherCount)
      || !count(lane.visibleHeadlineCount) || lane.visibleHeadlineCount > 20 || !count(lane.visiblePublisherCount)
      || lane.visibleHeadlineCount > lane.poolHeadlineCount
      || !shares(lane.publishers, lane.visibleHeadlineCount) || !shares(lane.families, lane.visibleHeadlineCount)
      || !shares(lane.poolPublishers, lane.poolHeadlineCount) || !shares(lane.poolFamilies, lane.poolHeadlineCount)
      || lane.visiblePublisherCount !== lane.publishers.length || lane.poolPublisherCount !== lane.poolPublishers.length) return null;
    lanes.push({ scope: lane.scope, poolHeadlineCount: lane.poolHeadlineCount, poolFeedCount: lane.poolFeedCount,
      poolPublisherCount: lane.poolPublisherCount, visibleHeadlineCount: lane.visibleHeadlineCount,
      visiblePublisherCount: lane.visiblePublisherCount, publishers: lane.publishers, families: lane.families,
      poolPublishers: lane.poolPublishers, poolFamilies: lane.poolFamilies });
  }
  return { generatedAt: record.generatedAt, freshness: now.getTime() - timestamp <= 15 * 60_000 ? "fresh" : "stale",
    totalHeadlineCount: record.totalHeadlineCount as number, totalFeedCount: record.totalFeedCount as number,
    totalPublisherCount: record.totalPublisherCount as number, lanes };
}

export function concentrationWarnings(lane: NewsSourceConcentration["lanes"][number]) {
  const warnings: string[] = [];
  for (const [label, rows] of [["Visible publisher", lane.publishers], ["Visible publisher-host family", lane.families],
    ["Pool publisher", lane.poolPublishers], ["Pool publisher-host family", lane.poolFamilies]] as const) {
    for (const row of rows) if (row.share > 0.5) warnings.push(`${label}: ${row.name} supplies ${row.count} stories (${Math.round(row.share * 100)}%).`);
  }
  return warnings;
}
