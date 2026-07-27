export const beastAdminMessageCategories = [
  "account",
  "support",
  "problem",
  "feedback",
  "access",
  "other",
] as const;

export type BeastAdminMessageCategory =
  (typeof beastAdminMessageCategories)[number];

export const beastAdminMessageCategoryLabels: Record<
  BeastAdminMessageCategory,
  string
> = {
  account: "Account",
  support: "Support",
  problem: "Report a problem",
  feedback: "Feedback",
  access: "Access",
  other: "Other",
};

export const beastAdminMessageThreadStatuses = [
  "open",
  "resolved",
] as const;

export type BeastAdminMessageThreadStatus =
  (typeof beastAdminMessageThreadStatuses)[number];

export const beastAdminMessageLinkTypes = [
  "feedback",
  "account_action",
  "roadmap",
] as const;

export type BeastAdminMessageLinkType =
  (typeof beastAdminMessageLinkTypes)[number];

export const beastAdminMessageLinkTypeLabels: Record<
  BeastAdminMessageLinkType,
  string
> = {
  feedback: "Beta feedback",
  account_action: "Account audit action",
  roadmap: "Roadmap work",
};

export const BEAST_ADMIN_MESSAGE_UNREAD_EVENT =
  "beast:admin-message-unread-change";

export type BeastAdminPrivateMessage = {
  id: string;
  senderUserId: string;
  senderRole: "admin" | "member";
  recipientUserId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  edited: false;
};

export type BeastAdminPrivateThread = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  assignedAdminId: string;
  category: BeastAdminMessageCategory;
  status: BeastAdminMessageThreadStatus;
  memberArchived: boolean;
  adminArchived: boolean;
  linkedObjectType: BeastAdminMessageLinkType | null;
  linkedObjectId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  resolvedAt: string | null;
  unreadCount: number;
  messageCount: number;
  messages: BeastAdminPrivateMessage[];
};

export type BeastAdminMessageInboxSnapshot = {
  threads: BeastAdminPrivateThread[];
  threadCount: number;
};

export type BeastAdminMessageInboxFilters = {
  query: string;
  unread: "all" | "unread" | "read";
  category: BeastAdminMessageCategory | "all";
  status: "all" | "open" | "resolved" | "archived";
  dateFrom: string;
  dateTo: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

export function normalizeBeastAdminMessageBody(value: unknown) {
  if (typeof value !== "string") return null;
  const body = value.trim();
  if (
    body.length < 1 ||
    body.length > 5000 ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(body) ||
    /<\s*\/?\s*(script|iframe|object|embed|form)\b|javascript\s*:/i.test(
      body
    )
  ) {
    return null;
  }
  return body;
}

function normalizeMessage(value: unknown): BeastAdminPrivateMessage | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.senderUserId !== "string" ||
    (value.senderRole !== "admin" && value.senderRole !== "member") ||
    typeof value.recipientUserId !== "string" ||
    normalizeBeastAdminMessageBody(value.body) === null ||
    !isTimestamp(value.createdAt) ||
    !isNullableTimestamp(value.readAt) ||
    value.edited !== false
  ) {
    return null;
  }

  return {
    id: value.id,
    senderUserId: value.senderUserId,
    senderRole: value.senderRole,
    recipientUserId: value.recipientUserId,
    body: normalizeBeastAdminMessageBody(value.body) as string,
    createdAt: value.createdAt,
    readAt: value.readAt,
    edited: false,
  };
}

export function normalizeBeastAdminPrivateThread(
  value: unknown
): BeastAdminPrivateThread | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.memberId !== "string" ||
    typeof value.memberName !== "string" ||
    (value.memberEmail !== null && typeof value.memberEmail !== "string") ||
    typeof value.assignedAdminId !== "string" ||
    !beastAdminMessageCategories.includes(
      value.category as BeastAdminMessageCategory
    ) ||
    !beastAdminMessageThreadStatuses.includes(
      value.status as BeastAdminMessageThreadStatus
    ) ||
    typeof value.memberArchived !== "boolean" ||
    typeof value.adminArchived !== "boolean" ||
    (value.linkedObjectType !== null &&
      !beastAdminMessageLinkTypes.includes(
        value.linkedObjectType as BeastAdminMessageLinkType
      )) ||
    (value.linkedObjectId !== null &&
      typeof value.linkedObjectId !== "string") ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    !isNullableTimestamp(value.lastMessageAt) ||
    !isNullableTimestamp(value.resolvedAt) ||
    !isNonNegativeInteger(value.unreadCount) ||
    !isNonNegativeInteger(value.messageCount) ||
    !Array.isArray(value.messages)
  ) {
    return null;
  }

  const messages = value.messages
    .map(normalizeMessage)
    .filter((message): message is BeastAdminPrivateMessage =>
      Boolean(message)
    );
  if (messages.length !== value.messages.length) return null;

  return {
    id: value.id,
    memberId: value.memberId,
    memberName: value.memberName.trim() || "Not provided",
    memberEmail: value.memberEmail,
    assignedAdminId: value.assignedAdminId,
    category: value.category as BeastAdminMessageCategory,
    status: value.status as BeastAdminMessageThreadStatus,
    memberArchived: value.memberArchived,
    adminArchived: value.adminArchived,
    linkedObjectType:
      value.linkedObjectType as BeastAdminMessageLinkType | null,
    linkedObjectId: value.linkedObjectId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lastMessageAt: value.lastMessageAt,
    resolvedAt: value.resolvedAt,
    unreadCount: value.unreadCount,
    messageCount: value.messageCount,
    messages,
  };
}

export function normalizeBeastAdminMessageInboxSnapshot(
  value: unknown
): BeastAdminMessageInboxSnapshot | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.threads) ||
    !isNonNegativeInteger(value.threadCount)
  ) {
    return null;
  }
  const threads = value.threads
    .map(normalizeBeastAdminPrivateThread)
    .filter((thread): thread is BeastAdminPrivateThread => Boolean(thread));
  if (
    threads.length !== value.threads.length ||
    value.threadCount !== threads.length
  ) {
    return null;
  }
  return { threads, threadCount: value.threadCount };
}

export function filterBeastAdminMessageThreads(
  threads: BeastAdminPrivateThread[],
  filters: BeastAdminMessageInboxFilters
) {
  const query = filters.query.trim().toLocaleLowerCase();
  const from = filters.dateFrom
    ? new Date(`${filters.dateFrom}T00:00:00.000Z`).getTime()
    : null;
  const to = filters.dateTo
    ? new Date(`${filters.dateTo}T23:59:59.999Z`).getTime()
    : null;

  return threads.filter((thread) => {
    const date = new Date(
      thread.lastMessageAt || thread.createdAt
    ).getTime();
    const archived = thread.adminArchived;
    return (
      (!query ||
        [thread.memberName, thread.memberEmail || ""].some((value) =>
          value.toLocaleLowerCase().includes(query)
        )) &&
      (filters.unread === "all" ||
        (filters.unread === "unread"
          ? thread.unreadCount > 0
          : thread.unreadCount === 0)) &&
      (filters.category === "all" ||
        thread.category === filters.category) &&
      (filters.status === "all" ||
        (filters.status === "archived"
          ? archived
          : !archived && thread.status === filters.status)) &&
      (from === null || date >= from) &&
      (to === null || date <= to)
    );
  });
}

export function getBeastAdminMessageThreadStateLabel(
  thread: BeastAdminPrivateThread,
  audience: "admin" | "member"
) {
  if (
    audience === "admin" ? thread.adminArchived : thread.memberArchived
  ) {
    return "Archived";
  }
  return thread.status === "resolved" ? "Resolved" : "Open";
}
