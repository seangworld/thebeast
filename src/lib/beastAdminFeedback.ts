import {
  isBeastAdminRoadmapProductId,
  isBeastAdminRoadmapStatus,
  type BeastAdminRoadmapProductId,
  type BeastAdminRoadmapStatus,
} from "./beastAdminRoadmap";

export const beastAdminFeedbackStatuses = [
  "New",
  "Acknowledged",
  "Planned",
  "In Progress",
  "Released",
  "Declined",
] as const;

export type BeastAdminFeedbackStatus =
  (typeof beastAdminFeedbackStatuses)[number];

export const beastAdminFeedbackStatusLabels: Record<
  BeastAdminFeedbackStatus,
  string
> = {
  New: "New",
  Acknowledged: "Acknowledged",
  Planned: "Planned",
  "In Progress": "In Progress",
  Released: "Released",
  Declined: "Declined",
};

export type BeastAdminFeedbackRoadmapLink = {
  id: string;
  title: string;
  productId: BeastAdminRoadmapProductId;
  status: BeastAdminRoadmapStatus;
};

export type BeastAdminFeedbackItem = {
  id: string;
  userId: string | null;
  memberName: string;
  memberEmail: string | null;
  category: string;
  message: string;
  context: string;
  status: BeastAdminFeedbackStatus;
  roadmapItem: BeastAdminFeedbackRoadmapLink | null;
  ownerResponse: string;
  submittedAt: string;
  updatedAt: string;
  releasedAt: string | null;
  memberNotifiedAt: string | null;
};

export type BeastAdminFeedbackFilters = {
  status: BeastAdminFeedbackStatus | "all";
  query: string;
};

export function isBeastAdminFeedbackStatus(
  value: unknown
): value is BeastAdminFeedbackStatus {
  return beastAdminFeedbackStatuses.includes(
    value as BeastAdminFeedbackStatus
  );
}

export function feedbackStatusRequiresRoadmap(
  status: BeastAdminFeedbackStatus
) {
  return (
    status === "Planned" ||
    status === "In Progress" ||
    status === "Released"
  );
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function normalizeRoadmapLink(
  value: unknown
): BeastAdminFeedbackRoadmapLink | null {
  if (value === null) return null;
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.title !== "string" ||
    !record.title.trim() ||
    !isBeastAdminRoadmapProductId(record.productId) ||
    !isBeastAdminRoadmapStatus(record.status)
  ) {
    return null;
  }

  return {
    id: record.id,
    title: record.title.trim(),
    productId: record.productId,
    status: record.status,
  };
}

export function normalizeBeastAdminFeedbackItem(
  value: unknown
): BeastAdminFeedbackItem | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const roadmapItem = normalizeRoadmapLink(record.roadmapItem);

  if (
    typeof record.id !== "string" ||
    (record.userId !== null && typeof record.userId !== "string") ||
    typeof record.memberName !== "string" ||
    typeof record.category !== "string" ||
    typeof record.message !== "string" ||
    !record.message.trim() ||
    typeof record.context !== "string" ||
    !isBeastAdminFeedbackStatus(record.status) ||
    typeof record.ownerResponse !== "string" ||
    !isTimestamp(record.submittedAt) ||
    !isTimestamp(record.updatedAt) ||
    (record.memberEmail !== null && typeof record.memberEmail !== "string") ||
    (record.releasedAt !== null && !isTimestamp(record.releasedAt)) ||
    (record.memberNotifiedAt !== null &&
      !isTimestamp(record.memberNotifiedAt)) ||
    (record.roadmapItem !== null && !roadmapItem)
  ) {
    return null;
  }

  return {
    id: record.id,
    userId: record.userId,
    memberName: record.memberName.trim() || "Member",
    memberEmail: record.memberEmail,
    category: record.category.trim() || "feedback",
    message: record.message.trim(),
    context: record.context.trim(),
    status: record.status,
    roadmapItem,
    ownerResponse: record.ownerResponse.trim(),
    submittedAt: record.submittedAt,
    updatedAt: record.updatedAt,
    releasedAt: record.releasedAt,
    memberNotifiedAt: record.memberNotifiedAt,
  };
}

export function normalizeBeastAdminFeedbackItems(
  value: unknown
): BeastAdminFeedbackItem[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map(normalizeBeastAdminFeedbackItem);
  return items.every((item): item is BeastAdminFeedbackItem => Boolean(item))
    ? items
    : null;
}

export function filterBeastAdminFeedbackItems(
  items: BeastAdminFeedbackItem[],
  filters: BeastAdminFeedbackFilters
) {
  const query = filters.query.trim().toLocaleLowerCase();

  return items.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }
    if (!query) return true;

    return [
      item.memberName,
      item.memberEmail || "",
      item.category,
      item.message,
      item.context,
      item.ownerResponse,
      item.roadmapItem?.title || "",
    ].some((field) => field.toLocaleLowerCase().includes(query));
  });
}

export function buildBeastAdminFeedbackCounts(
  items: BeastAdminFeedbackItem[]
) {
  return beastAdminFeedbackStatuses.reduce<
    Record<BeastAdminFeedbackStatus, number>
  >(
    (counts, status) => {
      counts[status] = items.filter((item) => item.status === status).length;
      return counts;
    },
    {
      New: 0,
      Acknowledged: 0,
      Planned: 0,
      "In Progress": 0,
      Released: 0,
      Declined: 0,
    }
  );
}
