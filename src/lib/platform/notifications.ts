import type { PlatformModule, PlatformSeverity } from "./types";

export type NotificationPriority = "Critical" | "High" | "Medium" | "Low";
export type NotificationState = "Unread" | "Read" | "Dismissed" | "Snoozed";
export type NotificationActionType = "Open" | "Dismiss" | "Snooze" | "Complete";
export type NotificationDigestFrequency = "Off" | "Daily" | "Weekly";

export type PlatformNotificationAction = {
  type: NotificationActionType;
  label: string;
  href?: string;
};

export type PlatformNotificationItem = {
  id: string;
  source: PlatformModule;
  sourceRecordId: string;
  title: string;
  summary: string;
  priority: NotificationPriority;
  severity: PlatformSeverity;
  state: NotificationState;
  createdAt: string;
  actionUrl: string;
  actions: PlatformNotificationAction[];
};

export type NotificationPreferences = {
  enabled: boolean;
  digestFrequency: NotificationDigestFrequency;
  mutedSources: PlatformModule[];
};

export type NotificationActionRequest = {
  id: string;
  notificationId: string;
  source: PlatformModule;
  sourceRecordId: string;
  actionType: NotificationActionType;
  dispatchMode: "source-contract-event";
  sourceOwnershipPreserved: true;
  href?: string;
};

export const notificationContractRules = [
  "BeastOS Notifications owns the shared inbox, grouping, state display, preferences, digests, and action routing.",
  "Source modules own source records, notification creation rules, completion, domain-specific state changes, and business actions.",
  "Notifications must identify source module, source record, priority, severity, state, action URL, and source-owned action metadata.",
  "Notification actions must dispatch source contract events instead of mutating module-owned records directly.",
];

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new Error(`Notification ${label} is required.`);
}

function parseNotificationTimestamp(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error("Notification createdAt must be a valid timestamp.");
  }
  return parsed;
}

const priorityWeight: Record<NotificationPriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export function buildNotificationItem(item: PlatformNotificationItem): PlatformNotificationItem {
  assertNonEmpty(item.id, "item id");
  assertNonEmpty(item.sourceRecordId, "source record id");
  assertNonEmpty(item.title, "title");
  assertNonEmpty(item.actionUrl, "action URL");
  parseNotificationTimestamp(item.createdAt);

  return item;
}

export function buildNotificationInbox({
  items,
  preferences,
}: {
  items: PlatformNotificationItem[];
  preferences: NotificationPreferences;
}) {
  if (!preferences.enabled) return [];

  return items
    .map(buildNotificationItem)
    .filter((item) => !preferences.mutedSources.includes(item.source))
    .filter((item) => item.state !== "Dismissed")
    .sort(
      (left, right) =>
        priorityWeight[right.priority] - priorityWeight[left.priority] ||
        right.createdAt.localeCompare(left.createdAt)
    );
}

export function groupNotificationsBySeverity(items: PlatformNotificationItem[]) {
  return {
    critical: items.filter((item) => item.severity === "critical"),
    warning: items.filter((item) => item.severity === "warning"),
    info: items.filter((item) => item.severity === "info"),
  };
}

export function buildNotificationActionRequest({
  item,
  actionType,
}: {
  item: PlatformNotificationItem;
  actionType: NotificationActionType;
}): NotificationActionRequest {
  const normalized = buildNotificationItem(item);

  return {
    id: `${normalized.id}:notification-action:${actionType.toLowerCase()}`,
    notificationId: normalized.id,
    source: normalized.source,
    sourceRecordId: normalized.sourceRecordId,
    actionType,
    dispatchMode: "source-contract-event",
    sourceOwnershipPreserved: true,
    href: normalized.actions.find((action) => action.type === actionType)?.href ?? normalized.actionUrl,
  };
}

export function buildNotificationDigest({
  items,
  preferences,
}: {
  items: PlatformNotificationItem[];
  preferences: NotificationPreferences;
}) {
  const inbox = buildNotificationInbox({ items, preferences });

  return {
    frequency: preferences.digestFrequency,
    enabled: preferences.enabled && preferences.digestFrequency !== "Off",
    total: inbox.length,
    critical: inbox.filter((item) => item.priority === "Critical").length,
    sources: Array.from(new Set(inbox.map((item) => item.source))).sort(),
  };
}
