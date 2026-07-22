import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMobileCalendarCards,
  buildMobileNotificationCards,
  buildMobileSearchCards,
  buildMobileSharedAICards,
  buildMobileTodayCards,
} from "../src/lib/mobileSharedServices";
import type { CalendarEvent } from "../src/lib/calendar";
import type { PlatformNotificationItem } from "../src/lib/platform/notifications";
import type { PlatformSearchItem } from "../src/lib/platform/search";
import type { SharedAIContextItem } from "../src/lib/platform/sharedAI";
import type { TodayContribution } from "../src/lib/platform/today";

const todayContribution: TodayContribution = {
  id: "today-learning",
  source: "learning",
  type: "Resume",
  title: "Continue Guidance Counselor work",
  summary: "Learning owns readiness and Today owns ranking.",
  reason: "Learning supplied this contribution.",
  recommendedAction: "Continue",
  actionUrl: "/dashboard/learning",
  activeDate: "2026-07-17",
  timing: "Active",
  priority: "High",
  importance: 8,
  urgency: 7,
  preferenceWeight: 5,
  estimatedMinutes: 20,
  dismissible: true,
  status: "Active",
  sourceEvidenceIds: ["activity-1"],
};

const notification: PlatformNotificationItem = {
  id: "notification-money",
  source: "money",
  sourceRecordId: "bill-1",
  title: "Bill needs attention",
  summary: "Money owns payment state.",
  priority: "High",
  severity: "warning",
  state: "Unread",
  createdAt: "2026-07-17T12:00:00.000Z",
  actionUrl: "/dashboard/money/cashflow",
  actions: [
    { type: "Open", label: "Open Money", href: "/dashboard/money/cashflow" },
    { type: "Dismiss", label: "Dismiss" },
  ],
};

const calendarEvent: CalendarEvent = {
  id: "calendar-money",
  source: "money",
  sourceRecordId: "bill-1",
  title: "Review bill",
  summary: "Money owns bill recurrence.",
  startsAt: "2026-07-17T13:00:00.000Z",
  endsAt: "2026-07-17T13:30:00.000Z",
  timeZone: "America/New_York",
  permissionScope: "Owner",
  actionUrl: "/dashboard/money/cashflow",
  recurrence: "Monthly",
  reminderMinutesBefore: [15],
};

const searchItem: PlatformSearchItem = {
  id: "search-learning",
  source: "learning",
  sourceRecordId: "mentor-1",
  domain: "Learning",
  title: "Next learning step",
  summary: "Learning owns the lesson.",
  keywords: ["learning", "mentor"],
  href: "/dashboard/learning",
  permissionScope: "Owner",
  updatedAt: "2026-07-17T12:00:00.000Z",
  actions: [{ type: "Resume", label: "Resume", href: "/dashboard/learning" }],
};

const sharedAIContext: SharedAIContextItem[] = [
  {
    id: "ai-money",
    kind: "Module",
    source: "money",
    sourceRecordId: "cashflow",
    summary: "Money alerts are available.",
    permission: "Allowed",
    retention: "Session",
  },
  {
    id: "ai-restricted",
    kind: "Document",
    source: "documents",
    sourceRecordId: "secret-upload",
    summary: "Restricted document context.",
    permission: "Restricted",
    retention: "Session",
  },
];

test("BF-MOB-003 builds source-owned mobile cards for shared services", () => {
  const todayCards = buildMobileTodayCards([todayContribution]);
  const notificationCards = buildMobileNotificationCards([notification]);
  const calendarCards = buildMobileCalendarCards({
    events: [calendarEvent],
    today: "2026-07-17T12:00:00.000Z",
  });
  const searchCards = buildMobileSearchCards([searchItem]);
  const aiCards = buildMobileSharedAICards(sharedAIContext);

  assert.equal(todayCards[0].dispatchMode, "module-contract-event");
  assert.equal(notificationCards[0].dispatchMode, "source-contract-event");
  assert.equal(calendarCards[0].dispatchMode, "source-contract-event");
  assert.equal(searchCards[0].dispatchMode, "route-or-source-contract");
  assert.equal(aiCards[0].href, "/dashboard/search#shared-ai");
  assert.equal(aiCards[0].sourceOwnershipPreserved, true);
  assert.equal(aiCards[0].metadata[0], "1 context items");
});

test("BF-MOB-003 adds mobile quick surfaces to Today Notifications Calendar and Search", () => {
  const today = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const notifications = readFileSync(
    "src/app/dashboard/notifications/page.tsx",
    "utf8"
  );
  const calendar = readFileSync("src/app/dashboard/calendar/page.tsx", "utf8");
  const search = readFileSync("src/app/dashboard/search/page.tsx", "utf8");

  assert.match(today, /data-mobile-shared-service="today"/);
  assert.match(notifications, /data-mobile-shared-service="notifications"/);
  assert.match(calendar, /data-mobile-shared-service="calendar"/);
  assert.match(search, /data-mobile-shared-service="search"/);
  assert.match(search, /data-mobile-shared-ai-entry="true"/);
  assert.match(today, /data-mobile-today-source-actions="module-contract-event"/);
});

test("BF-MOB-003 keeps mobile shared surfaces narrow and desktop routes intact", () => {
  const pages = [
    readFileSync("src/app/dashboard/today/page.tsx", "utf8"),
    readFileSync("src/app/dashboard/notifications/page.tsx", "utf8"),
    readFileSync("src/app/dashboard/calendar/page.tsx", "utf8"),
    readFileSync("src/app/dashboard/search/page.tsx", "utf8"),
  ];
  const globalStyles = readFileSync("src/app/globals.css", "utf8");

  for (const page of pages) {
    assert.match(page, /md:hidden/);
    assert.match(page, /min-w-0/);
    assert.match(page, /break-words/);
    assert.match(page, /beast-button/);
  }

  assert.match(pages[0], /Your Guidance Counselor Recommends/);
  assert.match(pages[1], /Notification Contracts/);
  assert.match(pages[2], /Calendar Contracts/);
  assert.match(pages[3], /Natural-language search and action routing/);
  assert.match(globalStyles, /width: 100%;/);
  assert.match(globalStyles, /min-width: 0;/);
  assert.doesNotMatch(globalStyles, /overflow-x: (?:clip|hidden)/);
});
