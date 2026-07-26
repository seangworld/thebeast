export const beastAdminMemberTimelineCategories = [
  "registration",
  "module",
  "conversation",
  "goals",
  "learning",
  "money",
  "health",
  "documents",
] as const;

export type BeastAdminMemberTimelineCategory =
  (typeof beastAdminMemberTimelineCategories)[number];

export type BeastAdminMemberDirectoryEntry = {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  registeredAt: string;
  lastActivityAt: string;
  eventCount: number;
};

export type BeastAdminMemberTimelineEvent = {
  id: string;
  occurredAt: string;
  category: BeastAdminMemberTimelineCategory;
  moduleId: string;
  title: string;
  detail: string;
};

export type BeastAdminMemberTimelineCoverage = {
  category: BeastAdminMemberTimelineCategory;
  state: "available" | "derived" | "partial";
  detail: string;
};

export type BeastAdminMemberTimelineSnapshot = {
  member: Omit<
    BeastAdminMemberDirectoryEntry,
    "lastActivityAt" | "eventCount"
  >;
  eventCount: number;
  hasMore: boolean;
  events: BeastAdminMemberTimelineEvent[];
  coverage: BeastAdminMemberTimelineCoverage[];
};

export const beastAdminMemberTimelineCategoryLabels: Record<
  BeastAdminMemberTimelineCategory,
  string
> = {
  registration: "Registration",
  module: "Module activations",
  conversation: "Conversations",
  goals: "Goals",
  learning: "Learning",
  money: "Money",
  health: "Health",
  documents: "Documents",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

export function isBeastAdminMemberTimelineCategory(
  value: unknown
): value is BeastAdminMemberTimelineCategory {
  return beastAdminMemberTimelineCategories.includes(
    value as BeastAdminMemberTimelineCategory
  );
}

function normalizeMemberBase(
  value: unknown
):
  | Omit<BeastAdminMemberDirectoryEntry, "lastActivityAt" | "eventCount">
  | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.role !== "string" ||
    !isDateString(value.registeredAt) ||
    (value.email !== null && typeof value.email !== "string")
  ) {
    return null;
  }

  return {
    id: value.id,
    displayName: value.displayName.trim() || "Member",
    email: value.email,
    role: value.role,
    registeredAt: value.registeredAt,
  };
}

export function normalizeBeastAdminMemberDirectory(
  value: unknown
): BeastAdminMemberDirectoryEntry[] | null {
  if (!Array.isArray(value)) return null;

  const members = value.flatMap((entry) => {
    const member = normalizeMemberBase(entry);
    if (
      !member ||
      !isRecord(entry) ||
      !isDateString(entry.lastActivityAt) ||
      !isNonNegativeNumber(entry.eventCount)
    ) {
      return [];
    }

    return [
      {
        ...member,
        lastActivityAt: entry.lastActivityAt,
        eventCount: entry.eventCount,
      },
    ];
  });

  return members.length === value.length ? members : null;
}

function normalizeTimelineEvents(
  value: unknown
): BeastAdminMemberTimelineEvent[] | null {
  if (!Array.isArray(value)) return null;

  const events = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      !isDateString(entry.occurredAt) ||
      !isBeastAdminMemberTimelineCategory(entry.category) ||
      typeof entry.moduleId !== "string" ||
      typeof entry.title !== "string" ||
      typeof entry.detail !== "string"
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        occurredAt: entry.occurredAt,
        category: entry.category,
        moduleId: entry.moduleId,
        title: entry.title,
        detail: entry.detail,
      },
    ];
  });

  return events.length === value.length ? events : null;
}

function normalizeCoverage(
  value: unknown
): BeastAdminMemberTimelineCoverage[] | null {
  if (!Array.isArray(value)) return null;

  const coverage = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      !isBeastAdminMemberTimelineCategory(entry.category) ||
      !["available", "derived", "partial"].includes(String(entry.state)) ||
      typeof entry.detail !== "string"
    ) {
      return [];
    }

    return [
      {
        category: entry.category,
        state: entry.state as BeastAdminMemberTimelineCoverage["state"],
        detail: entry.detail,
      },
    ];
  });

  return coverage.length === value.length ? coverage : null;
}

export function normalizeBeastAdminMemberTimeline(
  value: unknown
): BeastAdminMemberTimelineSnapshot | null {
  if (
    !isRecord(value) ||
    !isNonNegativeNumber(value.eventCount) ||
    typeof value.hasMore !== "boolean"
  ) {
    return null;
  }

  const member = normalizeMemberBase(value.member);
  const events = normalizeTimelineEvents(value.events);
  const coverage = normalizeCoverage(value.coverage);
  if (!member || !events || !coverage) return null;

  return {
    member,
    eventCount: value.eventCount,
    hasMore: value.hasMore,
    events,
    coverage,
  };
}

export function filterBeastAdminMemberTimelineEvents(
  events: BeastAdminMemberTimelineEvent[],
  category: BeastAdminMemberTimelineCategory | "all"
) {
  return category === "all"
    ? events
    : events.filter((event) => event.category === category);
}

export function buildBeastAdminMemberTimelineCounts(
  events: BeastAdminMemberTimelineEvent[]
) {
  return beastAdminMemberTimelineCategories.reduce<
    Record<BeastAdminMemberTimelineCategory, number>
  >(
    (counts, category) => {
      counts[category] = events.filter(
        (event) => event.category === category
      ).length;
      return counts;
    },
    {
      registration: 0,
      module: 0,
      conversation: 0,
      goals: 0,
      learning: 0,
      money: 0,
      health: 0,
      documents: 0,
    }
  );
}
