import type { PlatformModule } from "./types";

export type TimelineEventKind =
  | "Created"
  | "Updated"
  | "Completed"
  | "Reviewed"
  | "Scheduled"
  | "Alerted";

export type TimelineVisibility = "Owner" | "Household" | "Shared";

export type TimelineEventDetail = {
  label: string;
  value: string;
};

export type PlatformTimelineItem = {
  id: string;
  source: PlatformModule;
  sourceRecordId: string;
  kind: TimelineEventKind;
  title: string;
  summary: string;
  occurredAt: string;
  visibility: TimelineVisibility;
  href: string;
  meaningful: boolean;
  details: TimelineEventDetail[];
};

export type TimelineFilters = {
  source?: PlatformModule;
  kind?: TimelineEventKind;
  visibility?: TimelineVisibility;
};

export type TimelineGroup = {
  key: string;
  label: string;
  items: PlatformTimelineItem[];
};

export const timelineContractRules = [
  "BeastOS Timeline owns cross-module activity display, meaningful-event filtering, date grouping, filters, and item detail layout.",
  "Source modules own source records, event creation, completion, status changes, deletion, and domain-specific activity meaning.",
  "Timeline events must identify source module, source record, event kind, timestamp, visibility, action URL, and source-provided details.",
  "Timeline must omit noisy system churn unless a source module marks the event meaningful for the user.",
];

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new Error(`Timeline ${label} is required.`);
}

function parseTimelineTimestamp(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error("Timeline occurredAt must be a valid timestamp.");
  }
  return parsed;
}

function dateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function groupLabel(key: string) {
  return new Date(`${key}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildTimelineItem(item: PlatformTimelineItem): PlatformTimelineItem {
  assertNonEmpty(item.id, "item id");
  assertNonEmpty(item.sourceRecordId, "source record id");
  assertNonEmpty(item.title, "title");
  assertNonEmpty(item.href, "href");
  parseTimelineTimestamp(item.occurredAt);

  return {
    ...item,
    details: item.details.filter(
      (detail) => detail.label.trim() && detail.value.trim()
    ),
  };
}

export function buildTimelineStream({
  items,
  filters = {},
  allowedVisibility = ["Owner"],
}: {
  items: PlatformTimelineItem[];
  filters?: TimelineFilters;
  allowedVisibility?: TimelineVisibility[];
}) {
  return items
    .map(buildTimelineItem)
    .filter((item) => item.meaningful)
    .filter((item) => allowedVisibility.includes(item.visibility))
    .filter((item) => !filters.source || item.source === filters.source)
    .filter((item) => !filters.kind || item.kind === filters.kind)
    .filter((item) => !filters.visibility || item.visibility === filters.visibility)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

export function groupTimelineByDate(items: PlatformTimelineItem[]): TimelineGroup[] {
  const groups = new Map<string, PlatformTimelineItem[]>();

  for (const item of items) {
    const key = dateKey(item.occurredAt);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([key, groupItems]) => ({
    key,
    label: groupLabel(key),
    items: groupItems,
  }));
}

export function buildTimelineDetail(item: PlatformTimelineItem) {
  const normalized = buildTimelineItem(item);

  return {
    id: normalized.id,
    source: normalized.source,
    sourceRecordId: normalized.sourceRecordId,
    title: normalized.title,
    summary: normalized.summary,
    occurredAt: normalized.occurredAt,
    visibility: normalized.visibility,
    details: normalized.details,
    sourceOwnershipPreserved: true,
  };
}

export function summarizeTimeline(items: PlatformTimelineItem[]) {
  const stream = buildTimelineStream({ items, allowedVisibility: ["Owner", "Household", "Shared"] });
  return {
    totalMeaningful: stream.length,
    sources: Array.from(new Set(stream.map((item) => item.source))).sort(),
    kinds: Array.from(new Set(stream.map((item) => item.kind))).sort(),
    groups: groupTimelineByDate(stream).length,
  };
}
