import {
  buildCalendarViews,
  type CalendarEvent,
} from "./calendar";
import {
  buildNotificationActionRequest,
  type PlatformNotificationItem,
} from "./platform/notifications";
import {
  buildSearchActionRequest,
  type PlatformSearchItem,
  type SearchActionType,
} from "./platform/search";
import {
  buildSharedAIContext,
  buildSharedAIRecommendation,
  type SharedAIContextItem,
} from "./platform/sharedAI";
import {
  getRankedTodayContributions,
  type TodayContribution,
} from "./platform/today";
import type { PlatformModule } from "./platform/types";

export type MobileSharedServiceCard = {
  id: string;
  source: PlatformModule;
  title: string;
  summary: string;
  href: string;
  actionLabel: string;
  metadata: string[];
  dispatchMode?: string;
  sourceOwnershipPreserved: true;
};

export type MobileSharedServiceSummary = {
  label: string;
  value: string;
  detail: string;
};

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function primarySearchAction(item: PlatformSearchItem): SearchActionType {
  return item.actions[0]?.type ?? "Open";
}

function toPlatformModule(source: string): PlatformModule {
  return source === "plans" ? "beastos" : (source as PlatformModule);
}

export function buildMobileTodayCards(
  contributions: TodayContribution[],
  limit = 3
): MobileSharedServiceCard[] {
  return getRankedTodayContributions(contributions)
    .slice(0, limit)
    .map(({ rank, contribution, priorityScore }) => ({
      id: contribution.id,
      source: toPlatformModule(contribution.source),
      title: contribution.title,
      summary: contribution.summary,
      href: contribution.actionUrl,
      actionLabel: contribution.recommendedAction,
      metadata: [
        `#${rank}`,
        contribution.priority,
        contribution.timing,
        `${priorityScore.score} priority`,
      ],
      dispatchMode: "module-contract-event",
      sourceOwnershipPreserved: true,
    }));
}

export function buildMobileNotificationCards(
  notifications: PlatformNotificationItem[],
  limit = 3
): MobileSharedServiceCard[] {
  return notifications.slice(0, limit).map((notification) => {
    const openAction = notification.actions.find((action) => action.type === "Open");
    const actionRequest = buildNotificationActionRequest({
      item: notification,
      actionType: openAction?.type ?? notification.actions[0]?.type ?? "Open",
    });

    return {
      id: notification.id,
      source: notification.source,
      title: notification.title,
      summary: notification.summary,
      href: actionRequest.href ?? notification.actionUrl,
      actionLabel: openAction?.label ?? notification.actions[0]?.label ?? "Open",
      metadata: [notification.priority, notification.severity, notification.state],
      dispatchMode: actionRequest.dispatchMode,
      sourceOwnershipPreserved: actionRequest.sourceOwnershipPreserved,
    };
  });
}

export function buildMobileCalendarCards({
  events,
  today,
  limit = 3,
}: {
  events: CalendarEvent[];
  today: string;
  limit?: number;
}): MobileSharedServiceCard[] {
  return buildCalendarViews({ events, today }).agenda.slice(0, limit).map((event) => ({
    id: event.id,
    source: toPlatformModule(event.source),
    title: event.title,
    summary: event.summary,
    href: event.actionUrl,
    actionLabel: "Open source",
    metadata: [
      formatTime(event.startsAt),
      event.permissionScope,
      event.recurrence,
    ],
    dispatchMode: "source-contract-event",
    sourceOwnershipPreserved: true,
  }));
}

export function buildMobileSearchCards(
  results: PlatformSearchItem[],
  limit = 3
): MobileSharedServiceCard[] {
  return results.slice(0, limit).map((result) => {
    const actionType = primarySearchAction(result);
    const actionRequest = buildSearchActionRequest({ item: result, actionType });

    return {
      id: result.id,
      source: result.source,
      title: result.title,
      summary: result.summary,
      href: actionRequest.href ?? result.href,
      actionLabel: result.actions.find((action) => action.type === actionType)?.label ?? "Open",
      metadata: [result.domain, result.permissionScope],
      dispatchMode: actionRequest.dispatchMode,
      sourceOwnershipPreserved: actionRequest.sourceOwnershipPreserved,
    };
  });
}

export function buildMobileSharedAICards(
  context: SharedAIContextItem[]
): MobileSharedServiceCard[] {
  const allowedContext = buildSharedAIContext(context);
  const recommendation = buildSharedAIRecommendation({
    id: "mobile-shared-ai-daily-context",
    title: "Ask Beast about today",
    context: allowedContext,
  });

  return [
    {
      id: recommendation.id,
      source: "beastos",
      title: recommendation.title,
      summary: recommendation.explanation,
      href: "/dashboard/search#shared-ai",
      actionLabel: "Ask shared AI",
      metadata: [
        `${recommendation.sourceContextIds.length} context items`,
        "Permissioned",
      ],
      dispatchMode: "specialist-handoff",
      sourceOwnershipPreserved: true,
    },
  ];
}

export function buildMobileSharedServiceSummary({
  todayCount,
  notificationCount,
  calendarCount,
  searchCount,
}: {
  todayCount: number;
  notificationCount: number;
  calendarCount: number;
  searchCount: number;
}): MobileSharedServiceSummary[] {
  return [
    { label: "Today", value: String(todayCount), detail: "ranked actions" },
    { label: "Alerts", value: String(notificationCount), detail: "in inbox" },
    { label: "Calendar", value: String(calendarCount), detail: "agenda items" },
    { label: "Search", value: String(searchCount), detail: "quick results" },
  ];
}
